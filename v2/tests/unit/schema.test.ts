import { describe, it, expect } from 'vitest';
import {
  createDefaultProject,
  generateId,
  SCHEMA_VERSION,
  INSTAGRAM_SAFE_AREAS,
  EXPORT_PRESETS,
} from '../../src/core/schema.ts';

describe('schema', () => {
  it('createDefaultProject returns a valid project', () => {
    const project = createDefaultProject();
    expect(project.metadata.schemaVersion).toBe(SCHEMA_VERSION);
    expect(project.metadata.name).toBe('Untitled Project');
    expect(project.settings.width).toBe(1080);
    expect(project.settings.height).toBe(1920);
    expect(project.settings.fps).toBe(30);
    expect(project.settings.duration).toBe(16000);
    expect(project.layers.length).toBeGreaterThan(0);
    expect(project.safeAreas).toEqual(INSTAGRAM_SAFE_AREAS);
    expect(project.exportPreset).toEqual(EXPORT_PRESETS[0]);
  });

  it('default project has a logo layer', () => {
    const project = createDefaultProject();
    const logo = project.layers.find(l => l.name === 'Logo');
    expect(logo).toBeDefined();
    expect(logo!.type).toBe('image');
    expect(logo!.visible).toBe(true);
  });

  it('generateId returns unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  it('Instagram safe areas have correct structure', () => {
    expect(INSTAGRAM_SAFE_AREAS.length).toBe(3);
    for (const area of INSTAGRAM_SAFE_AREAS) {
      expect(area).toHaveProperty('name');
      expect(area).toHaveProperty('top');
      expect(area).toHaveProperty('bottom');
      expect(typeof area.top).toBe('number');
      expect(typeof area.bottom).toBe('number');
    }
  });

  it('export presets target Instagram specs', () => {
    const reel = EXPORT_PRESETS.find(p => p.name === 'Instagram Reel');
    expect(reel).toBeDefined();
    expect(reel!.width).toBe(1080);
    expect(reel!.height).toBe(1920);
    expect(reel!.fps).toBe(30);
    expect(reel!.codec).toBe('avc1.4d0034');
    expect(reel!.audioCodec).toBe('mp4a.40.2');
  });
});
