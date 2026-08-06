import type { Project, Layer, ImageLayer, TextLayer, EffectLayer, BackgroundLogoLayer } from '../core/schema.ts';
import { evaluateProperty } from '../timeline/interpolation.ts';
import { frameRNG } from '../core/random.ts';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  timeMs: number;
  normalizedTime: number;
  duration: number;
  bpm: number;
  seed: number;
  frameNumber: number;
  assets: Map<string, HTMLImageElement | HTMLVideoElement>;
  audioData: AudioRenderData | null;
}

export interface AudioRenderData {
  spectrum: Float32Array;
  waveform: Float32Array;
  vuLeft: number;
  vuRight: number;
}

export function renderFrame(project: Project, ctx: CanvasRenderingContext2D, timeMs: number, frameNumber: number, assets: Map<string, HTMLImageElement | HTMLVideoElement>, audioData: AudioRenderData | null) {
  const { width, height, duration, bpm, seed, backgroundColor, backgroundImageAssetId } = project.settings;
  const t = timeMs / duration;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  if (backgroundImageAssetId) {
    const bgImg = assets.get(backgroundImageAssetId) as HTMLImageElement | undefined;
    if (bgImg) {
      drawCoverImage(ctx, bgImg, width, height);
    }
  }

  const rc: RenderContext = {
    ctx, width, height, timeMs, normalizedTime: t,
    duration, bpm, seed, frameNumber, assets, audioData,
  };

  for (const layer of project.layers) {
    if (!layer.visible) continue;
    if (timeMs < layer.inTime || timeMs > layer.outTime) continue;

    const opacity = evaluateProperty(layer.opacity, timeMs);
    if (opacity <= 0) continue;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;

    const px = evaluateProperty(layer.position.x, timeMs);
    const py = evaluateProperty(layer.position.y, timeMs);
    const sx = evaluateProperty(layer.scale.x, timeMs);
    const sy = evaluateProperty(layer.scale.y, timeMs);
    const rot = evaluateProperty(layer.rotation, timeMs);

    renderLayer(rc, layer, px, py, sx, sy, rot);

    ctx.restore();
  }
}

function renderLayer(rc: RenderContext, layer: Layer, px: number, py: number, sx: number, _sy: number, _rot: number) {
  switch (layer.type) {
    case 'image': renderImageLayer(rc, layer, px, py, sx); break;
    case 'text': renderTextLayer(rc, layer, px, py); break;
    case 'effect': renderEffectLayer(rc, layer); break;
    case 'background-logo': renderBackgroundLogoLayer(rc, layer); break;
    default: break;
  }
}

