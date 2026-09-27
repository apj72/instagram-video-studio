import { describe, expect, it } from 'vitest';
import { getBackgroundPlacement } from '../../src/editor/backgroundCrop.ts';

describe('background photo placement', () => {
  it('covers a portrait template at 1× and crops further when zoomed in', () => {
    const fit = getBackgroundPlacement(4000, 3000, 1080, 1350, 1, 0.5, 0.5);
    const zoomed = getBackgroundPlacement(4000, 3000, 1080, 1350, 2, 0.75, 0.25);
    expect(fit.dh).toBeCloseTo(1350);
    expect(fit.dw).toBeGreaterThan(1080);
    expect(zoomed.dw).toBeCloseTo(fit.dw * 2);
    expect(zoomed.dx).toBeLessThan(fit.dx);
  });

  it('shows the whole photo with background space around it below 1×', () => {
    const placement = getBackgroundPlacement(4000, 3000, 1080, 1350, 0.5, 0.5, 0.5);
    expect(placement.dw).toBeLessThan(1080);
    expect(placement.dh).toBeLessThan(1350);
    expect(placement.dx).toBeCloseTo((1080 - placement.dw) / 2);
    expect(placement.dy).toBeCloseTo((1350 - placement.dh) / 2);
  });

  it('allows the zoomed-out image to be placed at a frame edge', () => {
    const left = getBackgroundPlacement(1200, 1800, 1080, 1920, 0.4, 0, 0);
    const right = getBackgroundPlacement(1200, 1800, 1080, 1920, 0.4, 1, 1);
    expect(left.dx).toBe(0);
    expect(left.dy).toBe(0);
    expect(right.dx + right.dw).toBeCloseTo(1080);
    expect(right.dy + right.dh).toBeCloseTo(1920);
  });
});
