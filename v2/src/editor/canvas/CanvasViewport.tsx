import { useRef, useCallback, useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { project, selectedLayerId, currentTime, updateLayer, removeLayer } from '../../core/state.ts';
import { evaluateProperty } from '../../timeline/interpolation.ts';
import type { Layer } from '../../core/schema.ts';

export const showSafeAreas = signal(false);
export const safeAreaPreset = signal<'reel' | 'feed45' | 'grid11'>('reel');

interface CanvasViewportProps {
  canvasRef: { current: HTMLCanvasElement | null };
}

export function CanvasViewport({ canvasRef }: CanvasViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ layerId: string; startX: number; startY: number; origPx: number; origPy: number } | null>(null);

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
    const layers = project.value.layers;
    const timeMs = currentTime.value;
    const w = project.value.settings.width;
    const h = project.value.settings.height;

    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible || layer.locked) continue;
      if (timeMs < layer.inTime || timeMs > layer.outTime) continue;

      const lx = evaluateProperty(layer.position.x, timeMs);
      const ly = evaluateProperty(layer.position.y, timeMs);
      const sx = evaluateProperty(layer.scale.x, timeMs);

      let hitW = 0, hitH = 0;

      if (layer.type === 'image') {
        hitW = w * sx;
        hitH = hitW;
      } else if (layer.type === 'text') {
        hitW = w * 0.6;
        hitH = 100;
      } else if (layer.type === 'shape') {
        hitW = layer.size.width * sx;
        hitH = layer.size.height * sx;
      } else if (layer.type === 'effect' || layer.type === 'background-logo') {
        continue;
      } else {
        hitW = w * 0.5;
        hitH = h * 0.3;
      }

      const left = lx * w - hitW / 2;
      const top = ly * h - hitH / 2;
      const right = left + hitW;
      const bottom = top + hitH;

      const absX = px * w;
      const absY = py * h;

      if (absX >= left && absX <= right && absY >= top && absY <= bottom) {
        return layer;
      }
    }
    return null;
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    const pos = canvasToProject(e.clientX, e.clientY);
    if (!pos) return;

    const hit = hitTestLayers(pos.px, pos.py);
    if (hit) {
      selectedLayerId.value = hit.id;
      const timeMs = currentTime.value;
      const origPx = evaluateProperty(hit.position.x, timeMs);
      const origPy = evaluateProperty(hit.position.y, timeMs);
      dragging.current = {
        layerId: hit.id,
        startX: pos.px,
        startY: pos.py,
        origPx,
        origPy,
      };
    } else {
      selectedLayerId.value = null;
    }
  }, [canvasToProject, hitTestLayers]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    const pos = canvasToProject(e.clientX, e.clientY);
    if (!pos) return;

    const dx = pos.px - dragging.current.startX;
    const dy = pos.py - dragging.current.startY;
    const newPx = dragging.current.origPx + dx;
    const newPy = dragging.current.origPy + dy;

    updateLayer(dragging.current.layerId, l => ({
      ...l,
      position: {
        x: { keyframes: [{ time: 0, value: newPx, easing: 'linear' as const }] },
        y: { keyframes: [{ time: 0, value: newPy, easing: 'linear' as const }] },
      },
    }));
  }, [canvasToProject]);

  const handleMouseUp = useCallback(() => {
    dragging.current = null;
  }, []);

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
        position: {
          x: { keyframes: [{ time: 0, value: newPx, easing: 'linear' as const }] },
          y: { keyframes: [{ time: 0, value: newPy, easing: 'linear' as const }] },
        },
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
      {showSafeAreas.value && <SafeAreaOverlay />}
      {selectedLayerId.value && <SelectionOverlay canvasRef={canvasRef} />}
      <style>{viewportStyles}</style>
    </div>
  );
}

function SafeAreaOverlay() {
  const preset = safeAreaPreset.value;
  const areas = project.value.safeAreas;
  const area = preset === 'reel' ? areas[0] : preset === 'feed45' ? areas[1] : areas[2];
  if (!area) return null;

  return (
    <div class="safe-area-overlay">
      <div class="safe-area-top" style={{ height: `${(area.top / project.value.settings.height) * 100}%` }} />
      <div class="safe-area-bottom" style={{ height: `${(area.bottom / project.value.settings.height) * 100}%` }} />
      <div class="safe-area-label">{area.name}</div>
    </div>
  );
}

function SelectionOverlay({ canvasRef }: { canvasRef: { current: HTMLCanvasElement | null } }) {
  const id = selectedLayerId.value;
  if (!id) return null;
  const layer = project.value.layers.find(l => l.id === id);
  if (!layer) return null;

  const canvas = canvasRef.current;
  if (!canvas) return null;

  const timeMs = currentTime.value;
  const w = project.value.settings.width;
  const h = project.value.settings.height;
  const px = evaluateProperty(layer.position.x, timeMs);
  const py = evaluateProperty(layer.position.y, timeMs);
  const sx = evaluateProperty(layer.scale.x, timeMs);

  let hitW = w * sx;
  let hitH = hitW;
  if (layer.type === 'text') { hitW = w * 0.6; hitH = 100; }
  if (layer.type === 'shape') { hitW = layer.size.width * sx; hitH = layer.size.height * sx; }

  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / w;
  const scaleY = rect.height / h;

  const left = (px * w - hitW / 2) * scaleX;
  const top = (py * h - hitH / 2) * scaleY;
  const boxW = hitW * scaleX;
  const boxH = hitH * scaleY;

  return (
    <div
      class="selection-box"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${boxW}px`,
        height: `${boxH}px`,
      }}
    >
      <div class="selection-handle selection-handle-tl" />
      <div class="selection-handle selection-handle-tr" />
      <div class="selection-handle selection-handle-bl" />
      <div class="selection-handle selection-handle-br" />
    </div>
  );
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
  inset: 0;
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

.selection-box {
  position: absolute;
  border: 2px solid var(--accent);
  pointer-events: none;
  z-index: 10;
}

.selection-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: white;
  border: 1px solid var(--accent);
  pointer-events: auto;
  cursor: nwse-resize;
}

.selection-handle-tl { top: -4px; left: -4px; cursor: nwse-resize; }
.selection-handle-tr { top: -4px; right: -4px; cursor: nesw-resize; }
.selection-handle-bl { bottom: -4px; left: -4px; cursor: nesw-resize; }
.selection-handle-br { bottom: -4px; right: -4px; cursor: nwse-resize; }
`;
