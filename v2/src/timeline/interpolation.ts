import type { AnimatedProperty, EasingType } from '../core/schema.ts';

const easingFunctions: Record<EasingType, (t: number) => number> = {
  'linear': (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'ease-out-cubic': (t) => 1 - Math.pow(1 - t, 3),
  'ease-out-expo': (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  'ease-out-back': (t) => {
    const c = 1.7;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  'spring': (t) => {
    const freq = 4.7;
    const decay = 4;
    return 1 - Math.exp(-decay * t) * Math.cos(freq * Math.PI * t);
  },
  'bounce': (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
    if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
    t -= 2.625 / 2.75;
    return 7.5625 * t * t + 0.984375;
  },
};

export function applyEasing(t: number, easing: EasingType): number {
  return (easingFunctions[easing] ?? easingFunctions.linear)(Math.max(0, Math.min(1, t)));
}

export function evaluateProperty(prop: AnimatedProperty, timeMs: number): number {
  const kfs = prop.keyframes;
  if (kfs.length === 0) return 0;
  if (kfs.length === 1) return kfs[0].value;

  if (timeMs <= kfs[0].time) return kfs[0].value;
  if (timeMs >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;

  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (timeMs >= a.time && timeMs <= b.time) {
      const segmentDuration = b.time - a.time;
      if (segmentDuration <= 0) return a.value;
      const localT = (timeMs - a.time) / segmentDuration;
      const easedT = applyEasing(localT, b.easing);
      return a.value + (b.value - a.value) * easedT;
    }
  }

  return kfs[kfs.length - 1].value;
}
