import type { AnimatedProperty, EasingType, Keyframe, Layer } from '../core/schema.ts';
import { evaluateProperty } from './interpolation.ts';

export interface MotionPreset {
  id: string;
  name: string;
  category: 'entrance' | 'exit' | 'emphasis';
  properties: MotionPresetProperty[];
  durationMs: number;
}

interface MotionPresetProperty {
  path: string[];
  from: number | 'current';
  to: number | 'current';
  easing: EasingType;
}

export const MOTION_PRESETS: MotionPreset[] = [
  {
    id: 'fade-in',
    name: 'Fade In',
    category: 'entrance',
    durationMs: 500,
    properties: [
      { path: ['opacity'], from: 0, to: 'current', easing: 'ease-out' },
    ],
  },
  {
    id: 'fade-out',
    name: 'Fade Out',
    category: 'exit',
    durationMs: 500,
    properties: [
      { path: ['opacity'], from: 'current', to: 0, easing: 'ease-in' },
    ],
  },
  {
    id: 'slide-up-in',
    name: 'Slide Up',
    category: 'entrance',
    durationMs: 600,
    properties: [
      { path: ['position', 'y'], from: 1.3, to: 'current', easing: 'ease-out-cubic' },
      { path: ['opacity'], from: 0, to: 'current', easing: 'ease-out' },
    ],
  },
  {
    id: 'slide-down-in',
    name: 'Slide Down',
    category: 'entrance',
    durationMs: 600,
    properties: [
      { path: ['position', 'y'], from: -0.3, to: 'current', easing: 'ease-out-cubic' },
      { path: ['opacity'], from: 0, to: 'current', easing: 'ease-out' },
    ],
  },
  {
    id: 'slide-left-in',
    name: 'Slide Left',
    category: 'entrance',
    durationMs: 600,
    properties: [
      { path: ['position', 'x'], from: 1.3, to: 'current', easing: 'ease-out-cubic' },
      { path: ['opacity'], from: 0, to: 'current', easing: 'ease-out' },
    ],
  },
  {
    id: 'slide-right-in',
    name: 'Slide Right',
    category: 'entrance',
    durationMs: 600,
    properties: [
      { path: ['position', 'x'], from: -0.3, to: 'current', easing: 'ease-out-cubic' },
      { path: ['opacity'], from: 0, to: 'current', easing: 'ease-out' },
    ],
  },
  {
    id: 'scale-in',
    name: 'Scale In',
    category: 'entrance',
    durationMs: 500,
    properties: [
      { path: ['scale', 'x'], from: 0, to: 'current', easing: 'ease-out-back' },
      { path: ['scale', 'y'], from: 0, to: 'current', easing: 'ease-out-back' },
      { path: ['opacity'], from: 0, to: 'current', easing: 'ease-out' },
    ],
  },
  {
    id: 'scale-out',
    name: 'Scale Out',
    category: 'exit',
    durationMs: 400,
    properties: [
      { path: ['scale', 'x'], from: 'current', to: 0, easing: 'ease-in' },
      { path: ['scale', 'y'], from: 'current', to: 0, easing: 'ease-in' },
      { path: ['opacity'], from: 'current', to: 0, easing: 'ease-in' },
    ],
  },
  {
    id: 'slide-up-out',
    name: 'Slide Up Out',
    category: 'exit',
    durationMs: 500,
    properties: [
      { path: ['position', 'y'], from: 'current', to: -0.3, easing: 'ease-in' },
      { path: ['opacity'], from: 'current', to: 0, easing: 'ease-in' },
    ],
  },
  {
    id: 'slide-down-out',
    name: 'Slide Down Out',
    category: 'exit',
    durationMs: 500,
    properties: [
      { path: ['position', 'y'], from: 'current', to: 1.3, easing: 'ease-in' },
      { path: ['opacity'], from: 'current', to: 0, easing: 'ease-in' },
    ],
  },
  {
    id: 'bounce-in',
    name: 'Bounce In',
    category: 'entrance',
    durationMs: 800,
    properties: [
      { path: ['scale', 'x'], from: 0, to: 'current', easing: 'bounce' },
      { path: ['scale', 'y'], from: 0, to: 'current', easing: 'bounce' },
      { path: ['opacity'], from: 0, to: 'current', easing: 'ease-out' },
    ],
  },
  {
    id: 'spring-in',
    name: 'Spring In',
    category: 'entrance',
    durationMs: 700,
    properties: [
      { path: ['scale', 'x'], from: 0, to: 'current', easing: 'spring' },
      { path: ['scale', 'y'], from: 0, to: 'current', easing: 'spring' },
      { path: ['opacity'], from: 0, to: 'current', easing: 'ease-out' },
    ],
  },
  {
    id: 'pulse',
    name: 'Pulse',
    category: 'emphasis',
    durationMs: 600,
    properties: [
      { path: ['scale', 'x'], from: 'current', to: 1.15, easing: 'ease-in-out' },
      { path: ['scale', 'y'], from: 'current', to: 1.15, easing: 'ease-in-out' },
    ],
  },
  {
    id: 'rotate-in',
    name: 'Rotate In',
    category: 'entrance',
    durationMs: 600,
    properties: [
      { path: ['rotation'], from: -0.25, to: 'current', easing: 'ease-out-back' },
      { path: ['scale', 'x'], from: 0, to: 'current', easing: 'ease-out-back' },
      { path: ['scale', 'y'], from: 0, to: 'current', easing: 'ease-out-back' },
      { path: ['opacity'], from: 0, to: 'current', easing: 'ease-out' },
    ],
  },
];

