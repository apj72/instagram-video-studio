import { useEffect, useState } from 'preact/hooks';
import { TEMPLATES } from '../templates/index.ts';
import { loadProject } from '../core/state.ts';
import type { Template } from '../templates/index.ts';
import { listLibraryItems, type LibraryItem } from '../core/persistence.ts';
import { bundledLibraryId, openLibraryItem } from '../core/library.ts';

interface TemplateDialogProps {
  onClose: () => void;
}

export function TemplateDialog({ onClose }: TemplateDialogProps) {
  const [saved, setSaved] = useState<LibraryItem[]>([]);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    let active = true;
    listLibraryItems('template').then(items => { if (active) setSaved(items); })
      .catch(cause => { if (active) setError(`Could not load templates: ${cause instanceof Error ? cause.message : String(cause)}`); });
    return () => { active = false; };
  }, []);

  async function handleSelect(template: Template | null, item?: LibraryItem) {
    setOpening(true);
    setError('');
    try {
      const proj = item ? await openLibraryItem(item) : template!.factory();
      loadProject(proj, item
        ? { kind: 'template', id: item.id, name: item.name }
        : { kind: 'template', id: bundledLibraryId('template', template!.id), name: template!.name });
      onClose();
    } catch (cause) {
      setError(`Could not open template: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setOpening(false);
    }
  }

  const categories = [...new Set(TEMPLATES.map(t => t.category))];

  return (
    <div class="template-overlay" onClick={onClose}>
      <div class="template-dialog" onClick={(e) => e.stopPropagation()}>
        <div class="template-header">
          <h3>New from Template</h3>
          <button class="template-close" onClick={onClose}>X</button>
        </div>
        <div class="template-body">
          {error && <p class="template-error" role="alert">{error}</p>}
          {saved.some(item => !item.id.startsWith('template:bundled:')) && <div class="template-category">
            <h4 class="template-category-label">Saved templates</h4>
            <div class="template-grid">
              {saved.filter(item => !item.id.startsWith('template:bundled:')).map(item => <button key={item.id} class="template-card" disabled={opening} onClick={() => void handleSelect(null, item)}>
                {item.thumbnail && <div class="template-card-preview"><img src={item.thumbnail} alt="" /></div>}
                <div class="template-card-name">{item.name}</div><div class="template-card-desc">Saved in this browser</div>
              </button>)}
            </div>
          </div>}
          {categories.map(cat => (
            <div key={cat} class="template-category">
              <h4 class="template-category-label">{cat}</h4>
              <div class="template-grid">
                {TEMPLATES.filter(t => t.category === cat).map(t => {
                  const item = saved.find(savedItem => savedItem.id === bundledLibraryId('template', t.id));
                  return (
                  <button
                    key={t.id}
                    class="template-card"
                    disabled={opening}
                    onClick={() => void handleSelect(t, item)}
                  >
                    {(item?.thumbnail || t.preview) && <div class="template-card-preview"><img src={item?.thumbnail || t.preview} alt="" /></div>}
                    <div class="template-card-name">{item?.name || t.name}{item ? ' · Saved' : ''}</div>
                    <div class="template-card-desc">{item ? 'Updated in this browser' : t.description}</div>
                  </button>
                ); })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{templateStyles}</style>
    </div>
  );
}

const templateStyles = `
.template-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.template-dialog {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.template-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.template-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.template-close {
  width: 24px;
  height: 24px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.template-close:hover { background: var(--border-hover); }

.template-body {
  padding: 20px;
  overflow-y: auto;
}
.template-error { color: #ff8b8b; font-size: 12px; }
.template-card:disabled { opacity: .6; }

.template-category {
  margin-bottom: 20px;
}

.template-category-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  margin: 0 0 10px;
}

.template-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.template-card {
  padding: 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.template-card:hover {
  border-color: var(--accent);
  background: var(--bg-tertiary);
}

.template-card-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.template-card-preview { height: 110px; border-radius: 4px; overflow: hidden; margin-bottom: 10px; background: #0B0714; }
.template-card-preview img { display: block; width: 100%; height: 100%; object-fit: cover; }

.template-card-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.3;
}
`;
