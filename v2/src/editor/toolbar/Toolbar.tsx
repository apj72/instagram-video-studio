interface ToolbarProps {
  onImportV1: () => void;
}

export function Toolbar({ onImportV1 }: ToolbarProps) {
  return (
    <div class="toolbar">
      <div class="toolbar-brand">
        <span class="toolbar-logo">VERSION 1</span>
        <span class="toolbar-subtitle">STUDIO</span>
      </div>
      <div class="toolbar-actions">
        <button class="toolbar-btn" onClick={onImportV1}>Import V1 Config</button>
        <button class="toolbar-btn toolbar-btn-primary">Export MP4</button>
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
