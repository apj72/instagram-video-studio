import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultProject } from '../../src/core/schema.ts';
import type { TextLayer } from '../../src/core/schema.ts';
import { createLayerGroup } from '../../src/core/groups.ts';
import { duplicateProjectLayer } from '../../src/core/duplicateLayer.ts';
import { clearHistory, duplicateLayer, redo, undo } from '../../src/core/commands.ts';
import { loadProject, project, selectedLayerId } from '../../src/core/state.ts';
import { VERSION1_TEMPLATES } from '../../src/templates/version1Events.ts';

afterEach(clearHistory);

describe('duplicate a configured layer', () => {
  it('preserves text styling, timing and animation without sharing mutable configuration', () => {
    const source = VERSION1_TEMPLATES[0].factory();
    const layer = source.layers.find((layer): layer is TextLayer => layer.type === 'text')!;
    const before = structuredClone(source);
    const result = duplicateProjectLayer(source, layer.id);
    const copy = result.project.layers.find(layer => layer.id === result.duplicateId) as TextLayer;
    expect(copy).toEqual({ ...layer, id: copy.id, name: `${layer.name} copy` });
    expect(copy.id).not.toBe(layer.id);
    expect(result.project.layers.indexOf(copy)).toBe(result.project.layers.indexOf(layer) + 1);
    copy.position.x.keyframes[0].value = .9;
    copy.background.color = '#ABCDEF';
    expect(source).toEqual(before);
  });

  it('retains the media reference and gives repeated copies distinct names', () => {
    const source = createDefaultProject();
    source.layers[0] = { ...source.layers[0], assetId: 'uploaded-logo' } as typeof source.layers[0];
    const first = duplicateProjectLayer(source, source.layers[0].id);
    const second = duplicateProjectLayer(first.project, source.layers[0].id);
    expect(second.project.layers.map(layer => layer.name)).toEqual(['Logo', 'Logo copy 2', 'Logo copy']);
    expect(second.project.layers[1]).toMatchObject({ assetId: 'uploaded-logo' });
  });

  it('duplicates a group and remaps every child to its own independent copy', () => {
    const source = createDefaultProject();
    source.layers.push({ ...structuredClone(source.layers[0]), id: 'second' });
    const grouped = createLayerGroup(source, source.layers.map(layer => layer.id));
    const result = duplicateProjectLayer(grouped.project, grouped.group!.id);
    const copy = result.project.layers.find(layer => layer.id === result.duplicateId)!;
    if (copy.type !== 'group') throw new Error('Expected a group');
    expect(copy.children).toHaveLength(2);
    expect(copy.children.some(id => grouped.group!.children.includes(id))).toBe(false);
    expect(copy.entrance).toEqual(grouped.group!.entrance);
    expect(copy.entrance).not.toBe(grouped.group!.entrance);
    for (const id of copy.children) expect(result.project.layers.some(layer => layer.id === id)).toBe(true);
    expect(new Set(result.project.layers.map(layer => layer.id)).size).toBe(result.project.layers.length);
  });

  it('keeps a duplicated group member in its original group', () => {
    const source = createDefaultProject();
    source.layers.push({ ...structuredClone(source.layers[0]), id: 'second' });
    const grouped = createLayerGroup(source, source.layers.map(layer => layer.id));
    const result = duplicateProjectLayer(grouped.project, source.layers[0].id);
    const group = result.project.layers.find(layer => layer.id === grouped.group!.id)!;
    expect(group.type === 'group' && group.children).toEqual([source.layers[0].id, result.duplicateId, 'second']);
    expect(grouped.group!.children).toHaveLength(2);
  });

  it('selects the copy, supports undo/redo, and reuses its identity on redo', () => {
    const source = createDefaultProject();
    loadProject(source);
    selectedLayerId.value = source.layers[0].id;
    duplicateLayer(source.layers[0].id);
    const copiedId = selectedLayerId.value;
    expect(project.value.layers).toHaveLength(2);
    undo();
    expect(project.value).toBe(source);
    expect(selectedLayerId.value).toBe(source.layers[0].id);
    redo();
    expect(project.value.layers).toHaveLength(2);
    expect(selectedLayerId.value).toBe(copiedId);
  });
});
