import type {
  Project, Layer, ImageLayer, TextLayer, EffectLayer,
  BackgroundLogoLayer, VideoLayer, AnimatedProperty, EffectType,
} from './schema.ts';
import { generateId, EXPORT_PRESETS, INSTAGRAM_SAFE_AREAS, SCHEMA_VERSION } from './schema.ts';

interface V1Config {
  global?: { duration?: number; bpm?: number; bgColor?: string; bgImageData?: string | null };
  logos?: Array<{
    imageData?: string | null; yPosition?: number; size?: number;
    fadeInTime?: number; fadeOutTime?: number; parallax?: boolean;
    parallaxStartY?: number; parallaxDuration?: number;
  }>;
  pulsingLogo?: {
    enabled?: boolean; yPosition?: number; startTime?: number;
    opacity?: number; maxScale?: number; imageData?: string | null;
  };
  textBoxes?: Array<{
    text?: string; yPosition?: number; fontSize?: number; fadeInTime?: number;
    fontFamily?: string; bgEnabled?: boolean; bgColor?: string; bgOpacity?: number;
    border?: boolean; borderWidth?: number; borderColor?: string;
    cornerRadius?: number; paddingX?: number; paddingY?: number; textColor?: string;
  }>;
  spectrum?: { enabled?: boolean; height?: number; bottomOffset?: number; barCount?: number };
  waveform?: { enabled?: boolean; yCenter?: number; height?: number; lineWidth?: number };
  bgLogos?: Array<{
    scale?: number; y?: number; speed?: number; clockDir?: number;
    opacity?: number; imageData?: string | null;
  }>;
  effects?: {
    glitch?: boolean; scanlines?: boolean; grid?: boolean;
    sweeps?: boolean; cornerAccents?: boolean; vignette?: boolean;
  };
  border?: {
    enabled?: boolean; thickness?: number; color?: string;
    cornerRadius?: number; inset?: number; outerBlur?: number;
  };
  layerOrder?: string[];
  videoSlice?: {
    enabled?: boolean; orientation?: string; thickness?: number;
    position?: number; videoPan?: number; opacity?: number;
    fadeInTime?: number; fadeOutTime?: number; fadeDuration?: number;
    slideIn?: string; slideOut?: string; slideInTime?: number;
    slideInDuration?: number; slideOutTime?: number; slideOutDuration?: number;
  };
}

function sk(value: number): AnimatedProperty {
  return { keyframes: [{ time: 0, value, easing: 'linear' }] };
}

function fadeKeyframes(fadeInMs: number, fadeOutMs: number, duration: number): AnimatedProperty {
  const kfs = [
    { time: 0, value: 0, easing: 'ease-out' as const },
    { time: fadeInMs, value: 1, easing: 'linear' as const },
    { time: duration - fadeOutMs, value: 1, easing: 'ease-in' as const },
    { time: duration, value: 0, easing: 'linear' as const },
  ];
  return { keyframes: kfs };
}

