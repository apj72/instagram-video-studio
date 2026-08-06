export const SCHEMA_VERSION = 1;

// --- Geometry ---

export interface Vec2 {
  x: number;
  y: number;
}

// --- Keyframes ---

export type EasingType =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-out-cubic'
  | 'ease-out-expo'
  | 'ease-out-back'
  | 'spring'
  | 'bounce';

export interface Keyframe<T = number> {
  time: number;
  value: T;
  easing: EasingType;
}

export interface AnimatedProperty<T = number> {
  keyframes: Keyframe<T>[];
}

// --- Layers ---

export type LayerType =
  | 'image'
  | 'text'
  | 'video'
  | 'shape'
  | 'effect'
  | 'background-logo'
  | 'group';

interface BaseLayer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: AnimatedProperty;
  position: { x: AnimatedProperty; y: AnimatedProperty };
  scale: { x: AnimatedProperty; y: AnimatedProperty };
  rotation: AnimatedProperty;
  inTime: number;
  outTime: number;
  blendMode: string;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  assetId: string | null;
  size: { width: number; height: number };
  parallax: boolean;
  parallaxStartY: number;
  parallaxDuration: number;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: AnimatedProperty;
  fontWeight: string;
  textColor: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  stroke: { enabled: boolean; color: string; width: number };
  shadow: { enabled: boolean; color: string; blur: number; offsetX: number; offsetY: number };
  background: { enabled: boolean; color: string; opacity: number; paddingX: number; paddingY: number; cornerRadius: number };
  border: { enabled: boolean; color: string; width: number; cornerRadius: number; paddingX: number; paddingY: number };
}

export interface VideoLayer extends BaseLayer {
  type: 'video';
  assetId: string | null;
  orientation: 'horizontal' | 'vertical';
  thickness: number;
  videoPan: number;
  fadeInTime: number;
  fadeOutTime: number;
  fadeDuration: number;
  slideIn: 'none' | 'top' | 'bottom' | 'left' | 'right';
  slideOut: 'none' | 'top' | 'bottom' | 'left' | 'right';
  slideInTime: number;
  slideInDuration: number;
  slideOutTime: number;
  slideOutDuration: number;
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shapeType: 'rect' | 'rounded-rect' | 'ellipse';
  size: { width: number; height: number };
  fill: { enabled: boolean; color: string };
  stroke: { enabled: boolean; color: string; width: number };
  cornerRadius: number;
}

export type EffectType =
  | 'glitch'
  | 'scanlines'
  | 'grid'
  | 'sweep'
  | 'vignette'
  | 'corner-accents'
  | 'particles'
  | 'spectrum'
  | 'waveform'
  | 'pulsing-logo';

export interface EffectLayer extends BaseLayer {
  type: 'effect';
  effectType: EffectType;
  config: Record<string, unknown>;
}

export interface BackgroundLogoLayer extends BaseLayer {
  type: 'background-logo';
  assetId: string | null;
  logoScale: number;
  speed: number;
  clockDir: number;
}

export interface GroupLayer extends BaseLayer {
  type: 'group';
  children: string[];
}

export type Layer =
  | ImageLayer
  | TextLayer
  | VideoLayer
  | ShapeLayer
  | EffectLayer
  | BackgroundLogoLayer
  | GroupLayer;

// --- Audio ---

export interface AudioTrack {
  assetId: string | null;
  volume: number;
  muted: boolean;
  fadeInDuration: number;
  fadeOutDuration: number;
  offset: number;
  trim: { start: number; end: number };
}

// --- Export ---

export interface ExportPreset {
  name: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: string;
  audioCodec: string;
  audioBitrate: number;
}

// --- Project ---

export interface ProjectMetadata {
  name: string;
  createdAt: string;
  modifiedAt: string;
  schemaVersion: number;
}

export interface ProjectSettings {
  width: number;
  height: number;
  duration: number;
  fps: number;
  bpm: number;
  beatOffset: number;
  backgroundColor: string;
  backgroundImageAssetId: string | null;
  seed: number;
}

export interface SafeArea {
  name: string;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Project {
  metadata: ProjectMetadata;
  settings: ProjectSettings;
  layers: Layer[];
  audio: AudioTrack;
  exportPreset: ExportPreset;
  safeAreas: SafeArea[];
}

// --- Assets ---

export interface AssetRef {
  id: string;
  type: 'image' | 'video' | 'audio' | 'font';
  name: string;
  mimeType: string;
  size: number;
  dataUrl?: string;
}

// --- Defaults ---

export const INSTAGRAM_SAFE_AREAS: SafeArea[] = [
  { name: 'Reel UI', top: 120, right: 0, bottom: 200, left: 0 },
  { name: 'Feed 4:5 crop', top: 285, right: 0, bottom: 285, left: 0 },
  { name: 'Grid 1:1 crop', top: 420, right: 0, bottom: 420, left: 0 },
];

export const EXPORT_PRESETS: ExportPreset[] = [
  { name: 'Instagram Reel', width: 1080, height: 1920, fps: 30, bitrate: 5_000_000, codec: 'avc1.4d0034', audioCodec: 'mp4a.40.2', audioBitrate: 128_000 },
  { name: 'Instagram Story', width: 1080, height: 1920, fps: 30, bitrate: 5_000_000, codec: 'avc1.4d0034', audioCodec: 'mp4a.40.2', audioBitrate: 128_000 },
  { name: 'Instagram Feed (Portrait)', width: 1080, height: 1350, fps: 30, bitrate: 5_000_000, codec: 'avc1.4d0034', audioCodec: 'mp4a.40.2', audioBitrate: 128_000 },
  { name: 'Instagram Feed (Square)', width: 1080, height: 1080, fps: 30, bitrate: 5_000_000, codec: 'avc1.4d0034', audioCodec: 'mp4a.40.2', audioBitrate: 128_000 },
];

function staticKeyframes(value: number): AnimatedProperty {
  return { keyframes: [{ time: 0, value, easing: 'linear' }] };
}

let nextId = 1;
export function generateId(): string {
  return `layer_${nextId++}_${Date.now().toString(36)}`;
}

export function createDefaultProject(): Project {
  return {
    metadata: {
      name: 'Untitled Project',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
    },
    settings: {
      width: 1080,
      height: 1920,
      duration: 16000,
      fps: 30,
      bpm: 124,
      beatOffset: 0,
      backgroundColor: '#000000',
      backgroundImageAssetId: null,
      seed: 42,
    },
    layers: [
      {
        id: generateId(),
        type: 'image',
        name: 'Logo',
        visible: true,
        locked: false,
        opacity: staticKeyframes(1),
        position: { x: staticKeyframes(0.5), y: staticKeyframes(0.5) },
        scale: { x: staticKeyframes(0.82), y: staticKeyframes(0.82) },
        rotation: staticKeyframes(0),
        inTime: 0,
        outTime: 16000,
        blendMode: 'source-over',
        assetId: null,
        size: { width: 1080, height: 1080 },
        parallax: true,
        parallaxStartY: -0.3,
        parallaxDuration: 3000,
      } satisfies ImageLayer,
    ],
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
}
