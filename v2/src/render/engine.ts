import type { Project, Layer, ImageLayer, TextLayer, VideoLayer, ShapeLayer, EffectLayer, BackgroundLogoLayer } from '../core/schema.ts';
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
  masterAlpha: number;
  instrAlpha: number;
}

export interface AudioRenderData {
  spectrum: Float32Array;
  waveform: Float32Array;
  vuLeft: number;
  vuRight: number;
}

const smoothedState = {
  spectrum: new Float32Array(32),
  peakSpectrum: new Float32Array(32),
  peakDecay: new Float32Array(32),
  initialized: false,
};

function updateSmoothed(raw: Float32Array) {
  const attack = 0.4, release = 0.08;
  if (!smoothedState.initialized) {
    smoothedState.spectrum.set(raw);
    smoothedState.peakSpectrum.set(raw);
    smoothedState.initialized = true;
    return;
  }
  for (let i = 0; i < raw.length && i < smoothedState.spectrum.length; i++) {
    const target = raw[i];
    const rate = target > smoothedState.spectrum[i] ? attack : release;
    smoothedState.spectrum[i] += rate * (target - smoothedState.spectrum[i]);
    if (smoothedState.spectrum[i] > smoothedState.peakSpectrum[i]) {
      smoothedState.peakSpectrum[i] = smoothedState.spectrum[i];
      smoothedState.peakDecay[i] = 0;
    } else {
      smoothedState.peakDecay[i]++;
      if (smoothedState.peakDecay[i] > 30) smoothedState.peakSpectrum[i] -= 0.008;
    }
  }
}

export function renderFrame(project: Project, ctx: CanvasRenderingContext2D, timeMs: number, frameNumber: number, assets: Map<string, HTMLImageElement | HTMLVideoElement>, audioData: AudioRenderData | null) {
  const { width, height, duration, bpm, seed, backgroundColor, backgroundImageAssetId } = project.settings;
  const t = timeMs / duration;

  let masterAlpha = 1;
  if (t < 0.05) masterAlpha = t / 0.05;
  else if (t > 0.95) masterAlpha = (1 - t) / 0.05;
  masterAlpha = Math.max(0, Math.min(1, masterAlpha));

  let instrAlpha = 1;
  if (t < 0.04) instrAlpha = 0;
  else if (t < 0.10) instrAlpha = (t - 0.04) / 0.06;
  else if (t > 0.96) instrAlpha = 0;
  else if (t > 0.90) instrAlpha = (0.96 - t) / 0.06;
  instrAlpha = Math.max(0, Math.min(1, instrAlpha));

  const rawSpectrum = audioData?.spectrum ?? getSimulatedSpectrum(bpm, timeMs, 32);
  updateSmoothed(rawSpectrum);

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
    masterAlpha, instrAlpha,
  };

  for (const layer of project.layers) {
    if (!layer.visible) continue;
    if (timeMs < layer.inTime || timeMs > layer.outTime) continue;

    const opacity = evaluateProperty(layer.opacity, timeMs);
    if (opacity <= 0) continue;

    ctx.save();
    ctx.globalAlpha = opacity * masterAlpha;
    ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;

    const px = evaluateProperty(layer.position.x, timeMs);
    const py = evaluateProperty(layer.position.y, timeMs);
    const sx = evaluateProperty(layer.scale.x, timeMs);
    renderLayer(rc, layer, px, py, sx);

    ctx.restore();
  }
}