function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number) {
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const canvasAspect = cw / ch;
  let dw: number, dh: number, dx: number, dy: number;
  if (imgAspect > canvasAspect) {
    dh = ch; dw = ch * imgAspect; dx = (cw - dw) / 2; dy = 0;
  } else {
    dw = cw; dh = cw / imgAspect; dx = 0; dy = (ch - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

function renderImageLayer(rc: RenderContext, layer: ImageLayer, px: number, py: number, scale: number) {
  const { ctx, width, height, assets, timeMs, duration } = rc;
  const img = layer.assetId ? assets.get(layer.assetId) as HTMLImageElement | undefined : assets.get('default-logo') as HTMLImageElement | undefined;
  if (!img) return;

  const aspect = img.naturalWidth / img.naturalHeight;
  const drawW = width * scale;
  const drawH = drawW / aspect;

  let targetY = py * height;

  if (layer.parallax) {
    const pxDur = layer.parallaxDuration;
    const startY = height * layer.parallaxStartY;
    const endY = py * height;
    if (timeMs < pxDur) {
      const p = easeOutCubic(timeMs / pxDur);
      targetY = startY + (endY - startY) * p;
    } else if (timeMs > duration - pxDur) {
      const p = easeOutCubic((duration - timeMs) / pxDur);
      targetY = startY + (endY - startY) * p;
    }
  }

  ctx.drawImage(img, px * width - drawW / 2, targetY - drawH / 2, drawW, drawH);
}

function renderTextLayer(rc: RenderContext, layer: TextLayer, px: number, py: number) {
  const { ctx, width, height } = rc;
  const fontSize = evaluateProperty(layer.fontSize, rc.timeMs);
  const lines = layer.text.split('\\n');

  ctx.font = `${layer.fontWeight} ${fontSize}px ${layer.fontFamily}`;
  ctx.textAlign = layer.textAlign;
  ctx.textBaseline = 'middle';

  const lineH = fontSize * layer.lineHeight;
  const totalH = lines.length * lineH;
  const textX = px * width;
  const textY = py * height;

  const maxW = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);

  if (layer.background.enabled || layer.border.enabled) {
    const padX = layer.background.enabled ? layer.background.paddingX : layer.border.paddingX;
    const padY = layer.background.enabled ? layer.background.paddingY : layer.border.paddingY;
    const radius = layer.background.enabled ? layer.background.cornerRadius : layer.border.cornerRadius;
    const boxW = maxW + padX * 2;
    const boxH = totalH + padY * 2;
    const boxX = textX - boxW / 2;
    const boxY = textY - totalH / 2 - padY;

    if (layer.background.enabled) {
      ctx.save();
      ctx.globalAlpha = (ctx.globalAlpha) * layer.background.opacity;
      ctx.fillStyle = layer.background.color;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, radius);
      ctx.fill();
      ctx.restore();
    }

    if (layer.border.enabled) {
      ctx.strokeStyle = layer.border.color;
      ctx.lineWidth = layer.border.width;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, radius);
      ctx.stroke();
    }
  }

  ctx.fillStyle = layer.textColor;
  for (let i = 0; i < lines.length; i++) {
    const ly = textY - totalH / 2 + lineH / 2 + i * lineH;
    if (layer.shadow.enabled) {
      ctx.save();
      ctx.shadowColor = layer.shadow.color;
      ctx.shadowBlur = layer.shadow.blur;
      ctx.shadowOffsetX = layer.shadow.offsetX;
      ctx.shadowOffsetY = layer.shadow.offsetY;
      ctx.fillText(lines[i], textX, ly);
      ctx.restore();
    } else {
      ctx.fillText(lines[i], textX, ly);
    }
    if (layer.stroke.enabled) {
      ctx.strokeStyle = layer.stroke.color;
      ctx.lineWidth = layer.stroke.width;
      ctx.strokeText(lines[i], textX, ly);
    }
  }
}

