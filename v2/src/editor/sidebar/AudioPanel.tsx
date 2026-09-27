import { useRef, useCallback, useEffect, useState } from 'preact/hooks';
import { currentTime, isPlaying, project, updateProject } from '../../core/state.ts';
import { audioLoaded, audioLoadError, detectedBpm, getAudioAudibleDuration, getAudioDuration, getAudioFile, loadAudioFile, setVolume } from '../../audio/analyser.ts';
import { autosave, saveAsset } from '../../core/persistence.ts';
import { resizeProjectDuration, scaleProjectTimeline } from '../../core/projectDuration.ts';

function secondsText(milliseconds: number): string {
  return String(Number((milliseconds / 1000).toFixed(3)));
}

export function AudioPanel({ onSeek }: { onSeek: (timeMs: number) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timingMode, setTimingMode] = useState<'keep' | 'scale'>('keep');
  const [trimSilence, setTrimSilence] = useState(true);
  const [baseSeconds, setBaseSeconds] = useState(secondsText(project.value.audio.timelineBaseDuration ?? project.value.settings.duration));
  const [timingMessage, setTimingMessage] = useState('');
  const audio = project.value.audio;
  const targetDuration = project.value.settings.duration;
  const fileDuration = getAudioDuration();
  const audibleDuration = getAudioAudibleDuration();
  const silentTail = fileDuration - audibleDuration;
  const hasSilentTail = audioLoaded.value && silentTail >= 250;
  const usingAudibleLength = Math.abs(targetDuration - audibleDuration) < 5;
  const baseDuration = Number(baseSeconds) * 1000;
  const canScale = !!audio.assetId && Number.isFinite(baseDuration) && baseDuration > 0
    && Math.abs(baseDuration - targetDuration) > 0.001;

  useEffect(() => {
    setBaseSeconds(secondsText(audio.timelineBaseDuration ?? project.value.settings.duration));
    setTimingMessage('');
  }, [audio.assetId, audio.timelineBaseDuration]);

  const handleFileSelect = useCallback(async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    (e.target as HTMLInputElement).value = '';
    setLoading(true);
    setError('');
    setTimingMessage('');
    try {
      const previousDuration = project.value.settings.duration;
      isPlaying.value = false;
      const assetId = `audio_${crypto.randomUUID()}`;
      await loadAudioFile(file, assetId);
      await saveAsset(project.value.metadata.createdAt, assetId, file, file.type || 'audio/flac', file.name);
      setVolume(project.value.audio.muted ? 0 : project.value.audio.volume);
      const newDuration = trimSilence ? getAudioAudibleDuration() : getAudioDuration();
      updateProject(p => {
        const withAudio = {
          ...p,
          audio: { ...p.audio, assetId, name: file.name,
            timelineBaseDuration: timingMode === 'keep' && previousDuration !== newDuration ? previousDuration : undefined },
          settings: detectedBpm.value ? { ...p.settings, bpm: detectedBpm.value } : p.settings,
        };
        return timingMode === 'scale'
          ? scaleProjectTimeline(withAudio, previousDuration, newDuration)
          : resizeProjectDuration(withAudio, newDuration);
      });
      setBaseSeconds(secondsText(timingMode === 'keep' ? previousDuration : newDuration));
      onSeek(0);
      await autosave(project.value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [timingMode, trimSilence, onSeek]);

  const useAudioLength = useCallback(async (newDuration: number) => {
    if (!audio.assetId || !Number.isFinite(newDuration) || newDuration <= 0) return;
    const previousDuration = project.value.settings.duration;
    const base = project.value.audio.timelineBaseDuration ?? previousDuration;
    if (Math.abs(previousDuration - newDuration) < 0.001) return;
    setError('');
    try {
      isPlaying.value = false;
      updateProject(p => {
        const changed = timingMode === 'scale'
          ? scaleProjectTimeline(p, base, newDuration, true)
          : resizeProjectDuration(p, newDuration);
        return { ...changed, audio: { ...changed.audio,
          timelineBaseDuration: timingMode === 'keep' && base !== newDuration ? base : undefined } };
      });
      setBaseSeconds(secondsText(timingMode === 'keep' ? base : newDuration));
      setTrimSilence(Math.abs(newDuration - getAudioAudibleDuration()) < 5);
      setTimingMessage(timingMode === 'scale'
        ? `Events scaled to ${secondsText(newDuration)}s.`
        : `Timeline set to ${secondsText(newDuration)}s; event times kept.`);
      onSeek(0);
      await autosave(project.value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [audio.assetId, timingMode, onSeek]);

  const handleScaleExisting = useCallback(async () => {
    const sourceDuration = Number(baseSeconds) * 1000;
    const duration = project.value.settings.duration;
    if (!Number.isFinite(sourceDuration) || sourceDuration <= 0 || Math.abs(sourceDuration - duration) <= 0.001) return;
    setError('');
    try {
      const newTime = Math.min(duration, currentTime.value * duration / sourceDuration);
      updateProject(p => {
        const scaled = scaleProjectTimeline(p, sourceDuration, duration, true);
        return { ...scaled, audio: { ...scaled.audio, timelineBaseDuration: undefined } };
      });
      onSeek(newTime);
      setBaseSeconds(secondsText(duration));
      setTimingMessage(`Events scaled from ${(sourceDuration / 1000).toFixed(3)}s to ${(duration / 1000).toFixed(3)}s.`);
      await autosave(project.value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [baseSeconds, onSeek]);

  const handleVolumeChange = useCallback((e: Event) => {
    const vol = parseFloat((e.target as HTMLInputElement).value);
    setVolume(audio.muted ? 0 : vol);
    updateProject(p => ({
      ...p,
      audio: { ...p.audio, volume: vol },
    }));
  }, [audio.muted]);

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
          accept="audio/*,.flac,audio/flac,audio/x-flac"
          class="sr-only"
          onChange={handleFileSelect}
        />
        <button
          class="toolbar-btn audio-load-btn"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
        >
          {loading ? 'Loading audio…' : audio.assetId ? 'Replace audio file…' : 'Choose audio file…'}
        </button>
        <div class="audio-prop-row">
          <label class="prop-label" for="audio-timing-mode">Timing</label>
          <select id="audio-timing-mode" aria-label="Timing when adding audio" value={timingMode}
            onChange={event => setTimingMode((event.target as HTMLSelectElement).value as 'keep' | 'scale')}>
            <option value="keep">Keep event times</option>
            <option value="scale">Scale all events</option>
          </select>
        </div>
        <p class="audio-file-help">FLAC, MP3 or WAV. The file sets clip length; choose how event times respond.</p>
        <label class="audio-trim-choice"><input type="checkbox" checked={trimSilence}
          onChange={event => setTrimSilence((event.target as HTMLInputElement).checked)} /> Trim trailing silence when adding audio</label>
        {audio.assetId && audioLoaded.value && <p class="audio-file-status" role="status">
          {audio.name || getAudioFile()?.name || 'Audio file'} · {secondsText(targetDuration)}s timeline
        </p>}
        {audio.assetId && hasSilentTail && <div class="audio-silent-tail">
          <span>Sound ends at {secondsText(audibleDuration)}s · file ends at {secondsText(fileDuration)}s</span>
          <button type="button" onClick={() => void useAudioLength(usingAudibleLength ? fileDuration : audibleDuration)}>
            Use {usingAudibleLength ? 'full file' : 'audible length'}
          </button>
        </div>}
        {audio.assetId && !audioLoaded.value && !loading && <p class="audio-file-help">Audio file is not loaded yet.</p>}
        {error && <p class="audio-file-error" role="alert">{error}</p>}
        {!error && audioLoadError.value && <p class="audio-file-error" role="alert">{audioLoadError.value}</p>}
        {audio.assetId && <div class="audio-retime">
          <strong>Recalculate existing timeline</strong>
          <p>Enter the original length to scale events to the current {secondsText(targetDuration)}s timeline.</p>
          <label for="audio-base-duration">Original length (sec)</label>
          <div class="audio-retime-controls">
            <input id="audio-base-duration" type="number" min="0.001" step="any" value={baseSeconds}
              onInput={event => { setBaseSeconds((event.target as HTMLInputElement).value); setTimingMessage(''); }} />
            <button type="button" disabled={!canScale || loading} onClick={() => void handleScaleExisting()}>Scale events</button>
          </div>
          {timingMessage && <p class="audio-file-status" role="status">{timingMessage}</p>}
        </div>}

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

        <div class="prop-subheading" style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted);margin-top:10px;padding-top:8px;border-top:1px solid var(--border)">Trim & Fade</div>

        <div class="audio-prop-row">
          <label class="prop-label">Offset</label>
          <input
            type="number"
            min="0"
            step="100"
            value={audio.offset}
            onInput={(e) => updateProject(p => ({ ...p, audio: { ...p.audio, offset: parseInt((e.target as HTMLInputElement).value) || 0 } }))}
            class="audio-offset-input"
          />
          <span class="audio-unit">ms</span>
        </div>

        <div class="audio-prop-row">
          <label class="prop-label">Trim start</label>
          <input
            type="number"
            min="0"
            step="100"
            value={audio.trim.start}
            onInput={(e) => updateProject(p => ({ ...p, audio: { ...p.audio, trim: { ...p.audio.trim, start: parseInt((e.target as HTMLInputElement).value) || 0 } } }))}
            class="audio-offset-input"
          />
          <span class="audio-unit">ms</span>
        </div>

        <div class="audio-prop-row">
          <label class="prop-label">Trim end</label>
          <input
            type="number"
            min="0"
            step="100"
            value={audio.trim.end}
            onInput={(e) => updateProject(p => ({ ...p, audio: { ...p.audio, trim: { ...p.audio.trim, end: parseInt((e.target as HTMLInputElement).value) || 0 } } }))}
            class="audio-offset-input"
          />
          <span class="audio-unit">ms</span>
        </div>

        <div class="audio-prop-row">
          <label class="prop-label">Fade in</label>
          <input
            type="number"
            min="0"
            step="100"
            value={audio.fadeInDuration}
            onInput={(e) => updateProject(p => ({ ...p, audio: { ...p.audio, fadeInDuration: parseInt((e.target as HTMLInputElement).value) || 0 } }))}
            class="audio-offset-input"
          />
          <span class="audio-unit">ms</span>
        </div>

        <div class="audio-prop-row">
          <label class="prop-label">Fade out</label>
          <input
            type="number"
            min="0"
            step="100"
            value={audio.fadeOutDuration}
            onInput={(e) => updateProject(p => ({ ...p, audio: { ...p.audio, fadeOutDuration: parseInt((e.target as HTMLInputElement).value) || 0 } }))}
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
  margin-bottom: 4px;
}
.audio-file-help, .audio-file-status, .audio-file-error { margin: 3px 0 9px; font-size: 10px; line-height: 1.4; overflow-wrap: anywhere; }
.audio-file-help { color: var(--text-muted); }
.audio-file-status { color: var(--text-secondary); }
.audio-file-error { color: var(--danger, #ff7575); }
.audio-trim-choice { display: flex; align-items: center; gap: 6px; margin: 0 0 7px; color: var(--text-secondary); font-size: 10px; line-height: 1.3; }
.audio-trim-choice input { margin: 0; }
.audio-silent-tail { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin: 0 0 8px; color: var(--text-secondary); font-size: 10px; line-height: 1.35; }
.audio-silent-tail button { padding: 3px 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-elevated); color: var(--text-primary); font-size: 10px; }
.audio-prop-row select { min-width: 0; flex: 1; }
.audio-retime { margin: 10px 0; padding: 10px; border: 1px solid var(--border); border-radius: 5px; background: var(--bg-elevated); font-size: 10px; }
.audio-retime strong { display: block; margin-bottom: 4px; font-size: 11px; }
.audio-retime p { margin: 0 0 7px; color: var(--text-muted); line-height: 1.4; }
.audio-retime label { display: block; margin-bottom: 4px; color: var(--text-secondary); }
.audio-retime-controls { display: flex; gap: 6px; }
.audio-retime-controls input { min-width: 0; flex: 1; }
.audio-retime-controls button { padding: 5px 8px; color: var(--text-primary); background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 4px; }
.audio-retime-controls button:disabled { opacity: .45; }

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
