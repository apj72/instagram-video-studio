import { useCallback } from 'preact/hooks';
import { TEMPLATES } from '../templates/index.ts';
import { loadProject } from '../core/state.ts';
import type { Template } from '../templates/index.ts';

interface TemplateDialogProps {
  onClose: () => void;
}

export function TemplateDialog({ onClose }: TemplateDialogProps) {
  const handleSelect = useCallback((template: Template) => {
    const proj = template.factory();
    loadProject(proj);
    onClose();
  }, [onClose]);

  const categories = [...new Set(TEMPLATES.map(t => t.category))];

  return (
    <div class="template-overlay" onClick={onClose}>
      <div class="template-dialog" onClick={(e) => e.stopPropagation()}>
        <div class="template-header">
          <h3>New from Template</h3>
          <button class="template-close" onClick={onClose}>X</button>
        </div>
        <div class="template-body">
          {categories.map(cat => (
            <div key={cat} class="template-category">
              <h4 class="template-category-label">{cat}</h4>
              <div class="template-grid">
                {TEMPLATES.filter(t => t.category === cat).map(t => (
                  <button
                    key={t.id}
                    class="template-card"
                    onClick={() => handleSelect(t)}
                  >
                    <div class="template-card-name">{t.name}</div>
                    <div class="template-card-desc">{t.description}</div>
                  </button>
                ))}
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

.template-card-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.3;
}
`;
