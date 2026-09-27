import type { GroupLayer, Layer, Project } from './schema.ts';
import { generateId } from './schema.ts';

const constant = (value: number) => ({ keyframes: [{ time: 0, value, easing: 'linear' as const }] });

/** Group members remain in the layer stack, preserving their drawing order. */
export function createLayerGroup(source: Project, ids: string[]): { project: Project; group: GroupLayer | null } {
  const members = source.layers.filter(layer => ids.includes(layer.id) && layer.type !== 'group' &&
    !source.layers.some(candidate => candidate.type === 'group' && candidate.children.includes(layer.id)));
  if (members.length < 2) return { project: source, group: null };
  const group: GroupLayer = {
    id: generateId(), type: 'group', name: 'New group', children: members.map(layer => layer.id),
    visible: true, locked: false, opacity: constant(1),
    position: { x: constant(0.5), y: constant(0.5) },
    scale: { x: constant(1), y: constant(1) }, rotation: constant(0),
    inTime: Math.min(...members.map(layer => layer.inTime)),
    outTime: Math.max(...members.map(layer => layer.outTime)), blendMode: 'source-over',
    entrance: { direction: 'none', startTime: Math.min(...members.map(layer => layer.inTime)), duration: 600, stagger: 180, alternate: false },
  };
  const firstIndex = source.layers.findIndex(layer => layer.id === members[0].id);
  const layers = [...source.layers];
  layers.splice(firstIndex, 0, group);
  return { project: { ...source, layers }, group };
}

export function getGroupForLayer(layers: Layer[], layerId: string): GroupLayer | undefined {
  return layers.find((layer): layer is GroupLayer => layer.type === 'group' && layer.children.includes(layerId));
}
