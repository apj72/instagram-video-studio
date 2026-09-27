import { useEffect, useRef, useState } from 'preact/hooks';
import { project, updateProject } from '../core/state.ts';
import { generateId } from '../core/schema.ts';
import { autosave, saveAsset } from '../core/persistence.ts';
import { registerAsset } from '../core/assets.ts';
import { TONY_BRAND_ASSETS } from '../templates/tonyBrand.ts';
import { getBackgroundPlacement } from './backgroundCrop.ts';

interface PhotoChoice {
  id: string;
  label: string;
  url: string;
  path?: string;
  folder?: string;
  file?: File;
}

const BUNDLED: PhotoChoice[] = TONY_BRAND_ASSETS.map(asset => ({
  id: asset.id,
  label: asset.id.replace('tony-brand-', 'Tony T — '),
  url: asset.url,
}));

const PHOTO_EXTENSIONS = /\.(jpe?g|png|webp|avif|gif|heic|heif)$/i;
const PAGE_SIZE = 60;

function isPhoto(file: File): boolean {
  return file.type.startsWith('image/') || PHOTO_EXTENSIONS.test(file.name);
}

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create the cropped image.')), 'image/jpeg', 0.92);
  });
}

export function BackgroundPhotoDialog({ onClose }: { onClose: () => void }) {
  const { width, height, backgroundColor, backgroundImageAssetId, backgroundImageDataUrl, backgroundImageName } = project.value.settings;
  const ratio = width / height;
  const previewWidth = Math.round(Math.min(440, 460 * ratio));
  const previewHeight = Math.round(previewWidth / ratio);
  const [imported, setImported] = useState<PhotoChoice[]>([]);
  const [selected, setSelected] = useState<PhotoChoice | null>(() => {
    if (backgroundImageDataUrl) return { id: 'current', label: backgroundImageName || 'Current cropped photo', url: backgroundImageDataUrl };
    return BUNDLED.find(photo => photo.id === backgroundImageAssetId) ?? null;
  });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [focusX, setFocusX] = useState(0.5);
  const [focusY, setFocusY] = useState(0.5);
  const [query, setQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState('studio');
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    folderInputRef.current?.setAttribute('webkitdirectory', '');
  }, []);

  useEffect(() => () => {
    imported.forEach(photo => URL.revokeObjectURL(photo.url));
  }, [imported]);

  useEffect(() => {
    setImage(null);
    setWarning('');
    setPreparing(Boolean(selected));
    if (!selected) return;
    let active = true;
    const controller = new AbortController();
    let convertedUrl: string | null = null;
    async function prepare() {
      try {
        let url = selected!.url;
        let conversionWarning = '';
        if (selected!.file) {
          const extension = selected!.file.name.match(/\.[^.]+$/)?.[0] ?? '';
          let response: Response | null = null;
          try {
            response = await fetch('/api/photo/convert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/octet-stream', 'X-Photo-Extension': extension },
              body: selected!.file,
              signal: controller.signal,
            });
          } catch (cause) {
            if (controller.signal.aborted) throw cause;
            conversionWarning = 'Local colour conversion is unavailable. HDR photos may appear muted.';
          }
          if (response?.status === 404) conversionWarning = 'Local colour conversion is unavailable. HDR photos may appear muted.';
          else if (response && !response.ok && response.status !== 204 && response.status !== 415) {
            throw new Error(await response.text() || 'Photo colour conversion failed.');
          }
          if (response?.status === 200) {
            convertedUrl = URL.createObjectURL(await response.blob());
            url = convertedUrl;
          }
        }
        const next = new Image();
        next.src = url;
        await next.decode();
        if (active) { setImage(next); setError(''); setWarning(conversionWarning); }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(`Could not open ${selected!.label}: ${cause instanceof Error ? cause.message : String(cause)}`);
        }
      } finally {
        if (active) setPreparing(false);
      }
    }
    void prepare();
    return () => {
      active = false;
      controller.abort();
      if (convertedUrl) URL.revokeObjectURL(convertedUrl);
    };
  }, [selected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { colorSpace: 'display-p3' });
    if (!ctx) return;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, previewWidth, previewHeight);
    if (!image) return;
    const placement = getBackgroundPlacement(image.naturalWidth, image.naturalHeight, previewWidth, previewHeight, zoom, focusX, focusY);
    ctx.drawImage(image, placement.dx, placement.dy, placement.dw, placement.dh);
  }, [image, zoom, focusX, focusY, backgroundColor, previewWidth, previewHeight]);

  function choose(photo: PhotoChoice) {
    setSelected(photo);
    setZoom(1);
    setFocusX(0.5);
    setFocusY(0.5);
    setError('');
    setWarning('');
  }

  function addFiles(files: FileList | File[], source: 'files' | 'folder') {
    const photos = Array.from(files).filter(isPhoto);
    if (photos.length === 0) {
      setError('No image files were found. Choose JPEG, PNG, WebP, AVIF or another browser-supported image.');
      return;
    }
    const choices = photos.map((file, index) => ({
      id: `file-${index}-${file.name}`,
      label: file.name,
      path: file.webkitRelativePath || file.name,
      folder: source === 'folder' ? file.webkitRelativePath.split('/').slice(0, -1).join('/') : '',
      url: URL.createObjectURL(file),
      file,
    }));
    setImported(choices);
    setCurrentFolder(source === 'folder' && choices[0].folder ? choices[0].folder.split('/')[0] : 'chosen');
    setQuery('');
    setPage(0);
    choose(choices[0]);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files.length) addFiles(event.dataTransfer.files, 'files');
  }

  function handlePointerMove(event: PointerEvent) {
    if (!pointerRef.current || !image) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const dx = (event.clientX - pointerRef.current.x) / bounds.width;
    const dy = (event.clientY - pointerRef.current.y) / bounds.height;
    const placement = getBackgroundPlacement(image.naturalWidth, image.naturalHeight, previewWidth, previewHeight, zoom, focusX, focusY);
    if (Math.abs(previewWidth - placement.dw) > 0.001) {
      setFocusX(value => Math.max(0, Math.min(1, value + dx * previewWidth / (previewWidth - placement.dw))));
    }
    if (Math.abs(previewHeight - placement.dh) > 0.001) {
      setFocusY(value => Math.max(0, Math.min(1, value + dy * previewHeight / (previewHeight - placement.dh))));
    }
    pointerRef.current = { x: event.clientX, y: event.clientY };
  }

  async function saveCrop() {
    if (!image || !selected || saving) return;
    setSaving(true);
    setError('');
    try {
      const output = document.createElement('canvas');
      output.width = width;
      output.height = height;
      const ctx = output.getContext('2d', { colorSpace: 'display-p3' });
      if (!ctx) throw new Error('Canvas is unavailable.');
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
      const placement = getBackgroundPlacement(image.naturalWidth, image.naturalHeight, width, height, zoom, focusX, focusY);
      ctx.drawImage(image, placement.dx, placement.dy, placement.dw, placement.dh);
      const blob = await canvasBlob(output);
      const dataUrl = await readDataUrl(blob);
      const assetId = `background-${generateId()}`;
      await saveAsset(project.value.metadata.createdAt, assetId, blob, 'image/jpeg', `${selected.label}-crop.jpg`);
      const loaded = new Image();
      loaded.src = dataUrl;
      await loaded.decode();
      registerAsset(assetId, loaded);
      updateProject(current => ({ ...current, settings: {
        ...current.settings,
        backgroundImageAssetId: assetId,
        backgroundImageDataUrl: dataUrl,
        backgroundImageName: selected.label,
      } }));
      await autosave(project.value);
      onClose();
    } catch (cause) {
      setError(`Could not save photo: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setSaving(false);
    }
  }

  const importedRoot = imported.find(photo => photo.folder)?.folder?.split('/')[0] ?? null;
  const currentPhotos = currentFolder === 'studio'
    ? [...BUNDLED, ...(selected?.id === 'current' ? [selected] : [])]
    : currentFolder === 'chosen'
      ? imported.filter(photo => !photo.folder)
      : imported.filter(photo => photo.folder === currentFolder || (query && photo.folder?.startsWith(`${currentFolder}/`)));
  const folders = new Map<string, { path: string; name: string; cover: string; count: number }>();
  if (currentFolder !== 'studio' && currentFolder !== 'chosen' && !query) {
    for (const photo of imported) {
      if (!photo.folder?.startsWith(`${currentFolder}/`)) continue;
      const name = photo.folder.slice(currentFolder.length + 1).split('/')[0];
      const path = `${currentFolder}/${name}`;
      const existing = folders.get(path);
      if (existing) existing.count++;
      else folders.set(path, { path, name, cover: photo.url, count: 1 });
    }
  }
  const filtered = currentPhotos.filter(photo => `${photo.label} ${photo.path ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const folderParts = currentFolder === 'studio' || currentFolder === 'chosen' ? [] : currentFolder.split('/');

  return (
    <div class="bg-photo-overlay" onClick={onClose}>
      <div class="bg-photo-dialog" role="dialog" aria-modal="true" aria-label="Choose background photo"
        onClick={event => event.stopPropagation()} onDragOver={event => event.preventDefault()} onDrop={handleDrop}>
        <header class="bg-photo-header">
          <div><h2>Background photo</h2><p>Choose a photo, then drag and zoom to frame it for this template.</p></div>
          <button onClick={onClose} aria-label="Close background photo picker">×</button>
        </header>
        <div class="bg-photo-body">
          <section class="bg-photo-library" aria-label="Photo library">
            <div class="bg-photo-actions">
              <button onClick={() => fileInputRef.current?.click()}>Choose photos…</button>
              <button onClick={() => folderInputRef.current?.click()}>Choose starting folder…</button>
              <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" multiple hidden
                onChange={event => { const input = event.target as HTMLInputElement; if (input.files) addFiles(input.files, 'files'); input.value = ''; }} />
              <input ref={folderInputRef} type="file" multiple hidden
                onChange={event => { const input = event.target as HTMLInputElement; if (input.files) addFiles(input.files, 'folder'); input.value = ''; }} />
            </div>
            <p class="bg-photo-help">Choose a starting folder once, then open its subfolders and view photos here as thumbnails. For Apple Photos, drag an image here or export it from Photos first.</p>
            <nav class="bg-photo-locations" aria-label="Photo locations">
              <button class={currentFolder === 'studio' ? 'bg-photo-location-active' : ''} onClick={() => { setCurrentFolder('studio'); setQuery(''); setPage(0); }}>Studio photos</button>
              {importedRoot
                ? <button class={currentFolder !== 'studio' ? 'bg-photo-location-active' : ''} onClick={() => { setCurrentFolder(importedRoot); setQuery(''); setPage(0); }} title={importedRoot}>{importedRoot}</button>
                : imported.length > 0 && <button class={currentFolder === 'chosen' ? 'bg-photo-location-active' : ''} onClick={() => { setCurrentFolder('chosen'); setQuery(''); setPage(0); }}>Chosen photos</button>}
            </nav>
            {folderParts.length > 0 && <nav class="bg-photo-breadcrumb" aria-label="Current folder">
              {folderParts.map((part, index) => <span key={index}>
                {index > 0 && <span class="bg-photo-breadcrumb-separator">/</span>}
                <button onClick={() => { setCurrentFolder(folderParts.slice(0, index + 1).join('/')); setQuery(''); setPage(0); }}>{part}</button>
              </span>)}
            </nav>}
            <input class="bg-photo-search" type="search" placeholder="Find a photo in this folder" aria-label="Search photos"
              value={query} onInput={event => { setQuery((event.target as HTMLInputElement).value); setPage(0); }} />
            <div class="bg-photo-count">{folders.size > 0 && `${folders.size} folder${folders.size === 1 ? '' : 's'} · `}{filtered.length} photo{filtered.length === 1 ? '' : 's'}</div>
            <div class="bg-photo-grid">
              {[...folders.values()].map(folder => <button key={folder.path} class="bg-photo-choice bg-photo-folder" title={folder.path}
                onClick={() => { setCurrentFolder(folder.path); setPage(0); }}>
                <img src={folder.cover} alt="" loading="lazy" />
                <span>▸ {folder.name} · {folder.count}</span>
              </button>)}
              {visible.map(photo => <button key={photo.url} class={`bg-photo-choice ${selected?.url === photo.url ? 'bg-photo-choice-selected' : ''}`}
                title={photo.path || photo.label} onClick={() => choose(photo)}>
                <img src={photo.url} alt="" loading="lazy" />
                <span>{photo.label}</span>
              </button>)}
            </div>
            {filtered.length > PAGE_SIZE && <div class="bg-photo-pages">
              <button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
              <span>{page + 1} / {Math.ceil(filtered.length / PAGE_SIZE)}</span>
              <button disabled={(page + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(page + 1)}>Next</button>
            </div>}
          </section>
          <section class="bg-photo-editor" aria-label="Crop photo">
            <div class="bg-photo-ratio">Template: {width} × {height} · {(ratio).toFixed(3)}:1</div>
            <div class="bg-photo-preview-wrap">
              {selected ? <canvas ref={canvasRef} width={previewWidth} height={previewHeight}
                class="bg-photo-preview" style={{ maxWidth: `${previewWidth}px` }}
                aria-label="Drag to reposition photo crop"
                onPointerDown={event => { pointerRef.current = { x: event.clientX, y: event.clientY }; (event.target as HTMLCanvasElement).setPointerCapture(event.pointerId); }}
                onPointerMove={handlePointerMove}
                onPointerUp={() => { pointerRef.current = null; }}
                onPointerCancel={() => { pointerRef.current = null; }} />
                : <div class="bg-photo-placeholder">{preparing ? 'Preparing photo colours…' : 'Choose a photo to frame it'}</div>}
              {preparing && <div class="bg-photo-preparing">Preparing photo colours…</div>}
            </div>
            <div class="bg-photo-zoom">
              <label for="bg-photo-zoom">Zoom</label>
              <input id="bg-photo-zoom" type="range" min="0.25" max="4" step="0.01" value={zoom} disabled={!image}
                onInput={event => setZoom(Number((event.target as HTMLInputElement).value))} />
              <span>{zoom.toFixed(2)}×</span>
            </div>
            <p class="bg-photo-crop-help">Drag to position the photo. Below 1×, the project background colour fills the space around it.</p>
            {error && <p class="bg-photo-error" role="alert">{error}</p>}
            {warning && <p class="bg-photo-error" role="status">{warning}</p>}
            <div class="bg-photo-footer">
              <button onClick={() => { setZoom(1); setFocusX(0.5); setFocusY(0.5); }} disabled={!image}>Reset crop</button>
              <button class="bg-photo-save" onClick={() => void saveCrop()} disabled={!image || saving}>{saving ? 'Saving…' : 'Use this photo'}</button>
            </div>
          </section>
        </div>
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
.bg-photo-overlay { position: fixed; inset: 0; z-index: 1200; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(0,0,0,.75); }
.bg-photo-dialog { width: min(1080px, 100%); max-height: min(850px, 94vh); display: flex; flex-direction: column; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 20px 60px #0009; overflow: hidden; }
.bg-photo-header { display: flex; justify-content: space-between; gap: 16px; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.bg-photo-header h2 { margin: 0; font-size: 18px; }
.bg-photo-header p { margin: 5px 0 0; color: var(--text-secondary); font-size: 12px; }
.bg-photo-header button { align-self: flex-start; background: transparent; font-size: 24px; line-height: 1; color: var(--text-secondary); }
.bg-photo-body { min-height: 0; display: grid; grid-template-columns: minmax(280px, 42%) minmax(0, 1fr); }
.bg-photo-library, .bg-photo-editor { min-height: 0; padding: 18px; overflow-y: auto; }
.bg-photo-library { border-right: 1px solid var(--border); }
.bg-photo-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.bg-photo-actions button, .bg-photo-footer button, .bg-photo-pages button { padding: 8px 10px; border: 1px solid var(--border); border-radius: 5px; background: var(--bg-elevated); color: var(--text-primary); font-size: 12px; }
.bg-photo-actions button:hover, .bg-photo-footer button:hover:not(:disabled), .bg-photo-pages button:hover:not(:disabled) { border-color: var(--accent); }
.bg-photo-help, .bg-photo-crop-help { color: var(--text-secondary); font-size: 11px; line-height: 1.45; }
.bg-photo-locations { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 8px; }
.bg-photo-locations button { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 6px 9px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-elevated); color: var(--text-secondary); font-size: 11px; }
.bg-photo-locations .bg-photo-location-active { color: var(--text-primary); border-color: var(--accent); }
.bg-photo-breadcrumb { display: flex; align-items: center; flex-wrap: wrap; gap: 3px; min-height: 24px; color: var(--text-muted); font-size: 11px; }
.bg-photo-breadcrumb button { padding: 2px 3px; background: transparent; color: var(--text-secondary); text-decoration: underline; text-underline-offset: 2px; }
.bg-photo-breadcrumb-separator { padding: 0 2px; }
.bg-photo-search { width: 100%; margin: 10px 0 6px; }
.bg-photo-count { color: var(--text-muted); font-size: 11px; margin-bottom: 8px; }
.bg-photo-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.bg-photo-choice { min-width: 0; padding: 5px; background: var(--bg-elevated); border: 2px solid transparent; border-radius: 5px; color: var(--text-secondary); text-align: left; }
.bg-photo-choice-selected { border-color: var(--accent); color: var(--text-primary); }
.bg-photo-folder { background: color-mix(in srgb, var(--bg-elevated), var(--accent) 9%); }
.bg-photo-folder img { opacity: .75; }
.bg-photo-folder span { color: var(--text-primary); font-weight: 650; }
.bg-photo-choice img { display: block; width: 100%; height: 84px; object-fit: cover; border-radius: 3px; }
.bg-photo-choice span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-top: 4px; font-size: 10px; }
.bg-photo-pages { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 11px; }
.bg-photo-pages button:disabled, .bg-photo-footer button:disabled { opacity: .5; cursor: default; }
.bg-photo-editor { display: flex; flex-direction: column; align-items: center; }
.bg-photo-ratio { width: 100%; color: var(--text-secondary); font-size: 12px; margin-bottom: 12px; }
.bg-photo-preview-wrap { position: relative; display: flex; justify-content: center; align-items: center; width: 100%; min-height: 220px; flex: 1; }
.bg-photo-preparing { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0, 0, 0, .55); color: var(--text-primary); font-size: 12px; pointer-events: none; }
.bg-photo-preview { display: block; width: auto; height: auto; max-width: 100%; max-height: 50vh; cursor: grab; touch-action: none; box-shadow: 0 0 0 1px var(--border); }
.bg-photo-preview:active { cursor: grabbing; }
.bg-photo-placeholder { width: 70%; padding: 80px 12px; text-align: center; border: 1px dashed var(--border); color: var(--text-muted); font-size: 13px; }
.bg-photo-zoom { width: 100%; display: flex; align-items: center; gap: 10px; margin-top: 12px; font-size: 12px; }
.bg-photo-zoom input { flex: 1; }
.bg-photo-zoom span { width: 45px; text-align: right; font-family: var(--font-mono); }
.bg-photo-crop-help { width: 100%; margin: 8px 0 0; }
.bg-photo-error { width: 100%; color: #ff7c8b; font-size: 12px; }
.bg-photo-footer { display: flex; justify-content: flex-end; gap: 8px; width: 100%; margin-top: 16px; }
.bg-photo-footer .bg-photo-save { background: var(--accent); color: #111; font-weight: 700; }
@media (max-width: 720px) { .bg-photo-body { display: block; overflow-y: auto; } .bg-photo-library, .bg-photo-editor { overflow: visible; } .bg-photo-library { border-right: 0; border-bottom: 1px solid var(--border); } .bg-photo-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
`;
