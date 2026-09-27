import { useRef, useCallback, useEffect, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { project, selectedLayerId, selectedLayerIds, currentTime, autoKeyframe, updateLayer, removeLayer } from '../../core/state.ts';
import { getGroupForLayer } from '../../core/groups.ts';
import { evaluateProperty } from '../../timeline/interpolation.ts';
import type { EffectLayer, Layer } from '../../core/schema.ts';
import { getLayerBounds, isCanvasWideLayer, transformBoundsByGroup } from './layerBounds.ts';
import { translatePosition } from './positionEditing.ts';
import { DEFAULT_LASER_COLORS, getLaserOrigin, setLaserOrigin } from '../../render/laserMotion.ts';

export const showSafeAreas = signal(false);
export const safeAreaPreset = signal<'reel' | 'feed45' | 'grid11'>('reel');

interface CanvasViewportProps {
  canvasRef: { current: HTMLCanvasElement | null };
}

export function CanvasViewport({ canvasRef }: CanvasViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const dragging = useRef<{ layerId: string; startX: number; startY: number; position: Layer['position'] } | null>(null);

  const canvasToProject = useCallback((clientX: number, clientY: number): { px: number; py: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (clientX - rect.left) * scaleX / canvas.width;
    const py = (clientY - rect.top) * scaleY / canvas.height;
    return { px, py };
  }, [canvasRef]);

  const hitTestLayers = useCallback((px: number, py: number): Layer | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const layers = project.value.layers;
    const timeMs = currentTime.value;

    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible || layer.locked) continue;
      if (timeMs < layer.inTime || timeMs > layer.outTime) continue;
      if (evaluateProperty(layer.opacity, timeMs) <= 0) continue;
      const group = getGroupForLayer(layers, layer.id);
      if (group && (!group.visible || group.locked || timeMs < group.inTime || timeMs > group.outTime)) continue;
      const raw = getLayerBounds(layer, timeMs, canvas);
      const bounds = raw && group ? transformBoundsByGroup(raw, group, group.children.indexOf(layer.id), timeMs, canvas) : raw;
      if (bounds && px * canvas.width >= bounds.x && px * canvas.width <= bounds.x + bounds.width &&
        py * canvas.height >= bounds.y && py * canvas.height <= bounds.y + bounds.height) {
        return layer;
      }
    }
    return null;
  }, [canvasRef]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    const pos = canvasToProject(e.clientX, e.clientY);
    if (!pos) return;

    const hit = hitTestLayers(pos.px, pos.py);
    const selected = project.value.layers.find(layer => layer.id === selectedLayerId.value);
    const group = selected?.type === 'group' && !selected.locked && (!hit || selected.children.includes(hit.id)) ? selected : null;
    const target = group ?? hit;
    if (target) {
      if (!group) {
        selectedLayerIds.value = [];
        selectedLayerId.value = target.id;
      }
      dragging.current = {
        layerId: target.id,
        startX: pos.px,
        startY: pos.py,
        position: target.position,
      };
    }
  }, [canvasToProject, hitTestLayers]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    const pos = canvasToProject(e.clientX, e.clientY);
    if (!pos) return;

    const dx = pos.px - dragging.current.startX;
    const dy = pos.py - dragging.current.startY;
    updateLayer(dragging.current.layerId, l => ({
      ...l,
      position: translatePosition(dragging.current!.position, dx, dy, currentTime.value, autoKeyframe.value),
    }));
  }, [canvasToProject]);

  const handleMouseUp = useCallback(() => {
    dragging.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;
    const observer = new ResizeObserver(() => setLayoutVersion(version => version + 1));
    observer.observe(canvas);
    observer.observe(viewport);
    setLayoutVersion(version => version + 1);
    return () => observer.disconnect();
  }, [canvasRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const id = selectedLayerId.value;
      if (!id) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      const step = e.shiftKey ? 0.01 : 0.002;
      const timeMs = currentTime.value;
      const layer = project.value.layers.find(l => l.id === id);
      if (!layer) return;

      const px = evaluateProperty(layer.position.x, timeMs);
      const py = evaluateProperty(layer.position.y, timeMs);

      let newPx = px, newPy = py;
      switch (e.key) {
        case 'ArrowUp': newPy -= step; break;
        case 'ArrowDown': newPy += step; break;
        case 'ArrowLeft': newPx -= step; break;
        case 'ArrowRight': newPx += step; break;
        case 'Delete':
        case 'Backspace':
          if (!layer.locked) {
            removeLayer(id);
          }
          e.preventDefault();
          return;
        default: return;
      }
      e.preventDefault();
      updateLayer(id, l => ({
        ...l,
        position: translatePosition(l.position, newPx - px, newPy - py, timeMs, autoKeyframe.value),
      }));
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      ref={viewportRef}
      class="canvas-viewport"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        width={project.value.settings.width}
        height={project.value.settings.height}
        class="preview-canvas"
      />
      {showSafeAreas.value && <SafeAreaOverlay canvasRef={canvasRef} layoutVersion={layoutVersion} />}
      {selectedLayerId.value && <SelectionOverlay canvasRef={canvasRef} layoutVersion={layoutVersion} />}
      <style>{viewportStyles}</style>
    </div>
  );
}

