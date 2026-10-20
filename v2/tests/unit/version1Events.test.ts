import { describe, expect, it } from 'vitest';
import {
  GENERIC_EVENT, NOVEMBER_EVENT, VERSION1_ASSETS, VERSION1_TEMPLATES, createVersion1Event, measureLine,
} from '../../src/templates/version1Events.ts';
import type { Layer, TextLayer } from '../../src/core/schema.ts';
import { evaluateProperty } from '../../src/timeline/interpolation.ts';

const BAR = (60000 / 128) * 4;
const SAFE = { top: 250, bottom: 1520, left: 64, right: 960 };

function textLayers(layers: Layer[]): TextLayer[] {
  return layers.filter((layer): layer is TextLayer => layer.type === 'text');
}

/** Where a line sits once it has finished arriving and before it leaves. */
function settledBox(layer: TextLayer) {
  const at = layer.inTime + (layer.outTime - layer.inTime) * 0.5;
  const size = evaluateProperty(layer.fontSize, at);
  const lines = layer.text.split('\\n');
  const width = Math.max(...lines.map(line => measureLine(line, size, layer.letterSpacing, layer.fontFamily)));
  const padX = layer.background.enabled ? layer.background.paddingX : 0;
  const padY = layer.background.enabled ? layer.background.paddingY : 0;
  const boxWidth = width + padX * 2;
  const boxHeight = lines.length * size * layer.lineHeight + padY * 2;
  const cx = evaluateProperty(layer.position.x, at) * 1080;
  const cy = evaluateProperty(layer.position.y, at) * 1920;
  const left = layer.textAlign === 'left' ? cx - padX
    : layer.textAlign === 'right' ? cx - boxWidth + padX : cx - boxWidth / 2;
  return { left, right: left + boxWidth, top: cy - boxHeight / 2, bottom: cy + boxHeight / 2 };
}

