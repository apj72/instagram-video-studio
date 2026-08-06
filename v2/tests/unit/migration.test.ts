import { describe, it, expect } from 'vitest';
import { importV1Config } from '../../src/core/migration.ts';

describe('V1 migration', () => {
  it('imports empty config with defaults', () => {
    const { project } = importV1Config({});
    expect(project.metadata.name).toBe('Imported V1 Project');
    expect(project.settings.width).toBe(1080);
    expect(project.settings.height).toBe(1920);
    expect(project.settings.duration).toBe(16000);
    expect(project.settings.bpm).toBe(124);
    expect(project.settings.backgroundColor).toBe('#000000');
    expect(project.layers.length).toBeGreaterThan(0);
  });

  it('maps global settings', () => {
    const { project } = importV1Config({
      global: { duration: 30000, bpm: 128, bgColor: '#FF0000' },
    });
    expect(project.settings.duration).toBe(30000);
    expect(project.settings.bpm).toBe(128);
    expect(project.settings.backgroundColor).toBe('#FF0000');
  });

  it('maps logos to image layers', () => {
    const { project } = importV1Config({
      logos: [
        { yPosition: 0.3, size: 0.5, fadeInTime: 500, fadeOutTime: 400 },
        { yPosition: 0.7, size: 1.0 },
      ],
    });
    const imageLayers = project.layers.filter(l => l.type === 'image');
    expect(imageLayers.length).toBe(2);
    expect(imageLayers[0].name).toBe('Logo 1');
    expect(imageLayers[1].name).toBe('Logo 2');
  });

  it('maps text boxes to text layers', () => {
    const { project } = importV1Config({
      textBoxes: [
        { text: 'Hello', yPosition: 0.5, fontSize: 60 },
        { text: 'World', yPosition: 0.7, fontSize: 40, textColor: '#FF0000' },
      ],
    });
    const textLayers = project.layers.filter(l => l.type === 'text');
    expect(textLayers.length).toBe(2);
    expect((textLayers[0] as any).text).toBe('Hello');
    expect((textLayers[1] as any).text).toBe('World');
    expect((textLayers[1] as any).textColor).toBe('#FF0000');
  });

  it('maps effects to effect layers', () => {
    const { project } = importV1Config({
      effects: {
        glitch: true,
        scanlines: false,
        grid: true,
        sweeps: true,
        vignette: true,
        cornerAccents: true,
      },
    });
    const effectLayers = project.layers.filter(l => l.type === 'effect');
    const glitch = effectLayers.find(l => l.name === 'Glitch');
    const scanlines = effectLayers.find(l => l.name === 'Scanlines');
    expect(glitch).toBeDefined();
    expect(glitch!.visible).toBe(true);
    expect(scanlines).toBeDefined();
    expect(scanlines!.visible).toBe(false);
  });

  it('maps bgLogos to background-logo layers', () => {
    const { project } = importV1Config({
      bgLogos: [{ scale: 0.5, y: 0.3, speed: 0.2, clockDir: 3, opacity: 0.15 }],
    });
    const bgLayers = project.layers.filter(l => l.type === 'background-logo');
    expect(bgLayers.length).toBe(1);
    expect(bgLayers[0].name).toBe('BG Logo 1');
  });

  it('maps videoSlice to video layer', () => {
    const { project } = importV1Config({
      videoSlice: {
        enabled: true,
        orientation: 'horizontal',
        thickness: 300,
        position: 0.4,
      },
    });
    const videoLayers = project.layers.filter(l => l.type === 'video');
    expect(videoLayers.length).toBe(1);
    expect(videoLayers[0].name).toBe('Video Slice');
  });

  it('skips disabled videoSlice', () => {
    const { project } = importV1Config({
      videoSlice: { enabled: false },
    });
    const videoLayers = project.layers.filter(l => l.type === 'video');
    expect(videoLayers.length).toBe(0);
  });

  it('extracts image assets from logos', () => {
    const { assets } = importV1Config({
      logos: [{ imageData: 'data:image/png;base64,abc123' }],
    });
    expect(assets.length).toBeGreaterThan(0);
    const logoAsset = assets.find(a => a.type === 'image');
    expect(logoAsset).toBeDefined();
    expect(logoAsset!.dataUrl).toBe('data:image/png;base64,abc123');
  });

  it('maps spectrum config', () => {
    const { project } = importV1Config({
      spectrum: { enabled: true, height: 1000, bottomOffset: 50, barCount: 64 },
    });
    const spectrum = project.layers.find(
      l => l.type === 'effect' && (l as any).effectType === 'spectrum'
    );
    expect(spectrum).toBeDefined();
    expect((spectrum as any).config.height).toBe(1000);
    expect((spectrum as any).config.barCount).toBe(64);
  });

  it('maps pulsing logo', () => {
    const { project } = importV1Config({
      pulsingLogo: { enabled: true, yPosition: 0.4, opacity: 0.9, maxScale: 1.5, startTime: 8000 },
    });
    const pulsing = project.layers.find(
      l => l.type === 'effect' && (l as any).effectType === 'pulsing-logo'
    );
    expect(pulsing).toBeDefined();
    expect(pulsing!.inTime).toBe(8000);
  });

  it('all layers have unique IDs', () => {
    const { project } = importV1Config({
      logos: [{}],
      textBoxes: [{}, {}],
      effects: { glitch: true },
    });
    const ids = project.layers.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
