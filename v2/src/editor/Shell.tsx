import { useRef, useEffect, useCallback, useState } from 'preact/hooks';
import { project, currentTime, isPlaying, showLabels, selectedLayerId } from '../core/state.ts';
import { createPreviewClock } from '../core/clock.ts';
import { renderFrame, renderLabels } from '../render/engine.ts';
import { followVideoAssets } from '../render/videoSync.ts';
import { importV1Config } from '../core/migration.ts';
import { loadProject } from '../core/state.ts';
import { playAudio, stopAudio, seekAudio, getAudioRenderData, audioLoaded, audioLoadError, clearAudio, getLoadedAudioAssetId, loadAudioFile, setVolume, setAudioLoop, isAudioNativeLooping, setAudioPlaybackRate } from '../audio/analyser.ts';
import { initKeyboardShortcuts } from '../core/commands.ts';
import { startAutosave, stopAutosave, loadAsset } from '../core/persistence.ts';
import { generateId } from '../core/schema.ts';
import { Toolbar } from './toolbar/Toolbar.tsx';
import { Sidebar, Inspector } from './sidebar/Sidebar.tsx';
import { TimelinePanel } from './timeline/TimelinePanel.tsx';
import { ExportDialog } from './ExportDialog.tsx';
import { TemplateDialog } from './TemplateDialog.tsx';
import { ConfigManager } from './ConfigManager.tsx';
import { PostsDialog } from './PostsDialog.tsx';
import { SaveLibraryDialog } from './SaveLibraryDialog.tsx';
import { CanvasViewport } from './canvas/CanvasViewport.tsx';
import { getAssetMap, registerAsset } from '../core/assets.ts';
import { TONY_BRAND_ASSETS } from '../templates/tonyBrand.ts';
import { VERSION1_ASSETS } from '../templates/version1Events.ts';

const previewClock = createPreviewClock(16000);

const SPEED_OPTIONS = [0.25, 0.5, 1, 2] as const;

