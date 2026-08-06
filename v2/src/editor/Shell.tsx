import { useRef, useEffect, useCallback } from 'preact/hooks';
import { project, currentTime, isPlaying, selectedLayerId } from '../core/state.ts';
import { createPreviewClock } from '../core/clock.ts';
import { renderFrame } from '../render/engine.ts';
import { importV1Config } from '../core/migration.ts';
import { loadProject } from '../core/state.ts';
import { Toolbar } from './toolbar/Toolbar.tsx';
import { Sidebar } from './sidebar/Sidebar.tsx';
import { TimelinePanel } from './timeline/TimelinePanel.tsx';

const previewClock = createPreviewClock(16000);

export function Shell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assetsRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const rafRef = useRef(0);

  useEffect(() => {
    const logo = new Image();
    logo.src = '/assets/logo_transparent.png';
    logo.onload = () => {
      assetsRef.current.set('default-logo', logo);
      drawFrame(0);
    };
  }, []);

  const drawFrame = useCallback((timeMs: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = project.value;
    const frameNumber = Math.floor(timeMs / (1000 / p.settings.fps));
    renderFrame(p, ctx, timeMs, frameNumber, assetsRef.current, null);
  }, []);

  useEffect(() => {
    previewClock.onTick = (timeMs: number) => {
      currentTime.value = timeMs;
      drawFrame(timeMs);
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
    };
  }, [drawFrame]);

  useEffect(() => {
    if (isPlaying.value) {
      previewClock.start();
    } else {
      previewClock.stop();
    }
  }, [isPlaying.value]);

  useEffect(() => {
    const dur = project.value.settings.duration;
    if (dur !== previewClock.duration) {
      previewClock.seek(0);
    }
  }, [project.value.settings.duration]);

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
    drawFrame(timeMs);
  }, [drawFrame]);

  return (
    <div class="shell">
      <Toolbar onImportV1={handleImportV1} />
      <div class="shell-main">
        <Sidebar />
        <div class="shell-canvas-area">
          <div class="canvas-viewport">
            <canvas
              ref={canvasRef}
              width={project.value.settings.width}
              height={project.value.settings.height}
              class="preview-canvas"
              onClick={() => {
                selectedLayerId.value = null;
              }}
            />
          </div>
          <div class="transport-bar">
            <button class="transport-btn" onClick={handlePlayPause}>
              {isPlaying.value ? '⏸' : '▶'}
            </button>
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
          </div>
        </div>
      </div>
      <TimelinePanel onSeek={handleSeek} />
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

.canvas-viewport {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 16px;
  background: #080808;
}

.preview-canvas {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
  box-shadow: 0 0 40px rgba(0,0,0,0.5);
}

.transport-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
}

.transport-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  transition: background 0.15s;
}
.transport-btn:hover { background: var(--accent); }

.transport-time {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 100px;
}

.transport-scrubber {
  flex: 1;
}
`;
