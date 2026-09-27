import { describe, expect, it } from 'vitest';
import { getBackgroundSlideOffset } from '../../src/render/backgroundMotion.ts';

describe('background photo slide', () => {
  it.each([
    ['top', 0, -1920],
    ['bottom', 0, 1920],
    ['left', -1080, 0],
    ['right', 1080, 0],
  ] as const)('starts fully off canvas from %s', (direction, x, y) => {
    const motion = { direction, startTime: 500, duration: 1000 };
    expect(getBackgroundSlideOffset(motion, 0, 1080, 1920)).toEqual({ x, y });
    expect(getBackgroundSlideOffset(motion, 500, 1080, 1920)).toEqual({ x, y });
    expect(getBackgroundSlideOffset(motion, 1500, 1080, 1920)).toEqual({ x: 0, y: 0 });
    expect(getBackgroundSlideOffset(motion, 3000, 1080, 1920)).toEqual({ x: 0, y: 0 });
  });

  it('moves smoothly toward the final position and keeps old projects static', () => {
    expect(getBackgroundSlideOffset({ direction: 'left', startTime: 0, duration: 1000 }, 500, 100, 200)).toEqual({ x: -12.5, y: 0 });
    expect(getBackgroundSlideOffset(undefined, 500, 100, 200)).toEqual({ x: 0, y: 0 });
  });
});
