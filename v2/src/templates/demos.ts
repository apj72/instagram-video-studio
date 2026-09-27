import type { Project, ImageLayer, TextLayer, EffectLayer, ShapeLayer } from '../core/schema.ts';
import { INSTAGRAM_SAFE_AREAS, EXPORT_PRESETS, SCHEMA_VERSION, generateId } from '../core/schema.ts';
import type { AnimatedProperty, EasingType } from '../core/schema.ts';

export interface DemoConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  factory: () => Project;
}

// ─── Helpers ───────────────────────────────────────────────

function kf(value: number): AnimatedProperty {
  return { keyframes: [{ time: 0, value, easing: 'linear' }] };
}

function kf2(t1: number, v1: number, t2: number, v2: number, easing: EasingType = 'ease-out-cubic'): AnimatedProperty {
  return { keyframes: [{ time: t1, value: v1, easing: 'linear' }, { time: t2, value: v2, easing }] };
}

function meta(name: string) {
  return { name, createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString(), schemaVersion: SCHEMA_VERSION };
}

function stg(duration = 16000, bpm = 124, bg = '#000000', border?: Partial<Project['settings']['border']>) {
  return {
    width: 1080, height: 1920, duration, fps: 30, bpm, beatOffset: 0,
    backgroundColor: bg, backgroundImageAssetId: null,
    seed: Math.floor(Math.random() * 999999),
    border: { enabled: false, thickness: 4, color: '#E8423F', cornerRadius: 0, inset: 40, outerBlur: 0, ...border },
  };
}

function aud() {
  return { assetId: null, volume: 1, muted: false, fadeInDuration: 0, fadeOutDuration: 0, offset: 0, trim: { start: 0, end: 0 } };
}

function base(name: string, inT: number, outT: number) {
  return {
    id: generateId(), name, visible: true, locked: false,
    opacity: kf(1), position: { x: kf(0.5), y: kf(0.5) },
    scale: { x: kf(1), y: kf(1) }, rotation: kf(0),
    inTime: inT, outTime: outT, blendMode: 'source-over',
  };
}

function txt(opts: {
  name: string; text: string; y: number; size: number; inT: number; outT: number;
  color?: string; font?: string; align?: TextLayer['textAlign']; spacing?: number; lh?: number; weight?: string;
  stroke?: TextLayer['stroke']; shadow?: TextLayer['shadow'];
  bg?: TextLayer['background']; border?: TextLayer['border'];
  tw?: TextLayer['typewriter'];
  opacity?: AnimatedProperty; scaleX?: AnimatedProperty; scaleY?: AnimatedProperty;
  x?: number;
}): TextLayer {
  return {
    ...base(opts.name, opts.inT, opts.outT), type: 'text',
    text: opts.text, fontFamily: opts.font ?? 'Bungee',
    fontSize: kf(opts.size), fontWeight: opts.weight ?? 'bold',
    textColor: opts.color ?? '#FFFFFF', textAlign: opts.align ?? 'center',
    lineHeight: opts.lh ?? 1.3, letterSpacing: opts.spacing ?? 0,
    position: { x: kf(opts.x ?? 0.5), y: kf(opts.y) },
    ...(opts.opacity ? { opacity: opts.opacity } : {}),
    ...(opts.scaleX ? { scale: { x: opts.scaleX, y: opts.scaleY ?? opts.scaleX } } : {}),
    stroke: opts.stroke ?? { enabled: false, color: '#000000', width: 2 },
    shadow: opts.shadow ?? { enabled: false, color: '#000000', blur: 10, offsetX: 0, offsetY: 2 },
    background: opts.bg ?? { enabled: false, color: '#000000', opacity: 0.7, paddingX: 20, paddingY: 10, cornerRadius: 4 },
    border: opts.border ?? { enabled: false, color: '#E8423F', width: 2, cornerRadius: 4, paddingX: 20, paddingY: 10 },
    ...(opts.tw ? { typewriter: opts.tw } : {}),
  };
}

function fx(name: string, effectType: EffectLayer['effectType'], inT: number, outT: number, config: Record<string, unknown> = {}): EffectLayer {
  return { ...base(name, inT, outT), type: 'effect', effectType, config };
}

function img(opts: {
  name: string; inT: number; outT: number; y: number; scale: number; w?: number; h?: number;
  parallax?: boolean; pStartY?: number; pDur?: number;
  opacity?: AnimatedProperty; scaleAnim?: AnimatedProperty;
}): ImageLayer {
  return {
    ...base(opts.name, opts.inT, opts.outT), type: 'image', assetId: null,
    size: { width: opts.w ?? 400, height: opts.h ?? 400 },
    position: { x: kf(0.5), y: kf(opts.y) },
    scale: { x: opts.scaleAnim ?? kf(opts.scale), y: opts.scaleAnim ?? kf(opts.scale) },
    ...(opts.opacity ? { opacity: opts.opacity } : {}),
    parallax: opts.parallax ?? false,
    parallaxStartY: opts.pStartY ?? 0,
    parallaxDuration: opts.pDur ?? 0,
  };
}

function rect(opts: {
  name: string; inT: number; outT: number; x: number; y: number; w: number; h: number;
  fill: string; corner?: number;
  opacity?: AnimatedProperty; scaleX?: AnimatedProperty; scaleY?: AnimatedProperty;
  rotation?: AnimatedProperty;
}): ShapeLayer {
  return {
    ...base(opts.name, opts.inT, opts.outT), type: 'shape', shapeType: 'rect',
    size: { width: opts.w, height: opts.h },
    position: { x: kf(opts.x), y: kf(opts.y) },
    fill: { enabled: true, color: opts.fill },
    stroke: { enabled: false, color: '#000', width: 0 },
    cornerRadius: opts.corner ?? 0,
    ...(opts.opacity ? { opacity: opts.opacity } : {}),
    ...(opts.scaleX ? { scale: { x: opts.scaleX, y: opts.scaleY ?? opts.scaleX } } : {}),
    ...(opts.rotation ? { rotation: opts.rotation } : {}),
  };
}

function proj(name: string, s: ReturnType<typeof stg>, layers: (TextLayer | ImageLayer | EffectLayer | ShapeLayer)[]): Project {
  return { metadata: meta(name), settings: s, layers, audio: aud(), exportPreset: EXPORT_PRESETS[0], safeAreas: INSTAGRAM_SAFE_AREAS };
}

// Staggered fade+scale entrance
function enterFade(start: number, dur = 400, ease: EasingType = 'ease-out-cubic'): AnimatedProperty {
  return kf2(start, 0, start + dur, 1, ease);
}
function enterScale(start: number, from = 0.7, dur = 500, ease: EasingType = 'ease-out-back'): AnimatedProperty {
  return kf2(start, from, start + dur, 1, ease);
}
function enterSpring(start: number, from = 0, dur = 600): AnimatedProperty {
  return kf2(start, from, start + dur, 1, 'spring');
}

// ============================================================
// 1. DJ LINE-UP — NEON NIGHTS
// Showcases: strobe, chromatic aberration, corner accents,
//   staggered text entrances, text shadows, typewriter venue
// ============================================================