function renderLayer(rc: RenderContext, layer: Layer, px: number, py: number, sx: number) {
  switch (layer.type) {
    case 'image': renderImageLayer(rc, layer, px, py, sx); break;
    case 'text': renderTextLayer(rc, layer, px, py); break;
    case 'video': renderVideoLayer(rc, layer); break;
    case 'shape': renderShapeLayer(rc, layer, px, py, sx); break;
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

  if (layer.letterSpacing > 0) {
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${layer.letterSpacing}px`;
  }

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

  if (layer.letterSpacing > 0) {
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';
  }
}

function renderVideoLayer(rc: RenderContext, layer: VideoLayer) {
  const { ctx, width, height, timeMs, assets } = rc;
  const video = layer.assetId ? assets.get(layer.assetId) as HTMLVideoElement | undefined : null;
  if (!video) return;

  let fadeAlpha = 1;
  if (layer.fadeDuration > 0) {
    if (timeMs >= layer.fadeInTime && timeMs < layer.fadeInTime + layer.fadeDuration) {
      fadeAlpha = (timeMs - layer.fadeInTime) / layer.fadeDuration;
    } else if (timeMs < layer.fadeInTime) {
      fadeAlpha = 0;
    }
    if (timeMs >= layer.fadeOutTime && timeMs < layer.fadeOutTime + layer.fadeDuration) {
      fadeAlpha *= 1 - (timeMs - layer.fadeOutTime) / layer.fadeDuration;
    } else if (timeMs >= layer.fadeOutTime + layer.fadeDuration) {
      fadeAlpha = 0;
    }
  }
  if (fadeAlpha <= 0) return;

  const isHorizontal = layer.orientation === 'horizontal';
  const sliceThick = isHorizontal
    ? height * layer.thickness
    : width * layer.thickness;

  let sliceX = isHorizontal ? 0 : width * evaluateProperty(layer.position.x, timeMs) - sliceThick / 2;
  let sliceY = isHorizontal ? height * evaluateProperty(layer.position.y, timeMs) - sliceThick / 2 : 0;
  let sliceW = isHorizontal ? width : sliceThick;
  let sliceH = isHorizontal ? sliceThick : height;

  if (layer.slideIn !== 'none' && timeMs >= layer.slideInTime && timeMs < layer.slideInTime + layer.slideInDuration) {
    const p = easeOutCubic((timeMs - layer.slideInTime) / layer.slideInDuration);
    const offsets = getSlideOffset(layer.slideIn, width, height);
    sliceX += offsets.x * (1 - p);
    sliceY += offsets.y * (1 - p);
  }
  if (layer.slideOut !== 'none' && timeMs >= layer.slideOutTime && timeMs < layer.slideOutTime + layer.slideOutDuration) {
    const p = easeOutCubic((timeMs - layer.slideOutTime) / layer.slideOutDuration);
    const offsets = getSlideOffset(layer.slideOut, width, height);
    sliceX += offsets.x * p;
    sliceY += offsets.y * p;
  }

  ctx.save();
  ctx.globalAlpha = ctx.globalAlpha * fadeAlpha;
  ctx.beginPath();
  ctx.rect(sliceX, sliceY, sliceW, sliceH);
  ctx.clip();

  const vw = video.videoWidth || width;
  const vh = video.videoHeight || height;
  const aspect = vw / vh;
  let dw: number, dh: number, dx: number, dy: number;
  if (isHorizontal) {
    dh = sliceH; dw = dh * aspect;
    if (dw < sliceW) { dw = sliceW; dh = dw / aspect; }
    dx = sliceX + (sliceW - dw) * 0.5 + (sliceW - dw) * layer.videoPan * 0.5;
    dy = sliceY + (sliceH - dh) * 0.5;
  } else {
    dw = sliceW; dh = dw / aspect;
    if (dh < sliceH) { dh = sliceH; dw = dh * aspect; }
    dx = sliceX + (sliceW - dw) * 0.5;
    dy = sliceY + (sliceH - dh) * 0.5 + (sliceH - dh) * layer.videoPan * 0.5;
  }
  ctx.drawImage(video, dx, dy, dw, dh);
  ctx.restore();
}

function getSlideOffset(dir: string, w: number, h: number): { x: number; y: number } {
  switch (dir) {
    case 'top': return { x: 0, y: -h };
    case 'bottom': return { x: 0, y: h };
    case 'left': return { x: -w, y: 0 };
    case 'right': return { x: w, y: 0 };
    default: return { x: 0, y: 0 };
  }
}

function renderShapeLayer(rc: RenderContext, layer: ShapeLayer, px: number, py: number, sx: number) {
  const { ctx, width, height } = rc;
  const cx = px * width;
  const cy = py * height;
  const w = layer.size.width * sx;
  const h = layer.size.height * sx;
  const x = cx - w / 2;
  const y = cy - h / 2;

  if (layer.shapeType === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    if (layer.fill.enabled) {
      ctx.fillStyle = layer.fill.color;
      ctx.fill();
    }
    if (layer.stroke.enabled) {
      ctx.strokeStyle = layer.stroke.color;
      ctx.lineWidth = layer.stroke.width;
      ctx.stroke();
    }
  } else {
    const r = layer.shapeType === 'rounded-rect' ? layer.cornerRadius : 0;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (layer.fill.enabled) {
      ctx.fillStyle = layer.fill.color;
      ctx.fill();
    }
    if (layer.stroke.enabled) {
      ctx.strokeStyle = layer.stroke.color;
      ctx.lineWidth = layer.stroke.width;
      ctx.stroke();
    }
  }
}

function renderEffectLayer(rc: RenderContext, layer: EffectLayer) {
  const { ctx, width, height, timeMs, duration, bpm, seed, frameNumber, audioData, masterAlpha, instrAlpha } = rc;
  const t = timeMs / duration;
  const rng = frameRNG(seed, frameNumber);

  switch (layer.effectType) {
    case 'vignette': {
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
      ctx.globalAlpha = 0.4 * masterAlpha * 0.12;
      for (let y = 0; y < height; y += 4) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, y, width, 2);
      }
      ctx.restore();
      break;
    }
    case 'grid': {
      let gridI = 0;
      if (t > 0.01 && t < 0.95) gridI = t < 0.06 ? (t - 0.01) / 0.05 : (t > 0.88 ? (0.95 - t) / 0.07 : 1);
      if (gridI <= 0) break;
      ctx.save();
      ctx.globalAlpha = gridI * 0.6 * masterAlpha * 0.06;
      ctx.strokeStyle = '#E8423F';
      ctx.lineWidth = 1;
      const sp = 60, off = Math.sin(timeMs / 1000) * 10;
      for (let x = off; x < width; x += sp) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
      for (let y = off; y < height; y += sp) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
      ctx.restore();
      break;
    }
    case 'corner-accents': {
      if (t <= 0.08 || t >= 0.94) break;
      const cA = (t < 0.14 ? (t - 0.08) / 0.06 : (t > 0.88 ? (0.94 - t) / 0.06 : 1));
      ctx.save();
      ctx.globalAlpha = cA * 0.6 * masterAlpha;
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
      const sweepWindows: [number, number, number][] = [[0.10, 0.20, 200], [0.45, 0.55, 150], [0.70, 0.78, 150]];
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
      gI *= masterAlpha;
      if (gI < 0.1) break;

      const origData = ctx.getImageData(0, 0, width, height);
      const origPixels = new Uint8ClampedArray(origData.data);

      const sliceCount = Math.floor(3 + rng.next() * 8 * gI);
      for (let i = 0; i < sliceCount; i++) {
        const sliceY = rng.nextInt(0, height);
        const sliceH = Math.floor(5 + rng.next() * 40 * gI);
        const offset = Math.floor((rng.next() - 0.5) * 60 * gI);
        const srcY = Math.max(0, Math.min(height - sliceH, sliceY));
        const grabH = Math.min(sliceH, height - srcY);
        if (grabH <= 0) continue;
        const slice = ctx.getImageData(0, srcY, width, grabH);
        ctx.putImageData(slice, offset, srcY);
      }

      const splitAmount = Math.floor(gI * 8);
      if (splitAmount > 0) {
        const afterSlice = ctx.getImageData(0, 0, width, height);
        const d = afterSlice.data;
        for (let i = 0; i < d.length; i += 4) {
          const ri = Math.min(d.length - 4, i + splitAmount * 4);
          const bi = Math.max(0, i - splitAmount * 4);
          d[i] = origPixels[ri] ?? d[i];
          d[i + 2] = origPixels[bi + 2] ?? d[i + 2];
        }
        ctx.putImageData(afterSlice, 0, 0);
      }

      if (gI > 0.3) {
        const count = Math.floor(gI * 12);
        for (let i = 0; i < count; i++) {
          ctx.globalAlpha = 0.3 + rng.next() * 0.5;
          ctx.fillStyle = rng.next() > 0.5 ? '#E8423F' : '#FFFFFF';
          ctx.fillRect(
            rng.next() * width,
            rng.next() * height,
            20 + rng.next() * 100 * gI,
            2 + rng.next() * 8,
          );
        }
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'particles': {
      renderParticles(rc, layer);
      break;
    }
    case 'spectrum': {
      const cfg = layer.config as { height?: number; bottomOffset?: number; barCount?: number };
      const specH = cfg.height ?? 900;
      const bottomOff = cfg.bottomOffset ?? 40;
      const barCount = cfg.barCount ?? 32;
      const specX = 30, specW = width - 60;
      const specY = height - specH - bottomOff;
      const alpha = instrAlpha * 0.9;
      renderSpectrum(ctx, specX, specY, specW, specH, barCount, alpha, bpm, timeMs, audioData);
      break;
    }
    case 'waveform': {
      const cfg = layer.config as { yCenter?: number; height?: number; lineWidth?: number };
      const waveH = cfg.height ?? 1200;
      const waveY = height * (cfg.yCenter ?? 0.61) - waveH / 2;
      const waveX = 30, waveW = width - 60;
      const alpha = instrAlpha * 0.85;
      renderWaveform(ctx, waveX, waveY, waveW, waveH, cfg.lineWidth ?? 6, alpha, bpm, timeMs, audioData);
      break;
    }
    case 'pulsing-logo': {
      const cfg = layer.config as { maxScale?: number; opacity?: number; startTime?: number };
      const startTime = cfg.startTime ?? 0;
      if (timeMs < startTime) break;
      const beatDuration = 60 / bpm;
      const totalTime = timeMs / 1000;
      const beatPhase = (totalTime / beatDuration) % 1;
      const pulseScale = 1 + beatPhase * ((cfg.maxScale ?? 2) - 1);
      const pulseAlpha = Math.pow(1 - beatPhase, 1.5);
      const cfgOpacity = cfg.opacity ?? 1;

      let fadeOut = 1;
      const parallaxOutStart = duration - 3000;
      if (timeMs > parallaxOutStart - 2000 && timeMs < parallaxOutStart) {
        fadeOut = (parallaxOutStart - timeMs) / 2000;
      } else if (timeMs >= parallaxOutStart) {
        fadeOut = 0;
      }

      const finalAlpha = pulseAlpha * cfgOpacity * fadeOut * masterAlpha;
      if (finalAlpha < 0.01) break;

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
      ctx.globalAlpha = finalAlpha;
      ctx.drawImage(logoImg, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
      break;
    }
    default: break;
  }
}

interface ParticleState {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

const particlePool: ParticleState[] = [];

function renderParticles(rc: RenderContext, _layer: EffectLayer) {
  const { ctx, width, height, normalizedTime: t } = rc;
  const rng = frameRNG(rc.seed, rc.frameNumber);

  if (t < 0.02) {
    particlePool.length = 0;
  }

  if (particlePool.length < 80 && t > 0.05 && t < 0.90 && rng.next() > 0.7) {
    const count = rng.nextInt(3, 8);
    const spawnX = width * 0.5;
    const spawnY = height * 0.5;
    for (let i = 0; i < count; i++) {
      particlePool.push({
        x: spawnX, y: spawnY,
        vx: (rng.next() - 0.5) * 4,
        vy: (rng.next() - 0.5) * 4,
        color: rng.next() > 0.5 ? '#E8423F' : '#FFFFFF',
        size: 3,
        life: 60,
        maxLife: 60,
      });
    }
  }

  for (let i = particlePool.length - 1; i >= 0; i--) {
    const p = particlePool[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.life--;
    if (p.life <= 0) {
      particlePool.splice(i, 1);
      continue;
    }
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.size * 3;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.restore();
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

// --- Simulated audio (V1-matching) ---

function getSimulatedSpectrum(bpm: number, timeMs: number, bands: number): Float32Array {
  const spectrum = new Float32Array(bands);
  const t = timeMs / 1000;
  const beatPhase = ((t * bpm) / 60) % 1;
  const kick = Math.pow(Math.max(0, 1 - beatPhase * 4), 3);
  const snare = Math.pow(Math.max(0, 1 - (((beatPhase + 0.5) % 1) * 6)), 2) * 0.7;

  for (let i = 0; i < bands; i++) {
    const freq = i / bands;
    let val = 0;
    if (i < 6) val += kick * (1 - freq * 3) * 0.9;
    if (i >= 4 && i < 12) val += (0.3 + 0.3 * Math.sin(t * 2.1 + i * 0.5)) * (snare * 0.5 + 0.4);
    if (i >= 8 && i < 20) val += (0.2 + 0.25 * Math.sin(t * 3.7 + i * 0.8)) * (0.5 + 0.3 * Math.sin(t * 1.3));
    if (i >= 16) val += (0.15 + 0.2 * Math.sin(t * 5.3 + i * 1.2)) * (0.3 + snare * 0.4);
    if (i >= 20) {
      const hhPhase = (t * bpm / 60 * 2) % 1;
      val += Math.pow(Math.max(0, 1 - hhPhase * 8), 2) * 0.35;
    }
    spectrum[i] = Math.min(1, Math.max(0, val));
  }
  return spectrum;
}

function getSimulatedWaveform(timeMs: number, bpm: number): Float32Array {
  const waveform = new Float32Array(128);
  const t = timeMs / 1000;
  const beatPhase = ((t * bpm) / 60) % 1;
  const kick = Math.pow(Math.max(0, 1 - beatPhase * 4), 3);

  for (let i = 0; i < 128; i++) {
    const phase = (i / 128) * Math.PI * 2;
    let val = 0;
    val += Math.sin(phase * 2 + t * 8) * 0.3 * (0.5 + kick * 0.5);
    val += Math.sin(phase * 5 + t * 13) * 0.15;
    val += Math.sin(phase * 11 + t * 21) * 0.08;
    val += Math.sin(phase * 23 + t * 34) * 0.05;
    waveform[i] = val;
  }
  return waveform;
}

function renderSpectrum(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, barCount: number, alpha: number, _bpm: number, _timeMs: number, _audioData: AudioRenderData | null) {
  if (alpha <= 0) return;
  ctx.save();

  const barGap = 4;
  const barW = (w - (barCount - 1) * barGap) / barCount;
  const segH = 8, segGap = 3;
  const totalSegs = Math.floor(h / (segH + segGap));
  const greenSegs = Math.round(totalSegs * 0.75);
  const amberSegs = Math.round(totalSegs * 0.1875);

  for (let i = 0; i < barCount; i++) {
    const specIdx = Math.floor((i / barCount) * 32);
    const val = smoothedState.spectrum[Math.min(31, specIdx)];
    const litSegs = Math.floor(val * totalSegs);
    const bx = x + i * (barW + barGap);

    for (let s = 0; s < litSegs; s++) {
      const sy = y + h - (s + 1) * (segH + segGap);
      if (s >= greenSegs + amberSegs) ctx.fillStyle = '#E8423F';
      else if (s >= greenSegs) ctx.fillStyle = '#FFA500';
      else ctx.fillStyle = '#00FF88';
      ctx.globalAlpha = alpha * (0.75 + 0.25 * val);
      ctx.fillRect(bx, sy, barW, segH);
    }

    if (val > 0.1) {
      const peakSy = y + h - litSegs * (segH + segGap) - segH;
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillRect(bx, peakSy, barW, 3);
    }
  }

  ctx.restore();
}

function renderWaveform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lineWidth: number, alpha: number, bpm: number, timeMs: number, audioData: AudioRenderData | null) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  const centerY = y + h / 2;
  const points = 256;
  const waveformData = audioData?.waveform ?? getSimulatedWaveform(timeMs, bpm);

  ctx.strokeStyle = '#00DDFF';
  ctx.lineWidth = lineWidth;
  ctx.shadowColor = '#00DDFF';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const px = x + (i / points) * w;
    const specIdx = Math.floor((i / points) * 32);
    const specVal = smoothedState.spectrum[Math.min(31, specIdx)];
    const nextVal = smoothedState.spectrum[Math.min(31, specIdx + 1)];
    const frac = ((i / points) * 32) - specIdx;
    const blended = specVal + (nextVal - specVal) * frac;
    const wave = Math.sin(i * Math.PI * 2 / (points / 8) + waveformData[i % 128] * 4);
    const py = centerY + wave * blended * h * 0.48;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = alpha * 0.1;
  ctx.fillStyle = '#00DDFF';
  ctx.lineTo(x + w, centerY);
  ctx.lineTo(x, centerY);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
