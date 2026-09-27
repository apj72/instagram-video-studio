import { describe, expect, it } from 'vitest';
import { getLaserBeamPath, getLaserOrigin, setLaserOrigin } from '../../src/render/laserMotion.ts';

describe('laser beam motion', () => {
  it('sweeps a fixed projector across the frame over time', () => {
    const first = getLaserBeamPath(0, 2, 1000, 1080, 1350);
    const later = getLaserBeamPath(0, 2, 2250, 1080, 1350);
    expect(first.startX).toBe(later.startX);
    expect(first.startY).toBe(later.startY);
    expect(first.angleDegrees).not.toBeCloseTo(later.angleDegrees);
    expect(first.endX).not.toBeCloseTo(later.endX);
    expect(getLaserBeamPath(0, 2, 1000, 1080, 1350)).toEqual(first);
  });

  it('holds steady when speed is zero and spreads multiple beams across the screen', () => {
    const left = getLaserBeamPath(0, 3, 0, 1080, 1920, 0);
    const right = getLaserBeamPath(2, 3, 6000, 1080, 1920, 0);
    expect(getLaserBeamPath(0, 3, 6000, 1080, 1920, 0)).toEqual(left);
    expect(left.startX).toBeLessThan(right.startX);
    expect(left.endY).toBeLessThan(left.startY);
    expect(right.endY).toBeLessThan(right.startY);
  });

  it('starts a beam at its chosen insertion point', () => {
    const origins = setLaserOrigin(undefined, 1, 2, { x: 0.3, y: 0.65 });
    expect(getLaserOrigin(0, 2, origins)).toEqual({ x: 0.07, y: 1 });
    const path = getLaserBeamPath(1, 2, 1200, 1080, 1350, 0.2, 24, origins[1]);
    expect(path.startX).toBeCloseTo(324);
    expect(path.startY).toBeCloseTo(877.5);
  });

  it('aims each beam from its chosen insertion angle before sweeping', () => {
    const origin = { x: 0.5, y: 0.8 };
    const up = getLaserBeamPath(0, 1, 0, 1080, 1350, 0, 0, origin, 0);
    const right = getLaserBeamPath(0, 1, 0, 1080, 1350, 0, 0, origin, 45);
    expect(up.angleDegrees).toBe(-90);
    expect(up.endX).toBeCloseTo(up.startX);
    expect(right.angleDegrees).toBe(-45);
    expect(right.endX).toBeGreaterThan(up.endX);
    const secondBeam = getLaserBeamPath(1, 2, 0, 1080, 1350, 0.2, 24, origin, -35);
    expect(secondBeam.angleDegrees).toBe(-125);
  });
});