function SafeAreaOverlay({ canvasRef }: { canvasRef: { current: HTMLCanvasElement | null }; layoutVersion: number }) {
  const canvas = canvasRef.current;
  if (!canvas) return null;
  const preset = safeAreaPreset.value;
  const areas = project.value.safeAreas;
  const area = preset === 'reel' ? areas[0] : preset === 'feed45' ? areas[1] : areas[2];
  if (!area) return null;
  const rect = canvas.getBoundingClientRect();
  const viewportRect = canvas.parentElement?.getBoundingClientRect() ?? rect;

  return (
    <div class="safe-area-overlay" style={{
      left: `${rect.left - viewportRect.left}px`, top: `${rect.top - viewportRect.top}px`,
      width: `${rect.width}px`, height: `${rect.height}px`,
    }}>
      <div class="safe-area-top" style={{ height: `${(area.top / project.value.settings.height) * 100}%` }} />
      <div class="safe-area-bottom" style={{ height: `${(area.bottom / project.value.settings.height) * 100}%` }} />
      <div class="safe-area-label">{area.name}</div>
    </div>
  );
}

function SelectionOverlay({ canvasRef }: { canvasRef: { current: HTMLCanvasElement | null }; layoutVersion: number }) {
  const id = selectedLayerId.value;
  if (!id) return null;
  const layer = project.value.layers.find(l => l.id === id);
  if (!layer) return null;

  const canvas = canvasRef.current;
  if (!canvas) return null;
  if (layer.type === 'effect' && layer.effectType === 'laser-beams') {
    return <LaserOriginOverlay canvas={canvas} layer={layer} />;
  }
  if (layer.type === 'group') {
    return <div class="canvas-selection-note">{layer.name} · drag canvas to move {layer.children.length} layers</div>;
  }
  if (isCanvasWideLayer(layer, canvas)) {
    return <div class="canvas-selection-note">{layer.name} · {layer.type === 'effect' ? 'full-frame effect' : 'full-frame layer'} · edit in Properties</div>;
  }

  const timeMs = currentTime.value;
  const raw = getLayerBounds(layer, timeMs, canvas);
  const group = getGroupForLayer(project.value.layers, layer.id);
  const bounds = raw && group ? transformBoundsByGroup(raw, group, group.children.indexOf(layer.id), timeMs, canvas) : raw;
  if (!bounds || evaluateProperty(layer.opacity, timeMs) <= 0) return null;

  const rect = canvas.getBoundingClientRect();
  const viewportRect = canvas.parentElement?.getBoundingClientRect() ?? rect;
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;

  const left = bounds.x * scaleX;
  const top = bounds.y * scaleY;
  const boxW = bounds.width * scaleX;
  const boxH = bounds.height * scaleY;

  return (
    <div class="selection-clip" style={{
      left: `${rect.left - viewportRect.left}px`, top: `${rect.top - viewportRect.top}px`,
      width: `${rect.width}px`, height: `${rect.height}px`,
    }}>
      <div
        class="selection-box"
        style={{ left: `${left}px`, top: `${top}px`, width: `${boxW}px`, height: `${boxH}px` }}
      >
        <div class="selection-label">{layer.name}</div>
        <div class="selection-handle selection-handle-tl" />
        <div class="selection-handle selection-handle-tr" />
        <div class="selection-handle selection-handle-bl" />
        <div class="selection-handle selection-handle-br" />
      </div>
    </div>
  );
}

