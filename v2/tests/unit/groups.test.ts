import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../../src/core/schema.ts';
import { createLayerGroup, getGroupForLayer } from '../../src/core/groups.ts';
import { getGroupEntranceOffset } from '../../src/render/groupMotion.ts';
import { getLayerEvents } from '../../src/timeline/events.ts';
import { scaleProjectTimeline } from '../../src/core/projectDuration.ts';

describe('layer groups', () => {
  it('groups selected layers in drawing order without removing their layer objects', () => {
    const source = createDefaultProject();
    const first = source.layers[0];
    const second = { ...first, id: 'second', name: 'Second' };
    const third = { ...first, id: 'third', name: 'Third' };
    source.layers.push(second, third);
    const { project, group } = createLayerGroup(source, [third.id, first.id]);
    expect(group?.children).toEqual([first.id, third.id]);
    expect(project.layers.map(layer => layer.id)).toEqual([group!.id, first.id, second.id, third.id]);
    expect(getGroupForLayer(project.layers, third.id)?.id).toBe(group?.id);
    expect(getGroupForLayer(project.layers, second.id)).toBeUndefined();
    expect(createLayerGroup(project, [first.id, second.id]).group).toBeNull();
  });

  it('moves members in sequence and scales entrance timing with project duration', () => {
    const source = createDefaultProject();
    source.layers.push({ ...source.layers[0], id: 'second' });
    const { project, group } = createLayerGroup(source, source.layers.map(layer => layer.id));
    if (!group) throw new Error('Group was not created');
    group.entrance = { direction: 'left', startTime: 1000, duration: 500, stagger: 200, alternate: true };
    expect(getGroupEntranceOffset(group, 0, 1000, 1080, 1920)).toEqual({ x: -1080, y: 0 });
    expect(getGroupEntranceOffset(group, 0, 1500, 1080, 1920)).toEqual({ x: 0, y: 0 });
    expect(getGroupEntranceOffset(group, 1, 1200, 1080, 1920)).toEqual({ x: 1080, y: 0 });
    expect(getLayerEvents(group, project.settings.duration).filter(event => event.label.startsWith('Slide')).map(event => event.time)).toEqual([1000, 1200]);
    const scaled = scaleProjectTimeline(project, project.settings.duration, project.settings.duration * 1.5);
    const scaledGroup = scaled.layers.find(layer => layer.id === group.id);
    expect(scaledGroup?.type === 'group' && scaledGroup.entrance).toMatchObject({ startTime: 1500, duration: 750, stagger: 300 });
  });
});