export function importV1Config(v1: V1Config): { project: Project; assets: Array<{ id: string; type: string; dataUrl: string }> } {
  const duration = v1.global?.duration ?? 16000;
  const bpm = v1.global?.bpm ?? 124;
  const bgColor = v1.global?.bgColor ?? '#000000';

  const layers: Layer[] = [];
  const assets: Array<{ id: string; type: string; dataUrl: string }> = [];

  if (v1.global?.bgImageData) {
    const assetId = `asset_bg_${Date.now().toString(36)}`;
    assets.push({ id: assetId, type: 'image', dataUrl: v1.global.bgImageData });
  }

  const bgLogos = v1.bgLogos ?? [];
  for (let i = 0; i < bgLogos.length; i++) {
    const bg = bgLogos[i];
    let assetId: string | null = null;
    if (bg.imageData) {
      assetId = `asset_bglogo_${i}_${Date.now().toString(36)}`;
      assets.push({ id: assetId, type: 'image', dataUrl: bg.imageData });
    }
    layers.push({
      id: generateId(),
      type: 'background-logo',
      name: `BG Logo ${i + 1}`,
      visible: true,
      locked: false,
      opacity: sk(bg.opacity ?? 0.2),
      position: { x: sk(0.5), y: sk(bg.y ?? 0.5) },
      scale: { x: sk(bg.scale ?? 1), y: sk(bg.scale ?? 1) },
      rotation: sk(0),
      inTime: 0,
      outTime: duration,
      blendMode: 'source-over',
      assetId,
      logoScale: bg.scale ?? 1,
      speed: bg.speed ?? 0.1,
      clockDir: bg.clockDir ?? 9,
    } satisfies BackgroundLogoLayer);
  }

  const effects = v1.effects ?? {};
  const effectMap: Array<[boolean, EffectType, string, Record<string, unknown>]> = [
    [effects.grid !== false, 'grid', 'Grid', {}],
    [effects.sweeps !== false, 'sweep', 'Light Sweeps', {}],
    [effects.glitch !== false, 'glitch', 'Glitch', {}],
    [effects.scanlines !== false, 'scanlines', 'Scanlines', {}],
    [effects.vignette !== false, 'vignette', 'Vignette', {}],
    [effects.cornerAccents !== false, 'corner-accents', 'Corner Accents', {}],
  ];
  for (const [enabled, effectType, name, config] of effectMap) {
    layers.push({
      id: generateId(),
      type: 'effect',
      name,
      visible: enabled,
      locked: false,
      opacity: sk(1),
      position: { x: sk(0), y: sk(0) },
      scale: { x: sk(1), y: sk(1) },
      rotation: sk(0),
      inTime: 0,
      outTime: duration,
      blendMode: 'source-over',
      effectType,
      config,
    } satisfies EffectLayer);
  }

  if (v1.spectrum?.enabled !== false) {
    layers.push({
      id: generateId(),
      type: 'effect',
      name: 'Spectrum',
      visible: true,
      locked: false,
      opacity: sk(0.9),
      position: { x: sk(0), y: sk(0) },
      scale: { x: sk(1), y: sk(1) },
      rotation: sk(0),
      inTime: 0,
      outTime: duration,
      blendMode: 'source-over',
      effectType: 'spectrum',
      config: {
        height: v1.spectrum?.height ?? 900,
        bottomOffset: v1.spectrum?.bottomOffset ?? 40,
        barCount: v1.spectrum?.barCount ?? 32,
      },
    } satisfies EffectLayer);
  }

  const logos = v1.logos ?? [];
  for (let i = 0; i < logos.length; i++) {
    const logo = logos[i];
    let assetId: string | null = null;
    if (logo.imageData) {
      assetId = `asset_logo_${i}_${Date.now().toString(36)}`;
      assets.push({ id: assetId, type: 'image', dataUrl: logo.imageData });
    }
    const fadeIn = logo.fadeInTime ?? 960;
    const fadeOut = logo.fadeOutTime ?? 800;
    layers.push({
      id: generateId(),
      type: 'image',
      name: `Logo ${i + 1}`,
      visible: true,
      locked: false,
      opacity: fadeKeyframes(fadeIn, fadeOut, duration),
      position: { x: sk(0.5), y: sk(logo.yPosition ?? 0.5) },
      scale: { x: sk(logo.size ?? 0.82), y: sk(logo.size ?? 0.82) },
      rotation: sk(0),
      inTime: 0,
      outTime: duration,
      blendMode: 'source-over',
      assetId,
      size: { width: 1080, height: 1080 },
      parallax: logo.parallax !== false,
      parallaxStartY: logo.parallaxStartY ?? -0.3,
      parallaxDuration: logo.parallaxDuration ?? 3000,
    } satisfies ImageLayer);
  }

  if (v1.pulsingLogo?.enabled) {
    layers.push({
      id: generateId(),
      type: 'effect',
      name: 'Pulsing Logo',
      visible: true,
      locked: false,
      opacity: sk(v1.pulsingLogo.opacity ?? 0.85),
      position: { x: sk(0.5), y: sk(v1.pulsingLogo.yPosition ?? 0.34) },
      scale: { x: sk(1), y: sk(1) },
      rotation: sk(0),
      inTime: v1.pulsingLogo.startTime ?? 10000,
      outTime: duration,
      blendMode: 'source-over',
      effectType: 'pulsing-logo',
      config: {
        maxScale: v1.pulsingLogo.maxScale ?? 2.0,
      },
    } satisfies EffectLayer);
  }

  const textBoxes = v1.textBoxes ?? [];
  for (let i = 0; i < textBoxes.length; i++) {
    const tb = textBoxes[i];
    layers.push({
      id: generateId(),
      type: 'text',
      name: `Text ${i + 1}`,
      visible: true,
      locked: false,
      opacity: fadeKeyframes(1500, 1500, duration),
      position: { x: sk(0.5), y: sk(tb.yPosition ?? 0.5) },
      scale: { x: sk(1), y: sk(1) },
      rotation: sk(0),
      inTime: tb.fadeInTime ?? 5000,
      outTime: duration,
      blendMode: 'source-over',
      text: tb.text ?? '',
      fontFamily: tb.fontFamily ?? '"Bungee", "Arial Black", sans-serif',
      fontSize: sk(tb.fontSize ?? 80),
      fontWeight: '400',
      textColor: tb.textColor ?? '#FFFFFF',
      textAlign: 'center',
      lineHeight: 1.2,
      letterSpacing: 0,
      stroke: { enabled: false, color: '#000000', width: 2 },
      shadow: { enabled: false, color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 0, offsetY: 2 },
      background: {
        enabled: tb.bgEnabled ?? false,
        color: tb.bgColor ?? '#000000',
        opacity: tb.bgOpacity ?? 0.5,
        paddingX: tb.paddingX ?? 40,
        paddingY: tb.paddingY ?? 20,
        cornerRadius: tb.cornerRadius ?? 12,
      },
      border: {
        enabled: tb.border ?? false,
        color: tb.borderColor ?? '#E8423F',
        width: tb.borderWidth ?? 3,
        cornerRadius: tb.cornerRadius ?? 12,
        paddingX: tb.paddingX ?? 40,
        paddingY: tb.paddingY ?? 20,
      },
    } satisfies TextLayer);
  }

  if (v1.waveform?.enabled !== false) {
    layers.push({
      id: generateId(),
      type: 'effect',
      name: 'Waveform',
      visible: true,
      locked: false,
      opacity: sk(0.85),
      position: { x: sk(0), y: sk(0) },
      scale: { x: sk(1), y: sk(1) },
      rotation: sk(0),
      inTime: 0,
      outTime: duration,
      blendMode: 'source-over',
      effectType: 'waveform',
      config: {
        yCenter: v1.waveform?.yCenter ?? 0.61,
        height: v1.waveform?.height ?? 1200,
        lineWidth: v1.waveform?.lineWidth ?? 6,
      },
    } satisfies EffectLayer);
  }

  if (v1.videoSlice?.enabled) {
    const vs = v1.videoSlice;
    layers.push({
      id: generateId(),
      type: 'video',
      name: 'Video Slice',
      visible: true,
      locked: false,
      opacity: sk(vs.opacity ?? 1),
      position: { x: sk(0.5), y: sk(vs.position ?? 0.5) },
      scale: { x: sk(1), y: sk(1) },
      rotation: sk(0),
      inTime: vs.fadeInTime ?? 2000,
      outTime: duration,
      blendMode: 'source-over',
      assetId: null,
      orientation: (vs.orientation as 'horizontal' | 'vertical') ?? 'horizontal',
      thickness: vs.thickness ?? 200,
      videoPan: vs.videoPan ?? 0.5,
      fadeInTime: vs.fadeInTime ?? 2000,
      fadeOutTime: vs.fadeOutTime ?? 14000,
      fadeDuration: vs.fadeDuration ?? 1000,
      slideIn: (vs.slideIn as VideoLayer['slideIn']) ?? 'none',
      slideOut: (vs.slideOut as VideoLayer['slideOut']) ?? 'none',
      slideInTime: vs.slideInTime ?? 2000,
      slideInDuration: vs.slideInDuration ?? 1000,
      slideOutTime: vs.slideOutTime ?? 14000,
      slideOutDuration: vs.slideOutDuration ?? 1000,
    } satisfies VideoLayer);
  }

  const project: Project = {
    metadata: {
      name: 'Imported V1 Project',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
    },
    settings: {
      width: 1080,
      height: 1920,
      duration,
      fps: 30,
      bpm,
      beatOffset: 0,
      backgroundColor: bgColor,
      backgroundImageAssetId: null,
      seed: 42,
      border: {
        enabled: v1.border?.enabled ?? false,
        thickness: v1.border?.thickness ?? 4,
        color: v1.border?.color ?? '#E8423F',
        cornerRadius: v1.border?.cornerRadius ?? 0,
        inset: v1.border?.inset ?? 40,
        outerBlur: v1.border?.outerBlur ?? 0,
      },
    },
    layers,
    audio: {
      assetId: null,
      volume: 1,
      muted: false,
      fadeInDuration: 0,
      fadeOutDuration: 0,
      offset: 0,
      trim: { start: 0, end: 0 },
    },
    exportPreset: EXPORT_PRESETS[0],
    safeAreas: INSTAGRAM_SAFE_AREAS,
  };

  return { project, assets };
}
