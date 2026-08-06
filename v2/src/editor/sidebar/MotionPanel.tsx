import { useCallback } from 'preact/hooks';
import { selectedLayer, selectedLayerId, currentTime, updateLayer } from '../../core/state.ts';
import { MOTION_PRESETS, applyMotionPreset } from '../../timeline/presets.ts';
import type { MotionPreset } from '../../timeline/presets.ts';

export function MotionPanel() {
  const layer = selectedLayer.value;

  const handleApply = useCallback((preset: MotionPreset) => {
    const id = selectedLayerId.value;
    if (!id) return;
    const timeMs = currentTime.value;
    updateLayer(id, l => applyMotionPreset(l, preset, timeMs));
  }, []);

  const entrancePresets = MOTION_PRESETS.filter(p => p.category === 'entrance');
  const exitPresets = MOTION_PRESETS.filter(p => p.category === 'exit');
  const emphasisPresets = MOTION_PRESETS.filter(p => p.category === 'emphasis');

  return (
    <div class="motion-panel">
      <div class="sidebar-header">
        <span>Motion</span>
      </div>
      {!layer ? (
        <div class="motion-empty">Select a layer to apply motion presets</div>
      ) : (
        <div class="motion-content">
          <PresetGroup label="Entrance" presets={entrancePresets} onApply={handleApply} />
          <PresetGroup label="Exit" presets={exitPresets} onApply={handleApply} />
          <PresetGroup label="Emphasis" presets={emphasisPresets} onApply={handleApply} />
        </div>
      )}
      <style>{motionStyles}</style>
    </div>
  );
}

function PresetGroup({
  label,
  presets,
  onApply,
}: {
  label: string;
  presets: MotionPreset[];
  onApply: (p: MotionPreset) => void;
}) {
  return (
    <div class="motion-group">
      <div class="motion-group-label">{label}</div>
      <div class="motion-grid">
        {presets.map(p => (
          <button
            key={p.id}
            class="motion-btn"
            onClick={() => onApply(p)}
            title={`${p.name} (${p.durationMs}ms)`}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

const motionStyles = `
.motion-panel {
  border-bottom: 1px solid var(--border);
}

.motion-empty {
  padding: 12px 14px;
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
}

.motion-content {
  padding: 4px 14px 10px;
}

.motion-group {
  margin-bottom: 8px;
}

.motion-group-label {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.motion-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
}

.motion-btn {
  padding: 4px 6px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 500;
  transition: background 0.15s;
  text-align: center;
}
.motion-btn:hover {
  background: var(--border-hover);
  color: var(--text-primary);
}
`;
