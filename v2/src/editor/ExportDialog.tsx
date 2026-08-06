import { useState, useCallback, useRef } from 'preact/hooks';
import { project } from '../core/state.ts';
import { EXPORT_PRESETS } from '../core/schema.ts';
import type { ExportPreset } from '../core/schema.ts';
import type { ExportProgress } from '../export/encoder.ts';
import { exportMp4, exportFallback, downloadBlob, supportsWebCodecs } from '../export/encoder.ts';

interface ExportDialogProps {
  assets: Map<string, HTMLImageElement | HTMLVideoElement>;
  onClose: () => void;
}

export function ExportDialog({ assets, onClose }: ExportDialogProps) {
  const [preset, setPreset] = useState<ExportPreset>(EXPORT_PRESETS[0]);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exporting, setExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const hasWebCodecs = supportsWebCodecs();

  const handleExport = useCallback(async () => {
    setExporting(true);
    abortRef.current = new AbortController();

    try {
      let blob: Blob | null;
      if (hasWebCodecs) {
        blob = await exportMp4(project.value, assets, preset, setProgress, abortRef.current.signal);
      } else {
        blob = await exportFallback(project.value, assets, setProgress);
      }

      if (blob) {
        const ext = hasWebCodecs ? 'mp4' : 'webm';
        const name = project.value.metadata.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        downloadBlob(blob, `${name}.${ext}`);
      }
    } catch (err) {
      setProgress({
        phase: 'error',
        currentFrame: 0,
        totalFrames: 0,
        percent: 0,
        error: String(err),
      });
    } finally {
      setExporting(false);
    }
  }, [assets, preset, hasWebCodecs]);

  const handleCancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    onClose();
  }, [onClose]);

  return (
    <div class="export-overlay" onClick={onClose}>
      <div class="export-dialog" onClick={(e) => e.stopPropagation()}>
        <div class="export-header">
          <h3>Export Video</h3>
          <button class="export-close" onClick={onClose}>X</button>
        </div>

        {!exporting && !progress?.phase && (
          <div class="export-body">
            <div class="export-row">
              <label>Format</label>
              <select
                value={preset.name}
                onChange={(e) => {
                  const found = EXPORT_PRESETS.find(p => p.name === (e.target as HTMLSelectElement).value);
                  if (found) setPreset(found);
                }}
              >
                {EXPORT_PRESETS.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div class="export-info">
              <span>{preset.width}x{preset.height}</span>
              <span>{preset.fps}fps</span>
              <span>{(preset.bitrate / 1_000_000).toFixed(1)} Mbps</span>
              <span>{hasWebCodecs ? 'H.264 MP4' : 'VP8 WebM (fallback)'}</span>
            </div>
            {!hasWebCodecs && (
              <div class="export-warning">
                WebCodecs not available. Export will use WebM format.
                For Instagram, you'll need to convert to MP4.
              </div>
            )}
            <button class="toolbar-btn toolbar-btn-primary export-start-btn" onClick={handleExport}>
              Start Export
            </button>
          </div>
        )}

        {exporting && progress && (
          <div class="export-body">
            <div class="export-progress-label">
              {progress.phase === 'encoding' && `Encoding frame ${progress.currentFrame} / ${progress.totalFrames}`}
              {progress.phase === 'muxing-audio' && 'Encoding audio (AAC)...'}
              {progress.phase === 'finalizing' && 'Finalizing MP4...'}
            </div>
            <div class="export-progress-bar">
              <div class="export-progress-fill" style={{ width: `${progress.percent}%` }} />
            </div>
            <div class="export-percent">{Math.round(progress.percent)}%</div>
            <button class="toolbar-btn export-cancel-btn" onClick={handleCancel}>Cancel</button>
          </div>
        )}

        {progress?.phase === 'done' && !exporting && (
          <div class="export-body">
            <div class="export-done">Export complete! File downloaded.</div>
            <button class="toolbar-btn" onClick={onClose}>Close</button>
          </div>
        )}

        {progress?.phase === 'error' && (
          <div class="export-body">
            <div class="export-error">Export failed: {progress.error}</div>
            <button class="toolbar-btn" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
      <style>{exportStyles}</style>
    </div>
  );
}

const exportStyles = `
.export-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.export-dialog {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 400px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.export-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.export-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.export-close {
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
.export-close:hover { background: var(--border-hover); }

.export-body {
  padding: 20px;
}

.export-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.export-row label {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 60px;
}

.export-row select {
  flex: 1;
}

.export-info {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  margin-bottom: 16px;
}

.export-warning {
  background: rgba(255, 165, 0, 0.1);
  border: 1px solid rgba(255, 165, 0, 0.3);
  border-radius: var(--radius-sm);
  padding: 10px;
  font-size: 11px;
  color: #FFA500;
  margin-bottom: 16px;
}

.export-start-btn {
  width: 100%;
  padding: 10px;
  font-size: 13px;
}

.export-progress-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.export-progress-bar {
  height: 6px;
  background: var(--bg-elevated);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.export-progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.1s;
}

.export-percent {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 12px;
}

.export-cancel-btn {
  width: 100%;
}

.export-done {
  font-size: 13px;
  color: #00CC00;
  text-align: center;
  margin-bottom: 16px;
}

.export-error {
  font-size: 12px;
  color: var(--accent);
  margin-bottom: 16px;
}
`;
