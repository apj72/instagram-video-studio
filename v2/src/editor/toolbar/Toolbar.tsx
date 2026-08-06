import { canUndo, canRedo, undo, redo } from '../../core/commands.ts';
import { isSaving } from '../../core/persistence.ts';

interface ToolbarProps {
  onImportV1: () => void;
  onExport: () => void;
  onSave: () => void;
  onNewFromTemplate: () => void;
}

export function Toolbar({ onImportV1, onExport, onSave, onNewFromTemplate }: ToolbarProps) {
  return (
    <div class="toolbar">
      <div class="toolbar-brand">
        <span class="toolbar-logo">VERSION 1</span>
        <span class="toolbar-subtitle">STUDIO</span>
      </div>
      <div class="toolbar-center">
        <button class="toolbar-btn" onClick={undo} disabled={!canUndo.value} title="Undo (Cmd+Z)">Undo</button>
        <button class="toolbar-btn" onClick={redo} disabled={!canRedo.value} title="Redo (Cmd+Shift+Z)">Redo</button>
        {isSaving.value && <span class="toolbar-saving">Saving...</span>}
      </div>
      <div class="toolbar-actions">
        <button class="toolbar-btn" onClick={onNewFromTemplate}>Templates</button>
        <button class="toolbar-btn" onClick={onImportV1}>Import V1</button>
        <button class="toolbar-btn" onClick={onSave}>Save</button>
        <button class="toolbar-btn toolbar-btn-primary" onClick={onExport}>Export MP4</button>
      </div>
      <style>{toolbarStyles}</style>
    </div>
  );
}

const toolbarStyles = `
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--toolbar-height);
  padding: 0 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.toolbar-brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.toolbar-logo {
  font-family: 'Bungee', sans-serif;
  font-size: 16px;
  color: var(--accent);
  letter-spacing: 2px;
}

.toolbar-subtitle {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 3px;
  text-transform: uppercase;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-saving {
  font-size: 10px;
  color: var(--text-muted);
  font-style: italic;
}

.toolbar-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.toolbar-btn {
  padding: 6px 14px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 500;
  transition: background 0.15s;
}
.toolbar-btn:hover { background: var(--border-hover); }

.toolbar-btn-primary {
  background: var(--accent);
  color: white;
}
.toolbar-btn-primary:hover { background: var(--accent-hover); }
`;