export function Shell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const [showExport, setShowExport] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showConfigs, setShowConfigs] = useState(false);
  const [showPosts, setShowPosts] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [looping, setLooping] = useState(previewClock.loop);
  const [speed, setSpeed] = useState(previewClock.rate);

  const projectIdRef = useRef(generateId());

  const handleToggleLoop = useCallback(() => {
    const next = !previewClock.loop;
    previewClock.setLoop(next);
    setAudioLoop(next, project.value.settings.duration);
    setLooping(next);
  }, []);

  useEffect(() => {
    const logo = new Image();
    logo.src = '/assets/logo_transparent.png';
    logo.onload = () => {
      registerAsset('default-logo', logo);
      drawFrame(0);
    };
    for (const asset of [...TONY_BRAND_ASSETS, ...VERSION1_ASSETS]) {
      if ('kind' in asset && asset.kind === 'video') {
        const video = document.createElement('video');
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.crossOrigin = 'anonymous';
        video.onloadeddata = () => { registerAsset(asset.id, video); drawFrame(currentTime.value); };
        video.src = asset.url;
        continue;
      }
      const image = new Image();
      image.onload = () => { registerAsset(asset.id, image); drawFrame(currentTime.value); };
      image.src = asset.url;
    }
    void Promise.all([
      document.fonts.load('48px Bungee'),
      document.fonts.load('48px "Permanent Marker"'),
      document.fonts.load('bold 24px "Space Mono"'),
    ]).then(() => drawFrame(currentTime.value));
    initKeyboardShortcuts();
    startAutosave(() => project.value);

    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === ' ') {
        e.preventDefault();
        isPlaying.value = !isPlaying.value;
      }
      if (selectedLayerId.value && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
      if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const frameDur = 1000 / project.value.settings.fps;
        const t = Math.max(0, currentTime.value - frameDur);
        isPlaying.value = false;
        currentTime.value = t;
        previewClock.seek(t);
        drawFrame(t);
      }
      if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const frameDur = 1000 / project.value.settings.fps;
        const t = Math.min(project.value.settings.duration, currentTime.value + frameDur);
        isPlaying.value = false;
        currentTime.value = t;
        previewClock.seek(t);
        drawFrame(t);
      }
      if (e.key === 'Home' || (e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        isPlaying.value = false;
        currentTime.value = 0;
        previewClock.seek(0);
        drawFrame(0);
      }
      if (e.key === 'End' || (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        isPlaying.value = false;
        const dur = project.value.settings.duration;
        currentTime.value = dur;
        previewClock.seek(dur);
        drawFrame(dur);
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleToggleLoop();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        setShowSave(true);
      }
    };
    document.addEventListener('keydown', handleGlobalKeys);

    return () => {
      stopAutosave();
      document.removeEventListener('keydown', handleGlobalKeys);
    };
  }, [handleToggleLoop]);

  const drawFrame = useCallback((timeMs: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { colorSpace: 'display-p3' });
    if (!ctx) return;
    const p = project.value;
    const frameNumber = Math.floor(timeMs / (1000 / p.settings.fps));
    const audioData = audioLoaded.value ? getAudioRenderData() : null;
    followVideoAssets(p, getAssetMap(), timeMs, isPlaying.value);
    renderFrame(p, ctx, timeMs, frameNumber, getAssetMap(), audioData);
    if (showLabels.value) renderLabels(p, ctx, timeMs);
  }, []);

  useEffect(() => {
    const { backgroundImageAssetId, backgroundImageDataUrl } = project.value.settings;
    if (!backgroundImageAssetId || !backgroundImageDataUrl) return;
    const existing = getAssetMap().get(backgroundImageAssetId);
    if (existing instanceof HTMLImageElement && existing.src === backgroundImageDataUrl) return;
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (active) {
        registerAsset(backgroundImageAssetId, image);
        drawFrame(currentTime.value);
      }
    };
    image.src = backgroundImageDataUrl;
    return () => { active = false; };
  }, [project.value.settings.backgroundImageAssetId, project.value.settings.backgroundImageDataUrl, drawFrame]);

  useEffect(() => {
    const assetId = project.value.audio.assetId;
    if (!assetId) { clearAudio(); return; }
    if (getLoadedAudioAssetId() === assetId) return;
    let active = true;
    clearAudio();
    void loadAsset(assetId).then(async blob => {
      if (!active || project.value.audio.assetId !== assetId) return;
      if (!blob) throw new Error('The audio file for this project was not found. Choose it again in Audio.');
      const file = new File([blob], project.value.audio.name || 'project-audio.flac', { type: blob.type });
      await loadAudioFile(file, assetId);
      if (active && project.value.audio.assetId === assetId) setVolume(project.value.audio.muted ? 0 : project.value.audio.volume);
    }).catch(cause => {
      if (active) audioLoadError.value = cause instanceof Error ? cause.message : String(cause);
    });
    return () => { active = false; };
  }, [project.value.audio.assetId]);

  useEffect(() => {
    if (audioLoaded.value) setVolume(project.value.audio.muted ? 0 : project.value.audio.volume);
  }, [audioLoaded.value, project.value.audio.muted, project.value.audio.volume]);

  useEffect(() => {
    previewClock.onTick = (timeMs: number) => {
      currentTime.value = timeMs;
      drawFrame(timeMs);
    };
    previewClock.onLoop = () => {
      if (audioLoaded.value && !isAudioNativeLooping()) playAudio(0);
    };

    function loop() {
      if (!isPlaying.value) {
        drawFrame(currentTime.value);
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      previewClock.onTick = null;
      previewClock.onLoop = null;
    };
  }, [drawFrame]);

  useEffect(() => {
    if (isPlaying.value) {
      previewClock.start();
      const startTime = previewClock.currentTime;
      currentTime.value = startTime;
      if (audioLoaded.value) playAudio(startTime);
    } else {
      previewClock.stop();
      if (audioLoaded.value) stopAudio();
    }
  }, [isPlaying.value, audioLoaded.value]);

  useEffect(() => {
    const dur = project.value.settings.duration;
    if (dur !== previewClock.duration) {
      previewClock.setDuration(dur);
      previewClock.seek(0);
    }
    setAudioLoop(previewClock.loop, dur);
  }, [project.value.settings.duration]);

  useEffect(() => {
    previewClock.onEnd = () => {
      isPlaying.value = false;
    };
    return () => { previewClock.onEnd = null; };
  }, []);

  const handleImportV1 = useCallback(async () => {
    try {
      const resp = await fetch('/v1/default_config.json');
      if (!resp.ok) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          const text = await file.text();
          const v1Config = JSON.parse(text);
          const { project: newProject } = importV1Config(v1Config);
          loadProject(newProject);
        };
        input.click();
        return;
      }
      const v1Config = await resp.json();
      const { project: newProject } = importV1Config(v1Config);
      loadProject(newProject);
    } catch {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const text = await file.text();
        const v1Config = JSON.parse(text);
        const { project: newProject } = importV1Config(v1Config);
        loadProject(newProject);
      };
      input.click();
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    isPlaying.value = !isPlaying.value;
  }, []);

  const handleSeek = useCallback((timeMs: number) => {
    currentTime.value = timeMs;
    previewClock.seek(timeMs);
    if (audioLoaded.value) seekAudio(timeMs);
    drawFrame(timeMs);
  }, [drawFrame]);

  const handleSkipToStart = useCallback(() => {
    isPlaying.value = false;
    handleSeek(0);
  }, [handleSeek]);

  const handleSkipToEnd = useCallback(() => {
    isPlaying.value = false;
    handleSeek(project.value.settings.duration);
  }, [handleSeek]);

  const handleFrameBack = useCallback(() => {
    isPlaying.value = false;
    const frameDur = 1000 / project.value.settings.fps;
    handleSeek(Math.max(0, currentTime.value - frameDur));
  }, [handleSeek]);

  const handleFrameForward = useCallback(() => {
    isPlaying.value = false;
    const frameDur = 1000 / project.value.settings.fps;
    handleSeek(Math.min(project.value.settings.duration, currentTime.value + frameDur));
  }, [handleSeek]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    previewClock.setRate(newSpeed);
    setAudioPlaybackRate(newSpeed);
  }, []);

  const handleSave = useCallback(() => setShowSave(true), []);

  const handleExport = useCallback(() => {
    isPlaying.value = false;
    setShowExport(true);
  }, []);

  const handleCaptureImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.value.metadata.name.replace(/\s+/g, '_')}_frame.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, []);

  return (
    <div class="shell">
      <Toolbar onImportV1={handleImportV1} onExport={handleExport} onSave={handleSave} onNewFromTemplate={() => setShowTemplates(true)} onCaptureImage={handleCaptureImage} onOpenConfigs={() => setShowConfigs(true)} onOpenPosts={() => setShowPosts(true)} />
      <div class="shell-main">
        <Sidebar onSeek={handleSeek} />
        <div class="shell-canvas-area">
          <CanvasViewport canvasRef={canvasRef} />
          <div class="transport-bar">
            <div class="transport-controls">
              <button class="transport-btn" onClick={handleSkipToStart} title="Skip to start (Home)">⏮</button>
              <button class="transport-btn" onClick={handleFrameBack} title="Frame back (←)">◀|</button>
              <button class="transport-btn transport-btn-play" onClick={handlePlayPause} title="Play / Pause (Space)">
                {isPlaying.value ? '⏸' : '▶'}
              </button>
              <button class="transport-btn" onClick={handleFrameForward} title="Frame forward (→)">|▶</button>
              <button class="transport-btn" onClick={handleSkipToEnd} title="Skip to end (End)">⏭</button>
              <button
                class={`transport-btn transport-btn-loop ${looping ? 'transport-btn-active' : ''}`}
                onClick={handleToggleLoop}
                title="Loop video and audio (L)"
                aria-label="Loop playback"
                aria-pressed={looping}
              >↻ Loop</button>
            </div>
            <span class="transport-time">
              {formatTime(currentTime.value)} / {formatTime(project.value.settings.duration)}
            </span>
            <input
              type="range"
              class="transport-scrubber"
              min={0}
              max={project.value.settings.duration}
              step={1}
              value={currentTime.value}
              onInput={(e) => handleSeek(parseInt((e.target as HTMLInputElement).value))}
            />
            <select
              class="transport-speed"
              value={speed}
              onChange={(e) => handleSpeedChange(parseFloat((e.target as HTMLSelectElement).value))}
              title="Playback speed"
            >
              {SPEED_OPTIONS.map(s => (
                <option key={s} value={s}>{s === 1 ? '1x' : `${s}x`}</option>
              ))}
            </select>
          </div>
        </div>
        <Inspector />
      </div>
      <TimelinePanel onSeek={handleSeek} />
      {showExport && (
        <ExportDialog
          assets={getAssetMap()}
          onClose={() => setShowExport(false)}
        />
      )}
      {showTemplates && (
        <TemplateDialog onClose={() => setShowTemplates(false)} />
      )}
      {showConfigs && (
        <ConfigManager canvasRef={canvasRef} onClose={() => setShowConfigs(false)} />
      )}
      {showPosts && <PostsDialog onClose={() => setShowPosts(false)} />}
      {showSave && <SaveLibraryDialog projectId={projectIdRef.current} onClose={() => setShowSave(false)} />}
      <style>{shellStyles}</style>
    </div>
  );
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const frac = Math.floor((ms % 1000) / 10);
  return `${min}:${String(sec).padStart(2, '0')}.${String(frac).padStart(2, '0')}`;
}

const shellStyles = `
.shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.shell-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.shell-canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
}

.transport-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
}

.transport-controls {
  display: flex;
  align-items: center;
  gap: 2px;
}

.transport-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 11px;
  transition: background 0.15s;
  flex-shrink: 0;
}
.transport-btn:hover { background: var(--border-hover); }

.transport-btn-play {
  width: 34px;
  height: 34px;
  font-size: 14px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
}
.transport-btn-play:hover { background: var(--accent-hover); }

.transport-btn-loop { width: auto; padding: 0 9px; gap: 4px; font-size: 11px; font-weight: 650; }

.transport-btn-active {
  background: var(--accent) !important;
  color: white !important;
}

.transport-time {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 100px;
  white-space: nowrap;
}

.transport-scrubber {
  flex: 1;
  min-width: 60px;
}

.transport-speed {
  padding: 4px 6px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 11px;
  font-family: var(--font-mono);
  cursor: pointer;
  flex-shrink: 0;
}
.transport-speed:hover { border-color: var(--border-hover); }
`;
