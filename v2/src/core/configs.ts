import type { Project } from './schema.ts';

const STORAGE_KEY = 'version1-v2-configs';

export interface SavedConfig {
  name: string;
  category: string;
  savedAt: string;
  thumbnail: string;
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

export function captureThumb(canvas: HTMLCanvasElement): string {
  const w = 160;
  const h = Math.round(w * (canvas.height / canvas.width));
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d', { colorSpace: 'display-p3' });
  if (!ctx) return '';
  ctx.drawImage(canvas, 0, 0, w, h);
  return offscreen.toDataURL('image/jpeg', 0.6);
}

export function getConfigs(): Record<string, SavedConfig> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function getConfigList(): SavedConfig[] {
  const configs = getConfigs();
  return Object.values(configs).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function saveConfig(name: string, category: string, project: Project, canvas: HTMLCanvasElement): void {
  const configs = getConfigs();
  configs[name] = {
    name,
    category,
    savedAt: new Date().toISOString(),
    thumbnail: captureThumb(canvas),
    project: stripAssets(project),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export function loadConfig(name: string): Project | null {
  const configs = getConfigs();
  return configs[name]?.project ?? null;
}

export function deleteConfig(name: string): void {
  const configs = getConfigs();
  delete configs[name];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export function exportConfigJSON(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function importConfigJSON(json: string): Project {
  return JSON.parse(json) as Project;
}
