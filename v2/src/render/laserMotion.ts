export const DEFAULT_LASER_COLORS = ['#39FF14', '#FF2E93', '#22D3EE'] as const;
export const DEFAULT_LASER_SPEED = 0.2;
export const DEFAULT_LASER_SWEEP = 24;

export interface LaserOrigin { x: number; y: number }

export function getLaserOrigin(index: number, count: number, origins?: LaserOrigin[]): LaserOrigin {
  const defaults = count === 1 ? [0.5] : count === 2 ? [0.07, 0.93] : [0.07, 0.5, 0.93];
  return origins?.[index] ?? { x: defaults[index] ?? 0.5, y: 1 };
}

/** Degrees from straight up: negative aims left, positive aims right. */
export function getDefaultLaserAngle(index: number, count: number): number {
  const defaults = count === 1 ? [0] : count === 2 ? [27, -27] : [28, 0, -28];
  return defaults[index] ?? 0;
}

export function setLaserOrigin(origins: LaserOrigin[] | undefined, index: number, count: number, value: LaserOrigin): LaserOrigin[] {
  const next = Array.from({ length: Math.max(count, index + 1) }, (_, beam) => getLaserOrigin(beam, count, origins));
  next[index] = { x: Math.max(0, Math.min(1, value.x)), y: Math.max(0, Math.min(1, value.y)) };
  return next;
}

export interface LaserBeamPath {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  angleDegrees: number;
}

/** A projector stays fixed while its mirror sweeps the beam across the frame. */
export function getLaserBeamPath(
  index: number,
  count: number,
  timeMs: number,
  width: number,
  height: number,
  speed = DEFAULT_LASER_SPEED,
  sweep = DEFAULT_LASER_SWEEP,
  origin?: LaserOrigin,
  insertionAngle = getDefaultLaserAngle(index, count),
): LaserBeamPath {
  const phase = index * 2.17;
  const cycles = timeMs / 1000 * Math.max(0, speed);
  const first = (Math.sin(2 * Math.PI * cycles + phase) - Math.sin(phase)) / (1 + Math.abs(Math.sin(phase)));
  const secondPhase = phase * 1.6;
  const second = (Math.sin(2 * Math.PI * cycles * 0.37 + secondPhase) - Math.sin(secondPhase)) / (1 + Math.abs(Math.sin(secondPhase)));
  const angularOffset = sweep * (first * 0.82 + second * 0.18);
  const angleDegrees = insertionAngle - 90 + angularOffset;
  const radians = angleDegrees * Math.PI / 180;
  const insertionPoint = origin ?? getLaserOrigin(index, count);
  const startX = width * insertionPoint.x;
  const startY = height * insertionPoint.y;
  const reach = Math.hypot(width, height) * 2;
  return {
    startX,
    startY,
    endX: startX + Math.cos(radians) * reach,
    endY: startY + Math.sin(radians) * reach,
    angleDegrees,
  };
}
