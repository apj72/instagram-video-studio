import { useCallback, useEffect, useState } from 'preact/hooks';
import { project, updateProject } from '../../core/state.ts';
import { loadMediaFolder, saveMediaFolder } from '../../core/persistence.ts';
import { canPickMediaFolders, pickMediaFolder, requestDirectoryPermission } from '../../core/mediaFolders.ts';
import { showSafeAreas, safeAreaPreset } from '../canvas/CanvasViewport.tsx';
import { TONY_BRAND_ASSETS } from '../../templates/tonyBrand.ts';
import { BackgroundPhotoDialog } from '../BackgroundPhotoDialog.tsx';
import type { ProjectSettings } from '../../core/schema.ts';
import { resizeProjectDuration } from '../../core/projectDuration.ts';

const BACKGROUND_PHOTO_NAMES: Record<string, string> = {
  'tony-brand-wild': 'Tony T — Wild',
  'tony-brand-crowd': 'Tony T — Crowd',
  'tony-brand-tiedye': 'Tony T — Tie-dye',
};

export function SettingsPanel() {
  const settings = project.value.settings;
  const backgroundMotion = settings.backgroundMotion ?? { direction: 'none', startTime: 0, duration: 1000 };
  const meta = project.value.metadata;
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [sourceFolder, setSourceFolder] = useState<FileSystemDirectoryHandle | null>(null);
  const [destinationFolder, setDestinationFolder] = useState<FileSystemDirectoryHandle | null>(null);
  const [folderError, setFolderError] = useState('');

  useEffect(() => {
    void Promise.all([loadMediaFolder('source'), loadMediaFolder('destination')])
      .then(([source, destination]) => { setSourceFolder(source); setDestinationFolder(destination); })
      .catch(() => setFolderError('Could not load saved folder settings.'));
  }, []);

  const chooseFolder = useCallback(async (key: 'source' | 'destination') => {
    setFolderError('');
    try {
      const handle = await pickMediaFolder(key === 'source' ? 'read' : 'readwrite');
      if (!await requestDirectoryPermission(handle, key === 'source' ? 'read' : 'readwrite')) {
        setFolderError(`Permission to use the ${key} folder was not granted.`);
        return;
      }
      await saveMediaFolder(key, handle);
      if (key === 'source') setSourceFolder(handle);
      else setDestinationFolder(handle);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setFolderError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const clearFolder = useCallback(async (key: 'source' | 'destination') => {
    await saveMediaFolder(key, null);
    if (key === 'source') setSourceFolder(null);
    else setDestinationFolder(null);
  }, []);

  const handleNameChange = useCallback((e: Event) => {
    const name = (e.target as HTMLInputElement).value;
    updateProject(p => ({ ...p, metadata: { ...p.metadata, name } }));
  }, []);

  const handleDurationChange = useCallback((e: Event) => {
    const sec = parseFloat((e.target as HTMLInputElement).value);
    if (isNaN(sec) || sec <= 0) return;
    updateProject(p => resizeProjectDuration(p, sec * 1000));
  }, []);

  const handleFpsChange = useCallback((e: Event) => {
    const fps = parseInt((e.target as HTMLSelectElement).value);
    updateProject(p => ({ ...p, settings: { ...p.settings, fps } }));
  }, []);

  const handleBgColorChange = useCallback((e: Event) => {
    const color = (e.target as HTMLInputElement).value;
    updateProject(p => ({ ...p, settings: { ...p.settings, backgroundColor: color } }));
  }, []);

  const handleBgPhotoChange = useCallback((e: Event) => {
    const assetId = (e.target as HTMLSelectElement).value || null;
    updateProject(p => ({ ...p, settings: { ...p.settings, backgroundImageAssetId: assetId, backgroundImageDataUrl: undefined, backgroundImageName: undefined } }));
  }, []);

  const updateBackgroundMotion = useCallback((changes: Partial<NonNullable<ProjectSettings['backgroundMotion']>>) => {
    updateProject(p => ({ ...p, settings: {
      ...p.settings,
      backgroundMotion: { direction: 'none', startTime: 0, duration: 1000, ...p.settings.backgroundMotion, ...changes },
    } }));
  }, []);

  const handleSeedChange = useCallback((e: Event) => {
    const seed = parseInt((e.target as HTMLInputElement).value);
    if (!isNaN(seed)) {
      updateProject(p => ({ ...p, settings: { ...p.settings, seed } }));
    }
  }, []);

  const updateBorder = useCallback((key: string, value: unknown) => {
    updateProject(p => ({
      ...p,
      settings: { ...p.settings, border: { ...p.settings.border, [key]: value } },
    }));
  }, []);

  return (
    <div class="settings-panel">
      <div class="sidebar-header">
        <span>Project</span>
      </div>
      <div class="settings-content">
        <div class="prop-row" title="Project display name">
          <label class="prop-label">Name</label>
          <div class="prop-control">
            <input type="text" value={meta.name} onInput={handleNameChange} />
          </div>
        </div>
        <div class="prop-row" title="Total video duration in seconds">
          <label class="prop-label">Duration</label>
          <div class="prop-control settings-dur-row">
            <input
              type="number"
              min="0.001"
              step="any"
              value={Number((settings.duration / 1000).toFixed(6))}
              onInput={handleDurationChange}
              class="settings-num-input"
            />
            <span class="settings-unit">sec</span>
          </div>
        </div>
        <div class="prop-row" title="Frames per second for export (higher = smoother, larger file)">
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
        <div class="prop-row" title="Canvas background color (visible behind all layers)">
          <label class="prop-label">BG Color</label>
          <div class="prop-control">
            <input type="color" value={settings.backgroundColor} onInput={handleBgColorChange} />
          </div>
        </div>
        <div class="prop-row" title="Photo behind all layers. The September Mix uses the Wild photo.">
          <label class="prop-label" for="background-photo">BG Photo</label>
          <div class="prop-control">
            <select id="background-photo" aria-label="Background photo" value={settings.backgroundImageAssetId ?? ''} onChange={handleBgPhotoChange}>
              <option value="">None</option>
              {TONY_BRAND_ASSETS.map(asset => <option key={asset.id} value={asset.id}>{BACKGROUND_PHOTO_NAMES[asset.id]}</option>)}
              {settings.backgroundImageAssetId && !BACKGROUND_PHOTO_NAMES[settings.backgroundImageAssetId] && (
                <option value={settings.backgroundImageAssetId}>{settings.backgroundImageName || 'Custom photo'}</option>
              )}
            </select>
          </div>
        </div>
        <div class="settings-photo-action">
          <button onClick={() => setShowPhotoPicker(true)}>Choose &amp; crop photo…</button>
          <span>From files, a folder, or a photo dragged from Apple Photos.</span>
        </div>
        <div class="prop-subheading settings-motion-heading">Background movement</div>
        <div class="prop-row" title="Slide the background photo into view over the background colour">
          <label class="prop-label" for="background-slide">Slide in</label>
          <div class="prop-control">
            <select id="background-slide" aria-label="Background slide direction" value={backgroundMotion.direction}
              disabled={!settings.backgroundImageAssetId}
              onChange={event => updateBackgroundMotion({ direction: (event.target as HTMLSelectElement).value as NonNullable<ProjectSettings['backgroundMotion']>['direction'] })}>
              <option value="none">None</option>
              <option value="top">From top</option>
              <option value="bottom">From bottom</option>
              <option value="left">From left</option>
              <option value="right">From right</option>
            </select>
          </div>
        </div>
        {backgroundMotion.direction !== 'none' && settings.backgroundImageAssetId && <>
          <div class="prop-row" title="When the background photo begins sliding into view">
            <label class="prop-label" for="background-slide-start">Start at</label>
            <div class="prop-control settings-dur-row">
              <input id="background-slide-start" type="number" min="0" max={settings.duration / 1000} step="0.1"
                value={backgroundMotion.startTime / 1000} class="settings-num-input"
                onChange={event => {
                  const seconds = Number((event.target as HTMLInputElement).value);
                  if (Number.isFinite(seconds)) updateBackgroundMotion({ startTime: Math.max(0, Math.min(settings.duration, seconds * 1000)) });
                }} />
              <span class="settings-unit">sec</span>
            </div>
          </div>
          <div class="prop-row" title="How long the slide takes to finish">
            <label class="prop-label" for="background-slide-duration">Slide time</label>
            <div class="prop-control settings-dur-row">
              <input id="background-slide-duration" type="number" min="0.1" max={settings.duration / 1000} step="0.1"
                value={backgroundMotion.duration / 1000} class="settings-num-input"
                onChange={event => {
                  const seconds = Number((event.target as HTMLInputElement).value);
                  if (Number.isFinite(seconds) && seconds > 0) updateBackgroundMotion({ duration: Math.max(100, Math.min(settings.duration, seconds * 1000)) });
                }} />
              <span class="settings-unit">sec</span>
            </div>
          </div>
          <p class="settings-motion-help">The photo enters over BG Color. Other layers stay in place.</p>
        </>}
        <div class="prop-row" title="Random seed for deterministic effects (glitch, particles). Change to get different patterns.">
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
        <div class="prop-subheading settings-motion-heading">Media folders</div>
        <p class="settings-folder-help">Choose folders on this device. Folder permissions are stored in this browser.</p>
        <div class="settings-folder-row">
          <div><strong>Source media</strong><span>{sourceFolder?.name ?? 'No folder selected'}</span></div>
          {sourceFolder && <button type="button" title="Clear source media folder" onClick={() => void clearFolder('source')}>Clear</button>}
          <button type="button" disabled={!canPickMediaFolders()} onClick={() => void chooseFolder('source')}>{sourceFolder ? 'Change' : 'Choose'}</button>
        </div>
        <div class="settings-folder-row">
          <div><strong>Save exports to</strong><span>{destinationFolder?.name ?? 'Browser downloads (default)'}</span></div>
          {destinationFolder && <button type="button" title="Clear export destination" onClick={() => void clearFolder('destination')}>Clear</button>}
          <button type="button" disabled={!canPickMediaFolders()} onClick={() => void chooseFolder('destination')}>{destinationFolder ? 'Change' : 'Choose'}</button>
        </div>
        {!canPickMediaFolders() && <p class="settings-folder-help">Local folder selection is available in Chrome or Edge.</p>}
        {folderError && <p class="settings-folder-error" role="alert">{folderError}</p>}
        <div class="prop-row" title="Show Instagram-safe overlay guides on canvas">
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
        <div class="prop-subheading" style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted);margin-top:10px;padding-top:8px;border-top:1px solid var(--border)">Border</div>
        <div class="prop-row" title="Show a decorative frame border overlay">
          <label class="prop-label">Enabled</label>
          <div class="prop-control">
            <input type="checkbox" checked={settings.border.enabled}
              onChange={() => updateBorder('enabled', !settings.border.enabled)} />
          </div>
        </div>
        {settings.border.enabled && (
          <>
            <div class="prop-row" title="Border stroke color">
              <label class="prop-label">Color</label>
              <div class="prop-control">
                <input type="color" value={settings.border.color}
                  onInput={(e) => updateBorder('color', (e.target as HTMLInputElement).value)} />
              </div>
            </div>
            <div class="prop-row" title="Border line thickness in pixels">
              <label class="prop-label">Width</label>
              <div class="prop-control">
                <input type="range" min="1" max="20" step="1" value={settings.border.thickness}
                  onInput={(e) => updateBorder('thickness', parseInt((e.target as HTMLInputElement).value))} />
              </div>
            </div>
            <div class="prop-row" title="Distance from canvas edge to the border">
              <label class="prop-label">Inset</label>
              <div class="prop-control">
                <input type="range" min="0" max="200" step="1" value={settings.border.inset}
                  onInput={(e) => updateBorder('inset', parseInt((e.target as HTMLInputElement).value))} />
              </div>
            </div>
            <div class="prop-row" title="Rounded corner radius for the border">
              <label class="prop-label">Radius</label>
              <div class="prop-control">
                <input type="range" min="0" max="60" step="1" value={settings.border.cornerRadius}
                  onInput={(e) => updateBorder('cornerRadius', parseInt((e.target as HTMLInputElement).value))} />
              </div>
            </div>
            <div class="prop-row" title="Blur applied to the area outside the border (creates depth-of-field look)">
              <label class="prop-label">Blur</label>
              <div class="prop-control">
                <input type="range" min="0" max="50" step="1" value={settings.border.outerBlur}
                  onInput={(e) => updateBorder('outerBlur', parseInt((e.target as HTMLInputElement).value))} />
              </div>
            </div>
          </>
        )}
      </div>
      {showPhotoPicker && <BackgroundPhotoDialog onClose={() => setShowPhotoPicker(false)} />}
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

.settings-folder-help { margin: 3px 14px 8px; color: var(--text-muted); font-size: 10px; line-height: 1.4; }
.settings-folder-row { display:flex; align-items:center; gap:5px; padding:6px 14px; }
.settings-folder-row > div { min-width:0; flex:1; display:flex; flex-direction:column; gap:2px; }
.settings-folder-row strong { color:var(--text-secondary); font-size:10px; font-weight:600; }
.settings-folder-row span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-muted); font-size:10px; }
.settings-folder-row button { padding:4px 7px; border-radius:var(--radius-sm); background:var(--bg-elevated); color:var(--text-secondary); font-size:10px; }
.settings-folder-row button:hover:not(:disabled) { background:var(--border-hover); color:var(--text-primary); }
.settings-folder-row button:disabled { opacity:.45; }
.settings-folder-error { margin:5px 14px 8px; color:#ff7c7c; font-size:10px; }

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

.settings-photo-action { padding: 4px 0 10px 63px; display: flex; flex-direction: column; align-items: flex-start; gap: 5px; }
.settings-photo-action button { padding: 6px 8px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-elevated); color: var(--text-primary); font-size: 11px; }
.settings-photo-action button:hover { border-color: var(--accent); }
.settings-photo-action span { font-size: 10px; line-height: 1.35; color: var(--text-muted); }
.settings-motion-heading { margin: 6px 0 4px; padding-top: 8px; border-top: 1px solid var(--border); color: var(--text-muted); font-size: 9px; font-weight: 600; letter-spacing: .8px; text-transform: uppercase; }
.settings-motion-help { margin: 2px 0 10px 63px; color: var(--text-muted); font-size: 10px; line-height: 1.35; }
`;
