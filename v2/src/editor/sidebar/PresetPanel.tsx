import { useState, useCallback } from 'preact/hooks';
import { project, loadProject } from '../../core/state.ts';
import { getPresetNames, savePreset, loadPreset, deletePreset } from '../../core/presets.ts';

export function PresetPanel() {
  const [names, setNames] = useState<string[]>(getPresetNames());
  const [selected, setSelected] = useState('');
  const [newName, setNewName] = useState('');

  const refresh = useCallback(() => {
    setNames(getPresetNames());
    setSelected('');
  }, []);

  const handleSave = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    savePreset(name, project.value);
    setNewName('');
    refresh();
  }, [newName, refresh]);

  const handleLoad = useCallback(() => {
    if (!selected) return;
    const p = loadPreset(selected);
    if (p) loadProject(p);
  }, [selected]);

  const handleDelete = useCallback(() => {
    if (!selected) return;
    if (!confirm(`Delete preset "${selected}"?`)) return;
    deletePreset(selected);
    refresh();
  }, [selected, refresh]);

  return (
    <div class="preset-panel">
      <div class="sidebar-header">
        <span>Presets</span>
        <span class="sidebar-count">{names.length}</span>
      </div>
      <div class="preset-content">
        <div class="preset-save-row">
          <input
            type="text"
            placeholder="Preset name..."
            value={newName}
            onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            class="preset-name-input"
          />
          <button class="preset-btn" onClick={handleSave} disabled={!newName.trim()}>Save</button>
        </div>
        {names.length > 0 && (
          <div class="preset-load-row">
            <select
              value={selected}
              onChange={(e) => setSelected((e.target as HTMLSelectElement).value)}
              class="preset-select"
            >
              <option value="">— select —</option>
              {names.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <button class="preset-btn" onClick={handleLoad} disabled={!selected}>Load</button>
            <button class="preset-btn preset-btn-danger" onClick={handleDelete} disabled={!selected}>Del</button>
          </div>
        )}
      </div>
      <style>{presetStyles}</style>
    </div>
  );
}

const presetStyles = `
.preset-panel {
  border-bottom: 1px solid var(--border);
}

.preset-content {
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preset-save-row,
.preset-load-row {
  display: flex;
  gap: 4px;
  align-items: center;
}

.preset-name-input {
  flex: 1;
  font-size: 11px;
  padding: 4px 6px;
}

.preset-select {
  flex: 1;
  font-size: 11px;
  padding: 4px 6px;
}

.preset-btn {
  padding: 4px 8px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 500;
  transition: background 0.15s;
  flex-shrink: 0;
}
.preset-btn:hover:not(:disabled) { background: var(--border-hover); color: var(--text-primary); }
.preset-btn:disabled { opacity: 0.3; cursor: default; }

.preset-btn-danger:hover:not(:disabled) { background: rgba(232, 66, 63, 0.2); color: var(--accent); }
`;
