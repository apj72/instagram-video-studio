import type { Layer, AnimatedProperty } from '../core/schema.ts';

export interface AnimPropEntry {
  name: string;
  path: string[];
  prop: AnimatedProperty;
}

export function getAnimatedProperties(layer: Layer): AnimPropEntry[] {
  const entries: AnimPropEntry[] = [
    { name: 'opacity', path: ['opacity'], prop: layer.opacity },
    { name: 'pos X', path: ['position', 'x'], prop: layer.position.x },
    { name: 'pos Y', path: ['position', 'y'], prop: layer.position.y },
    { name: 'scale X', path: ['scale', 'x'], prop: layer.scale.x },
    { name: 'scale Y', path: ['scale', 'y'], prop: layer.scale.y },
    { name: 'rotation', path: ['rotation'], prop: layer.rotation },
  ];
  if (layer.type === 'text') {
    entries.push({ name: 'fontSize', path: ['fontSize'], prop: layer.fontSize });
  }
  return entries;
}

