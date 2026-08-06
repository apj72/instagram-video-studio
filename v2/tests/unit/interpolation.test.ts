import { describe, it, expect } from 'vitest';
import { evaluateProperty, applyEasing } from '../../src/timeline/interpolation.ts';
import type { AnimatedProperty } from '../../src/core/schema.ts';

describe('interpolation', () => {
  describe('evaluateProperty', () => {
    it('returns 0 for empty keyframes', () => {
      const prop: AnimatedProperty = { keyframes: [] };
      expect(evaluateProperty(prop, 500)).toBe(0);
    });

    it('returns single keyframe value at any time', () => {
      const prop: AnimatedProperty = {
        keyframes: [{ time: 0, value: 0.75, easing: 'linear' }],
      };
      expect(evaluateProperty(prop, 0)).toBe(0.75);
      expect(evaluateProperty(prop, 5000)).toBe(0.75);
      expect(evaluateProperty(prop, 10000)).toBe(0.75);
    });

    it('clamps to first keyframe before start', () => {
      const prop: AnimatedProperty = {
        keyframes: [
          { time: 1000, value: 0.5, easing: 'linear' },
          { time: 2000, value: 1.0, easing: 'linear' },
        ],
      };
      expect(evaluateProperty(prop, 0)).toBe(0.5);
      expect(evaluateProperty(prop, 500)).toBe(0.5);
    });

    it('clamps to last keyframe after end', () => {
      const prop: AnimatedProperty = {
        keyframes: [
          { time: 1000, value: 0.5, easing: 'linear' },
          { time: 2000, value: 1.0, easing: 'linear' },
        ],
      };
      expect(evaluateProperty(prop, 3000)).toBe(1.0);
    });

    it('interpolates linearly between keyframes', () => {
      const prop: AnimatedProperty = {
        keyframes: [
          { time: 0, value: 0, easing: 'linear' },
          { time: 1000, value: 1, easing: 'linear' },
        ],
      };
      expect(evaluateProperty(prop, 0)).toBeCloseTo(0, 5);
      expect(evaluateProperty(prop, 250)).toBeCloseTo(0.25, 5);
      expect(evaluateProperty(prop, 500)).toBeCloseTo(0.5, 5);
      expect(evaluateProperty(prop, 750)).toBeCloseTo(0.75, 5);
      expect(evaluateProperty(prop, 1000)).toBeCloseTo(1, 5);
    });

    it('handles multiple segments', () => {
      const prop: AnimatedProperty = {
        keyframes: [
          { time: 0, value: 0, easing: 'linear' },
          { time: 1000, value: 1, easing: 'linear' },
          { time: 2000, value: 0.5, easing: 'linear' },
        ],
      };
      expect(evaluateProperty(prop, 500)).toBeCloseTo(0.5, 5);
      expect(evaluateProperty(prop, 1500)).toBeCloseTo(0.75, 5);
    });

    it('applies ease-in easing', () => {
      const prop: AnimatedProperty = {
        keyframes: [
          { time: 0, value: 0, easing: 'linear' },
          { time: 1000, value: 1, easing: 'ease-in' },
        ],
      };
      const midpoint = evaluateProperty(prop, 500);
      expect(midpoint).toBeLessThan(0.5);
    });

    it('applies ease-out easing', () => {
      const prop: AnimatedProperty = {
        keyframes: [
          { time: 0, value: 0, easing: 'linear' },
          { time: 1000, value: 1, easing: 'ease-out' },
        ],
      };
      const midpoint = evaluateProperty(prop, 500);
      expect(midpoint).toBeGreaterThan(0.5);
    });
  });

  describe('applyEasing', () => {
    it('linear returns input unchanged', () => {
      expect(applyEasing(0, 'linear')).toBe(0);
      expect(applyEasing(0.5, 'linear')).toBe(0.5);
      expect(applyEasing(1, 'linear')).toBe(1);
    });

    it('all easing functions return 0 at t=0', () => {
      const easings = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'ease-out-cubic', 'ease-out-expo', 'bounce'] as const;
      for (const easing of easings) {
        expect(applyEasing(0, easing)).toBeCloseTo(0, 3);
      }
    });

    it('all easing functions return 1 at t=1', () => {
      const easings = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'ease-out-cubic', 'ease-out-expo', 'bounce'] as const;
      for (const easing of easings) {
        expect(applyEasing(1, easing)).toBeCloseTo(1, 3);
      }
    });

    it('clamps input to [0,1]', () => {
      expect(applyEasing(-0.5, 'linear')).toBe(0);
      expect(applyEasing(1.5, 'linear')).toBe(1);
    });
  });
});
