import { useCallback } from 'preact/hooks';
import { addLayer, project } from '../../core/state.ts';
import { generateId } from '../../core/schema.ts';
import type { TextLayer, ShapeLayer, EffectLayer, ImageLayer, VideoLayer, BackgroundLogoLayer } from '../../core/schema.ts';
import { loadImageAsset, loadVideoAsset } from '../../core/assets.ts';
import { DEFAULT_LASER_COLORS, DEFAULT_LASER_SPEED, DEFAULT_LASER_SWEEP, getDefaultLaserAngle } from '../../render/laserMotion.ts';

function staticKf(value: number) {
  return { keyframes: [{ time: 0, value, easing: 'linear' as const }] };
}

function baseLayer(name: string) {
  return {
    id: generateId(),
    name,
    visible: true,
    locked: false,
    opacity: staticKf(1),
    position: { x: staticKf(0.5), y: staticKf(0.5) },
    scale: { x: staticKf(1), y: staticKf(1) },
    rotation: staticKf(0),
    inTime: 0,
    outTime: project.value.settings.duration,
    blendMode: 'source-over',
  };
}

export function AddLayerPanel() {
  const handleAddText = useCallback((style: 'plain' | 'headline' | 'label' | 'marker' | 'detail' = 'plain') => {
    const layer: TextLayer = {
      ...baseLayer(style === 'plain' ? 'New Text' : `Brand ${style}`),
      type: 'text',
      text: style === 'headline' ? 'YOUR\\nHEADLINE' : style === 'label' ? 'NEW MIX' : style === 'marker' ? 'YOUR DATE' : 'YOUR TEXT',
      fontFamily: style === 'marker' ? 'Permanent Marker' : style === 'label' || style === 'detail' ? 'Space Mono' : 'Bungee',
      fontSize: staticKf(style === 'headline' ? 120 : style === 'marker' ? 64 : style === 'label' ? 26 : style === 'detail' ? 26 : 48),
      fontWeight: style === 'marker' ? '400' : 'bold',
      textColor: style === 'label' ? '#0B0714' : style === 'marker' ? '#FFD400' : '#FFFFFF',
      textAlign: 'center',
      lineHeight: style === 'headline' ? 0.98 : 1.3,
      letterSpacing: style === 'label' || style === 'detail' ? 2 : 0,
      stroke: { enabled: false, color: '#000000', width: 2 },
      shadow: { enabled: style === 'marker', color: '#0B0714', blur: 0, offsetX: 5, offsetY: 5 },
      background: { enabled: style === 'label', color: '#B6FF00', opacity: 1, paddingX: 20, paddingY: 10, cornerRadius: 20 },
      border: { enabled: style === 'label', color: '#0B0714', width: 4, cornerRadius: 20, paddingX: 20, paddingY: 10 },
      ...(style === 'headline' ? { headlineEffect: { mode: 'stacked' as const, outlineColor: '#000000', outlineWidth: 10, offset: 7, midColor: '#FF7A1A', backColor: '#FF2E93' } } : {}),
    };
    addLayer(layer);
  }, []);

  const handleAddShape = useCallback(() => {
    const layer: ShapeLayer = {
      ...baseLayer('New Shape'),
      type: 'shape',
      shapeType: 'rounded-rect',
      size: { width: 400, height: 200 },
      fill: { enabled: true, color: '#E8423F' },
      stroke: { enabled: false, color: '#FFFFFF', width: 2 },
      cornerRadius: 8,
    };
    addLayer(layer);
  }, []);

  const handleAddEffect = useCallback((effectType: string) => {
    const layer: EffectLayer = {
      ...baseLayer(`${effectType} Effect`),
      type: 'effect',
      effectType: effectType as EffectLayer['effectType'],
      config: effectType === 'laser-beams'
        ? { count: 3, glow: 26, speed: DEFAULT_LASER_SPEED, sweep: DEFAULT_LASER_SWEEP,
          colors: [...DEFAULT_LASER_COLORS], angles: Array.from({ length: 3 }, (_, index) => getDefaultLaserAngle(index, 3)) }
        : {},
    };
    addLayer(layer);
  }, []);

  const handleAddImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const assetId = generateId();
      const img = await loadImageAsset(assetId, file);
      const layer: ImageLayer = {
        ...baseLayer(file.name.replace(/\.[^.]+$/, '')),
        type: 'image',
        assetId,
        size: { width: img.naturalWidth, height: img.naturalHeight },
        parallax: false,
        parallaxStartY: -0.3,
        parallaxDuration: 3000,
      };
      addLayer(layer);
    };
    input.click();
  }, []);

  const handleAddVideo = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const assetId = generateId();
      await loadVideoAsset(assetId, file);
      const layer: VideoLayer = {
        ...baseLayer(file.name.replace(/\.[^.]+$/, '')),
        type: 'video',
        assetId,
        orientation: 'horizontal',
        thickness: 300,
        videoPan: 0.5,
        fadeInTime: 0,
        fadeOutTime: 0,
        fadeDuration: 500,
        slideIn: 'none',
        slideOut: 'none',
        slideInTime: 0,
        slideInDuration: 500,
        slideOutTime: 0,
        slideOutDuration: 500,
      };
      addLayer(layer);
    };
    input.click();
  }, []);

  const handleAddBgLogo = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const assetId = generateId();
      await loadImageAsset(assetId, file);
      const layer: BackgroundLogoLayer = {
        ...baseLayer('BG Logo'),
        type: 'background-logo',
        assetId,
        logoScale: 0.35,
        speed: 0.15,
        clockDir: 2,
      };
      addLayer(layer);
    };
    input.click();
  }, []);

  return (
    <div class="add-layer-panel">
      <div class="sidebar-header">
        <span>Add Layer</span>
      </div>
      <div class="add-layer-grid">
        <button class="add-layer-btn" onClick={() => handleAddText()}>+ Text</button>
        <button class="add-layer-btn" onClick={() => handleAddText('headline')}>+ Headline</button>
        <button class="add-layer-btn" onClick={() => handleAddText('label')}>+ Lime Label</button>
        <button class="add-layer-btn" onClick={() => handleAddText('marker')}>+ Marker Tag</button>
        <button class="add-layer-btn" onClick={() => handleAddText('detail')}>+ Mono Detail</button>
        <button class="add-layer-btn" onClick={handleAddShape}>+ Shape</button>
        <button class="add-layer-btn" onClick={handleAddImage}>+ Image</button>
        <button class="add-layer-btn" onClick={handleAddVideo}>+ Video</button>
        <button class="add-layer-btn" onClick={handleAddBgLogo}>+ BG Logo</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('glitch')}>+ Glitch</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('laser-beams')}>+ Lasers</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('scanlines')}>+ Scanlines</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('vignette')}>+ Vignette</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('grid')}>+ Grid</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('sweep')}>+ Sweep</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('corner-accents')}>+ Corners</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('spectrum')}>+ Spectrum</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('waveform')}>+ Waveform</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('pulsing-logo')}>+ Pulse</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('strobe')}>+ Strobe</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('film-grain')}>+ Film Grain</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('chromatic-aberration')}>+ Chroma</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('color-grading')}>+ Color Grade</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('zoom-pulse')}>+ Zoom Pulse</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('blur-transition')}>+ Blur Trans</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('parallax-drift')}>+ Parallax</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('mirror')}>+ Mirror</button>
      </div>
      <style>{addLayerStyles}</style>
    </div>
  );
}

const addLayerStyles = `
.add-layer-panel {
  border-bottom: 1px solid var(--border);
}

.add-layer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
  padding: 8px 14px;
}

.add-layer-btn {
  padding: 6px 4px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 500;
  transition: background 0.15s;
  text-align: center;
}
.add-layer-btn:hover {
  background: var(--border-hover);
  color: var(--text-primary);
}
`;