describe('Version1 event templates', () => {
  it('offers a series of 15-second Reels on one beat grid', () => {
    expect(VERSION1_TEMPLATES).toHaveLength(6);
    for (const template of VERSION1_TEMPLATES) {
      const project = template.factory();
      expect(template.category).toBe('Version1 Events');
      expect([project.settings.width, project.settings.height]).toEqual([1080, 1920]);
      expect(project.settings.duration).toBe(15000);
      expect(project.settings.bpm).toBe(128);
      // Eight bars at 128 BPM, so every section can cut on a downbeat.
      expect(project.settings.duration / BAR).toBe(8);
      expect(project.settings.fps).toBe(30);
      expect(project.exportPreset.width).toBe(1080);
      expect(project.exportPreset.height).toBe(1920);
    }
  });

  it('puts real laser footage behind every template, sliding in after the logo lands', () => {
    const supplied = new Set<string>(VERSION1_ASSETS.map(asset => asset.id));
    for (const template of VERSION1_TEMPLATES) {
      const project = template.factory();
      const footage = project.layers.find(layer => layer.type === 'video');
      expect(footage, `${template.id} has no footage layer`).toBeDefined();
      if (footage?.type !== 'video') throw new Error('unreachable');
      expect(supplied.has(footage.assetId!)).toBe(true);
      expect(footage.slideIn).toBe('bottom');
      expect(footage.outTime).toBe(15000);
      // It arrives on black, after the logo has spiralled in.
      expect(footage.inTime).toBeGreaterThan(600);
      for (const layer of project.layers) {
        if (layer.type === 'image') expect(supplied.has(layer.assetId!)).toBe(true);
      }
    }
  });

  it('keeps the logo on screen from the first frame to the last', () => {
    for (const template of VERSION1_TEMPLATES) {
      const project = template.factory();
      const logo = project.layers.find(layer => layer.name.includes('supplied logo'))!;
      expect(logo.inTime).toBe(0);
      expect(logo.outTime).toBe(15000);
      // Spirals in: it turns, and it grows from nothing to bigger than it ends up.
      expect(evaluateProperty(logo.rotation, 0)).toBeLessThan(-1);
      expect(evaluateProperty(logo.rotation, 1200)).toBe(0);
      const start = evaluateProperty(logo.scale.x, 0);
      const peak = evaluateProperty(logo.scale.x, 900);
      const rest = evaluateProperty(logo.scale.x, 15000);
      expect(start).toBeLessThan(0.1);
      expect(peak).toBeGreaterThan(rest);
      expect(rest).toBeGreaterThan(0.5);
      // Then travels from the middle up to its place at the top, and stays there.
      expect(evaluateProperty(logo.position.y, 900)).toBeGreaterThan(0.4);
      expect(evaluateProperty(logo.position.y, 2000)).toBeLessThan(0.2);
      expect(evaluateProperty(logo.position.y, 15000)).toBe(evaluateProperty(logo.position.y, 2000));
    }
  });

  it('assembles each piece in order and takes it apart again', () => {
    for (const template of VERSION1_TEMPLATES) {
      const project = template.factory();
      const pieces = textLayers(project.layers).filter(layer => layer.name !== 'Collective line');
      for (const layer of pieces) {
        expect(evaluateProperty(layer.opacity, layer.inTime)).toBe(0);
        expect(evaluateProperty(layer.opacity, layer.outTime)).toBe(0);
        const middle = layer.inTime + (layer.outTime - layer.inTime) / 2;
        expect(evaluateProperty(layer.opacity, middle)).toBe(1);
        // It travels: the settled position is not where it starts or finishes.
        const startX = evaluateProperty(layer.position.x, layer.inTime);
        const startY = evaluateProperty(layer.position.y, layer.inTime);
        const restX = evaluateProperty(layer.position.x, middle);
        const restY = evaluateProperty(layer.position.y, middle);
        expect(startX !== restX || startY !== restY).toBe(true);
      }
    }
  });

  it('gives every section a visible hold between arriving and leaving', () => {
    for (const template of VERSION1_TEMPLATES) {
      for (const layer of textLayers(template.factory().layers)) {
        const settled = layer.position.x.keyframes[1].time;
        const leaves = layer.position.x.keyframes[2].time;
        expect(leaves - settled, `${template.id} / ${layer.name}`).toBeGreaterThan(400);
      }
    }
  });

  it('sets the main lines in black-backed type so they read over footage', () => {
    for (const template of VERSION1_TEMPLATES) {
      const headline = textLayers(template.factory().layers)
        .filter(layer => layer.fontFamily === 'Bungee' && evaluateProperty(layer.fontSize, layer.inTime + 600) > 80);
      expect(headline.length, `${template.id} has no prominent line`).toBeGreaterThan(0);
      for (const layer of headline) {
        expect(layer.shadow.enabled).toBe(true);
        expect(layer.shadow.color).toBe('#000000');
        expect(layer.shadow.blur).toBe(0);
        // Offset down and to the right.
        expect(layer.shadow.offsetX).toBeGreaterThan(0);
        expect(layer.shadow.offsetY).toBeGreaterThan(layer.shadow.offsetX);
      }
    }
  });

  it('keeps every line inside the guide’s Reel safe zone', () => {
    for (const template of VERSION1_TEMPLATES) {
      for (const layer of textLayers(template.factory().layers)) {
        const box = settledBox(layer);
        const where = `${template.id} / ${layer.name}`;
        expect(`${where} left ${Math.round(box.left)}`).toBe(`${where} left ${Math.round(Math.max(box.left, SAFE.left))}`);
        expect(`${where} right ${Math.round(box.right)}`).toBe(`${where} right ${Math.round(Math.min(box.right, SAFE.right))}`);
        expect(`${where} top ${Math.round(box.top)}`).toBe(`${where} top ${Math.round(Math.max(box.top, SAFE.top))}`);
        expect(`${where} bottom ${Math.round(box.bottom)}`).toBe(`${where} bottom ${Math.round(Math.min(box.bottom, SAFE.bottom))}`);
      }
    }
  });

  it('no longer carries the Instagram handle plate', () => {
    for (const template of VERSION1_TEMPLATES) {
      const text = textLayers(template.factory().layers);
      expect(text.some(layer => layer.text.startsWith('@'))).toBe(false);
      expect(text.some(layer => layer.name.includes('Handle'))).toBe(false);
    }
  });

  it('carries the 14 November details without touching the generic copy', () => {
    const november = textLayers(createVersion1Event('announcement', NOVEMBER_EVENT).layers).map(layer => layer.text);
    expect(november).toContain('14 NOV');
    expect(november).toContain('THE CRESCENT');
    expect(november).toContain('SMILEY JACK');
    expect(november).toContain('8 THE CRESCENT, YORK YO24 1AW');
    expect(november).not.toContain('VENUE NAME');

    const generic = textLayers(createVersion1Event('announcement', GENERIC_EVENT).layers).map(layer => layer.text);
    expect(generic).toContain('VENUE NAME');
    expect(generic).not.toContain('THE CRESCENT');
  });

  it('gives each style its own composition rather than a reordered one', () => {
    const signatures = (['announcement', 'save-the-date', 'selectors', 'mix-drop', 'last-call'] as const)
      .map(style => textLayers(createVersion1Event(style).layers)
        .map(layer => `${layer.text}@${Math.round(layer.inTime)}`).sort().join('|'));
    expect(new Set(signatures).size).toBe(signatures.length);
  });
});

describe('measureLine', () => {
  it('uses the measured Bungee advances rather than one average', () => {
    // M is the widest letter and I one of the narrowest, so a flat average cannot match both.
    expect(measureLine('M', 100, 0, 'Bungee')).toBeCloseTo(84.9, 1);
    expect(measureLine('I', 100, 0, 'Bungee')).toBeCloseTo(60.5, 1);
    // Checked against the renderer's own measureText. The table rounds each glyph to three
    // decimals, so a long line may drift by about a pixel at this size.
    const renderer: Record<string, number> = { TONIGHT: 486.9, 'VENUE NAME': 674.8, HOUSE: 354.6, 'SMILEY JACK': 717.5 };
    for (const [line, measured] of Object.entries(renderer)) {
      expect(Math.abs(measureLine(line, 100, 0, 'Bungee') - measured), line).toBeLessThan(1.5);
    }
  });

  it('counts letter spacing after every character, as Chromium does', () => {
    expect(measureLine('ABC', 100, 10, 'Bungee') - measureLine('ABC', 100, 0, 'Bungee')).toBe(30);
  });
});
