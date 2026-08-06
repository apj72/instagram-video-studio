import { describe, it, expect } from 'vitest';
import { MOTION_PRESETS, applyMotionPreset } from '../../src/timeline/presets.ts';
import { createDefaultProject } from '../../src/core/schema.ts';
import { evaluateProperty } from '../../src/timeline/interpolation.ts';

describe('motion presets', () => {
  it('has presets for all categories', () => {
    const categories = new Set(MOTION_PRESETS.map(p => p.category));
    expect(categories.has('entrance')).toBe(true);
    expect(categories.has('exit')).toBe(true);
    expect(categories.has('emphasis')).toBe(true);
  });

  it('all presets have unique IDs', () => {
    const ids = MOTION_PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fade-in sets opacity from 0 to current', () => {
    const project = createDefaultProject();
    const layer = project.layers[0];
    const fadeIn = MOTION_PRESETS.find(p => p.id === 'fade-in')!;
    const result = applyMotionPreset(layer, fadeIn, 0);

    expect(evaluateProperty(result.opacity, 0)).toBeCloseTo(0, 3);
    expect(evaluateProperty(result.opacity, fadeIn.durationMs)).toBeCloseTo(1, 3);
  });

  it('fade-out sets opacity from current to 0', () => {
    const project = createDefaultProject();
    const layer = project.layers[0];
    const fadeOut = MOTION_PRESETS.find(p => p.id === 'fade-out')!;
    const result = applyMotionPreset(layer, fadeOut, 5000);

    expect(evaluateProperty(result.opacity, 5000)).toBeCloseTo(1, 3);
    expect(evaluateProperty(result.opacity, 5000 + fadeOut.durationMs)).toBeCloseTo(0, 3);
  });

  it('scale-in sets scale from 0 to current', () => {
    const project = createDefaultProject();
    const layer = project.layers[0];
    const scaleIn = MOTION_PRESETS.find(p => p.id === 'scale-in')!;
    const result = applyMotionPreset(layer, scaleIn, 0);

    expect(evaluateProperty(result.scale.x, 0)).toBeCloseTo(0, 3);
    expect(evaluateProperty(result.scale.y, 0)).toBeCloseTo(0, 3);
  });

  it('preset application preserves layer identity', () => {
    const project = createDefaultProject();
    const layer = project.layers[0];
    const preset = MOTION_PRESETS[0];
    const result = applyMotionPreset(layer, preset, 0);

    expect(result.id).toBe(layer.id);
    expect(result.name).toBe(layer.name);
    expect(result.type).toBe(layer.type);
  });

  it('all presets have positive duration', () => {
    for (const preset of MOTION_PRESETS) {
      expect(preset.durationMs).toBeGreaterThan(0);
    }
  });
});
