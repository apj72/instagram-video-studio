import { project, selectedLayerId, selectedLayer, updateLayer, removeLayer, reorderLayers } from '../../core/state.ts';
import type { Layer } from '../../core/schema.ts';

const LAYER_TYPE_ICONS: Record<string, string> = {
  'image': 'IMG',
  'text': 'TXT',
  'video': 'VID',
  'shape': 'SHP',
  'effect': 'FX',
  'background-logo': 'BG',
  'group': 'GRP',
};

export function Sidebar() {
  const layers = project.value.layers;
  const selected = selectedLayer.value;

  return (
    <div class="sidebar">
      <div class="sidebar-section">
        <div class="sidebar-header">
          <span>Layers</span>
          <span class="sidebar-count">{layers.length}</span>
        </div>
        <div class="layer-list">
          {layers.map((layer, index) => (
            <div
              key={layer.id}
              class={`layer-item ${selectedLayerId.value === layer.id ? 'layer-item-selected' : ''}`}
              onClick={() => { selectedLayerId.value = layer.id; }}
            >
              <span class="layer-type-badge">{LAYER_TYPE_ICONS[layer.type] ?? '?'}</span>
              <span class="layer-name">{layer.name}</span>
              <div class="layer-actions">
                <button
                  class="layer-action-btn"
                  title={layer.visible ? 'Hide' : 'Show'}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLayer(layer.id, l => ({ ...l, visible: !l.visible }));
                  }}
                >
                  {layer.visible ? 'V' : '-'}
                </button>
                {index > 0 && (
                  <button
                    class="layer-action-btn"
                    title="Move up"
                    onClick={(e) => {
                      e.stopPropagation();
                      reorderLayers(index, index - 1);
                    }}
                  >^</button>
                )}
                {index < layers.length - 1 && (
                  <button
                    class="layer-action-btn"
                    title="Move down"
                    onClick={(e) => {
                      e.stopPropagation();
                      reorderLayers(index, index + 1);
                    }}
                  >v</button>
                )}
              </div>
            </div>
          ))}
          {layers.length === 0 && (
            <div class="layer-list-empty">No layers. Import a V1 config to get started.</div>
          )}
        </div>
      </div>

      {selected && (
        <div class="sidebar-section">
          <div class="sidebar-header">
            <span>Properties</span>
          </div>
          <div class="property-panel">
            <PropertyRow label="Name">
              <input
                type="text"
                value={selected.name}
                onInput={(e) => updateLayer(selected.id, l => ({ ...l, name: (e.target as HTMLInputElement).value }))}
              />
            </PropertyRow>
            <PropertyRow label="Type">
              <span class="prop-value-readonly">{selected.type}</span>
            </PropertyRow>
            <PropertyRow label="Visible">
              <input
                type="checkbox"
                checked={selected.visible}
                onChange={() => updateLayer(selected.id, l => ({ ...l, visible: !l.visible }))}
              />
            </PropertyRow>
            <PropertyRow label="Blend">
              <select
                value={selected.blendMode}
                onChange={(e) => updateLayer(selected.id, l => ({ ...l, blendMode: (e.target as HTMLSelectElement).value }))}
              >
                <option value="source-over">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="lighten">Lighten</option>
                <option value="darken">Darken</option>
              </select>
            </PropertyRow>

            {selected.type === 'text' && <TextProperties layer={selected} />}
            {selected.type === 'effect' && <EffectProperties layer={selected} />}

            <div class="property-danger-zone">
              <button
                class="danger-btn"
                onClick={() => removeLayer(selected.id)}
              >
                Delete Layer
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{sidebarStyles}</style>
    </div>
  );
}

function PropertyRow({ label, children }: { label: string; children: any }) {
  return (
    <div class="prop-row">
      <label class="prop-label">{label}</label>
      <div class="prop-control">{children}</div>
    </div>
  );
}

function TextProperties({ layer }: { layer: Layer & { type: 'text' } }) {
  return (
    <>
      <PropertyRow label="Text">
        <textarea
          value={layer.text}
          rows={3}
          onInput={(e) => updateLayer(layer.id, l => ({
            ...l,
            text: (e.target as HTMLTextAreaElement).value,
          }))}
        />
      </PropertyRow>
      <PropertyRow label="Font">
        <input
          type="text"
          value={layer.fontFamily}
          onInput={(e) => updateLayer(layer.id, l => ({
            ...l,
            fontFamily: (e.target as HTMLInputElement).value,
          }))}
        />
      </PropertyRow>
      <PropertyRow label="Color">
        <input
          type="color"
          value={layer.textColor}
          onInput={(e) => updateLayer(layer.id, l => ({
            ...l,
            textColor: (e.target as HTMLInputElement).value,
          }))}
        />
      </PropertyRow>
      <PropertyRow label="Align">
        <select
          value={layer.textAlign}
          onChange={(e) => updateLayer(layer.id, l => ({
            ...l,
            textAlign: (e.target as HTMLSelectElement).value as 'left' | 'center' | 'right',
          }))}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </PropertyRow>
    </>
  );
}

function EffectProperties({ layer }: { layer: Layer & { type: 'effect' } }) {
  return (
    <PropertyRow label="Effect">
      <span class="prop-value-readonly">{layer.effectType}</span>
    </PropertyRow>
  );
}

const sidebarStyles = `
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
}

.sidebar-section {
  border-bottom: 1px solid var(--border);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

.sidebar-count {
  background: var(--bg-elevated);
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 10px;
}

.layer-list {
  padding: 4px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.1s;
}
.layer-item:hover { background: var(--bg-elevated); }

.layer-item-selected {
  background: var(--accent-dim) !important;
  border: 1px solid var(--accent);
}

.layer-type-badge {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 3px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.layer-name {
  flex: 1;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.layer-item:hover .layer-actions,
.layer-item-selected .layer-actions { opacity: 1; }

.layer-action-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 3px;
  color: var(--text-secondary);
  font-size: 10px;
  font-family: var(--font-mono);
  transition: background 0.1s;
}
.layer-action-btn:hover { background: var(--border-hover); color: var(--text-primary); }

.layer-list-empty {
  padding: 20px 14px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

.property-panel {
  padding: 8px 14px;
}

.prop-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
}

.prop-label {
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 55px;
  text-align: right;
}

.prop-control {
  flex: 1;
}

.prop-control input[type="text"],
.prop-control select,
.prop-control textarea {
  width: 100%;
  font-size: 12px;
  padding: 4px 6px;
}

.prop-control textarea {
  resize: vertical;
  min-height: 50px;
}

.prop-control input[type="color"] {
  width: 32px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--border);
  cursor: pointer;
}

.prop-control input[type="checkbox"] {
  accent-color: var(--accent);
}

.prop-value-readonly {
  font-size: 12px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.property-danger-zone {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.danger-btn {
  width: 100%;
  padding: 6px;
  background: rgba(232, 66, 63, 0.12);
  color: var(--accent);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  transition: background 0.15s;
}
.danger-btn:hover { background: rgba(232, 66, 63, 0.25); }
`;
