import { signal, computed } from '@preact/signals';
import type { Project, Layer } from './schema.ts';
import { createDefaultProject } from './schema.ts';

export const project = signal<Project>(createDefaultProject());
export const selectedLayerId = signal<string | null>(null);
export const currentTime = signal(0);
export const isPlaying = signal(false);
export const zoom = signal(1);

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
    layers: p.layers.map(l => l.id === layerId ? updater(l) : l),
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
    layers: p.layers.filter(l => l.id !== layerId),
  }));
  if (selectedLayerId.value === layerId) {
    selectedLayerId.value = null;
  }
}

export function reorderLayers(fromIndex: number, toIndex: number) {
  updateProject(p => {
    const layers = [...p.layers];
    const [moved] = layers.splice(fromIndex, 1);
    layers.splice(toIndex, 0, moved);
    return { ...p, layers };
  });
}

export function loadProject(p: Project) {
  project.value = p;
  selectedLayerId.value = null;
  currentTime.value = 0;
  isPlaying.value = false;
}