function renderEffectLayer(rc: RenderContext, layer: EffectLayer) {
  const { ctx, width, height, timeMs, duration, bpm, seed, frameNumber, audioData } = rc;
  const t = timeMs / duration;
  const rng = frameRNG(seed, frameNumber);

  switch (layer.effectType) {
    case 'vignette': {
      const fadeIn = 0.05, fadeOut = 0.05;
      let masterAlpha = 1;
      if (t < fadeIn) masterAlpha = t / fadeIn;
      else if (t > 1 - fadeOut) masterAlpha = (1 - t) / fadeOut;
      const strength = 0.55 + (1 - masterAlpha) * 0.45;
      const vG = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.8);
      vG.addColorStop(0, 'rgba(0,0,0,0)');
      vG.addColorStop(1, `rgba(0,0,0,${strength})`);
      ctx.fillStyle = vG;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case 'scanlines': {
      ctx.save();
      ctx.globalAlpha = 0.4 * ctx.globalAlpha;
      for (let y = 0; y < height; y += 4) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, y, width, 1);
      }
      ctx.restore();
      break;
    }
    case 'grid': {
      let gridI = 0;
      if (t > 0.01 && t < 0.95) gridI = t < 0.06 ? (t - 0.01) / 0.05 : (t > 0.88 ? (0.95 - t) / 0.07 : 1);
      if (gridI <= 0) break;
      ctx.save();
      ctx.globalAlpha = gridI * 0.06;
      ctx.strokeStyle = '#E8423F';
      ctx.lineWidth = 1;
      const sp = 60, off = Math.sin(timeMs / 1000) * 10;
      for (let x = off; x < width; x += sp) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
      for (let y = 0; y < height; y += sp) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
      ctx.restore();
      break;
    }
    case 'corner-accents': {
      if (t <= 0.08 || t >= 0.94) break;
      const cA = (t < 0.14 ? (t - 0.08) / 0.06 : (t > 0.88 ? (0.94 - t) / 0.06 : 1));
      ctx.save();
      ctx.globalAlpha = cA * 0.6;
      ctx.strokeStyle = '#E8423F';
      ctx.lineWidth = 3;
      const m = 40, l = 60;
      ctx.beginPath(); ctx.moveTo(m, m + l); ctx.lineTo(m, m); ctx.lineTo(m + l, m); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(width - m - l, m); ctx.lineTo(width - m, m); ctx.lineTo(width - m, m + l); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m, height - m - l); ctx.lineTo(m, height - m); ctx.lineTo(m + l, height - m); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(width - m - l, height - m); ctx.lineTo(width - m, height - m); ctx.lineTo(width - m, height - m - l); ctx.stroke();
      ctx.restore();
      break;
    }
    case 'sweep': {
      const sweepWindows = [[0.10, 0.20, 200], [0.45, 0.55, 150], [0.70, 0.78, 150]];
      for (const [start, end, h] of sweepWindows) {
        if (t > start && t < end) {
          const progress = (t - start) / (end - start);
          const sx = -200 + (width + 400) * progress;
          const grad = ctx.createLinearGradient(sx - 200, 0, sx + 200, 0);
          grad.addColorStop(0, 'rgba(255,255,255,0)');
          grad.addColorStop(0.4, 'rgba(255,255,255,0.15)');
          grad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
          grad.addColorStop(0.6, 'rgba(255,255,255,0.15)');
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, height * 0.5 - h / 2, width, h);
        }
      }
      break;
    }
    case 'glitch': {
      let gI = 0;
      if (t > 0.06 && t < 0.12) gI = 0.8 * (1 - (t - 0.06) / 0.06);
      if (t > 0.15 && t < 0.20) gI = Math.max(gI, 0.7 * (1 - (t - 0.15) / 0.05));
      if (t > 0.25 && t < 0.85 && Math.sin(timeMs * 0.017) > 0.97) gI = 0.3;
      if (t > 0.88 && t < 0.94) gI = Math.max(gI, 0.8 * ((t - 0.88) / 0.06));
      if (gI < 0.1) break;

      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      for (let i = 0; i < 3 + Math.floor(gI * 5); i++) {
        const sliceY = rng.nextInt(0, height);
        const sliceH = rng.nextInt(2, 30 + Math.floor(gI * 40));
        const offset = rng.nextInt(-30, 30) * gI;
        const srcY = Math.max(0, Math.min(height - sliceH, sliceY));
        const slice = ctx.getImageData(0, srcY, width, Math.min(sliceH, height - srcY));
        ctx.putImageData(slice, offset, srcY);
      }

      const splitAmount = Math.floor(gI * 8);
      if (splitAmount > 0) {
        const imgData2 = ctx.getImageData(0, 0, width, height);
        const d = imgData2.data;
        for (let i = 0; i < d.length; i += 4) {
          const ri = Math.min(d.length - 4, i + splitAmount * 4);
          const bi = Math.max(0, i - splitAmount * 4);
          d[i] = data[ri] ?? d[i];
          d[i + 2] = data[bi + 2] ?? d[i + 2];
        }
        ctx.putImageData(imgData2, 0, 0);
      }
      break;
    }
    case 'spectrum': {
      const cfg = layer.config as { height?: number; bottomOffset?: number; barCount?: number };
      const specH = cfg.height ?? 900;
      const bottomOff = cfg.bottomOffset ?? 40;
      const barCount = cfg.barCount ?? 32;
      const specX = 30, specW = width - 60;
      const specY = height - specH - bottomOff;
      renderSpectrum(ctx, specX, specY, specW, specH, barCount, bpm, timeMs, audioData);
      break;
    }
    case 'waveform': {
      const cfg = layer.config as { yCenter?: number; height?: number; lineWidth?: number };
      const waveH = cfg.height ?? 1200;
      const waveY = height * (cfg.yCenter ?? 0.61) - waveH / 2;
      const waveX = 30, waveW = width - 60;
      renderWaveform(ctx, waveX, waveY, waveW, waveH, cfg.lineWidth ?? 6, bpm, timeMs, audioData);
      break;
    }
    case 'pulsing-logo': {
      const cfg = layer.config as { maxScale?: number };
      const beatDuration = 60 / bpm;
      const totalTime = timeMs / 1000;
      const beatPhase = (totalTime / beatDuration) % 1;
      const pulseScale = 1 + beatPhase * ((cfg.maxScale ?? 2) - 1);
      const pulseAlpha = Math.pow(1 - beatPhase, 1.5);
      if (pulseAlpha < 0.01) break;
      const logoImg = rc.assets.get('default-logo') as HTMLImageElement | undefined;
      if (!logoImg) break;
      const pY = evaluateProperty(layer.position.y, timeMs);
      const targetW = width * 0.82;
      const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
      const drawW = targetW;
      const drawH = drawW / aspect;
      ctx.save();
      ctx.translate(width / 2, height * pY);
      ctx.scale(pulseScale, pulseScale);
      ctx.globalAlpha = ctx.globalAlpha * pulseAlpha;
      ctx.drawImage(logoImg, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
      break;
    }
    default: break;
  }
}

