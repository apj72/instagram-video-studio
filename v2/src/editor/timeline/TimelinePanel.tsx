import { useRef, useCallback, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { project, currentTime, selectedLayerId, zoom, updateLayer } from '../../core/state.ts';
import { evaluateProperty } from '../../timeline/interpolation.ts';
import type { Layer, AnimatedProperty, EasingType, Keyframe } from '../../core/schema.ts';

interface TimelinePanelProps {
  onSeek: (timeMs: number) => void;
}

export const selectedPropertyName = signal<string>('opacity');

interface AnimPropEntry {
  name: string;
  path: string[];
  prop: AnimatedProperty;
}

function getAnimatedProperties(layer: Layer): AnimPropEntry[] {
  const entries: AnimPropEntry[] = [
    { name: 'opacity', path: ['opacity'], prop: layer.opacity },
    { name: 'pos X', path: ['position', 'x'], prop: layer.position.x },
    { name: 'pos Y', path: ['position', 'y'], prop: layer.position.y },
    { name: 'scale X', path: ['scale', 'x'], prop: layer.scale.x },
    { name: 'scale Y', path: ['scale', 'y'], prop: layer.scale.y },
    { name: 'rotation', path: ['rotation'], prop: layer.rotation },
  ];
  if (layer.type === 'text') {
    entries.push({ name: 'fontSize', path: ['fontSize'], prop: layer.fontSize });
  }
  return entries;
}

function setNestedProp(obj: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  if (path.length === 1) {
    return { ...obj, [path[0]]: value };
  }
  return {
    ...obj,
    [path[0]]: setNestedProp(obj[path[0]] as Record<string, unknown>, path.slice(1), value),
  };
}

const PROPERTY_COLORS: Record<string, string> = {
  opacity: '#FFD700',
  'pos X': '#4FC3F7',
  'pos Y': '#4DB6AC',
  'scale X': '#FF8A65',
  'scale Y': '#FF7043',
  rotation: '#BA68C8',
  fontSize: '#AED581',
};

const EASING_OPTIONS: EasingType[] = [
  'linear', 'ease-in', 'ease-out', 'ease-in-out',
  'ease-out-cubic', 'ease-out-expo', 'ease-out-back',
  'spring', 'bounce',
];

export function TimelinePanel({ onSeek }: TimelinePanelProps) {
  const layers = project.value.layers;
  const dur = project.value.settings.duration;
  const bpmVal = project.value.settings.bpm;
  const time = currentTime.value;
  const z = zoom.value;
  const rulerRef = useRef<HTMLDivElement>(null);
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const [draggingKf, setDraggingKf] = useState<{
    layerId: string;
    path: string[];
    kfIndex: number;
    startX: number;
    origTime: number;
  } | null>(null);
  const [easingMenu, setEasingMenu] = useState<{
    layerId: string;
    path: string[];
    kfIndex: number;
    x: number;
    y: number;
  } | null>(null);

  const totalWidth = z * 100;
  const playheadPct = dur > 0 ? (time / dur) * 100 : 0;
  const propName = selectedPropertyName.value;

  const handleRulerClick = useCallback((e: MouseEvent) => {
    const el = rulerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollLeft = el.scrollLeft;
    const clickX = e.clientX - rect.left + scrollLeft;
    const pct = Math.max(0, Math.min(1, clickX / (totalWidth * rect.width / 100)));
    onSeek(pct * dur);
  }, [dur, totalWidth, onSeek]);

  const handleTrackScroll = useCallback((e: Event) => {
    const el = e.target as HTMLDivElement;
    if (rulerRef.current) {
      rulerRef.current.scrollLeft = el.scrollLeft;
    }
  }, []);

  const handleZoomChange = useCallback((e: Event) => {
    zoom.value = parseFloat((e.target as HTMLInputElement).value);
  }, []);

  const handleAddKeyframe = useCallback((layerId: string, clickPct: number) => {
    const layer = project.value.layers.find(l => l.id === layerId);
    if (!layer) return;
    const entries = getAnimatedProperties(layer);
    const entry = entries.find(e => e.name === propName);
    if (!entry) return;

    const timeMs = clickPct * dur;
    const value = evaluateProperty(entry.prop, timeMs);
    const newKf: Keyframe = { time: timeMs, value, easing: 'linear' };
    const newKeyframes = [...entry.prop.keyframes, newKf].sort((a, b) => a.time - b.time);
    const newProp: AnimatedProperty = { keyframes: newKeyframes };

    updateLayer(layerId, l => setNestedProp(l as unknown as Record<string, unknown>, entry.path, newProp) as unknown as Layer);
  }, [propName, dur]);

  const handleKeyframeMouseDown = useCallback((
    e: MouseEvent,
    layerId: string,
    path: string[],
    kfIndex: number,
    kfTime: number,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingKf({ layerId, path, kfIndex, startX: e.clientX, origTime: kfTime });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingKf) return;
    const trackEl = trackAreaRef.current;
    if (!trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    const pxPerMs = (rect.width * (totalWidth / 100)) / dur;
    const dx = e.clientX - draggingKf.startX;
    const newTime = Math.max(0, Math.min(dur, draggingKf.origTime + dx / pxPerMs));

    updateLayer(draggingKf.layerId, l => {
      const entries = getAnimatedProperties(l);
      const entry = entries.find(en => en.path.join('.') === draggingKf.path.join('.'));
      if (!entry) return l;
      const kfs = [...entry.prop.keyframes];
      kfs[draggingKf.kfIndex] = { ...kfs[draggingKf.kfIndex], time: newTime };
      kfs.sort((a, b) => a.time - b.time);
      const newIdx = kfs.findIndex(k => k.time === newTime && k.value === entry.prop.keyframes[draggingKf.kfIndex].value);
      if (newIdx !== draggingKf.kfIndex) {
        setDraggingKf(prev => prev ? { ...prev, kfIndex: newIdx >= 0 ? newIdx : prev.kfIndex } : null);
      }
      return setNestedProp(l as unknown as Record<string, unknown>, entry.path, { keyframes: kfs }) as unknown as Layer;
    });
  }, [draggingKf, totalWidth, dur]);

  const handleMouseUp = useCallback(() => {
    setDraggingKf(null);
  }, []);

  const handleKeyframeContextMenu = useCallback((
    e: MouseEvent,
    layerId: string,
    path: string[],
    kfIndex: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setEasingMenu({ layerId, path, kfIndex, x: e.clientX, y: e.clientY });
  }, []);

  const handleDeleteKeyframe = useCallback((layerId: string, path: string[], kfIndex: number) => {
    updateLayer(layerId, l => {
      const entries = getAnimatedProperties(l);
      const entry = entries.find(en => en.path.join('.') === path.join('.'));
      if (!entry) return l;
      if (entry.prop.keyframes.length <= 1) return l;
      const kfs = entry.prop.keyframes.filter((_, i) => i !== kfIndex);
      return setNestedProp(l as unknown as Record<string, unknown>, entry.path, { keyframes: kfs }) as unknown as Layer;
    });
    setEasingMenu(null);
  }, []);

  const handleChangeEasing = useCallback((layerId: string, path: string[], kfIndex: number, easing: EasingType) => {
    updateLayer(layerId, l => {
      const entries = getAnimatedProperties(l);
      const entry = entries.find(en => en.path.join('.') === path.join('.'));
      if (!entry) return l;
      const kfs = [...entry.prop.keyframes];
      kfs[kfIndex] = { ...kfs[kfIndex], easing };
      return setNestedProp(l as unknown as Record<string, unknown>, entry.path, { keyframes: kfs }) as unknown as Layer;
    });
    setEasingMenu(null);
  }, []);

  const handleTrackBarClick = useCallback((e: MouseEvent, layerId: string) => {
    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    handleAddKeyframe(layerId, pct);
  }, [handleAddKeyframe]);

  const beatIntervalMs = bpmVal > 0 ? (60 / bpmVal) * 1000 : 0;

  return (
    <div
      class="timeline-panel"
      onMouseMove={draggingKf ? handleMouseMove : undefined}
      onMouseUp={draggingKf ? handleMouseUp : undefined}
      onMouseLeave={draggingKf ? handleMouseUp : undefined}
    >
      <div class="timeline-toolbar">
        <span class="timeline-toolbar-label">Timeline</span>
        <div class="timeline-toolbar-controls">
          <label class="tl-prop-label">Property:</label>
          <select
            class="tl-prop-select"
            value={propName}
            onChange={(e) => { selectedPropertyName.value = (e.target as HTMLSelectElement).value; }}
          >
            <option value="opacity">Opacity</option>
            <option value="pos X">Position X</option>
            <option value="pos Y">Position Y</option>
            <option value="scale X">Scale X</option>
            <option value="scale Y">Scale Y</option>
            <option value="rotation">Rotation</option>
            <option value="fontSize">Font Size</option>
          </select>
          <div class="timeline-zoom">
            <span class="timeline-zoom-label">Zoom</span>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={z}
              onInput={handleZoomChange}
              class="timeline-zoom-slider"
            />
          </div>
        </div>
      </div>
      <div class="timeline-body">
        <div class="track-labels">
          <div class="track-label-header">Layer</div>
          {layers.map(layer => (
            <div
              key={layer.id}
              class={`track-label ${selectedLayerId.value === layer.id ? 'track-label-selected' : ''}`}
              onClick={() => { selectedLayerId.value = layer.id; }}
            >
              {layer.name}
            </div>
          ))}
        </div>
        <div class="timeline-scroll-area">
          <div
            ref={rulerRef}
            class="timeline-ruler"
            onClick={handleRulerClick}
            style={{ overflowX: 'hidden' }}
          >
            <div class="ruler-inner" style={{ width: `${totalWidth}%` }}>
              <TimeRulerMarks durationMs={dur} zoom={z} />
              {beatIntervalMs > 0 && <BeatMarkers durationMs={dur} beatIntervalMs={beatIntervalMs} />}
              <div class="timeline-playhead" style={{ left: `${playheadPct / z}%` }} />
            </div>
          </div>
          <div
            ref={trackAreaRef}
            class="timeline-tracks"
            onScroll={handleTrackScroll}
          >
            {layers.map(layer => {
              const entries = getAnimatedProperties(layer);
              const selectedEntry = entries.find(e => e.name === propName);
              return (
                <div
                  key={layer.id}
                  class={`timeline-track ${selectedLayerId.value === layer.id ? 'timeline-track-selected' : ''}`}
                  onClick={() => { selectedLayerId.value = layer.id; }}
                >
                  <div class="track-bar-area" style={{ width: `${totalWidth}%` }}>
                    <div
                      class="track-bar"
                      style={{
                        left: `${(layer.inTime / dur) * 100}%`,
                        width: `${((layer.outTime - layer.inTime) / dur) * 100}%`,
                      }}
                      onDblClick={(e) => handleTrackBarClick(e, layer.id)}
                    >
                      <span class="track-bar-label">{layer.name}</span>
                      {selectedEntry && selectedEntry.prop.keyframes.map((kf, ki) => {
                        const kfPct = dur > 0 ? ((kf.time - layer.inTime) / (layer.outTime - layer.inTime)) * 100 : 0;
                        if (kfPct < 0 || kfPct > 100) return null;
                        const color = PROPERTY_COLORS[propName] ?? '#FFD700';
                        return (
                          <div
                            key={`${selectedEntry.name}-${ki}`}
                            class="kf-diamond"
                            style={{ left: `${kfPct}%`, borderColor: color }}
                            title={`${selectedEntry.name}: ${kf.value.toFixed(2)} @ ${(kf.time / 1000).toFixed(2)}s [${kf.easing}]`}
                            onMouseDown={(e) => handleKeyframeMouseDown(e, layer.id, selectedEntry.path, ki, kf.time)}
                            onContextMenu={(e) => handleKeyframeContextMenu(e, layer.id, selectedEntry.path, ki)}
                          />
                        );
                      })}
                    </div>
                    <div class="timeline-playhead-track" style={{ left: `${playheadPct / z}%` }} />
                  </div>
                </div>
              );
            })}
            {layers.length === 0 && (
              <div class="timeline-empty">No layers</div>
            )}
          </div>
        </div>
      </div>

      {easingMenu && (
        <div
          class="kf-context-menu"
          style={{ left: `${easingMenu.x}px`, top: `${easingMenu.y}px` }}
        >
          <div class="kf-menu-header">Easing</div>
          {EASING_OPTIONS.map(easing => (
            <button
              key={easing}
              class="kf-menu-item"
              onClick={() => handleChangeEasing(easingMenu.layerId, easingMenu.path, easingMenu.kfIndex, easing)}
            >
              {easing}
            </button>
          ))}
          <div class="kf-menu-divider" />
          <button
            class="kf-menu-item kf-menu-delete"
            onClick={() => handleDeleteKeyframe(easingMenu.layerId, easingMenu.path, easingMenu.kfIndex)}
          >
            Delete keyframe
          </button>
        </div>
      )}
      {easingMenu && (
        <div class="kf-menu-backdrop" onClick={() => setEasingMenu(null)} />
      )}

      <style>{timelineStyles}</style>
    </div>
  );
}

function TimeRulerMarks({ durationMs, zoom: z }: { durationMs: number; zoom: number }) {
  const totalSec = durationMs / 1000;
  const rawInterval = totalSec / (z * 10);
  const interval = rawInterval <= 0.5 ? 0.5 : rawInterval <= 1 ? 1 : rawInterval <= 2 ? 2 : rawInterval <= 5 ? 5 : 10;
  const marks: { pct: number; label: string }[] = [];

  for (let s = 0; s <= totalSec; s += interval) {
    marks.push({
      pct: (s / totalSec) * 100,
      label: `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`,
    });
  }

  return (
    <>
      {marks.map(m => (
        <span key={m.pct} class="ruler-mark" style={{ left: `${m.pct}%` }}>
          {m.label}
        </span>
      ))}
    </>
  );
}

function BeatMarkers({ durationMs, beatIntervalMs }: { durationMs: number; beatIntervalMs: number }) {
  const markers: number[] = [];
  for (let ms = 0; ms < durationMs; ms += beatIntervalMs) {
    markers.push((ms / durationMs) * 100);
  }
  return (
    <>
      {markers.map((pct, i) => (
        <div
          key={i}
          class={`beat-marker ${i % 4 === 0 ? 'beat-marker-downbeat' : ''}`}
          style={{ left: `${pct}%` }}
        />
      ))}
    </>
  );
}

const timelineStyles = `
.timeline-panel {
  height: var(--timeline-height);
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

.timeline-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.timeline-toolbar-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
}

.timeline-toolbar-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tl-prop-label {
  font-size: 10px;
  color: var(--text-muted);
}

.tl-prop-select {
  font-size: 10px;
  padding: 2px 4px;
  background: var(--bg-elevated);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 3px;
}

.timeline-zoom {
  display: flex;
  align-items: center;
  gap: 6px;
}

.timeline-zoom-label {
  font-size: 10px;
  color: var(--text-muted);
}

.timeline-zoom-slider {
  width: 80px;
}

.timeline-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.track-labels {
  width: 120px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  overflow-y: auto;
}

.track-label-header {
  height: 24px;
  line-height: 24px;
  padding: 0 10px;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}

.track-label {
  height: 28px;
  line-height: 28px;
  padding: 0 10px;
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
}
.track-label:hover { background: var(--bg-elevated); }
.track-label-selected { background: var(--accent-dim) !important; color: var(--text-primary); }

.timeline-scroll-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.timeline-ruler {
  position: relative;
  height: 24px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  flex-shrink: 0;
  overflow: hidden;
}

.ruler-inner {
  position: relative;
  height: 100%;
  min-width: 100%;
}

.ruler-mark {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-muted);
  line-height: 24px;
  padding: 0 4px;
  user-select: none;
  pointer-events: none;
}

.beat-marker {
  position: absolute;
  top: 18px;
  width: 1px;
  height: 6px;
  background: rgba(232, 66, 63, 0.25);
  pointer-events: none;
}

.beat-marker-downbeat {
  height: 10px;
  top: 14px;
  background: rgba(232, 66, 63, 0.5);
}

.timeline-playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--accent);
  transform: translateX(-1px);
  pointer-events: none;
  z-index: 2;
}

.timeline-playhead-track {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--accent);
  opacity: 0.4;
  pointer-events: none;
  z-index: 1;
}

.timeline-tracks {
  flex: 1;
  overflow: auto;
}

.timeline-track {
  height: 28px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.1s;
}
.timeline-track:hover { background: var(--bg-elevated); }
.timeline-track-selected { background: var(--accent-dim) !important; }

.track-bar-area {
  position: relative;
  height: 100%;
  min-width: 100%;
}

.track-bar {
  position: absolute;
  top: 4px;
  bottom: 4px;
  background: var(--accent);
  opacity: 0.35;
  border-radius: 3px;
  min-width: 4px;
  display: flex;
  align-items: center;
  padding: 0 6px;
  overflow: visible;
}

.track-bar-label {
  font-size: 9px;
  color: rgba(255,255,255,0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.timeline-track-selected .track-bar {
  opacity: 0.6;
}

.kf-diamond {
  position: absolute;
  top: 50%;
  width: 8px;
  height: 8px;
  transform: translate(-50%, -50%) rotate(45deg);
  background: var(--bg-secondary);
  border: 2px solid #FFD700;
  cursor: grab;
  z-index: 3;
  transition: background 0.1s;
  pointer-events: auto;
}
.kf-diamond:hover {
  background: #FFD700;
}

.kf-context-menu {
  position: fixed;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  z-index: 100;
  min-width: 140px;
  padding: 4px 0;
}

.kf-menu-header {
  padding: 4px 12px;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
}

.kf-menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 5px 12px;
  font-size: 11px;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.1s;
}
.kf-menu-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.kf-menu-delete {
  color: var(--accent);
}
.kf-menu-delete:hover {
  background: rgba(232, 66, 63, 0.15);
}

.kf-menu-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

.kf-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
}

.timeline-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}
`;
