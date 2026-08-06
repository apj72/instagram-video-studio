import { useCallback } from 'preact/hooks';
import { addLayer, project } from '../../core/state.ts';
import { generateId } from '../../core/schema.ts';
import type { TextLayer, ShapeLayer, EffectLayer, ImageLayer } from '../../core/schema.ts';

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
  const handleAddText = useCallback(() => {
    const layer: TextLayer = {
      ...baseLayer('New Text'),
      type: 'text',
      text: 'YOUR TEXT',
      fontFamily: 'Bungee',
      fontSize: staticKf(48),
      fontWeight: 'bold',
      textColor: '#FFFFFF',
      textAlign: 'center',
      lineHeight: 1.3,
      letterSpacing: 0,
      stroke: { enabled: false, color: '#000000', width: 2 },
      shadow: { enabled: false, color: '#000000', blur: 10, offsetX: 0, offsetY: 2 },
      background: { enabled: false, color: '#000000', opacity: 0.7, paddingX: 20, paddingY: 10, cornerRadius: 4 },
      border: { enabled: false, color: '#E8423F', width: 2, cornerRadius: 4, paddingX: 20, paddingY: 10 },
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
      config: {},
    };
    addLayer(layer);
  }, []);

  const handleAddImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const assetId = generateId();
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
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  return (
    <div class="add-layer-panel">
      <div class="sidebar-header">
        <span>Add Layer</span>
      </div>
      <div class="add-layer-grid">
        <button class="add-layer-btn" onClick={handleAddText}>+ Text</button>
        <button class="add-layer-btn" onClick={handleAddShape}>+ Shape</button>
        <button class="add-layer-btn" onClick={handleAddImage}>+ Image</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('glitch')}>+ Glitch</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('scanlines')}>+ Scanlines</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('vignette')}>+ Vignette</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('grid')}>+ Grid</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('sweep')}>+ Sweep</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('corner-accents')}>+ Corners</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('spectrum')}>+ Spectrum</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('waveform')}>+ Waveform</button>
        <button class="add-layer-btn" onClick={() => handleAddEffect('pulsing-logo')}>+ Pulse</button>
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