function djNeonNights(): Project {
  const dur = 16000;
  const s = stg(dur, 126, '#050510', { enabled: true, thickness: 2, color: '#00FFFF', cornerRadius: 0, inset: 30, outerBlur: 8 });
  return proj('Neon Nights', s, [
    fx('Vignette', 'vignette', 0, dur, { strength: 0.7, color: '0,10,40' }),
    fx('Film Grain', 'film-grain', 0, dur, { intensity: 0.12, grainSize: 1.5, mono: true }),

    rect({ name: 'Top Bar', inT: 400, outT: dur, x: 0.5, y: 0.08, w: 800, h: 3, fill: '#00FFFF', opacity: enterFade(400, 300), scaleX: kf2(400, 0, 800, 1, 'ease-out-expo') }),

    img({ name: 'Logo', inT: 200, outT: dur, y: 0.18, scale: 0.45, w: 500, h: 500, opacity: enterFade(200, 600), scaleAnim: kf2(200, 0.3, 800, 0.45, 'ease-out-back') }),

    txt({ name: 'Presents', text: 'PRESENTS', y: 0.28, size: 18, inT: 600, outT: dur, color: '#00FFFF', font: 'Montserrat', spacing: 8, opacity: enterFade(600, 400) }),

    txt({ name: 'Title', text: 'LINE-UP', y: 0.34, size: 72, inT: 800, outT: dur, color: '#FFFFFF', opacity: enterFade(800, 500), scaleX: enterSpring(800, 0.5, 700),
      shadow: { enabled: true, color: '#00FFFF', blur: 30, offsetX: 0, offsetY: 0 },
      stroke: { enabled: true, color: '#00FFFF', width: 2 },
    }),

    rect({ name: 'Divider', inT: 1200, outT: dur, x: 0.5, y: 0.395, w: 300, h: 2, fill: '#FF00FF', opacity: enterFade(1200, 300), scaleX: kf2(1200, 0, 1500, 1, 'ease-out-expo') }),

    txt({ name: 'DJ 1', text: 'SYNTHWAVE', y: 0.44, size: 34, inT: 1400, outT: dur, color: '#FF00FF', opacity: enterFade(1400), scaleX: enterScale(1400, 0.8),
      shadow: { enabled: true, color: '#FF00FF', blur: 20, offsetX: 0, offsetY: 0 },
    }),
    txt({ name: 'Time 1', text: '22:00', y: 0.475, size: 16, inT: 1500, outT: dur, color: '#888899', font: 'Montserrat', spacing: 4, opacity: enterFade(1500) }),

    txt({ name: 'DJ 2', text: 'NEONLUX', y: 0.52, size: 34, inT: 1800, outT: dur, color: '#FF00FF', opacity: enterFade(1800), scaleX: enterScale(1800, 0.8),
      shadow: { enabled: true, color: '#FF00FF', blur: 20, offsetX: 0, offsetY: 0 },
    }),
    txt({ name: 'Time 2', text: '23:30', y: 0.555, size: 16, inT: 1900, outT: dur, color: '#888899', font: 'Montserrat', spacing: 4, opacity: enterFade(1900) }),

    txt({ name: 'DJ 3', text: 'CYBERLIGHT', y: 0.60, size: 34, inT: 2200, outT: dur, color: '#FF00FF', opacity: enterFade(2200), scaleX: enterScale(2200, 0.8),
      shadow: { enabled: true, color: '#FF00FF', blur: 20, offsetX: 0, offsetY: 0 },
    }),
    txt({ name: 'Time 3', text: '01:00', y: 0.635, size: 16, inT: 2300, outT: dur, color: '#888899', font: 'Montserrat', spacing: 4, opacity: enterFade(2300) }),

    txt({ name: 'DJ 4', text: 'GRIDRUNNER', y: 0.68, size: 34, inT: 2600, outT: dur, color: '#FF00FF', opacity: enterFade(2600), scaleX: enterScale(2600, 0.8),
      shadow: { enabled: true, color: '#FF00FF', blur: 20, offsetX: 0, offsetY: 0 },
    }),
    txt({ name: 'Time 4', text: '02:30', y: 0.715, size: 16, inT: 2700, outT: dur, color: '#888899', font: 'Montserrat', spacing: 4, opacity: enterFade(2700) }),

    rect({ name: 'Bottom Bar', inT: 3000, outT: dur, x: 0.5, y: 0.78, w: 800, h: 3, fill: '#00FFFF', opacity: enterFade(3000, 300), scaleX: kf2(3000, 0, 3400, 1, 'ease-out-expo') }),

    txt({ name: 'Venue', text: 'CLUB NEON — TOKYO', y: 0.84, size: 20, inT: 3200, outT: dur, color: '#00FFFF', font: 'Montserrat', spacing: 3,
      opacity: enterFade(3200, 500),
      bg: { enabled: true, color: '#000033', opacity: 0.8, paddingX: 28, paddingY: 10, cornerRadius: 4 },
      tw: { enabled: true, speed: 25, cursor: true, cursorChar: '_' },
    }),

    fx('Chroma', 'chromatic-aberration', 0, dur, { intensity: 4, angle: 45, edgeOnly: true }),
    fx('Strobe', 'strobe', 0, dur, { color: '#00FFFF', intensity: 0.15, beatDiv: 2 }),
    fx('Spectrum', 'spectrum', 0, dur, { height: 600, barCount: 24 }),
    fx('Corners', 'corner-accents', 0, dur, { color: '#00FFFF', lineWidth: 2, margin: 30, length: 60 }),
  ]);
}

// ============================================================
// 2. DJ LINE-UP — MINIMAL WHITE
// Showcases: clean typography, subtle effects, shape dividers,
//   letter spacing, elegant entrance animations
// ============================================================

function djMinimalWhite(): Project {
  const dur = 16000;
  const s = stg(dur, 122, '#0A0A0A');
  return proj('Minimal White', s, [
    fx('Vignette', 'vignette', 0, dur, { strength: 0.25, outerRadius: 1.0 }),

    img({ name: 'Logo', inT: 300, outT: dur, y: 0.14, scale: 0.35, w: 500, h: 500, opacity: enterFade(300, 800), scaleAnim: kf2(300, 0.25, 1100, 0.35, 'ease-out-cubic') }),

    rect({ name: 'Line Top', inT: 800, outT: dur, x: 0.5, y: 0.245, w: 120, h: 1, fill: '#444444', opacity: enterFade(800, 500), scaleX: kf2(800, 0, 1300, 1, 'ease-out-expo') }),

    txt({ name: 'Title', text: 'THE LINE UP', y: 0.30, size: 38, inT: 1000, outT: dur, color: '#FFFFFF', font: 'Montserrat', spacing: 6, weight: '300', opacity: enterFade(1000, 600) }),

    rect({ name: 'Line Mid', inT: 1300, outT: dur, x: 0.5, y: 0.345, w: 60, h: 1, fill: '#444444', opacity: enterFade(1300, 500), scaleX: kf2(1300, 0, 1800, 1, 'ease-out-expo') }),

    txt({ name: 'DJ 1', text: 'ALPHA', y: 0.41, size: 30, inT: 1600, outT: dur, color: '#FFFFFF', font: 'Montserrat', spacing: 10, weight: '300', opacity: enterFade(1600, 500) }),
    txt({ name: 'Set 1', text: '22:00 — 23:30', y: 0.44, size: 14, inT: 1700, outT: dur, color: '#555555', font: 'Montserrat', spacing: 3, opacity: enterFade(1700) }),

    txt({ name: 'DJ 2', text: 'BETA', y: 0.49, size: 30, inT: 2000, outT: dur, color: '#FFFFFF', font: 'Montserrat', spacing: 10, weight: '300', opacity: enterFade(2000, 500) }),
    txt({ name: 'Set 2', text: '23:30 — 01:00', y: 0.52, size: 14, inT: 2100, outT: dur, color: '#555555', font: 'Montserrat', spacing: 3, opacity: enterFade(2100) }),

    txt({ name: 'DJ 3', text: 'GAMMA', y: 0.57, size: 30, inT: 2400, outT: dur, color: '#FFFFFF', font: 'Montserrat', spacing: 10, weight: '300', opacity: enterFade(2400, 500) }),
    txt({ name: 'Set 3', text: '01:00 — 02:30', y: 0.60, size: 14, inT: 2500, outT: dur, color: '#555555', font: 'Montserrat', spacing: 3, opacity: enterFade(2500) }),

    txt({ name: 'DJ 4', text: 'DELTA', y: 0.65, size: 30, inT: 2800, outT: dur, color: '#FFFFFF', font: 'Montserrat', spacing: 10, weight: '300', opacity: enterFade(2800, 500) }),
    txt({ name: 'Set 4', text: '02:30 — 04:00', y: 0.68, size: 14, inT: 2900, outT: dur, color: '#555555', font: 'Montserrat', spacing: 3, opacity: enterFade(2900) }),

    rect({ name: 'Line Bot', inT: 3200, outT: dur, x: 0.5, y: 0.74, w: 120, h: 1, fill: '#444444', opacity: enterFade(3200, 500), scaleX: kf2(3200, 0, 3700, 1, 'ease-out-expo') }),

    txt({ name: 'Venue', text: 'THE WAREHOUSE — LONDON', y: 0.80, size: 16, inT: 3400, outT: dur, color: '#666666', font: 'Montserrat', spacing: 4, opacity: enterFade(3400, 600) }),
    txt({ name: 'Date', text: 'SATURDAY 22 NOVEMBER 2026', y: 0.835, size: 12, inT: 3600, outT: dur, color: '#444444', font: 'Montserrat', spacing: 2, opacity: enterFade(3600, 600) }),

    fx('Spectrum', 'spectrum', 0, dur, { height: 400, barCount: 16 }),
  ]);
}

