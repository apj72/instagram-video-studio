import type { Project } from './schema.ts';

const STORAGE_KEY = 'version1-v2-presets';

export interface SavedPreset {
  name: string;
  savedAt: string;
  project: Project;
}

function stripAssets(p: Project): Project {
  return {
    ...p,
    layers: p.layers.map(l => {
      if (l.type === 'image' || l.type === 'video' || l.type === 'background-logo') {
        return { ...l, assetId: null };
      }
      return l;
    }),
    audio: { ...p.audio, assetId: null },
  };
}

export function getPresets(): Record<string, SavedPreset> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function getPresetNames(): string[] {
  return Object.keys(getPresets()).sort();
}

export function savePreset(name: string, project: Project): void {
  const presets = getPresets();
  presets[name] = {
    name,
    savedAt: new Date().toISOString(),
    project: stripAssets(project),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function loadPreset(name: string): Project | null {
  const presets = getPresets();
  return presets[name]?.project ?? null;
}

export function deletePreset(name: string): void {
  const presets = getPresets();
  delete presets[name];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}
