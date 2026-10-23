import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultProject } from '../../src/core/schema.ts';
import { autoKeyframe, currentTime, loadProject, project, selectedLayerId, selectedPropertyName, updateLayer } from '../../src/core/state.ts';
import { translatePosition } from '../../src/editor/canvas/positionEditing.ts';

beforeEach(() => {
  loadProject(createDefaultProject());
  selectedLayerId.value = project.value.layers[0].id;
  selectedPropertyName.value = 'opacity';
  currentTime.value = 2000;
  autoKeyframe.value = true;
});

describe('show the property edited with Auto-Key', () => {
  it('reveals a new scale key when the timeline was showing opacity', () => {
    updateLayer(selectedLayerId.value!, layer => ({ ...layer, scale: {
      ...layer.scale,
      x: { keyframes: [...layer.scale.x.keyframes, { time: 2000, value: 1.2, easing: 'linear' }] },
    } }));
    expect(selectedPropertyName.value).toBe('scale X');
    expect(project.value.layers[0].scale.x.keyframes.at(-1)).toMatchObject({ time: 2000, value: 1.2 });
  });

  it('reveals position keys when dragging an element on the canvas', () => {
    updateLayer(selectedLayerId.value!, layer => ({
      ...layer, position: translatePosition(layer.position, .1, .2, currentTime.value, true),
    }));
    expect(selectedPropertyName.value).toBe('pos X');
    // Both axes change on a drag; preserve the user's selected axis on subsequent edits.
    selectedPropertyName.value = 'pos Y';
    updateLayer(selectedLayerId.value!, layer => ({
      ...layer, position: translatePosition(layer.position, .05, .1, currentTime.value, true),
    }));
    expect(selectedPropertyName.value).toBe('pos Y');
  });

  it('keeps the property selection when Auto-Key is off or an unrelated field changes', () => {
    updateLayer(selectedLayerId.value!, layer => ({ ...layer, name: 'Renamed' }));
    expect(selectedPropertyName.value).toBe('opacity');
    autoKeyframe.value = false;
    updateLayer(selectedLayerId.value!, layer => ({
      ...layer, position: translatePosition(layer.position, .1, .2, currentTime.value, false),
    }));
    expect(selectedPropertyName.value).toBe('opacity');
  });
});