function renderBackgroundLogoLayer(rc: RenderContext, layer: BackgroundLogoLayer) {
  const { ctx, width, height, timeMs, duration, assets } = rc;
  const img = layer.assetId ? assets.get(layer.assetId) as HTMLImageElement | undefined : assets.get('default-logo') as HTMLImageElement | undefined;
  if (!img) return;

  const t = timeMs / duration;
  let bgFade = 1;
  if (t < 0.05) bgFade = t / 0.05;
  else if (t > 0.93) bgFade = Math.max(0, (1 - t) / 0.07);
  if (bgFade <= 0) return;

  const CLOCK_DIRS: Record<number, { dx: number; dy: number }> = {
    12: { dx: 0, dy: -1 }, 1: { dx: 0.5, dy: -0.866 }, 2: { dx: 0.866, dy: -0.5 },
    3: { dx: 1, dy: 0 }, 4: { dx: 0.866, dy: 0.5 }, 5: { dx: 0.5, dy: 0.866 },
    6: { dx: 0, dy: 1 }, 7: { dx: -0.5, dy: 0.866 }, 8: { dx: -0.866, dy: 0.5 },
    9: { dx: -1, dy: 0 }, 10: { dx: -0.866, dy: -0.5 }, 11: { dx: -0.5, dy: -0.866 },
  };

  const bgAspect = img.naturalWidth / img.naturalHeight;
  const lW = width * layer.logoScale;
  const lH = lW / bgAspect;
  const scrollLenX = lW + width;
  const scrollLenY = lH + height;
  const dir = CLOCK_DIRS[layer.clockDir] ?? CLOCK_DIRS[9];
  const cd = layer.clockDir;
  const isVertical = cd === 12 || cd === 6;
  const isHorizontal = cd === 3 || cd === 9;
  const yPos = evaluateProperty(layer.position.y, timeMs);

  ctx.save();
  ctx.globalAlpha = ctx.globalAlpha * bgFade;

  if (isHorizontal) {
    const px = dir.dx > 0
      ? -lW + ((timeMs * layer.speed) % scrollLenX)
      : width - ((timeMs * layer.speed) % scrollLenX);
    const py = yPos * height - lH / 2;
    ctx.drawImage(img, px, py, lW, lH);
    ctx.drawImage(img, px - dir.dx * scrollLenX, py, lW, lH);
  } else if (isVertical) {
    const px = yPos * width - lW / 2;
    const py = dir.dy > 0
      ? -lH + ((timeMs * layer.speed) % scrollLenY)
      : height - ((timeMs * layer.speed) % scrollLenY);
    ctx.drawImage(img, px, py, lW, lH);
    ctx.drawImage(img, px, py - dir.dy * scrollLenY, lW, lH);
  } else {
    const speedX = layer.speed * Math.abs(dir.dx);
    const speedY = layer.speed * Math.abs(dir.dy);
    const rawPx = dir.dx > 0 ? -lW + ((timeMs * speedX) % scrollLenX) : width - ((timeMs * speedX) % scrollLenX);
    const rawPy = dir.dy > 0 ? -lH + ((timeMs * speedY) % scrollLenY) : height - ((timeMs * speedY) % scrollLenY);
    const offX = dir.dx > 0 ? -scrollLenX : scrollLenX;
    const offY = dir.dy > 0 ? -scrollLenY : scrollLenY;
    ctx.drawImage(img, rawPx, rawPy, lW, lH);
    ctx.drawImage(img, rawPx + offX, rawPy, lW, lH);
    ctx.drawImage(img, rawPx, rawPy + offY, lW, lH);
    ctx.drawImage(img, rawPx + offX, rawPy + offY, lW, lH);
  }

  ctx.restore();
}