function getNestedProp(obj: Record<string, unknown>, path: string[]): AnimatedProperty | null {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur && typeof cur === 'object' && key in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return null;
    }
  }
  if (cur && typeof cur === 'object' && 'keyframes' in (cur as Record<string, unknown>)) {
    return cur as AnimatedProperty;
  }
  return null;
}

function setNestedProp(obj: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  if (path.length === 1) {
    return { ...obj, [path[0]]: value };
  }
  return {
    ...obj,
    [path[0]]: setNestedProp(obj[path[0]] as Record<string, unknown>, path.slice(1), value),
  };
}

export function applyMotionPreset(layer: Layer, preset: MotionPreset, atTimeMs: number): Layer {
  let result = layer as unknown as Record<string, unknown>;

  for (const prop of preset.properties) {
    const animProp = getNestedProp(result, prop.path);
    if (!animProp) continue;

    const currentValue = evaluateProperty(animProp, atTimeMs);
    const fromValue = prop.from === 'current' ? currentValue : prop.from;
    const toValue = prop.to === 'current' ? currentValue : prop.to;

    let startTime: number;
    let endTime: number;

    if (preset.category === 'entrance') {
      startTime = atTimeMs;
      endTime = atTimeMs + preset.durationMs;
    } else if (preset.category === 'exit') {
      startTime = atTimeMs;
      endTime = atTimeMs + preset.durationMs;
    } else {
      startTime = atTimeMs;
      endTime = atTimeMs + preset.durationMs / 2;
    }

    const newKfs: Keyframe[] = [];
    for (const kf of animProp.keyframes) {
      if (kf.time < startTime || kf.time > endTime) {
        newKfs.push(kf);
      }
    }

    newKfs.push({ time: startTime, value: fromValue, easing: 'linear' });
    newKfs.push({ time: endTime, value: toValue, easing: prop.easing });

    if (preset.category === 'emphasis') {
      newKfs.push({ time: atTimeMs + preset.durationMs, value: currentValue, easing: prop.easing });
    }

    newKfs.sort((a, b) => a.time - b.time);
    result = setNestedProp(result, prop.path, { keyframes: newKfs });
  }

  return result as unknown as Layer;
}
