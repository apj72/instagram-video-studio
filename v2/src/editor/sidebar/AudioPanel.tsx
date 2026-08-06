import { useRef, useCallback } from 'preact/hooks';
import { project, updateProject } from '../../core/state.ts';
import { audioLoaded, detectedBpm, loadAudioFile, setVolume } from '../../audio/analyser.ts';

export function AudioPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audio = project.value.audio;

  const handleFileSelect = useCallback(async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    await loadAudioFile(file);
    if (detectedBpm.value) {
      updateProject(p => ({
        ...p,
        settings: { ...p.settings, bpm: detectedBpm.value! },
      }));
    }
  }, []);

  const handleVolumeChange = useCallback((e: Event) => {
    const vol = parseFloat((e.target as HTMLInputElement).value);
    setVolume(vol);
    updateProject(p => ({
      ...p,
      audio: { ...p.audio, volume: vol },
    }));
  }, []);

  const handleMuteToggle = useCallback(() => {
    updateProject(p => ({
      ...p,
      audio: { ...p.audio, muted: !p.audio.muted },
    }));
    setVolume(audio.muted ? audio.volume : 0);
  }, [audio.muted, audio.volume]);

  const handleBpmChange = useCallback((e: Event) => {
    const bpm = parseFloat((e.target as HTMLInputElement).value);
    if (!isNaN(bpm) && bpm > 0) {
      updateProject(p => ({
        ...p,
        settings: { ...p.settings, bpm },
      }));
    }
  }, []);

  const handleBeatOffsetChange = useCallback((e: Event) => {
    const offset = parseFloat((e.target as HTMLInputElement).value);
    if (!isNaN(offset)) {
      updateProject(p => ({
        ...p,
        settings: { ...p.settings, beatOffset: offset },
      }));
    }
  }, []);

  return (
    <div class="audio-panel">
      <div class="sidebar-header">
        <span>Audio</span>
        {audioLoaded.value && <span class="audio-badge">Loaded</span>}
      </div>
      <div class="audio-panel-content">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          class="sr-only"
          onChange={handleFileSelect}
        />
        <button
          class="toolbar-btn audio-load-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          {audioLoaded.value ? 'Replace Audio' : 'Load Audio'}
        </button>

        <div class="audio-prop-row">
          <label class="prop-label">Volume</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={audio.volume}
            onInput={handleVolumeChange}
          />
          <button
            class={`layer-action-btn ${audio.muted ? 'muted' : ''}`}
            onClick={handleMuteToggle}
            title={audio.muted ? 'Unmute' : 'Mute'}
          >
            {audio.muted ? 'M' : 'S'}
          </button>
        </div>

        <div class="audio-prop-row">
          <label class="prop-label">BPM</label>
          <input
            type="number"
            min="40"
            max="300"
            step="1"
            value={project.value.settings.bpm}
            onInput={handleBpmChange}
            class="audio-bpm-input"
          />
          {detectedBpm.value && (
            <span class="audio-detected-bpm">
              Auto: {detectedBpm.value}
            </span>
          )}
        </div>

        <div class="audio-prop-row">
          <label class="prop-label">Beat offset</label>
          <input
            type="number"
            min="-1000"
            max="1000"
            step="10"
            value={project.value.settings.beatOffset}
            onInput={handleBeatOffsetChange}
            class="audio-offset-input"
          />
          <span class="audio-unit">ms</span>
        </div>
      </div>
      <style>{audioPanelStyles}</style>
    </div>
  );
}

const audioPanelStyles = `
.audio-panel {
  border-bottom: 1px solid var(--border);
}

.audio-panel-content {
  padding: 8px 14px;
}

.audio-load-btn {
  width: 100%;
  margin-bottom: 8px;
}

.audio-prop-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.audio-prop-row .prop-label {
  min-width: 55px;
  text-align: right;
  font-size: 11px;
  color: var(--text-secondary);
}

.audio-prop-row input[type="range"] {
  flex: 1;
}

.audio-bpm-input,
.audio-offset-input {
  width: 70px;
  text-align: center;
}

.audio-detected-bpm {
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.audio-unit {
  font-size: 10px;
  color: var(--text-muted);
}

.audio-badge {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(0, 200, 0, 0.2);
  color: #00CC00;
}

.muted {
  color: var(--accent) !important;
}
`;