// --- Simulated audio ---

function getSimulatedSpectrum(bpm: number, timeMs: number, bands: number): Float32Array {
  const spectrum = new Float32Array(bands);
  const t = timeMs / 1000;
  const beatPhase = ((t * bpm) / 60) % 1;
  const kick = Math.pow(Math.max(0, 1 - beatPhase * 4), 2);
  const snare = beatPhase > 0.45 && beatPhase < 0.55 ? Math.pow(1 - Math.abs(beatPhase - 0.5) * 20, 2) : 0;
  const hihat = beatPhase % 0.25 < 0.05 ? 0.5 : 0;

  for (let i = 0; i < bands; i++) {
    const freq = i / bands;
    let val = 0;
    if (freq < 0.15) val = kick * 0.9;
    else if (freq < 0.3) val = kick * 0.4 + snare * 0.3;
    else if (freq < 0.5) val = snare * 0.5 + Math.sin(t * 3 + i) * 0.15;
    else if (freq < 0.7) val = Math.sin(t * 5 + i * 0.5) * 0.2 + hihat * 0.3;
    else val = hihat * 0.4 + Math.sin(t * 7 + i) * 0.1;
    spectrum[i] = Math.max(0, Math.min(1, val + Math.sin(t * 2 + i * 0.3) * 0.05));
  }
  return spectrum;
}

function renderSpectrum(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, barCount: number, bpm: number, timeMs: number, audioData: AudioRenderData | null) {
  const spectrum = audioData?.spectrum ?? getSimulatedSpectrum(bpm, timeMs, barCount);
  const barW = w / barCount;
  const gap = 2;
  const segH = 4;

  for (let i = 0; i < barCount; i++) {
    const val = i < spectrum.length ? spectrum[i] : 0;
    const barH = val * h;
    const segs = Math.ceil(barH / (segH + gap));
    const bx = x + i * barW + gap / 2;

    for (let s = 0; s < segs; s++) {
      const sy = y + h - (s + 1) * (segH + gap);
      const ratio = s / (h / (segH + gap));
      if (ratio > 0.9375) ctx.fillStyle = '#E8423F';
      else if (ratio > 0.75) ctx.fillStyle = '#FFA500';
      else ctx.fillStyle = '#00CC00';
      ctx.fillRect(bx, sy, barW - gap, segH);
    }
  }
}

function renderWaveform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lineWidth: number, bpm: number, timeMs: number, audioData: AudioRenderData | null) {
  const samples = 128;
  const spectrum = audioData?.spectrum ?? getSimulatedSpectrum(bpm, timeMs, 32);
  ctx.save();
  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = lineWidth;
  ctx.shadowColor = '#00FFFF';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let i = 0; i < samples; i++) {
    const sx = x + (i / samples) * w;
    const freqIdx = Math.floor((i / samples) * spectrum.length);
    const amp = (spectrum[freqIdx] ?? 0) * h * 0.4;
    const wave = Math.sin(i * 0.15 + timeMs * 0.003) * amp;
    const sy = y + h / 2 + wave;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();
  ctx.restore();
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
