export interface ProjectClock {
  getTime(frameNumber: number): number;
  getFrame(timeMs: number): number;
  getNormalizedTime(frameNumber: number): number;
  readonly fps: number;
  readonly duration: number;
  readonly totalFrames: number;
}

export function createClock(fps: number, durationMs: number): ProjectClock {
  const frameDuration = 1000 / fps;
  const totalFrames = Math.ceil(durationMs / frameDuration);

  return {
    fps,
    duration: durationMs,
    totalFrames,
    getTime(frameNumber: number): number {
      return (frameNumber * frameDuration) % durationMs;
    },
    getFrame(timeMs: number): number {
      return Math.floor(timeMs / frameDuration) % totalFrames;
    },
    getNormalizedTime(frameNumber: number): number {
      return this.getTime(frameNumber) / durationMs;
    },
  };
}

export interface PreviewClock {
  start(): void;
  stop(): void;
  seek(timeMs: number): void;
  toggle(): void;
  readonly playing: boolean;
  readonly currentTime: number;
  readonly duration: number;
  onTick: ((timeMs: number) => void) | null;
}

export function createPreviewClock(durationMs: number): PreviewClock {
  let playing = false;
  let startTimestamp = 0;
  let pausedAt = 0;
  let rafId = 0;
  let onTick: ((timeMs: number) => void) | null = null;

  function tick(timestamp: number) {
    if (!playing) return;
    const elapsed = timestamp - startTimestamp;
    const currentTime = elapsed % durationMs;
    onTick?.(currentTime);
    rafId = requestAnimationFrame(tick);
  }

  return {
    get playing() { return playing; },
    get currentTime() {
      if (!playing) return pausedAt;
      return (performance.now() - startTimestamp) % durationMs;
    },
    get duration() { return durationMs; },
    get onTick() { return onTick; },
    set onTick(fn) { onTick = fn; },

    start() {
      if (playing) return;
      playing = true;
      startTimestamp = performance.now() - pausedAt;
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      if (!playing) return;
      playing = false;
      pausedAt = (performance.now() - startTimestamp) % durationMs;
      cancelAnimationFrame(rafId);
    },
    seek(timeMs: number) {
      pausedAt = timeMs % durationMs;
      if (playing) {
        startTimestamp = performance.now() - pausedAt;
      }
    },
    toggle() {
      if (playing) this.stop();
      else this.start();
    },
  };
}