// ============================================================
// 3. DJ LINE-UP — INFERNO
// Showcases: particles, glitch, color grading, film grain,
//   text with stroke outlines, shape decorations, bounce easing
// ============================================================

function djInferno(): Project {
  const dur = 16000;
  const s = stg(dur, 128, '#0A0000', { enabled: true, thickness: 3, color: '#FF4500', cornerRadius: 0, inset: 25, outerBlur: 15 });
  return proj('Inferno', s, [
    fx('Vignette', 'vignette', 0, dur, { strength: 0.85, color: '60,0,0' }),
    fx('Color Grade', 'color-grading', 0, dur, { preset: 'warm', saturation: 0.3 }),
    fx('Film Grain', 'film-grain', 0, dur, { intensity: 0.2, grainSize: 2.5 }),

    img({ name: 'Logo', inT: 200, outT: dur, y: 0.17, scale: 0.5, w: 500, h: 500, opacity: enterFade(200, 600), scaleAnim: kf2(200, 0.2, 900, 0.5, 'ease-out-back') }),

    txt({ name: 'Title', text: 'INFERNO', y: 0.32, size: 80, inT: 600, outT: dur, color: '#FF4500', opacity: enterFade(600, 500), scaleX: kf2(600, 1.5, 1100, 1, 'ease-out-expo'),
      stroke: { enabled: true, color: '#FFD700', width: 2 },
      shadow: { enabled: true, color: '#FF0000', blur: 40, offsetX: 0, offsetY: 0 },
    }),

    txt({ name: 'Subtitle', text: 'UNDERGROUND SESSIONS', y: 0.375, size: 16, inT: 1000, outT: dur, color: '#FF6600', font: 'Montserrat', spacing: 6, opacity: enterFade(1000, 400) }),

    rect({ name: 'Fire Line', inT: 1200, outT: dur, x: 0.5, y: 0.41, w: 500, h: 3, fill: '#FF4500', opacity: enterFade(1200, 300), scaleX: kf2(1200, 0, 1600, 1, 'ease-out-expo') }),

    txt({ name: 'DJ 1', text: 'BLAZE', y: 0.46, size: 38, inT: 1500, outT: dur, color: '#FF6600', opacity: enterFade(1500),
      stroke: { enabled: true, color: '#FF4500', width: 1 },
      shadow: { enabled: true, color: '#FF2200', blur: 20, offsetX: 0, offsetY: 0 },
    }),
    txt({ name: 'Time 1', text: '22:00 — 23:30', y: 0.495, size: 14, inT: 1600, outT: dur, color: '#884422', font: 'Montserrat', opacity: enterFade(1600) }),

    txt({ name: 'DJ 2', text: 'EMBER', y: 0.54, size: 38, inT: 1900, outT: dur, color: '#FF6600', opacity: enterFade(1900),
      stroke: { enabled: true, color: '#FF4500', width: 1 },
      shadow: { enabled: true, color: '#FF2200', blur: 20, offsetX: 0, offsetY: 0 },
    }),
    txt({ name: 'Time 2', text: '23:30 — 01:00', y: 0.575, size: 14, inT: 2000, outT: dur, color: '#884422', font: 'Montserrat', opacity: enterFade(2000) }),

    txt({ name: 'DJ 3', text: 'PYROX', y: 0.62, size: 38, inT: 2300, outT: dur, color: '#FF6600', opacity: enterFade(2300),
      stroke: { enabled: true, color: '#FF4500', width: 1 },
      shadow: { enabled: true, color: '#FF2200', blur: 20, offsetX: 0, offsetY: 0 },
    }),
    txt({ name: 'Time 3', text: '01:00 — 03:00', y: 0.655, size: 14, inT: 2400, outT: dur, color: '#884422', font: 'Montserrat', opacity: enterFade(2400) }),

    txt({ name: 'Venue', text: 'THE FURNACE — BERLIN', y: 0.78, size: 22, inT: 2800, outT: dur, color: '#FF4500', opacity: enterFade(2800, 500),
      border: { enabled: true, color: '#FF4500', width: 1, cornerRadius: 0, paddingX: 24, paddingY: 10 },
    }),

    fx('Particles', 'particles', 0, dur, { color1: '#FF4500', color2: '#FFD700', gravity: -0.08, maxCount: 80, sizeMax: 5, sizeMin: 1 }),
    fx('Glitch', 'glitch', 0, dur, { intensity: 1.2 }),
    fx('Spectrum', 'spectrum', 0, dur, { height: 700 }),
  ]);
}

// ============================================================
// 4. EVENT PROMO — GOLD LUXE
// Showcases: blur transition, parallax, sweep, gold palette,
//   text backgrounds, elegant borders, animated scale entrance
// ============================================================

