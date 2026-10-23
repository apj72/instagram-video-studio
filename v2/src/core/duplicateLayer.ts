import type { Layer, Project } from './schema.ts';
import { generateId } from './schema.ts';
import { getGroupForLayer } from './groups.ts';

/** Copy a layer and, for a group, its members. Project objects and keyframes stay independent. */
export function duplicateProjectLayer(source: Project, layerId: string): { project: Project; duplicateId: string | null } {
  const original = source.layers.find(layer => layer.id === layerId);
  if (!original) return { project: source, duplicateId: null };
  const names = new Set(source.layers.map(layer => layer.name));
  const ids = new Set(source.layers.map(layer => layer.id));
  const copies = new Map<string, Layer>();
  const clone = (layer: Layer): Layer => {
    const existing = copies.get(layer.id);
    if (existing) return existing;
    const copy = structuredClone(layer);
    do { copy.id = generateId(); } while (ids.has(copy.id));
    ids.add(copy.id);
    const baseName = layer.name.replace(/ copy(?: \d+)?$/, '');
    let name = `${baseName} copy`, number = 2;
    while (names.has(name)) name = `${baseName} copy ${number++}`;
    copy.name = name;
    names.add(name);
    copies.set(layer.id, copy);
    if (copy.type === 'group' && layer.type === 'group') {
      copy.children = layer.children.flatMap(id => {
        const member = source.layers.find(candidate => candidate.id === id);
        return member ? [clone(member).id] : [];
      });
    }
    return copy;
  };
  const duplicate = clone(original);
  const parent = getGroupForLayer(source.layers, original.id);
  const layers = source.layers.flatMap(layer => {
    let current = layer;
    if (parent?.id === layer.id && layer.type === 'group') {
      const children = [...layer.children];
      children.splice(children.indexOf(original.id) + 1, 0, duplicate.id);
      current = { ...layer, children };
    }
    const copy = copies.get(layer.id);
    return copy ? [current, copy] : [current];
  });
  return { project: { ...source, layers }, duplicateId: duplicate.id };
}
