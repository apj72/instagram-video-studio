import { signal, computed } from '@preact/signals';
import type { Project, Layer } from './schema.ts';
import { createDefaultProject } from './schema.ts';
import { createLayerGroup } from './groups.ts';
import { getAnimatedProperties } from '../timeline/properties.ts';

export const project = signal<Project>(createDefaultProject());
export const selectedLayerId = signal<string | null>(null);
export const selectedLayerIds = signal<string[]>([]);
export const currentTime = signal(0);
export const isPlaying = signal(false);
export const zoom = signal(1);
export const showLabels = signal(false);
export const autoKeyframe = signal(false);
export const selectedPropertyName = signal<string>('opacity');
export interface LibrarySource { kind: 'post' | 'template'; id: string; name: string; }
export const librarySource = signal<LibrarySource | null>(null);

export const selectedLayer = computed<Layer | null>(() => {
  const id = selectedLayerId.value;
  if (!id) return null;
  return project.value.layers.find(l => l.id === id) ?? null;
});

export const duration = computed(() => project.value.settings.duration);
export const fps = computed(() => project.value.settings.fps);
export const bpm = computed(() => project.value.settings.bpm);

export function updateProject(updater: (p: Project) => Project) {
  project.value = updater(project.value);
}

export function updateLayer(layerId: string, updater: (l: Layer) => Layer) {
  updateProject(p => ({
    ...p,
    layers: p.layers.map(l => {
      if (l.id !== layerId) return l;
      const next = updater(l);
      // Reveal the property whose key was written, including edits made on the canvas.
      if (autoKeyframe.value && selectedLayerId.value === layerId) {
        const previous = getAnimatedProperties(l);
        const changed = getAnimatedProperties(next).filter(entry => {
          const frame = entry.prop.keyframes.find(key => key.time === currentTime.value);
          if (!frame) return false;
          const old = previous.find(prop => prop.name === entry.name)?.prop.keyframes.find(key => key.time === frame.time);
          return !old || old.value !== frame.value;
        });
        const reveal = changed.find(entry => entry.name === selectedPropertyName.value) ?? changed[0];
        if (reveal) selectedPropertyName.value = reveal.name;
      }
      return next;
    }),
  }));
}

export function addLayer(layer: Layer) {
  updateProject(p => ({
    ...p,
    layers: [...p.layers, layer],
  }));
}

export function removeLayer(layerId: string) {
  updateProject(p => ({
    ...p,
    layers: p.layers.filter(l => l.id !== layerId).map(l => l.type === 'group'
      ? { ...l, children: l.children.filter(id => id !== layerId) } : l),
  }));
  selectedLayerIds.value = selectedLayerIds.value.filter(id => id !== layerId);
  if (selectedLayerId.value === layerId) {
    selectedLayerId.value = null;
  }
}

export function groupSelectedLayers() {
  const result = createLayerGroup(project.value, selectedLayerIds.value);
  if (!result.group) return false;
  project.value = result.project;
  selectedLayerIds.value = [];
  selectedLayerId.value = result.group.id;
  return true;
}

export function ungroupLayer(groupId: string) {
  if (project.value.layers.find(layer => layer.id === groupId)?.type !== 'group') return;
  removeLayer(groupId);
}

export function reorderLayers(fromIndex: number, toIndex: number) {
  updateProject(p => {
    const layers = [...p.layers];
    const [moved] = layers.splice(fromIndex, 1);
    layers.splice(toIndex, 0, moved);
    return { ...p, layers };
  });
}

export function loadProject(p: Project, source: LibrarySource | null = null) {
  project.value = p;
  librarySource.value = source;
  selectedLayerId.value = null;
  selectedLayerIds.value = [];
  currentTime.value = 0;
  isPlaying.value = false;
}