function promoGoldLuxe(): Project {
  const dur = 15000;
  const s = stg(dur, 120, '#080604', { enabled: true, thickness: 2, color: '#FFD700', cornerRadius: 0, inset: 35, outerBlur: 10 });
  return proj('Gold Luxe', s, [
    fx('Vignette', 'vignette', 0, dur, { strength: 0.6, color: '20,15,0' }),
    fx('Blur In', 'blur-transition', 0, dur, { maxBlur: 30, startTime: 0, endTime: 2500, mode: 'in' }),

    img({ name: 'Logo', inT: 500, outT: dur, y: 0.22, scale: 0.6, w: 600, h: 600, parallax: true, pStartY: -0.15, pDur: 2500, opacity: enterFade(500, 800) }),

    rect({ name: 'Gold Line', inT: 2200, outT: dur, x: 0.5, y: 0.38, w: 200, h: 2, fill: '#FFD700', opacity: enterFade(2200, 400), scaleX: kf2(2200, 0, 2700, 1, 'ease-out-expo') }),

    txt({ name: 'Event', text: 'GOLDEN\nNIGHT', y: 0.46, size: 56, inT: 2400, outT: dur, color: '#FFD700', lh: 1.1, opacity: enterFade(2400, 600), scaleX: enterScale(2400, 0.85, 600, 'ease-out-cubic'),
      shadow: { enabled: true, color: '#FFD700', blur: 25, offsetX: 0, offsetY: 0 },
    }),

    txt({ name: 'Date', text: 'SATURDAY 22 NOVEMBER', y: 0.565, size: 20, inT: 2800, outT: dur, color: '#FFFFFF', font: 'Montserrat', spacing: 4, opacity: enterFade(2800, 500) }),

    txt({ name: 'Time', text: '21:00 — LATE', y: 0.60, size: 16, inT: 3000, outT: dur, color: '#CCAA66', font: 'Montserrat', spacing: 3, opacity: enterFade(3000, 400) }),

    rect({ name: 'Info BG', inT: 3200, outT: dur, x: 0.5, y: 0.67, w: 550, h: 80, fill: '#1A1400', corner: 4, opacity: enterFade(3200, 400) }),
    txt({ name: 'Venue', text: 'THE RITZ — PARIS', y: 0.665, size: 22, inT: 3400, outT: dur, color: '#FFD700', font: 'Montserrat', spacing: 3, opacity: enterFade(3400, 500) }),

    txt({ name: 'CTA', text: 'TABLE RESERVATIONS OPEN', y: 0.82, size: 14, inT: 3800, outT: dur, color: '#FFD700', font: 'Montserrat', spacing: 4, opacity: enterFade(3800, 500),
      bg: { enabled: true, color: '#332B00', opacity: 0.9, paddingX: 24, paddingY: 10, cornerRadius: 20 },
    }),

    fx('Sweep', 'sweep', 0, dur, { color: '255,215,0', sweepWidth: 200, speed: 0.6, count: 1 }),
    fx('Corners', 'corner-accents', 0, dur, { color: '#FFD700', lineWidth: 1, margin: 35, length: 50 }),
    fx('Spectrum', 'spectrum', 0, dur, { height: 500, barCount: 16 }),
  ]);
}

// ============================================================
// 5. EVENT PROMO — RETRO WAVE
// Showcases: vintage color grading, film grain, scanlines,
//   text stroke + shadow combo, shape backgrounds, nostalgic palette
// ============================================================

function promoRetroWave(): Project {
  const dur = 15000;
  const s = stg(dur, 118, '#0C0008');
  return proj('Retro Wave', s, [
    fx('Vignette', 'vignette', 0, dur, { strength: 0.65, color: '40,0,40' }),
    fx('Color Grade', 'color-grading', 0, dur, { preset: 'vintage' }),
    fx('Film Grain', 'film-grain', 0, dur, { intensity: 0.3, grainSize: 2.5, mono: false }),
    fx('Scanlines', 'scanlines', 0, dur, { spacing: 3, thickness: 1, opacity: 0.07 }),

    img({ name: 'Logo', inT: 400, outT: dur, y: 0.20, scale: 0.55, w: 600, h: 600, parallax: true, pStartY: -0.2, pDur: 2500, opacity: enterFade(400, 800) }),

    rect({ name: 'Title BG', inT: 1200, outT: dur, x: 0.5, y: 0.38, w: 700, h: 110, fill: '#1A0020', corner: 0, opacity: enterFade(1200, 400) }),
    txt({ name: 'Event', text: 'RETRO WAVE', y: 0.38, size: 58, inT: 1400, outT: dur, color: '#FF6B9D',
      stroke: { enabled: true, color: '#FF3370', width: 2 },
      shadow: { enabled: true, color: '#FF6B9D', blur: 30, offsetX: 0, offsetY: 0 },
      opacity: enterFade(1400, 500), scaleX: enterScale(1400, 0.8, 600),
    }),

    txt({ name: 'Tagline', text: 'A NIGHT OF NOSTALGIA', y: 0.44, size: 14, inT: 1800, outT: dur, color: '#FFD93D', font: 'Montserrat', spacing: 6, opacity: enterFade(1800, 400) }),

    rect({ name: 'Divider', inT: 2100, outT: dur, x: 0.5, y: 0.48, w: 400, h: 2, fill: '#FFD93D', opacity: enterFade(2100, 300), scaleX: kf2(2100, 0, 2500, 1, 'ease-out-expo') }),

    txt({ name: 'Date', text: 'FRI 28 NOVEMBER', y: 0.53, size: 28, inT: 2300, outT: dur, color: '#FFD93D', font: 'Montserrat', spacing: 3, opacity: enterFade(2300, 500) }),
    txt({ name: 'Time', text: '20:00 ONWARDS', y: 0.57, size: 18, inT: 2500, outT: dur, color: '#CC88AA', font: 'Montserrat', spacing: 2, opacity: enterFade(2500, 400) }),

    txt({ name: 'Venue', text: 'SUNSET BOULEVARD', y: 0.66, size: 24, inT: 2800, outT: dur, color: '#FF6B9D', font: 'Montserrat', spacing: 3, opacity: enterFade(2800, 500),
      border: { enabled: true, color: '#FF6B9D', width: 1, cornerRadius: 0, paddingX: 24, paddingY: 10 },
    }),
    txt({ name: 'City', text: 'LOS ANGELES', y: 0.705, size: 14, inT: 3000, outT: dur, color: '#885577', font: 'Montserrat', spacing: 6, opacity: enterFade(3000) }),

    txt({ name: 'CTA', text: 'TICKETS AT THE DOOR', y: 0.84, size: 16, inT: 3400, outT: dur, color: '#FFD93D', font: 'Montserrat', spacing: 3, opacity: enterFade(3400, 500),
      tw: { enabled: true, speed: 30, cursor: true, cursorChar: '|' },
    }),

    fx('Spectrum', 'spectrum', 0, dur, { height: 500, barCount: 20 }),
    fx('Corners', 'corner-accents', 0, dur, { color: '#FF6B9D', lineWidth: 1 }),
  ]);
}

// ============================================================
// 6. EVENT PROMO — HYPE MACHINE
// Showcases: zoom pulse, strobe, chromatic aberration,
//   cyberpunk grading, bold glowing text, high energy
// ============================================================

