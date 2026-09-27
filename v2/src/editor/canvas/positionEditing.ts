import type { AnimatedProperty, Layer } from '../../core/schema.ts';
import { evaluateProperty } from '../../timeline/interpolation.ts';

type Position = Layer['position'];

function shift(property: AnimatedProperty, delta: number): AnimatedProperty {
  return { keyframes: property.keyframes.map(frame => ({ ...frame, value: frame.value + delta })) };
}

function keyAt(property: AnimatedProperty, timeMs: number, delta: number): AnimatedProperty {
  const value = evaluateProperty(property, timeMs) + delta;
  const keyframes = property.keyframes.filter(frame => frame.time !== timeMs);
  keyframes.push({ time: timeMs, value, easing: 'ease-out' });
  keyframes.sort((a, b) => a.time - b.time);
  return { keyframes };
}

export function translatePosition(
  source: Position, dx: number, dy: number, timeMs: number, autoKeyframe: boolean,
): Position {
  const edit = autoKeyframe ? (property: AnimatedProperty, delta: number) => keyAt(property, timeMs, delta) : shift;
  return { x: edit(source.x, dx), y: edit(source.y, dy) };
}
