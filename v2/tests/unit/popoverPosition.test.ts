import { describe, expect, it } from 'vitest';
import { fitPopoverToViewport } from '../../src/editor/timeline/popoverPosition.ts';

describe('timeline popover positioning', () => {
  it('opens above diamonds near the bottom and stays inside the right edge', () => {
    expect(fitPopoverToViewport(
      { x: 1430, y: 760 }, { width: 150, height: 300 }, { width: 1440, height: 900 },
    )).toEqual({ x: 1282, y: 454 });
  });

  it('clamps a tall menu to the screen on small displays', () => {
    expect(fitPopoverToViewport(
      { x: 2, y: 120 }, { width: 140, height: 304 }, { width: 320, height: 320 },
    )).toEqual({ x: 8, y: 8 });
  });

  it('opens below when there is room', () => {
    expect(fitPopoverToViewport(
      { x: 80, y: 100 }, { width: 140, height: 200 }, { width: 800, height: 600 },
    )).toEqual({ x: 80, y: 106 });
  });
});