function promoHypeMachine(): Project {
  const dur = 15000;
  const s = stg(dur, 140, '#030808', { enabled: true, thickness: 2, color: '#00FF88', cornerRadius: 0, inset: 20, outerBlur: 12 });
  return proj('Hype Machine', s, [
    fx('Vignette', 'vignette', 0, dur, { strength: 0.5, color: '0,15,10' }),
    fx('Color Grade', 'color-grading', 0, dur, { preset: 'cyberpunk' }),

    img({ name: 'Logo', inT: 200, outT: dur, y: 0.20, scale: 0.55, w: 600, h: 600, parallax: true, pStartY: -0.2, pDur: 1800, opacity: enterFade(200, 600) }),

    txt({ name: 'Presents', text: 'WAREHOUSE 9 PRESENTS', y: 0.36, size: 14, inT: 1000, outT: dur, color: '#00FF88', font: 'Montserrat', spacing: 8, opacity: enterFade(1000, 400) }),

    txt({ name: 'Event', text: 'HYPE\nMACHINE', y: 0.465, size: 72, inT: 1200, outT: dur, color: '#00FF88', lh: 1.0,
      stroke: { enabled: true, color: '#00CC66', width: 3 },
      shadow: { enabled: true, color: '#00FF88', blur: 40, offsetX: 0, offsetY: 4 },
      opacity: enterFade(1200, 400), scaleX: kf2(1200, 2, 1800, 1, 'ease-out-expo'),
    }),

    rect({ name: 'Date BG', inT: 2000, outT: dur, x: 0.5, y: 0.58, w: 450, h: 60, fill: '#00FF88', corner: 0, opacity: enterFade(2000, 300), scaleX: kf2(2000, 0, 2400, 1, 'ease-out-expo') }),
    txt({ name: 'Date', text: 'SAT 6 DECEMBER', y: 0.577, size: 26, inT: 2200, outT: dur, color: '#030808', font: 'Montserrat', weight: '800', spacing: 3, opacity: enterFade(2200, 300) }),

    txt({ name: 'Time', text: '23:00 — 06:00', y: 0.63, size: 18, inT: 2500, outT: dur, color: '#AAAAAA', font: 'Montserrat', spacing: 2, opacity: enterFade(2500, 400) }),

    txt({ name: 'Venue', text: 'WAREHOUSE 9 — NYC', y: 0.70, size: 20, inT: 2800, outT: dur, color: '#00FF88', font: 'Montserrat', spacing: 3, opacity: enterFade(2800, 500),
      border: { enabled: true, color: '#00FF88', width: 2, cornerRadius: 0, paddingX: 22, paddingY: 10 },
    }),

    txt({ name: 'CTA', text: 'LINK IN BIO', y: 0.84, size: 18, inT: 3200, outT: dur, color: '#00FF88', font: 'Montserrat', spacing: 4, opacity: enterFade(3200, 400),
      bg: { enabled: true, color: '#003320', opacity: 0.9, paddingX: 30, paddingY: 10, cornerRadius: 20 },
    }),

    fx('Chroma', 'chromatic-aberration', 0, dur, { intensity: 6, angle: 0, edgeOnly: false }),
    fx('Strobe', 'strobe', 0, dur, { color: '#00FF88', intensity: 0.35, beatDiv: 1 }),
    fx('Zoom Pulse', 'zoom-pulse', 0, dur, { amount: 0.035, beatDiv: 1, decay: 3 }),
    fx('Spectrum', 'spectrum', 0, dur, { height: 700 }),
  ]);
}

// ============================================================
// 7. TRACK RELEASE — VINYL PRESS
// Showcases: noir grading, heavy vignette, waveform,
//   minimalist typography, subtle film grain, typewriter CTA
// ============================================================

function releaseVinylPress(): Project {
  const dur = 16000;
  const s = stg(dur, 110, '#050505');
  return proj('Vinyl Press', s, [
    fx('Vignette', 'vignette', 0, dur, { strength: 0.85, innerRadius: 0.2, outerRadius: 0.65 }),
    fx('Color Grade', 'color-grading', 0, dur, { preset: 'noir' }),
    fx('Film Grain', 'film-grain', 0, dur, { intensity: 0.25, grainSize: 2, mono: true }),

    txt({ name: 'Label', text: 'OUT NOW', y: 0.12, size: 14, inT: 800, outT: dur, color: '#666666', font: 'Montserrat', spacing: 8,
      opacity: enterFade(800, 600),
      border: { enabled: true, color: '#333333', width: 1, cornerRadius: 0, paddingX: 16, paddingY: 6 },
    }),

    img({ name: 'Artwork', inT: 400, outT: dur, y: 0.36, scale: 0.75, w: 800, h: 800, opacity: enterFade(400, 1000), scaleAnim: kf2(400, 0.6, 1400, 0.75, 'ease-out-cubic') }),

    rect({ name: 'Divider', inT: 1600, outT: dur, x: 0.5, y: 0.555, w: 80, h: 1, fill: '#444444', opacity: enterFade(1600, 400), scaleX: kf2(1600, 0, 2000, 1, 'ease-out-expo') }),

    txt({ name: 'Title', text: 'MIDNIGHT\nSESSIONS', y: 0.625, size: 46, inT: 1800, outT: dur, lh: 1.1,
      shadow: { enabled: true, color: '#000000', blur: 20, offsetX: 0, offsetY: 4 },
      opacity: enterFade(1800, 600), scaleX: enterScale(1800, 0.9, 500),
    }),

    txt({ name: 'Artist', text: 'DEEP COLLECTIVE', y: 0.71, size: 18, inT: 2200, outT: dur, color: '#777777', font: 'Montserrat', spacing: 5, opacity: enterFade(2200, 500) }),

    txt({ name: 'CTA', text: 'STREAM ON ALL PLATFORMS', y: 0.86, size: 14, inT: 2800, outT: dur, color: '#555555', font: 'Montserrat', spacing: 3, opacity: enterFade(2800, 500),
      tw: { enabled: true, speed: 20, cursor: true, cursorChar: '_' },
    }),

    fx('Waveform', 'waveform', 0, dur, { height: 1200, yCenter: 0.56, lineWidth: 3 }),
  ]);
}

// ============================================================
// 8. TRACK RELEASE — NEON CYBER
// Showcases: mirror horizontal, cyberpunk grading, spectrum,
//   chromatic aberration, bold neon text with glow
// ============================================================

function releaseNeonCyber(): Project {
  const dur = 16000;
  const s = stg(dur, 135, '#020015', { enabled: true, thickness: 2, color: '#FF00FF', cornerRadius: 0, inset: 25, outerBlur: 10 });
  return proj('Neon Cyber', s, [
    fx('Vignette', 'vignette', 0, dur, { strength: 0.5, color: '5,0,30' }),
    fx('Color Grade', 'color-grading', 0, dur, { preset: 'cyberpunk' }),

    txt({ name: 'Label', text: 'NEW RELEASE', y: 0.11, size: 14, inT: 600, outT: dur, color: '#FF00FF', font: 'Montserrat', spacing: 8, opacity: enterFade(600, 400),
      bg: { enabled: true, color: '#200030', opacity: 0.9, paddingX: 20, paddingY: 8, cornerRadius: 3 },
    }),

    img({ name: 'Artwork', inT: 300, outT: dur, y: 0.32, scale: 0.65, w: 800, h: 800, opacity: enterFade(300, 800), scaleAnim: kf2(300, 0.4, 1200, 0.65, 'ease-out-back') }),

    rect({ name: 'Glow Bar', inT: 1400, outT: dur, x: 0.5, y: 0.50, w: 600, h: 3, fill: '#00FFFF', opacity: enterFade(1400, 300), scaleX: kf2(1400, 0, 1800, 1, 'ease-out-expo') }),

    txt({ name: 'Title', text: 'DIGITAL\nDREAMS', y: 0.585, size: 56, inT: 1600, outT: dur, color: '#00FFFF', lh: 1.05,
      stroke: { enabled: true, color: '#0088AA', width: 2 },
      shadow: { enabled: true, color: '#00FFFF', blur: 35, offsetX: 0, offsetY: 0 },
      opacity: enterFade(1600, 500), scaleX: enterSpring(1600, 0.5, 700),
    }),

    txt({ name: 'Artist', text: 'CYBER.WAVE', y: 0.685, size: 22, inT: 2100, outT: dur, color: '#FF00FF', font: 'Montserrat', spacing: 4, opacity: enterFade(2100, 500),
      shadow: { enabled: true, color: '#FF00FF', blur: 15, offsetX: 0, offsetY: 0 },
    }),

    txt({ name: 'Feature', text: 'FEATURING NEONLUX', y: 0.72, size: 13, inT: 2400, outT: dur, color: '#555577', font: 'Montserrat', spacing: 3, opacity: enterFade(2400) }),

    txt({ name: 'CTA', text: 'LINK IN BIO', y: 0.85, size: 16, inT: 2800, outT: dur, color: '#00FFFF', font: 'Montserrat', spacing: 4, opacity: enterFade(2800, 500),
      border: { enabled: true, color: '#00FFFF', width: 1, cornerRadius: 20, paddingX: 24, paddingY: 8 },
    }),

    fx('Mirror', 'mirror', 0, dur, { mode: 'horizontal' }),
    fx('Chroma', 'chromatic-aberration', 0, dur, { intensity: 3, edgeOnly: true }),
    fx('Spectrum', 'spectrum', 0, dur, { height: 600, barCount: 32 }),
    fx('Corners', 'corner-accents', 0, dur, { color: '#00FFFF', lineWidth: 1, margin: 25 }),
  ]);
}

