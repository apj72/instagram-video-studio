"""Render the Version1 templates through the studio's own Canvas renderer and MP4 encoder.

Start the dev server first, then run this from v2/:

    npm run dev -- --host 127.0.0.1
    python3 posts/version1-events/render.py --check      # safe zones and layout only
    python3 posts/version1-events/render.py --frames     # contact sheets for review
    python3 posts/version1-events/render.py              # frames, projects and MP4s

Requires Python Playwright with Chromium.
"""
import argparse
import asyncio
import base64
import json
import sys
from pathlib import Path

from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

# One frame per bar, plus the opening and the final held frame.
REVIEW_TIMES = [240, 1200, 2400, 3300, 4300, 5300, 6300, 7300, 8300, 9300,
                10300, 11300, 12300, 13000, 13900, 14800]

SETUP = """async (origin) => {
  window.v1 = await import(origin + '/src/templates/version1Events.ts');
  window.renderFrame = (await import(origin + '/src/render/engine.ts')).renderFrame;
  window.exportMp4 = (await import(origin + '/src/export/encoder.ts')).exportMp4;
  window.seekVideoAssets = (await import(origin + '/src/render/videoSync.ts')).seekVideoAssets;
  window.media = new Map();
  await Promise.all(v1.VERSION1_ASSETS.map(async asset => {
    if (asset.kind === 'video') {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = asset.url;
      await new Promise((resolve, reject) => {
        video.onloadeddata = resolve;
        video.onerror = () => reject(new Error('could not load ' + asset.url));
      });
      video.pause();
      media.set(asset.id, video);
      return;
    }
    const image = new Image();
    image.src = asset.url;
    await image.decode();
    media.set(asset.id, image);
  }));
  await document.fonts.load('200px Bungee');
  await document.fonts.ready;
}"""

# Mirrors the renderer: measures with letter spacing and the auto-sized background box.
CHECK = """(safe) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  const issues = [];
  const evaluate = (prop, t) => {
    const k = prop.keyframes;
    if (k.length === 1) return k[0].value;
    if (t <= k[0].time) return k[0].value;
    if (t >= k[k.length - 1].time) return k[k.length - 1].value;
    for (let i = 0; i < k.length - 1; i++) {
      const a = k[i], b = k[i + 1];
      if (t >= a.time && t <= b.time) {
        const span = b.time - a.time;
        if (span <= 0) return a.value;
        return a.value + (b.value - a.value) * ((t - a.time) / span);
      }
    }
    return k[k.length - 1].value;
  };
  for (const template of v1.VERSION1_TEMPLATES) {
    const project = template.factory();
    for (const layer of project.layers) {
      if (layer.type !== 'text') continue;
      // Sample where the layer is settled, between its entrance and its exit.
      const t = layer.inTime + (layer.outTime - layer.inTime) * 0.5;
      const size = evaluate(layer.fontSize, t);
      ctx.font = `${layer.fontWeight} ${size}px ${layer.fontFamily}`;
      ctx.letterSpacing = `${layer.letterSpacing}px`;
      const lines = layer.text.split('\\\\n');
      const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
      ctx.letterSpacing = '0px';
      const padX = layer.background.enabled ? layer.background.paddingX : 0;
      const padY = layer.background.enabled ? layer.background.paddingY : 0;
      const boxWidth = textWidth + padX * 2;
      const boxHeight = lines.length * size * layer.lineHeight + padY * 2;
      const cx = evaluate(layer.position.x, t) * 1080;
      const cy = evaluate(layer.position.y, t) * 1920;
      const left = layer.textAlign === 'left' ? cx - padX
        : layer.textAlign === 'right' ? cx - boxWidth + padX : cx - boxWidth / 2;
      const box = { left, right: left + boxWidth, top: cy - boxHeight / 2, bottom: cy + boxHeight / 2 };
      const bad = box.left < safe.left || box.right > safe.right
        || box.top < safe.top || box.bottom > safe.bottom;
      if (bad) issues.push({
        template: template.id, layer: layer.name, text: layer.text, atMs: Math.round(t),
        left: Math.round(box.left), right: Math.round(box.right),
        top: Math.round(box.top), bottom: Math.round(box.bottom),
      });
    }
  }
  return issues;
}"""

