import { canUndo, canRedo, undo, redo } from '../../core/commands.ts';
import { isSaving } from '../../core/persistence.ts';
import { showLabels, autoKeyframe } from '../../core/state.ts';

interface ToolbarProps {
  onImportV1: () => void;
  onExport: () => void;
  onSave: () => void;
  onNewFromTemplate: () => void;
  onCaptureImage: () => void;
  onOpenPosts: () => void;
}

export function Toolbar({ onImportV1, onExport, onSave, onNewFromTemplate, onCaptureImage, onOpenPosts }: ToolbarProps) {
  return (
    <div class="toolbar">
      <div class="toolbar-brand">
        <span class="toolbar-logo">VERSION 1</span>
        <span class="toolbar-subtitle">STUDIO</span>
      </div>
      <div class="toolbar-center">
        <button class="toolbar-btn" onClick={undo} disabled={!canUndo.value} title="Undo (Cmd+Z)">Undo</button>
        <button class="toolbar-btn" onClick={redo} disabled={!canRedo.value} title="Redo (Cmd+Shift+Z)">Redo</button>
        <button
          class={`toolbar-btn ${showLabels.value ? 'toolbar-btn-active' : ''}`}
          onClick={() => { showLabels.value = !showLabels.value; }}
          title="Show element ID labels on canvas"
        >
          Labels
        </button>
        <button
          class={`toolbar-btn ${autoKeyframe.value ? 'toolbar-btn-autokey' : ''}`}
          onClick={() => { autoKeyframe.value = !autoKeyframe.value; }}
          title="Auto-keyframe: when ON, changing a property creates a keyframe at the playhead position"
        >
          {autoKeyframe.value ? '◆ Auto-Key' : 'Auto-Key'}
        </button>
        {isSaving.value && <span class="toolbar-saving">Saving...</span>}
      </div>
      <div class="toolbar-actions">
        <button class="toolbar-btn" onClick={onNewFromTemplate} title="Start from a pre-built template">Templates</button>
        <button class="toolbar-btn" onClick={onImportV1} title="Import a V1 project configuration">Import V1</button>
        <button class="toolbar-btn" onClick={onCaptureImage} title="Save current frame as PNG">Screenshot</button>
        <button class="toolbar-btn" onClick={onOpenPosts} title="View generated post thumbnails and JSON jobs">Posts</button>
        <button class="toolbar-btn" onClick={onSave} title="Save or update a post or template (Cmd+S)">Save / Save As</button>
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
  gap: 12px;
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
  flex-shrink: 0;
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
  flex-shrink: 0;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
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
  white-space: nowrap;
}
.toolbar-btn:hover { background: var(--border-hover); }

.toolbar-btn-active {
  background: var(--accent);
  color: white;
}

.toolbar-btn-autokey {
  background: var(--accent);
  color: white;
  animation: autokey-pulse 1.5s ease-in-out infinite;
}

@keyframes autokey-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(232, 66, 63, 0.6); }
  50% { box-shadow: 0 0 8px 3px rgba(232, 66, 63, 0.4); }
}

.toolbar-btn-primary {
  background: var(--accent);
  color: white;
}
.toolbar-btn-primary:hover { background: var(--accent-hover); }

@media (max-width: 1200px) {
  .toolbar { padding: 0 8px; gap: 8px; overflow-x: auto; }
  .toolbar-subtitle { display: none; }
  .toolbar-logo { white-space: nowrap; font-size: 13px; }
  .toolbar-actions { gap: 4px; }
  .toolbar-btn { padding: 6px 8px; font-size: 11px; }
}
`;
