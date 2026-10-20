import type { Project, ImageLayer, TextLayer, EffectLayer, ShapeLayer } from '../core/schema.ts';
import { INSTAGRAM_SAFE_AREAS, EXPORT_PRESETS, SCHEMA_VERSION, generateId } from '../core/schema.ts';
import type { AnimatedProperty } from '../core/schema.ts';
import { TONY_TEMPLATES } from './tonyBrand.ts';
import { VERSION1_TEMPLATES } from './version1Events.ts';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  preview?: string;
  factory: () => Project;
}

function kf(value: number, easing: 'linear' | 'ease-out' | 'ease-in' | 'ease-in-out' | 'ease-out-cubic' | 'ease-out-back' | 'spring' | 'bounce' | 'ease-out-expo' = 'linear'): AnimatedProperty {
  return { keyframes: [{ time: 0, value, easing }] };
}

function kf2(time1: number, val1: number, time2: number, val2: number, easing: 'linear' | 'ease-out' | 'ease-in' | 'ease-in-out' | 'ease-out-cubic' | 'ease-out-back' | 'spring' | 'bounce' | 'ease-out-expo' = 'ease-out-cubic'): AnimatedProperty {
  return {
    keyframes: [
      { time: time1, value: val1, easing: 'linear' },
      { time: time2, value: val2, easing },
    ],
  };
}

function baseMeta(name: string) {
  return {
    name,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  };
}

function baseSettings(duration = 16000, bpm = 124) {
  return {
    width: 1080,
    height: 1920,
    duration,
    fps: 30,
    bpm,
    beatOffset: 0,
    backgroundColor: '#000000',
    backgroundImageAssetId: null,
    seed: Math.floor(Math.random() * 999999),
    border: { enabled: false, thickness: 4, color: '#E8423F', cornerRadius: 0, inset: 40, outerBlur: 0 },
  };
}

function baseAudio() {
  return {
    assetId: null,
    volume: 1,
    muted: false,
    fadeInDuration: 0,
    fadeOutDuration: 0,
    offset: 0,
    trim: { start: 0, end: 0 },
  };
}

function baseLayer(name: string, dur: number) {
  return {
    id: generateId(),
    name,
    visible: true,
    locked: false,
    opacity: kf(1),
    position: { x: kf(0.5), y: kf(0.5) },
    scale: { x: kf(1), y: kf(1) },
    rotation: kf(0),
    inTime: 0,
    outTime: dur,
    blendMode: 'source-over',
  };
}

function textLayer(name: string, text: string, y: number, fontSize: number, dur: number, color = '#FFFFFF'): TextLayer {
  return {
    ...baseLayer(name, dur),
    type: 'text',
    text,
    fontFamily: 'Bungee',
    fontSize: kf(fontSize),
    fontWeight: 'bold',
    textColor: color,
    textAlign: 'center',
    lineHeight: 1.3,
    letterSpacing: 0,
    position: { x: kf(0.5), y: kf(y) },
    stroke: { enabled: false, color: '#000000', width: 2 },
    shadow: { enabled: false, color: '#000000', blur: 10, offsetX: 0, offsetY: 2 },
    background: { enabled: false, color: '#000000', opacity: 0.7, paddingX: 20, paddingY: 10, cornerRadius: 4 },
    border: { enabled: false, color: '#E8423F', width: 2, cornerRadius: 4, paddingX: 20, paddingY: 10 },
  };
}

function effectLayer(name: string, effectType: EffectLayer['effectType'], dur: number): EffectLayer {
  return {
    ...baseLayer(name, dur),
    type: 'effect',
    effectType,
    config: {},
  };
}