GRAB = """async ([ms, scale]) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1920;
  await seekVideoAssets(window.project, media, ms);
  renderFrame(window.project, canvas.getContext('2d'), ms, Math.round(ms * 0.03), media, null);
  if (scale === 1) return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
  const small = document.createElement('canvas');
  small.width = Math.round(1080 * scale); small.height = Math.round(1920 * scale);
  const sctx = small.getContext('2d');
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(canvas, 0, 0, small.width, small.height);
  return small.toDataURL('image/jpeg', 0.9).split(',')[1];
}"""

ENCODE = """async () => {
  const blob = await exportMp4(window.project, media, window.project.exportPreset, () => {});
  return await new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
}"""


def contact_sheet(images, columns, destination):
    """Tile review frames into one image so a whole template can be read at a glance."""
    from PIL import Image
    import io
    tiles = [Image.open(io.BytesIO(data)) for data in images]
    width, height = tiles[0].size
    rows = (len(tiles) + columns - 1) // columns
    sheet = Image.new('RGB', (width * columns, height * rows), (12, 12, 12))
    for index, tile in enumerate(tiles):
        sheet.paste(tile, ((index % columns) * width, (index // columns) * height))
    sheet.save(destination, quality=88)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--origin', default='http://127.0.0.1:5175')
    parser.add_argument('--check', action='store_true', help='safe-zone report only')
    parser.add_argument('--frames', action='store_true', help='review frames, no MP4s')
    parser.add_argument('--only', help='single template id')
    args = parser.parse_args()

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=['--enable-unsafe-swiftshader'])
        page = await browser.new_page(viewport={'width': 1280, 'height': 900})
        page.on('pageerror', lambda e: print(f'page error: {e}', file=sys.stderr))
        # A blank page on the dev server's origin: Vite still resolves the imports, but the
        # editor and its hot-reload client are not running to navigate out from under us.
        await page.route('**/__harness', lambda route: route.fulfill(
            status=200, content_type='text/html', body='<!doctype html><title>harness</title>'))
        await page.goto(args.origin + '/__harness')
        await page.add_style_tag(content="@font-face{font-family:'Bungee';src:url('/assets/fonts/Bungee-Regular.ttf') format('truetype')}")
        await page.evaluate(SETUP, args.origin)

        issues = await page.evaluate(CHECK, {'top': 250, 'bottom': 1520, 'left': 64, 'right': 960})
        print(json.dumps({'safeZoneIssues': issues}, indent=2))
        if args.check:
            await browser.close()
            raise SystemExit(1 if issues else 0)

        templates = await page.evaluate('() => v1.VERSION1_TEMPLATES.map(t => ({id: t.id, name: t.name}))')
        for template in templates:
            if args.only and template['id'] != args.only:
                continue
            slug = template['id'].replace('version1-', '')
            folder = HERE / slug
            folder.mkdir(exist_ok=True)
            project = await page.evaluate(
                '''id => { window.project = v1.VERSION1_TEMPLATES.find(t => t.id === id).factory(); return window.project; }''',
                template['id'])
            (folder / 'project.json').write_text(json.dumps(project, indent=2) + '\n')

            sheet = [base64.b64decode(await page.evaluate(GRAB, [ms, 0.34])) for ms in REVIEW_TIMES]
            contact_sheet(sheet, 4, folder / 'contact-sheet.jpg')
            hero_ms = 2400
            hero = base64.b64decode(await page.evaluate(GRAB, [hero_ms, 1]))
            (folder / 'poster.jpg').write_bytes(hero)
            # The Posts dialog looks for thumbnail.jpg beside the project JSON.
            (folder / 'thumbnail.jpg').write_bytes(hero)
            (ROOT / 'public/assets/version1' / f'preview-{slug}.jpg').write_bytes(hero)
            print(f'{slug}: frames written', flush=True)

            if args.frames:
                continue
            print(f'{slug}: encoding 450 frames', flush=True)
            mp4 = base64.b64decode(await page.evaluate(ENCODE))
            name = ('v1_2026-11-14_collective_announcement_house-music.mp4'
                    if slug == 'november14' else f'v1_template_{slug}_15s.mp4')
            for stale in folder.glob('*.mp4'):
                stale.unlink()
            (folder / name).write_bytes(mp4)
            print(f'{slug}: saved {name} ({len(mp4) // 1024} KB)', flush=True)

        await browser.close()


asyncio.run(main())
