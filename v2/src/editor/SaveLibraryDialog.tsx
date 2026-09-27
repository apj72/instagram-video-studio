import { useState } from 'preact/hooks';
import { project, currentTime, librarySource } from '../core/state.ts';
import { generateId } from '../core/schema.ts';
import { getAssetMap } from '../core/assets.ts';
import { renderFrame } from '../render/engine.ts';
import { saveEditorLibraryItem } from '../core/library.ts';
import { saveProject, type LibraryKind } from '../core/persistence.ts';

interface Props { projectId: string; onClose: () => void; }

export function SaveLibraryDialog({ projectId, onClose }: Props) {
  const source = librarySource.value;
  const [mode, setMode] = useState<'update' | 'new'>(source ? 'update' : 'new');
  const [kind, setKind] = useState<LibraryKind>(source?.kind ?? 'post');
  const [name, setName] = useState(source?.name ?? project.value.metadata.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    const cleanName = name.trim();
    if (!cleanName) { setError('Enter a name.'); return; }
    setBusy(true);
    setError('');
    try {
      const snapshot = structuredClone(project.value);
      snapshot.metadata.name = cleanName;
      snapshot.metadata.modifiedAt = new Date().toISOString();
      const canvas = document.createElement('canvas');
      canvas.width = snapshot.settings.width;
      canvas.height = snapshot.settings.height;
      const ctx = canvas.getContext('2d', { colorSpace: 'display-p3' });
      let thumbnail: string | undefined;
      if (ctx) {
        renderFrame(snapshot, ctx, Math.min(currentTime.value, snapshot.settings.duration),
          Math.floor(currentTime.value / (1000 / snapshot.settings.fps)), getAssetMap(), null);
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 180;
        thumbCanvas.height = Math.round(180 * canvas.height / canvas.width);
        thumbCanvas.getContext('2d', { colorSpace: 'display-p3' })?.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.72);
      }
      const saved = await saveEditorLibraryItem({
        id: mode === 'update' && source ? source.id : `${kind}:saved:${generateId()}`,
        kind: mode === 'update' && source ? source.kind : kind,
        name: cleanName, project: snapshot, thumbnail,
      });
      await saveProject(projectId, snapshot);
      project.value = snapshot;
      librarySource.value = { kind: saved.kind, id: saved.id, name: saved.name };
      onClose();
    } catch (cause) {
      setError(`Could not save: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setBusy(false);
    }
  }

  return <div class="save-library-overlay" onClick={onClose}>
    <div class="save-library-dialog" role="dialog" aria-modal="true" aria-label="Save post or template" onClick={event => event.stopPropagation()}>
      <h2>Save for reuse</h2>
      <p>Save the current layout, timing, effects, and media in your local Posts or Templates library.</p>
      {source && <label class="save-library-choice"><input type="radio" name="save-mode" checked={mode === 'update'} onChange={() => { setMode('update'); setKind(source.kind); setName(source.name); }} /> Update {source.kind} “{source.name}”</label>}
      <label class="save-library-choice"><input type="radio" name="save-mode" checked={mode === 'new'} onChange={() => setMode('new')} /> Save as new</label>
      {mode === 'new' && <label class="save-library-field">Save in
        <select value={kind} onChange={event => setKind((event.target as HTMLSelectElement).value as LibraryKind)}>
          <option value="post">Posts</option><option value="template">Templates</option>
        </select>
      </label>}
      <label class="save-library-field">Name
        <input autoFocus value={name} onInput={event => setName((event.target as HTMLInputElement).value)} onKeyDown={event => { if (event.key === 'Enter') void handleSave(); }} />
      </label>
      {error && <p class="save-library-error" role="alert">{error}</p>}
      <div class="save-library-actions"><button onClick={onClose} disabled={busy}>Cancel</button><button class="save-library-primary" onClick={() => void handleSave()} disabled={busy}>{busy ? 'Saving…' : mode === 'update' ? 'Update' : 'Save new'}</button></div>
    </div>
    <style>{styles}</style>
  </div>;
}

const styles = `
.save-library-overlay { position: fixed; inset: 0; z-index: 1200; background: rgba(0,0,0,.7); display: grid; place-items: center; padding: 20px; }
.save-library-dialog { width: min(430px,100%); background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px; color: var(--text-primary); box-shadow: 0 20px 70px #0009; display: grid; gap: 14px; }
.save-library-dialog h2 { margin: 0; font-size: 18px; }
.save-library-dialog p { margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
.save-library-choice { display: flex; align-items: center; gap: 10px; font-size: 13px; cursor: pointer; }
.save-library-choice input { accent-color: var(--accent); }
.save-library-field { display: grid; gap: 6px; font-size: 12px; color: var(--text-secondary); }
.save-library-field input, .save-library-field select { width: 100%; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 9px; font: inherit; }
.save-library-error { color: #ff8b8b !important; }
.save-library-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 5px; }
.save-library-actions button { padding: 9px 14px; border-radius: var(--radius-sm); background: var(--bg-elevated); color: var(--text-primary); }
.save-library-actions .save-library-primary { background: var(--accent); color: white; }
.save-library-actions button:disabled { opacity: .5; }
`;
