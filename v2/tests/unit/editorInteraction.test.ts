import { describe, expect, it } from 'vitest';
import { TONY_TEMPLATES } from '../../src/templates/tonyBrand.ts';
import { translatePosition } from '../../src/editor/canvas/positionEditing.ts';
import { getFirstVisibleTime, getLayerEvents, getVisibleSpan } from '../../src/timeline/events.ts';
import { evaluateProperty } from '../../src/timeline/interpolation.ts';

const motionProject = () => TONY_TEMPLATES.find(template => template.id === 'tony-september-mix-motion')!.factory();

describe('editor interactions for animated layers', () => {
  it('moves a whole motion path when dragging without auto-keyframe', () => {
    const layer = motionProject().layers.find(item => item.name === 'Headline')!;
    const shifted = translatePosition(layer.position, 0.1, -0.05, 5000, false);
    expect(shifted.x.keyframes).toHaveLength(layer.position.x.keyframes.length);
    expect(shifted.y.keyframes).toHaveLength(layer.position.y.keyframes.length);
    for (const time of [0, 1000, 5000, 11000]) {
      expect(evaluateProperty(shifted.x, time)).toBeCloseTo(evaluateProperty(layer.position.x, time) + 0.1);
      expect(evaluateProperty(shifted.y, time)).toBeCloseTo(evaluateProperty(layer.position.y, time) - 0.05);
    }
  });

  it('adds a position keyframe only at the playhead when auto-keyframe is on', () => {
    const layer = motionProject().layers.find(item => item.name === 'Headline')!;
    const edited = translatePosition(layer.position, 0.1, 0, 5000, true);
    expect(edited.x.keyframes.some(frame => frame.time === 5000)).toBe(true);
    expect(evaluateProperty(edited.x, 5000)).toBeCloseTo(evaluateProperty(layer.position.x, 5000) + 0.1);
    expect(evaluateProperty(edited.x, 0)).toBe(evaluateProperty(layer.position.x, 0));
  });

  it('exposes distinct named events for timeline navigation', () => {
    const project = motionProject();
    const layer = project.layers.find(item => item.name === 'Headline')!;
    const events = getLayerEvents(layer, project.settings.duration);
    expect(events.length).toBeGreaterThan(2);
    expect(events.map(event => event.time)).toEqual([...new Set(events.map(event => event.time))].sort((a, b) => a - b));
    expect(events.some(event => event.label.includes('Move'))).toBe(true);
  });

  it('shows the active text scene on its timeline bar', () => {
    const project = motionProject();
    const layer = project.layers.find(item => item.name === 'Headline')!;
    expect(getVisibleSpan(layer, project.settings.duration)).toEqual({ start: 650, end: 10420 });
  });

  it('seeks into a layer entrance when selecting it', () => {
    const project = motionProject();
    const headline = project.layers.find(item => item.name === 'Headline')!;
    const time = getFirstVisibleTime(headline, project.settings.duration);
    expect(time).toBeGreaterThan(getVisibleSpan(headline, project.settings.duration).start);
    expect(evaluateProperty(headline.opacity, time)).toBeGreaterThan(0);
    expect(time).toBeLessThan(headline.opacity.keyframes.find(frame => frame.value > 0)!.time);
  });
});
