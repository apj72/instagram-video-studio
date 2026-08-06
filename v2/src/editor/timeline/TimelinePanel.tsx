import { project, currentTime, selectedLayerId } from '../../core/state.ts';

interface TimelinePanelProps {
  onSeek: (timeMs: number) => void;
}

export function TimelinePanel({ onSeek }: TimelinePanelProps) {
  const layers = project.value.layers;
  const dur = project.value.settings.duration;
  const time = currentTime.value;
  const playheadPct = dur > 0 ? (time / dur) * 100 : 0;

  return (
    <div class="timeline-panel">
      <div class="timeline-ruler"
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          onSeek(pct * dur);
        }}
      >
        <TimeRulerMarks durationMs={dur} />
        <div class="timeline-playhead" style={{ left: `${playheadPct}%` }} />
      </div>
      <div class="timeline-tracks">
        {layers.map(layer => (
          <div
            key={layer.id}
            class={`timeline-track ${selectedLayerId.value === layer.id ? 'timeline-track-selected' : ''}`}
            onClick={() => { selectedLayerId.value = layer.id; }}
          >
            <div class="track-label">{layer.name}</div>
            <div class="track-bar-area">
              <div
                class="track-bar"
                style={{
                  left: `${(layer.inTime / dur) * 100}%`,
                  width: `${((layer.outTime - layer.inTime) / dur) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
        {layers.length === 0 && (
          <div class="timeline-empty">No layers</div>
        )}
      </div>
      <style>{timelineStyles}</style>
    </div>
  );
}

function TimeRulerMarks({ durationMs }: { durationMs: number }) {
  const totalSec = durationMs / 1000;
  const marks: { pct: number; label: string }[] = [];
  const interval = totalSec <= 10 ? 1 : totalSec <= 30 ? 2 : totalSec <= 60 ? 5 : 10;

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

.timeline-ruler {
  position: relative;
  height: 24px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  flex-shrink: 0;
  overflow: hidden;
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

.timeline-tracks {
  flex: 1;
  overflow-y: auto;
}

.timeline-track {
  display: flex;
  align-items: center;
  height: 28px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.1s;
}
.timeline-track:hover { background: var(--bg-elevated); }

.timeline-track-selected {
  background: var(--accent-dim) !important;
}

.track-label {
  width: 120px;
  padding: 0 10px;
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
}

.track-bar-area {
  flex: 1;
  position: relative;
  height: 100%;
}

.track-bar {
  position: absolute;
  top: 4px;
  bottom: 4px;
  background: var(--accent);
  opacity: 0.4;
  border-radius: 3px;
  min-width: 4px;
}

.timeline-track-selected .track-bar {
  opacity: 0.7;
}

.timeline-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}
`;