function LaserOriginOverlay({ canvas, layer }: { canvas: HTMLCanvasElement; layer: EffectLayer }) {
  const activeBeam = useRef<number | null>(null);
  const config = layer.config as { count?: number; colors?: string[]; origins?: { x: number; y: number }[] };
  const count = Math.max(0, Math.min(3, Math.round(config.count ?? 3)));
  const rect = canvas.getBoundingClientRect();
  const viewportRect = canvas.parentElement?.getBoundingClientRect() ?? rect;

  function moveOrigin(index: number, clientX: number, clientY: number) {
    const bounds = canvas.getBoundingClientRect();
    const point = {
      x: (clientX - bounds.left) / bounds.width,
      y: (clientY - bounds.top) / bounds.height,
    };
    updateLayer(layer.id, current => {
      const currentConfig = (current as EffectLayer).config;
      const currentCount = Math.max(1, Math.min(3, Math.round(Number(currentConfig.count ?? 3))));
      return { ...current, config: {
        ...currentConfig,
        origins: setLaserOrigin(currentConfig.origins as { x: number; y: number }[] | undefined, index, currentCount, point),
      } };
    });
  }

  return <div class="laser-origin-overlay" style={{
    left: `${rect.left - viewportRect.left}px`, top: `${rect.top - viewportRect.top}px`,
    width: `${rect.width}px`, height: `${rect.height}px`,
  }}>
    <div class="laser-origin-instruction">Drag a numbered point to move its beam</div>
    {Array.from({ length: count }, (_, index) => {
      const origin = getLaserOrigin(index, count, config.origins);
      return <button key={index} type="button" class="laser-origin-handle"
        aria-label={`Drag Beam ${index + 1} origin`}
        title={`Beam ${index + 1} insertion point`}
        style={{ left: `${origin.x * 100}%`, top: `${origin.y * 100}%`, background: config.colors?.[index] ?? DEFAULT_LASER_COLORS[index] }}
        onMouseDown={event => event.stopPropagation()}
        onPointerDown={event => {
          event.stopPropagation();
          activeBeam.current = index;
          (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          if (activeBeam.current !== index) return;
          event.stopPropagation();
          moveOrigin(index, event.clientX, event.clientY);
        }}
        onPointerUp={event => { event.stopPropagation(); activeBeam.current = null; }}
        onPointerCancel={() => { activeBeam.current = null; }}
      >{index + 1}</button>;
    })}
  </div>;
}

const viewportStyles = `
.canvas-viewport {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 16px;
  background: #080808;
  position: relative;
}

.preview-canvas {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
  box-shadow: 0 0 40px rgba(0,0,0,0.5);
}

.safe-area-overlay {
  position: absolute;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.safe-area-top,
.safe-area-bottom {
  position: absolute;
  left: 0;
  right: 0;
  background: rgba(232, 66, 63, 0.15);
  border: 1px dashed rgba(232, 66, 63, 0.4);
}

.safe-area-top { top: 0; border-top: none; }
.safe-area-bottom { bottom: 0; border-bottom: none; }

.safe-area-label {
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 9px;
  color: rgba(232, 66, 63, 0.6);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.selection-clip {
  position: absolute; overflow: hidden; pointer-events: none; z-index: 10;
}

.selection-box {
  position: absolute;
  border: 1px dashed rgba(100, 180, 255, 0.8);
  pointer-events: none;
}

.canvas-selection-note {
  position: absolute; top: 24px; right: 24px; z-index: 10;
  padding: 7px 10px; color: #dceeff; background: rgba(5, 17, 29, .85);
  border: 1px solid rgba(100, 180, 255, .6); border-radius: 4px;
  font-size: 11px; pointer-events: none;
}

.laser-origin-overlay { position: absolute; z-index: 11; pointer-events: none; }
.laser-origin-instruction { position: absolute; top: 8px; left: 8px; padding: 5px 7px; border-radius: 4px; background: rgba(5,17,29,.85); color: #dceeff; font-size: 10px; pointer-events: none; }
.laser-origin-handle { position: absolute; width: 24px; height: 24px; padding: 0; transform: translate(-50%, -50%); border: 2px solid #fff; border-radius: 50%; box-shadow: 0 1px 9px #000; color: #111; font-size: 11px; font-weight: 800; text-align: center; pointer-events: auto; cursor: grab; touch-action: none; user-select: none; }
.laser-origin-handle:active { cursor: grabbing; }

.selection-label {
  position: absolute;
  top: -18px;
  left: 0;
  font-size: 9px;
  font-family: var(--font-mono);
  color: rgba(100, 180, 255, 0.9);
  background: rgba(0, 0, 0, 0.6);
  padding: 1px 5px;
  border-radius: 2px;
  white-space: nowrap;
  pointer-events: none;
}

.selection-handle {
  position: absolute;
  width: 7px;
  height: 7px;
  background: rgba(100, 180, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 1px;
  pointer-events: auto;
  cursor: nwse-resize;
}

.selection-handle-tl { top: -4px; left: -4px; cursor: nwse-resize; }
.selection-handle-tr { top: -4px; right: -4px; cursor: nesw-resize; }
.selection-handle-bl { bottom: -4px; left: -4px; cursor: nesw-resize; }
.selection-handle-br { bottom: -4px; right: -4px; cursor: nwse-resize; }
`;