// ============================================================
// 9. TRACK RELEASE — ACOUSTIC CLEAN
// Showcases: warm grading, soft parallax, waveform,
//   elegant serif-style layout, minimal effects, warm palette
// ============================================================

function releaseAcousticClean(): Project {
  const dur = 16000;
  const s = stg(dur, 95, '#0A0806');
  return proj('Acoustic Clean', s, [
    fx('Vignette', 'vignette', 0, dur, { strength: 0.3, outerRadius: 1.0, color: '15,10,5' }),
    fx('Color Grade', 'color-grading', 0, dur, { preset: 'warm', brightness: 0.04 }),

    txt({ name: 'Tag', text: 'NEW SINGLE', y: 0.10, size: 12, inT: 800, outT: dur, color: '#AA8855', font: 'Montserrat', spacing: 6, opacity: enterFade(800, 600),
      border: { enabled: true, color: '#AA8855', width: 1, cornerRadius: 20, paddingX: 18, paddingY: 6 },
    }),

    img({ name: 'Artwork', inT: 300, outT: dur, y: 0.35, scale: 0.8, w: 800, h: 800, parallax: true, pStartY: -0.12, pDur: 3500, opacity: enterFade(300, 1200) }),

    rect({ name: 'Warm Line', inT: 1800, outT: dur, x: 0.5, y: 0.555, w: 100, h: 2, fill: '#AA8855', opacity: enterFade(1800, 500), scaleX: kf2(1800, 0, 2300, 1, 'ease-out-expo') }),

    txt({ name: 'Title', text: 'GOLDEN HOUR', y: 0.61, size: 42, inT: 2000, outT: dur, color: '#FFFFFF', font: 'Montserrat', spacing: 3, weight: '300', opacity: enterFade(2000, 700),
      shadow: { enabled: true, color: '#000000', blur: 15, offsetX: 0, offsetY: 4 },
    }),

    txt({ name: 'Artist', text: 'AMBER SKIES', y: 0.66, size: 20, inT: 2400, outT: dur, color: '#CCAA77', font: 'Montserrat', spacing: 5, opacity: enterFade(2400, 500) }),

    txt({ name: 'Date', text: 'AVAILABLE DECEMBER 1', y: 0.71, size: 13, inT: 2700, outT: dur, color: '#777766', font: 'Montserrat', spacing: 3, opacity: enterFade(2700) }),

    txt({ name: 'CTA', text: 'PRE-SAVE NOW', y: 0.85, size: 15, inT: 3200, outT: dur, color: '#AA8855', font: 'Montserrat', spacing: 4, opacity: enterFade(3200, 600),
      bg: { enabled: true, color: '#1A1508', opacity: 0.9, paddingX: 26, paddingY: 10, cornerRadius: 20 },
    }),

    fx('Waveform', 'waveform', 0, dur, { height: 800, yCenter: 0.55, lineWidth: 2 }),
  ]);
}

// ============================================================
// 10. COUNTDOWN — DRAMATIC DROP
// Showcases: blur transition, strobe flash, film grain,
//   massive animated number, spring easing, corner accents
// ============================================================

function countdownDramatic(): Project {
  const dur = 12000;
  const s = stg(dur, 130, '#050505', { enabled: true, thickness: 2, color: '#E8423F', cornerRadius: 0, inset: 40, outerBlur: 6 });
  return proj('Dramatic Drop', s, [
    fx('Vignette', 'vignette', 0, dur, { strength: 0.8, color: '20,0,0' }),
    fx('Blur In', 'blur-transition', 0, dur, { maxBlur: 40, startTime: 0, endTime: 2000, mode: 'in' }),
    fx('Film Grain', 'film-grain', 0, dur, { intensity: 0.18, mono: true }),

    img({ name: 'Logo', inT: 500, outT: dur, y: 0.18, scale: 0.4, w: 500, h: 500, opacity: enterFade(500, 800) }),

    txt({ name: 'Count', text: '7', y: 0.46, size: 180, inT: 1500, outT: dur, color: '#E8423F',
      shadow: { enabled: true, color: '#FF0000', blur: 50, offsetX: 0, offsetY: 0 },
      stroke: { enabled: true, color: '#FF6666', width: 3 },
      opacity: kf2(1500, 0, 2100, 1, 'ease-out'),
      scaleX: kf2(1500, 3, 2100, 1, 'spring'),
    }),

    txt({ name: 'Label', text: 'DAYS REMAINING', y: 0.60, size: 18, inT: 2200, outT: dur, color: '#666666', font: 'Montserrat', spacing: 8, opacity: enterFade(2200, 500) }),

    rect({ name: 'Divider', inT: 2600, outT: dur, x: 0.5, y: 0.66, w: 200, h: 2, fill: '#E8423F', opacity: enterFade(2600, 300), scaleX: kf2(2600, 0, 3000, 1, 'ease-out-expo') }),

    txt({ name: 'Event', text: 'THE MAIN EVENT', y: 0.72, size: 36, inT: 2800, outT: dur, opacity: enterFade(2800, 500), scaleX: enterScale(2800, 0.85),
      shadow: { enabled: true, color: '#000000', blur: 15, offsetX: 0, offsetY: 4 },
    }),

    txt({ name: 'Date', text: '22 NOVEMBER 2026', y: 0.77, size: 16, inT: 3100, outT: dur, color: '#888888', font: 'Montserrat', spacing: 3, opacity: enterFade(3100, 400) }),

    txt({ name: 'CTA', text: 'GET YOUR TICKETS', y: 0.87, size: 14, inT: 3500, outT: dur, color: '#E8423F', font: 'Montserrat', spacing: 4, opacity: enterFade(3500),
      border: { enabled: true, color: '#E8423F', width: 1, cornerRadius: 20, paddingX: 22, paddingY: 8 },
    }),

    fx('Strobe', 'strobe', 0, dur, { color: '#FF0000', intensity: 0.2, beatDiv: 0.25 }),
    fx('Corners', 'corner-accents', 0, dur, { color: '#E8423F', margin: 40, length: 50, lineWidth: 2 }),
    fx('Spectrum', 'spectrum', 0, dur, { height: 400, barCount: 12 }),
  ]);
}

// ============================================================
// 11. COUNTDOWN — PARTY BOUNCE
// Showcases: zoom pulse, bounce easing, particles,
//   golden palette, animated backgrounds, high energy
// ============================================================

