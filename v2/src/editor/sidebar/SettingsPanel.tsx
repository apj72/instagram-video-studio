import { useCallback } from 'preact/hooks';
import { project, updateProject } from '../../core/state.ts';
import { showSafeAreas, safeAreaPreset } from '../canvas/CanvasViewport.tsx';

export function SettingsPanel() {
  const settings = project.value.settings;
  const meta = project.value.metadata;

  const handleNameChange = useCallback((e: Event) => {
    const name = (e.target as HTMLInputElement).value;
    updateProject(p => ({ ...p, metadata: { ...p.metadata, name } }));
  }, []);

  const handleDurationChange = useCallback((e: Event) => {
    const sec = parseFloat((e.target as HTMLInputElement).value);
    if (isNaN(sec) || sec <= 0) return;
    const newDur = sec * 1000;
    const oldDur = project.value.settings.duration;
    const ratio = newDur / oldDur;
    updateProject(p => ({
      ...p,
      settings: { ...p.settings, duration: newDur },
      layers: p.layers.map(l => ({
        ...l,
        outTime: l.outTime === oldDur ? newDur : l.outTime * ratio,
      })),
    }));
  }, []);

  const handleFpsChange = useCallback((e: Event) => {
    const fps = parseInt((e.target as HTMLSelectElement).value);
    updateProject(p => ({ ...p, settings: { ...p.settings, fps } }));
  }, []);

  const handleBgColorChange = useCallback((e: Event) => {
    const color = (e.target as HTMLInputElement).value;
    updateProject(p => ({ ...p, settings: { ...p.settings, backgroundColor: color } }));
  }, []);

  const handleSeedChange = useCallback((e: Event) => {
    const seed = parseInt((e.target as HTMLInputElement).value);
    if (!isNaN(seed)) {
      updateProject(p => ({ ...p, settings: { ...p.settings, seed } }));
    }
  }, []);

  return (
    <div class="settings-panel">
      <div class="sidebar-header">
        <span>Project</span>
      </div>
      <div class="settings-content">
        <div class="prop-row">
          <label class="prop-label">Name</label>
          <div class="prop-control">
            <input type="text" value={meta.name} onInput={handleNameChange} />
          </div>
        </div>
        <div class="prop-row">
          <label class="prop-label">Duration</label>
          <div class="prop-control settings-dur-row">
            <input
              type="number"
              min="1"
              max="900"
              step="1"
              value={Math.round(settings.duration / 1000)}
              onInput={handleDurationChange}
              class="settings-num-input"
            />
            <span class="settings-unit">sec</span>
          </div>
        </div>
        <div class="prop-row">
          <label class="prop-label">FPS</label>
          <div class="prop-control">
            <select value={settings.fps} onChange={handleFpsChange}>
              <option value="24">24</option>
              <option value="25">25</option>
              <option value="30">30</option>
              <option value="60">60</option>
            </select>
          </div>
        </div>
        <div class="prop-row">
          <label class="prop-label">BG Color</label>
          <div class="prop-control">
            <input type="color" value={settings.backgroundColor} onInput={handleBgColorChange} />
          </div>
        </div>
        <div class="prop-row">
          <label class="prop-label">Seed</label>
          <div class="prop-control">
            <input
              type="number"
              min="0"
              max="999999"
              value={settings.seed}
              onInput={handleSeedChange}
              class="settings-num-input"
            />
          </div>
        </div>
        <div class="prop-row">
          <label class="prop-label">Safe areas</label>
          <div class="prop-control settings-safe-row">
            <input
              type="checkbox"
              checked={showSafeAreas.value}
              onChange={() => { showSafeAreas.value = !showSafeAreas.value; }}
            />
            <select
              value={safeAreaPreset.value}
              onChange={(e) => { safeAreaPreset.value = (e.target as HTMLSelectElement).value as 'reel' | 'feed45' | 'grid11'; }}
              disabled={!showSafeAreas.value}
            >
              <option value="reel">Reel UI</option>
              <option value="feed45">Feed 4:5</option>
              <option value="grid11">Grid 1:1</option>
            </select>
          </div>
        </div>
      </div>
      <style>{settingsStyles}</style>
    </div>
  );
}

const settingsStyles = `
.settings-panel {
  border-bottom: 1px solid var(--border);
}

.settings-content {
  padding: 8px 14px;
}

.settings-num-input {
  width: 70px;
  text-align: center;
}

.settings-dur-row,
.settings-safe-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.settings-unit {
  font-size: 10px;
  color: var(--text-muted);
}
`;
