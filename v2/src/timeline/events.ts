import type { AnimatedProperty, Layer } from '../core/schema.ts';
import { evaluateProperty } from './interpolation.ts';

export interface TimelineEvent { time: number; label: string; properties: string[] }

export function getVisibleSpan(layer: Layer, duration: number): { start: number; end: number } {
  const start = Math.max(0, layer.inTime);
  const end = Math.min(duration, layer.outTime);
  const frames = layer.opacity.keyframes;
  if (frames.length < 2) return { start, end };
  const first = frames.findIndex(frame => frame.value > 0);
  const last = frames.findLastIndex(frame => frame.value > 0);
  if (first < 0 || last < 0) return { start, end: start };
  const visibleStart = first > 0 ? frames[first - 1].time : frames[first].time;
  const visibleEnd = last < frames.length - 1 ? frames[last + 1].time : frames[last].time;
  return { start: Math.max(start, visibleStart), end: Math.min(end, visibleEnd) };
}

export function getFirstVisibleTime(layer: Layer, duration: number): number {
  const { start, end } = getVisibleSpan(layer, duration);
  if (end <= start) return start;
  if (evaluateProperty(layer.opacity, start) > 0) {
    // The renderer fades all layers in at the very beginning of the video.
    return start === 0 ? Math.min(end, Math.min(100, duration * 0.01)) : start;
  }

  const frames = [...layer.opacity.keyframes].sort((a, b) => a.time - b.time);
  const firstVisible = frames.findIndex(frame => frame.time > start && frame.value > 0);
  if (firstVisible < 0) return start;
  const previous = frames[firstVisible - 1];
  const visible = frames[firstVisible];
  const fadeStart = Math.max(start, previous?.time ?? start);
  // Seek just inside the fade, so the selected layer is visible while its entrance remains easy to inspect.
  return Math.min(end, visible.time, fadeStart + Math.min(100, (visible.time - fadeStart) * 0.2));
}

export function getLayerEvents(layer: Layer, duration: number): TimelineEvent[] {
  const properties: Array<[string, AnimatedProperty]> = [
    ['Opacity', layer.opacity],
    ['Position X', layer.position.x],
    ['Position Y', layer.position.y],
    ['Scale X', layer.scale.x],
    ['Scale Y', layer.scale.y],
    ['Rotation', layer.rotation],
  ];
  if (layer.type === 'text') properties.push(['Font size', layer.fontSize]);
  const grouped = new Map<number, Set<string>>();
  for (const [name, property] of properties) {
    if (property.keyframes.length < 2) continue;
    for (const frame of property.keyframes) {
      const time = Math.round(frame.time);
      if (time < 0 || time > duration) continue;
      if (!grouped.has(time)) grouped.set(time, new Set());
      grouped.get(time)!.add(name);
    }
  }
  const events = [...grouped.entries()].sort(([a], [b]) => a - b).map(([time, names]) => {
    const properties = [...names];
    const hasMove = properties.some(name => name.startsWith('Position'));
    const hasOpacity = properties.includes('Opacity');
    const label = time === 0 ? 'Start'
      : time === duration ? 'End'
        : hasMove && hasOpacity ? 'Move + fade'
          : hasMove ? 'Move'
            : hasOpacity ? 'Fade'
              : 'Change';
    return { time, label, properties };
  });
  if (layer.type === 'group' && layer.entrance && layer.entrance.direction !== 'none') {
    layer.children.forEach((_, index) => {
      const time = layer.entrance!.startTime + index * layer.entrance!.stagger;
      if (time >= 0 && time <= duration) events.push({
        time, label: `Slide ${index + 1}`, properties: [`Member ${index + 1} enters from ${layer.entrance!.direction}`],
      });
    });
  }
  return events.sort((a, b) => a.time - b.time);
}