function countdownPartyBounce(): Project {
  const dur = 12000;
  const s = stg(dur, 132, '#080400');
  return proj('Party Bounce', s, [
    fx('Vignette', 'vignette', 0, dur, { strength: 0.4, color: '20,10,0' }),

    img({ name: 'Logo', inT: 300, outT: dur, y: 0.16, scale: 0.35, w: 500, h: 500, opacity: enterFade(300, 600) }),

    txt({ name: 'Countdown Tag', text: 'COUNTDOWN', y: 0.26, size: 12, inT: 600, outT: dur, color: '#FFD700', font: 'Montserrat', spacing: 10, opacity: enterFade(600, 400),
      bg: { enabled: true, color: '#332B00', opacity: 0.9, paddingX: 20, paddingY: 6, cornerRadius: 3 },
    }),

    txt({ name: 'Count', text: '5', y: 0.44, size: 200, inT: 1000, outT: dur, color: '#FFD700',
      shadow: { enabled: true, color: '#FFD700', blur: 50, offsetX: 0, offsetY: 0 },
      stroke: { enabled: true, color: '#FFAA00', width: 4 },
      opacity: kf2(1000, 0, 1500, 1, 'bounce'),
      scaleX: kf2(1000, 0.2, 1500, 1, 'bounce'),
    }),

    txt({ name: 'Label', text: 'DAYS TO GO!', y: 0.585, size: 24, inT: 1600, outT: dur, color: '#FFFFFF', font: 'Montserrat', spacing: 3, opacity: enterFade(1600, 400),
      shadow: { enabled: true, color: '#FFD700', blur: 15, offsetX: 0, offsetY: 0 },
    }),

    rect({ name: 'Gold Bar', inT: 2000, outT: dur, x: 0.5, y: 0.635, w: 400, h: 4, fill: '#FFD700', opacity: enterFade(2000, 300), scaleX: kf2(2000, 0, 2400, 1, 'ease-out-expo') }),

    txt({ name: 'Event', text: 'FESTIVAL', y: 0.70, size: 52, inT: 2200, outT: dur, color: '#FFD700', opacity: enterFade(2200, 500), scaleX: enterSpring(2200, 0.6),
      stroke: { enabled: true, color: '#CC8800', width: 2 },
    }),

    txt({ name: 'Date', text: 'SUMMER 2026', y: 0.76, size: 18, inT: 2600, outT: dur, color: '#CCAA55', font: 'Montserrat', spacing: 4, opacity: enterFade(2600, 400) }),

    txt({ name: 'CTA', text: 'EARLY BIRD TICKETS AVAILABLE', y: 0.87, size: 12, inT: 3000, outT: dur, color: '#FFD700', font: 'Montserrat', spacing: 3, opacity: enterFade(3000, 500),
      tw: { enabled: true, speed: 35, cursor: true, cursorChar: '_' },
    }),

    fx('Particles', 'particles', 0, dur, { color1: '#FFD700', color2: '#FF69B4', gravity: -0.12, maxCount: 80, sizeMax: 6 }),
    fx('Zoom Pulse', 'zoom-pulse', 0, dur, { amount: 0.04, beatDiv: 1, decay: 2 }),
    fx('Strobe', 'strobe', 0, dur, { color: '#FFD700', intensity: 0.25, beatDiv: 2 }),
    fx('Corners', 'corner-accents', 0, dur, { color: '#FFD700', lineWidth: 2 }),
    fx('Spectrum', 'spectrum', 0, dur, { height: 400, barCount: 16 }),
  ]);
}

// ============================================================
// 12. COUNTDOWN — DARK TENSION
// Showcases: heavy vignette, noir grading, parallax drift,
//   scanlines, dramatic entrance, typewriter date
// ============================================================

function countdownDarkTension(): Project {
  const dur = 12000;
  const s = stg(dur, 90, '#030303');
  return proj('Dark Tension', s, [
    fx('Vignette', 'vignette', 0, dur, { strength: 0.92, innerRadius: 0.1, outerRadius: 0.55, color: '0,0,0' }),
    fx('Color Grade', 'color-grading', 0, dur, { preset: 'noir' }),
    fx('Film Grain', 'film-grain', 0, dur, { intensity: 0.3, grainSize: 2.5, mono: true }),
    fx('Parallax', 'parallax-drift', 0, dur, { speedX: 0.008, speedY: 0.004, zoomAmount: 0.02 }),
    fx('Scanlines', 'scanlines', 0, dur, { spacing: 3, opacity: 0.05 }),

    img({ name: 'Logo', inT: 800, outT: dur, y: 0.20, scale: 0.35, w: 500, h: 500, opacity: enterFade(800, 1000) }),

    txt({ name: 'Count', text: '1', y: 0.47, size: 200, inT: 1500, outT: dur, color: '#CC0000',
      shadow: { enabled: true, color: '#880000', blur: 60, offsetX: 0, offsetY: 0 },
      opacity: kf2(1500, 0, 2500, 1, 'ease-out'),
    }),

    txt({ name: 'Label', text: 'DAY LEFT', y: 0.61, size: 20, inT: 2400, outT: dur, color: '#444444', font: 'Montserrat', spacing: 8, opacity: enterFade(2400, 600) }),

    rect({ name: 'Line', inT: 2800, outT: dur, x: 0.5, y: 0.665, w: 100, h: 1, fill: '#333333', opacity: enterFade(2800, 400), scaleX: kf2(2800, 0, 3300, 1, 'ease-out-expo') }),

    txt({ name: 'Event', text: 'JUDGEMENT DAY', y: 0.72, size: 34, inT: 3000, outT: dur, color: '#BBBBBB', opacity: enterFade(3000, 600),
      shadow: { enabled: true, color: '#000000', blur: 20, offsetX: 0, offsetY: 4 },
    }),

    txt({ name: 'Date', text: '31.12.2026', y: 0.77, size: 16, inT: 3400, outT: dur, color: '#555555', font: 'Montserrat', spacing: 4, opacity: enterFade(3400, 500),
      tw: { enabled: true, speed: 10, cursor: true, cursorChar: '|' },
    }),
  ]);
}

// ============================================================
// 13. LOGO STING — GLITCH STORM
// Showcases: intense glitch, chromatic aberration, strobe,
//   shape flash, spring scale, pulsing logo, rapid entrance
// ============================================================

function stingGlitchStorm(): Project {
  const dur = 5000;
  const s = stg(dur, 140, '#050505');
  return proj('Glitch Storm', s, [
    fx('Vignette', 'vignette', 0, dur, { strength: 0.6 }),

    rect({ name: 'Flash', inT: 400, outT: 900, x: 0.5, y: 0.5, w: 1080, h: 1920, fill: '#FF0000',
      opacity: kf2(400, 0.9, 900, 0, 'ease-out'),
    }),

    img({ name: 'Logo', inT: 300, outT: dur, y: 0.42, scale: 0.7, w: 800, h: 800,
      opacity: kf2(300, 0, 600, 1, 'ease-out'),
      scaleAnim: kf2(300, 0, 700, 0.7, 'spring'),
    }),

    txt({ name: 'Brand', text: 'YOUR BRAND', y: 0.62, size: 28, inT: 700, outT: dur, color: '#FFFFFF', font: 'Montserrat', spacing: 8, opacity: enterFade(700, 300),
      shadow: { enabled: true, color: '#FF0000', blur: 20, offsetX: 0, offsetY: 0 },
    }),

    txt({ name: 'Tagline', text: 'MAKE IT LOUD', y: 0.67, size: 14, inT: 900, outT: dur, color: '#888888', font: 'Montserrat', spacing: 4, opacity: enterFade(900, 300) }),

    fx('Glitch', 'glitch', 0, dur, { intensity: 2.5 }),
    fx('Chroma', 'chromatic-aberration', 0, dur, { intensity: 10, angle: 90 }),
    fx('Strobe', 'strobe', 0, dur, { color: '#FFFFFF', intensity: 0.4, beatDiv: 4 }),
    fx('Corners', 'corner-accents', 0, dur, { color: '#FF0000', lineWidth: 2 }),
    fx('Pulsing Logo', 'pulsing-logo', 0, dur, { maxScale: 2.2, opacity: 0.5 }),
  ]);
}

