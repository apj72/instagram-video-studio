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

export interface PreviewClockExt extends PreviewClock {
  setDuration(ms: number): void;
  setRate(rate: number): void;
  setLoop(loop: boolean): void;
  readonly rate: number;
  readonly loop: boolean;
  onEnd: (() => void) | null;
  onLoop: (() => void) | null;
}

export function createPreviewClock(initialDurationMs: number): PreviewClockExt {
  let playing = false;
  let startTimestamp = 0;
  let pausedAt = 0;
  let rafId = 0;
  let dur = initialDurationMs;
  let rate = 1;
  let looping = false;
  let onTick: ((timeMs: number) => void) | null = null;
  let onEnd: (() => void) | null = null;
  let onLoop: (() => void) | null = null;

  function tick(timestamp: number) {
    if (!playing) return;
    const elapsed = (timestamp - startTimestamp) * rate;
    if (elapsed >= dur) {
      if (looping) {
        const wrapped = elapsed % dur;
        startTimestamp = timestamp - wrapped / rate;
        onLoop?.();
        onTick?.(wrapped);
      } else {
        playing = false;
        pausedAt = dur;
        onTick?.(dur);
        onEnd?.();
        return;
      }
    } else {
      onTick?.(elapsed);
    }
    rafId = requestAnimationFrame(tick);
  }

  return {
    get playing() { return playing; },
    get currentTime() {
      if (!playing) return pausedAt;
      const elapsed = (performance.now() - startTimestamp) * rate;
      return Math.min(elapsed, dur);
    },
    get duration() { return dur; },
    get rate() { return rate; },
    get loop() { return looping; },
    get onTick() { return onTick; },
    set onTick(fn) { onTick = fn; },
    get onEnd() { return onEnd; },
    set onEnd(fn) { onEnd = fn; },
    get onLoop() { return onLoop; },
    set onLoop(fn) { onLoop = fn; },

    setDuration(ms: number) {
      dur = ms;
      if (pausedAt > dur) pausedAt = 0;
    },

    setRate(r: number) {
      if (playing) {
        pausedAt = Math.min((performance.now() - startTimestamp) * rate, dur);
        startTimestamp = performance.now() - pausedAt / r;
      }
      rate = r;
    },

    setLoop(l: boolean) {
      looping = l;
    },

    start() {
      if (playing) return;
      if (pausedAt >= dur) pausedAt = 0;
      playing = true;
      startTimestamp = performance.now() - pausedAt / rate;
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      if (!playing) return;
      playing = false;
      pausedAt = Math.min((performance.now() - startTimestamp) * rate, dur);
      cancelAnimationFrame(rafId);
    },
    seek(timeMs: number) {
      pausedAt = Math.max(0, Math.min(timeMs, dur));
      if (playing) {
        startTimestamp = performance.now() - pausedAt / rate;
      }
    },
    toggle() {
      if (playing) this.stop();
      else this.start();
    },
  };
}