export const TEMPLATES: Template[] = [
  ...VERSION1_TEMPLATES,
  ...TONY_TEMPLATES,
  {
    id: 'dj-lineup',
    name: 'DJ Line-Up',
    description: 'Announce your lineup with artist names and times',
    category: 'Events',
    factory: () => {
      const dur = 16000;
      const layers = [
        effectLayer('Vignette', 'vignette', dur),
        effectLayer('Scanlines', 'scanlines', dur),
        effectLayer('Grid', 'grid', dur),
        {
          ...baseLayer('Logo', dur),
          type: 'image' as const,
          assetId: null,
          size: { width: 400, height: 400 },
          position: { x: kf(0.5), y: kf(0.15) },
          scale: { x: kf(0.5), y: kf(0.5) },
          parallax: false,
          parallaxStartY: 0,
          parallaxDuration: 0,
        } satisfies ImageLayer,
        textLayer('Title', 'LINE-UP', 0.32, 56, dur, '#E8423F'),
        textLayer('DJ 1', 'DJ ALPHA — 22:00', 0.42, 32, dur),
        textLayer('DJ 2', 'DJ BETA — 23:30', 0.48, 32, dur),
        textLayer('DJ 3', 'DJ GAMMA — 01:00', 0.54, 32, dur),
        textLayer('DJ 4', 'DJ DELTA — 02:30', 0.60, 32, dur),
        {
          ...textLayer('Venue', 'VENUE NAME — CITY', 0.82, 22, dur, '#999999'),
          background: { enabled: true, color: '#000000', opacity: 0.5, paddingX: 24, paddingY: 8, cornerRadius: 4 },
        } as TextLayer,
        effectLayer('Spectrum', 'spectrum', dur),
        effectLayer('Corner Accents', 'corner-accents', dur),
      ];
      return {
        metadata: baseMeta('DJ Line-Up'),
        settings: baseSettings(dur),
        layers,
        audio: baseAudio(),
        exportPreset: EXPORT_PRESETS[0],
        safeAreas: INSTAGRAM_SAFE_AREAS,
      };
    },
  },
  {
    id: 'event-promo',
    name: 'Event Promo',
    description: 'Promote your event with date, venue, and lineup',
    category: 'Events',
    factory: () => {
      const dur = 15000;
      const layers = [
        effectLayer('Vignette', 'vignette', dur),
        effectLayer('Glitch', 'glitch', dur),
        {
          ...baseLayer('Logo', dur),
          type: 'image' as const,
          assetId: null,
          size: { width: 600, height: 600 },
          position: { x: kf(0.5), y: kf(0.28) },
          scale: { x: kf(0.7), y: kf(0.7) },
          parallax: true,
          parallaxStartY: -0.3,
          parallaxDuration: 3000,
        } satisfies ImageLayer,
        textLayer('Event Name', 'EVENT NAME', 0.48, 52, dur, '#E8423F'),
        textLayer('Date', 'SATURDAY 15 NOV', 0.56, 28, dur),
        textLayer('Time', '22:00 — LATE', 0.61, 24, dur, '#CCCCCC'),
        {
          ...textLayer('Venue', 'VENUE — CITY', 0.68, 22, dur, '#AAAAAA'),
          border: { enabled: true, color: '#E8423F', width: 1, cornerRadius: 4, paddingX: 20, paddingY: 8 },
        } as TextLayer,
        textLayer('Tickets', 'TICKETS ON SALE NOW', 0.85, 18, dur, '#E8423F'),
        effectLayer('Sweep', 'sweep', dur),
        effectLayer('Corner Accents', 'corner-accents', dur),
        effectLayer('Spectrum', 'spectrum', dur),
      ];
      return {
        metadata: baseMeta('Event Promo'),
        settings: baseSettings(dur, 128),
        layers,
        audio: baseAudio(),
        exportPreset: EXPORT_PRESETS[0],
        safeAreas: INSTAGRAM_SAFE_AREAS,
      };
    },
  },
  {
    id: 'track-release',
    name: 'Track Release',
    description: 'Announce a new track or EP release',
    category: 'Music',
    factory: () => {
      const dur = 16000;
      const layers = [
        effectLayer('Vignette', 'vignette', dur),
        effectLayer('Scanlines', 'scanlines', dur),
        {
          ...baseLayer('Artwork', dur),
          type: 'image' as const,
          assetId: null,
          size: { width: 800, height: 800 },
          position: { x: kf(0.5), y: kf(0.35) },
          scale: { x: kf(0.75), y: kf(0.75) },
          parallax: false,
          parallaxStartY: 0,
          parallaxDuration: 0,
        } satisfies ImageLayer,
        textLayer('OUT NOW', 'OUT NOW', 0.18, 28, dur, '#E8423F'),
        textLayer('Track Title', 'TRACK TITLE', 0.58, 44, dur),
        textLayer('Artist', 'ARTIST NAME', 0.64, 24, dur, '#CCCCCC'),
        textLayer('Label', 'LABEL NAME', 0.70, 18, dur, '#888888'),
        textLayer('CTA', 'LINK IN BIO', 0.88, 20, dur, '#E8423F'),
        effectLayer('Waveform', 'waveform', dur),
        effectLayer('Pulsing Logo', 'pulsing-logo', dur),
      ];
      return {
        metadata: baseMeta('Track Release'),
        settings: baseSettings(dur, 126),
        layers,
        audio: baseAudio(),
        exportPreset: EXPORT_PRESETS[0],
        safeAreas: INSTAGRAM_SAFE_AREAS,
      };
    },
  },
  {
    id: 'countdown',
    name: 'Countdown',
    description: 'Count down to your event or release',
    category: 'Events',
    factory: () => {
      const dur = 12000;
      const layers = [
        effectLayer('Vignette', 'vignette', dur),
        effectLayer('Grid', 'grid', dur),
        {
          ...baseLayer('Logo', dur),
          type: 'image' as const,
          assetId: null,
          size: { width: 400, height: 400 },
          position: { x: kf(0.5), y: kf(0.22) },
          scale: { x: kf(0.45), y: kf(0.45) },
          parallax: false,
          parallaxStartY: 0,
          parallaxDuration: 0,
        } satisfies ImageLayer,
        {
          ...textLayer('Count', '3', 0.48, 120, dur, '#E8423F'),
          opacity: kf2(0, 0, 500, 1, 'ease-out'),
          scale: { x: kf2(0, 2, 500, 1, 'ease-out-back'), y: kf2(0, 2, 500, 1, 'ease-out-back') },
        } as TextLayer,
        textLayer('Label', 'DAYS TO GO', 0.60, 28, dur),
        textLayer('Event', 'EVENT NAME', 0.72, 36, dur),
        textLayer('Date', '15.11.2026', 0.78, 20, dur, '#AAAAAA'),
        effectLayer('Scanlines', 'scanlines', dur),
        effectLayer('Corner Accents', 'corner-accents', dur),
        effectLayer('Pulsing Logo', 'pulsing-logo', dur),
      ];
      return {
        metadata: baseMeta('Countdown'),
        settings: baseSettings(dur, 130),
        layers,
        audio: baseAudio(),
        exportPreset: EXPORT_PRESETS[0],
        safeAreas: INSTAGRAM_SAFE_AREAS,
      };
    },
  },
  {
    id: 'logo-sting',
    name: 'Logo Sting',
    description: 'Short animated logo reveal',
    category: 'Branding',
    factory: () => {
      const dur = 5000;
      const layers = [
        effectLayer('Vignette', 'vignette', dur),
        {
          ...baseLayer('Logo', dur),
          type: 'image' as const,
          assetId: null,
          size: { width: 800, height: 800 },
          position: { x: kf(0.5), y: kf(0.45) },
          scale: {
            x: kf2(0, 0, 800, 0.8, 'spring'),
            y: kf2(0, 0, 800, 0.8, 'spring'),
          },
          opacity: kf2(0, 0, 400, 1, 'ease-out'),
          parallax: false,
          parallaxStartY: 0,
          parallaxDuration: 0,
        } satisfies ImageLayer,
        {
          ...baseLayer('Flash', dur),
          type: 'shape' as const,
          shapeType: 'rect' as const,
          size: { width: 1080, height: 1920 },
          fill: { enabled: true, color: '#FFFFFF' },
          stroke: { enabled: false, color: '#000', width: 0 },
          cornerRadius: 0,
          opacity: kf2(600, 0.8, 1200, 0, 'ease-out'),
          inTime: 600,
          outTime: 1200,
        } satisfies ShapeLayer,
        effectLayer('Glitch', 'glitch', dur),
        effectLayer('Corner Accents', 'corner-accents', dur),
        effectLayer('Pulsing Logo', 'pulsing-logo', dur),
      ];
      return {
        metadata: baseMeta('Logo Sting'),
        settings: baseSettings(dur, 128),
        layers,
        audio: baseAudio(),
        exportPreset: EXPORT_PRESETS[0],
        safeAreas: INSTAGRAM_SAFE_AREAS,
      };
    },
  },
];