// ============================================================
// 14. LOGO STING — SMOOTH REVEAL
// Showcases: blur transition, warm grading, parallax drift,
//   gentle scale animation, clean typography, corner accents
// ============================================================

function stingSmoothReveal(): Project {
  const dur = 5000;
  const s = stg(dur, 100, '#080604', { enabled: true, thickness: 1, color: '#CCCCCC', cornerRadius: 0, inset: 50, outerBlur: 4 });
  return proj('Smooth Reveal', s, [
    fx('Vignette', 'vignette', 0, dur, { strength: 0.35, color: '15,10,5' }),
    fx('Blur In', 'blur-transition', 0, dur, { maxBlur: 20, startTime: 0, endTime: 1800, mode: 'in' }),
    fx('Color Grade', 'color-grading', 0, dur, { preset: 'warm', brightness: 0.04 }),

    img({ name: 'Logo', inT: 200, outT: dur, y: 0.42, scale: 0.7, w: 800, h: 800,
      opacity: kf2(200, 0, 1200, 1, 'ease-out'),
      scaleAnim: kf2(200, 0.5, 1500, 0.7, 'ease-out-cubic'),
    }),

    txt({ name: 'Brand', text: 'YOUR BRAND', y: 0.62, size: 22, inT: 1400, outT: dur, color: '#AAAAAA', font: 'Montserrat', spacing: 6, weight: '300', opacity: enterFade(1400, 600) }),

    rect({ name: 'Line', inT: 1800, outT: dur, x: 0.5, y: 0.66, w: 60, h: 1, fill: '#888888', opacity: enterFade(1800, 400), scaleX: kf2(1800, 0, 2200, 1, 'ease-out-expo') }),

    txt({ name: 'Tagline', text: 'CRAFTED WITH CARE', y: 0.70, size: 13, inT: 2000, outT: dur, color: '#777777', font: 'Montserrat', spacing: 4, opacity: enterFade(2000, 500) }),

    fx('Parallax', 'parallax-drift', 0, dur, { speedX: 0.01, speedY: 0.006, zoomAmount: 0.03 }),
    fx('Corners', 'corner-accents', 0, dur, { color: '#BBBBBB', lineWidth: 1, margin: 50, length: 35 }),
  ]);
}

// ============================================================
// 15. LOGO STING — KALEIDOSCOPE
// Showcases: mirror kaleidoscope, zoom pulse, cool grading,
//   pulsing logo, bold neon glow, corner accents
// ============================================================

function stingKaleidoscope(): Project {
  const dur = 5000;
  const s = stg(dur, 128, '#020010', { enabled: true, thickness: 2, color: '#00BBFF', cornerRadius: 0, inset: 20, outerBlur: 10 });
  return proj('Kaleidoscope', s, [
    fx('Vignette', 'vignette', 0, dur, { strength: 0.5, color: '0,0,40' }),
    fx('Color Grade', 'color-grading', 0, dur, { preset: 'cool', saturation: 0.2 }),

    img({ name: 'Logo', inT: 200, outT: dur, y: 0.42, scale: 0.7, w: 800, h: 800,
      opacity: kf2(200, 0, 700, 1, 'ease-out'),
      scaleAnim: kf2(200, 0, 900, 0.7, 'spring'),
    }),

    txt({ name: 'Brand', text: 'YOUR BRAND', y: 0.62, size: 24, inT: 800, outT: dur, color: '#00BBFF', font: 'Montserrat', spacing: 6, opacity: enterFade(800, 400),
      shadow: { enabled: true, color: '#00BBFF', blur: 20, offsetX: 0, offsetY: 0 },
    }),

    txt({ name: 'Tagline', text: 'VISUALISE THE SOUND', y: 0.67, size: 12, inT: 1000, outT: dur, color: '#6688AA', font: 'Montserrat', spacing: 4, opacity: enterFade(1000, 400) }),

    fx('Mirror', 'mirror', 0, dur, { mode: 'kaleidoscope', segments: 6 }),
    fx('Zoom Pulse', 'zoom-pulse', 0, dur, { amount: 0.03, beatDiv: 1, decay: 2 }),
    fx('Corners', 'corner-accents', 0, dur, { color: '#00BBFF', lineWidth: 2 }),
    fx('Pulsing Logo', 'pulsing-logo', 0, dur, { maxScale: 2.5, opacity: 0.5 }),
  ]);
}

// ============================================================
// EXPORT
// ============================================================

export const DEMO_CONFIGS: DemoConfig[] = [
  { id: 'dj-neon', name: 'Neon Nights', description: 'Cyan/magenta neon with staggered DJ entrances, glow text, strobe + chroma', category: 'Events', factory: djNeonNights },
  { id: 'dj-minimal', name: 'Minimal White', description: 'Clean white-on-black with elegant spacing, subtle dividers, fade entrances', category: 'Events', factory: djMinimalWhite },
  { id: 'dj-inferno', name: 'Inferno', description: 'Fire palette with glowing stroke text, particles, glitch, warm grading', category: 'Events', factory: djInferno },
  { id: 'promo-gold', name: 'Gold Luxe', description: 'Elegant gold with blur reveal, sweep, parallax logo, pill CTA', category: 'Events', factory: promoGoldLuxe },
  { id: 'promo-retro', name: 'Retro Wave', description: 'Vintage grading + scanlines, neon pink/yellow palette, typewriter CTA', category: 'Events', factory: promoRetroWave },
  { id: 'promo-hype', name: 'Hype Machine', description: 'High-energy cyberpunk with zoom pulse, inverted date bar, chromatic aberration', category: 'Events', factory: promoHypeMachine },
  { id: 'release-vinyl', name: 'Vinyl Press', description: 'Noir grading with heavy vignette, waveform, minimalist type, typewriter CTA', category: 'Music', factory: releaseVinylPress },
  { id: 'release-cyber', name: 'Neon Cyber', description: 'Cyberpunk mirror + spectrum, dual-neon glow titles, spring animation', category: 'Music', factory: releaseNeonCyber },
  { id: 'release-acoustic', name: 'Acoustic Clean', description: 'Warm tones with soft parallax, pill tags, elegant light-weight type', category: 'Music', factory: releaseAcousticClean },
  { id: 'count-dramatic', name: 'Dramatic Drop', description: 'Blur reveal with spring-scale number, red glow, strobe flash', category: 'Events', factory: countdownDramatic },
  { id: 'count-party', name: 'Party Bounce', description: 'Bounce-animated number, golden particles, zoom pulse, typewriter CTA', category: 'Events', factory: countdownPartyBounce },
  { id: 'count-dark', name: 'Dark Tension', description: 'Extreme vignette + noir, parallax drift, scanlines, typewriter date', category: 'Events', factory: countdownDarkTension },
  { id: 'sting-glitch', name: 'Glitch Storm', description: 'Intense glitch + chromatic aberration, flash shape, spring scale logo', category: 'Branding', factory: stingGlitchStorm },
  { id: 'sting-smooth', name: 'Smooth Reveal', description: 'Gentle blur-in with warm grading, parallax drift, clean borders', category: 'Branding', factory: stingSmoothReveal },
  { id: 'sting-kaleidoscope', name: 'Kaleidoscope', description: 'Mirror kaleidoscope with zoom pulse, neon glow, pulsing logo', category: 'Branding', factory: stingKaleidoscope },
];
