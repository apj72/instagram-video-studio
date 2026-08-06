import { useRef, useCallback } from 'preact/hooks';
import { project, currentTime, selectedLayerId, zoom } from '../../core/state.ts';

interface TimelinePanelProps {
  onSeek: (timeMs: number) => void;
}

export function TimelinePanel({ onSeek }: TimelinePanelProps) {
  const layers = project.value.layers;
  const dur = project.value.settings.duration;
  const bpm = project.value.settings.bpm;
  const time = currentTime.value;
  const z = zoom.value;
  const rulerRef = useRef<HTMLDivElement>(null);
  const trackAreaRef = useRef<HTMLDivElement>(null);

  const totalWidth = z * 100;
  const playheadPct = dur > 0 ? (time / dur) * 100 : 0;

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

  const beatIntervalMs = bpm > 0 ? (60 / bpm) * 1000 : 0;

  return (
    <div class="timeline-panel">
      <div class="timeline-toolbar">
        <span class="timeline-toolbar-label">Timeline</span>
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
            {layers.map(layer => (
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
                  >
                    <span class="track-bar-label">{layer.name}</span>
                  </div>
                  <div class="timeline-playhead-track" style={{ left: `${playheadPct / z}%` }} />
                </div>
              </div>
            ))}
            {layers.length === 0 && (
              <div class="timeline-empty">No layers</div>
            )}
          </div>
        </div>
      </div>
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
  overflow: hidden;
}

.track-bar-label {
  font-size: 9px;
  color: rgba(255,255,255,0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timeline-track-selected .track-bar {
  opacity: 0.6;
}

.timeline-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}
`;
