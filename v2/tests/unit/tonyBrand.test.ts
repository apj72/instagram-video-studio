import { describe, expect, it } from 'vitest';
import { TONY_BRAND_ASSETS, TONY_TEMPLATES } from '../../src/templates/tonyBrand.ts';
import { evaluateProperty } from '../../src/timeline/interpolation.ts';

describe('Tony T brand templates', () => {
  it('provides editable projects for the three video formats', () => {
    const dimensions = [[1080, 1350], [1080, 1350], [1080, 1920], [1080, 1080],
      [1080, 1350], [1080, 1920], [1080, 1080]];
    const assetIds = new Set(TONY_BRAND_ASSETS.map(asset => asset.id));

    expect(TONY_TEMPLATES).toHaveLength(7);
    TONY_TEMPLATES.forEach((template, index) => {
      const project = template.factory();
      expect([project.settings.width, project.settings.height]).toEqual(dimensions[index]);
      expect(assetIds.has(project.settings.backgroundImageAssetId!)).toBe(true);
      expect(project.exportPreset.width).toBe(project.settings.width);
      expect(project.exportPreset.height).toBe(project.settings.height);
      expect(project.layers.some(layer => layer.type === 'text' && layer.headlineEffect?.mode === 'stacked')).toBe(true);
      expect(project.layers.filter(layer => layer.type === 'text' && layer.fontFamily === 'Permanent Marker')).toHaveLength(1);
      expect(project.layers.filter(layer => layer.type === 'effect' && layer.effectType === 'laser-beams').every(layer => Number(layer.config.count) <= 3)).toBe(true);
    });
  });

  it('includes the September Mix release text', () => {
    const project = TONY_TEMPLATES[0].factory();
    const text = project.layers.filter(layer => layer.type === 'text').map(layer => layer.text);
    expect(text).toContain('SEPTEMBER\\nMIX');
    expect(text).toContain('@TONYT.DJ · SOUNDCLOUD');
  });

  it('adds staged entrances from each edge without changing the simple templates', () => {
    expect(TONY_TEMPLATES.slice(0, 4).every(template => template.category === 'DJ Tony T')).toBe(true);
    for (const template of TONY_TEMPLATES.slice(4)) {
      const project = template.factory();
      const text = project.layers.filter(layer => layer.type === 'text');
      const starts = text.map(layer => ({
        x: evaluateProperty(layer.position.x, 0),
        y: evaluateProperty(layer.position.y, 0),
      }));
      expect(starts.some(point => point.x < 0)).toBe(true);
      expect(starts.some(point => point.x > 1)).toBe(true);
      expect(starts.some(point => point.y < 0)).toBe(true);
      expect(starts.some(point => point.y > 1)).toBe(true);
      expect(text.every(layer => evaluateProperty(layer.opacity, 0) === 0)).toBe(true);
      expect(text.every(layer => evaluateProperty(layer.opacity, 5000) === 1)).toBe(true);
      expect(text.every(layer => evaluateProperty(layer.opacity, project.settings.duration) === 0)).toBe(true);
      expect(text.every(layer => {
        const x = evaluateProperty(layer.position.x, 5000);
        const y = evaluateProperty(layer.position.y, 5000);
        return x > 0 && x < 1 && y > 0 && y < 1;
      })).toBe(true);
    }
  });
});
