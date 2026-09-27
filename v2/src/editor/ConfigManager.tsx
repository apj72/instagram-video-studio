import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import { project, loadProject } from '../core/state.ts';
import { DEMO_CONFIGS } from '../templates/demos.ts';
import type { DemoConfig } from '../templates/demos.ts';
import {
  getConfigList, saveConfig, loadConfig, deleteConfig,
  captureThumb, exportConfigJSON, importConfigJSON,
} from '../core/configs.ts';
import type { SavedConfig } from '../core/configs.ts';
import type { Project } from '../core/schema.ts';
import { renderFrame } from '../render/engine.ts';
import { getAssetMap } from '../core/assets.ts';

interface ConfigManagerProps {
  canvasRef: { current: HTMLCanvasElement | null };
  onClose: () => void;
}

type Tab = 'library' | 'save' | 'io';

export function ConfigManager({ canvasRef, onClose }: ConfigManagerProps) {
  const [tab, setTab] = useState<Tab>('library');
  const [saveName, setSaveName] = useState(project.value.metadata.name);
  const [saveCategory, setSaveCategory] = useState('Custom');
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>(getConfigList());
  const [thumbPreview, setThumbPreview] = useState<string>('');
  const [demoThumbs, setDemoThumbs] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d', { colorSpace: 'display-p3' });
    if (!ctx) return;
    const assets = getAssetMap();
    const thumbs: Record<string, string> = {};
    for (const demo of DEMO_CONFIGS) {
      const p = demo.factory();
      const timeMs = p.settings.duration * 0.2;
      const frame = Math.floor(timeMs / (1000 / p.settings.fps));
      ctx.clearRect(0, 0, 1080, 1920);
      renderFrame(p, ctx, timeMs, frame, assets, null);
      thumbs[demo.id] = captureThumb(canvas);
    }
    setDemoThumbs(thumbs);
  }, []);

  const refreshConfigs = useCallback(() => {
    setSavedConfigs(getConfigList());
  }, []);

  const handleLoadDemo = useCallback((demo: DemoConfig) => {
    loadProject(demo.factory());
    onClose();
  }, [onClose]);

  const handleLoadSaved = useCallback((name: string) => {
    const p = loadConfig(name);
    if (p) {
      loadProject(p);
      onClose();
    }
  }, [onClose]);

  const handleDelete = useCallback((name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    deleteConfig(name);
    refreshConfigs();
  }, [refreshConfigs]);

  const handleSave = useCallback(() => {
    if (!saveName.trim()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveConfig(saveName.trim(), saveCategory, project.value, canvas);
    refreshConfigs();
    setTab('library');
  }, [saveName, saveCategory, canvasRef, refreshConfigs]);

  const handleTabSwitch = useCallback((t: Tab) => {
    setTab(t);
    if (t === 'save' && canvasRef.current) {
      setThumbPreview(captureThumb(canvasRef.current));
    }
  }, [canvasRef]);

  const handleDownloadJSON = useCallback(() => {
    const json = exportConfigJSON(project.value);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.value.metadata.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleUploadJSON = useCallback((file: File) => {
    file.text().then(text => {
      try {
        const p = importConfigJSON(text) as Project;
        loadProject(p);
        onClose();
      } catch {
        alert('Invalid JSON design file');
      }
    });
  }, [onClose]);

  const handleFileSelect = useCallback((e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleUploadJSON(file);
  }, [handleUploadJSON]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.endsWith('.json')) handleUploadJSON(file);
  }, [handleUploadJSON]);

  const demoCategories = [...new Set(DEMO_CONFIGS.map(d => d.category))];
  const savedCategories = [...new Set(savedConfigs.map(c => c.category))];

  return (
    <div class="cm-overlay" onClick={onClose}>
      <div class="cm-dialog" onClick={(e) => e.stopPropagation()}>
        <div class="cm-header">
          <h3>Designs</h3>
          <div class="cm-tabs">
            <button class={`cm-tab ${tab === 'library' ? 'cm-tab-active' : ''}`} onClick={() => handleTabSwitch('library')}>Library</button>
            <button class={`cm-tab ${tab === 'save' ? 'cm-tab-active' : ''}`} onClick={() => handleTabSwitch('save')}>Save</button>
            <button class={`cm-tab ${tab === 'io' ? 'cm-tab-active' : ''}`} onClick={() => handleTabSwitch('io')}>Import / Export</button>
          </div>
          <button class="cm-close" onClick={onClose}>X</button>
        </div>

        <div class="cm-body">
          {tab === 'library' && (
            <>
              {savedConfigs.length > 0 && (
                <>
                  <h4 class="cm-section-label">Your Designs</h4>
                  {savedCategories.map(cat => (
                    <div key={cat}>
                      <div class="cm-cat-label">{cat}</div>
                      <div class="cm-card-grid">
                        {savedConfigs.filter(c => c.category === cat).map(c => (
                          <div key={c.name} class="cm-card" onClick={() => handleLoadSaved(c.name)}>
                            <div class="cm-card-thumb">
                              {c.thumbnail ? <img src={c.thumbnail} alt={c.name} /> : <div class="cm-card-nothumb" />}
                            </div>
                            <div class="cm-card-info">
                              <div class="cm-card-name">{c.name}</div>
                              <div class="cm-card-date">{new Date(c.savedAt).toLocaleDateString()}</div>
                            </div>
                            <button class="cm-card-del" onClick={(e) => { e.stopPropagation(); handleDelete(c.name); }} title="Delete">x</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}

              <h4 class="cm-section-label">Demo Designs</h4>
              {demoCategories.map(cat => (
                <div key={cat}>
                  <div class="cm-cat-label">{cat}</div>
                  <div class="cm-card-grid">
                    {DEMO_CONFIGS.filter(d => d.category === cat).map(d => (
                      <div key={d.id} class="cm-card cm-card-demo" onClick={() => handleLoadDemo(d)}>
                        <div class="cm-card-thumb">
                          {demoThumbs[d.id]
                            ? <img src={demoThumbs[d.id]} alt={d.name} />
                            : null}
                          <div class="cm-card-demobadge">{d.category}</div>
                        </div>
                        <div class="cm-card-info">
                          <div class="cm-card-name">{d.name}</div>
                          <div class="cm-card-desc">{d.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'save' && (
            <div class="cm-save-form">
              <div class="cm-save-preview">
                {thumbPreview
                  ? <img src={thumbPreview} alt="Preview" class="cm-save-thumb" />
                  : <div class="cm-save-nothumb">No preview</div>}
              </div>
              <div class="cm-save-fields">
                <label class="cm-field-label">Name</label>
                <input
                  type="text"
                  value={saveName}
                  onInput={(e) => setSaveName((e.target as HTMLInputElement).value)}
                  placeholder="My Configuration"
                  class="cm-field-input"
                />
                <label class="cm-field-label">Category</label>
                <select
                  value={saveCategory}
                  onChange={(e) => setSaveCategory((e.target as HTMLSelectElement).value)}
                  class="cm-field-select"
                >
                  <option value="Events">Events</option>
                  <option value="Music">Music</option>
                  <option value="Branding">Branding</option>
                  <option value="Custom">Custom</option>
                </select>
                <button class="cm-save-btn" onClick={handleSave}>
                  Save Design
                </button>
              </div>
            </div>
          )}

          {tab === 'io' && (
            <div class="cm-io">
              <div class="cm-io-section">
                <h4 class="cm-section-label">Export</h4>
                <p class="cm-io-desc">Download the current project as a JSON file.</p>
                <button class="cm-io-btn" onClick={handleDownloadJSON}>
                  Download JSON
                </button>
              </div>
              <div class="cm-io-section">
                <h4 class="cm-section-label">Import</h4>
                <p class="cm-io-desc">Load a previously saved JSON design file.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  class="sr-only"
                  onChange={handleFileSelect}
                />
                <button class="cm-io-btn" onClick={() => fileInputRef.current?.click()}>
                  Upload JSON
                </button>
              </div>
              <div
                class="cm-io-dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                Drop a .json file here to import
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{cmStyles}</style>
    </div>
  );
}

const cmStyles = `
.cm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.cm-dialog {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 680px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.cm-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.cm-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
}

.cm-tabs {
  display: flex;
  gap: 4px;
  flex: 1;
}

.cm-tab {
  padding: 5px 14px;
  font-size: 11px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  transition: background 0.15s, color 0.15s;
}
.cm-tab:hover { background: var(--bg-elevated); }
.cm-tab-active {
  background: var(--accent) !important;
  color: white !important;
}

.cm-close {
  width: 24px;
  height: 24px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cm-close:hover { background: var(--border-hover); }

.cm-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.cm-section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px;
}

.cm-cat-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  margin: 12px 0 8px;
}

.cm-card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.cm-card {
  position: relative;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s, transform 0.1s;
}
.cm-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}

.cm-card-thumb {
  width: 100%;
  aspect-ratio: 9 / 16;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.cm-card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cm-card-nothumb {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--bg-primary), var(--bg-elevated));
}

.cm-card-demobadge {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: white;
  background: var(--accent);
  padding: 2px 6px;
  border-radius: 3px;
}

.cm-card-info {
  padding: 8px 10px;
}

.cm-card-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cm-card-desc {
  font-size: 10px;
  color: var(--text-muted);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cm-card-date {
  font-size: 10px;
  color: var(--text-muted);
}

.cm-card-del {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background: rgba(0,0,0,0.7);
  border-radius: 50%;
  color: var(--text-secondary);
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
}
.cm-card:hover .cm-card-del { opacity: 1; }
.cm-card-del:hover { background: var(--accent); color: white; }

/* Save tab */
.cm-save-form {
  display: flex;
  gap: 24px;
}

.cm-save-preview {
  width: 180px;
  flex-shrink: 0;
}

.cm-save-thumb {
  width: 100%;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.cm-save-nothumb {
  width: 100%;
  aspect-ratio: 9 / 16;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 12px;
}

.cm-save-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cm-field-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 4px;
}

.cm-field-input {
  padding: 8px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
}

.cm-field-select {
  padding: 8px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
}

.cm-save-btn {
  margin-top: 12px;
  padding: 10px 20px;
  background: var(--accent);
  color: white;
  font-size: 13px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}
.cm-save-btn:hover { background: var(--accent-hover); }

/* IO tab */
.cm-io {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cm-io-section {
  padding: 16px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.cm-io-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 8px 0 12px;
}

.cm-io-btn {
  padding: 8px 18px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 500;
  transition: background 0.15s;
}
.cm-io-btn:hover { background: var(--border-hover); }

.cm-io-dropzone {
  padding: 40px;
  border: 2px dashed var(--border);
  border-radius: var(--radius-sm);
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  transition: border-color 0.15s, color 0.15s;
}
.cm-io-dropzone:hover,
.cm-io-dropzone.dragover {
  border-color: var(--accent);
  color: var(--text-secondary);
}
`;
