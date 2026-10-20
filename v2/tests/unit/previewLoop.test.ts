import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPreviewClock } from '../../src/core/clock.ts';

afterEach(() => vi.unstubAllGlobals());

describe('preview loop', () => {
  it('keeps the remaining fraction of a frame when wrapping and emits one loop event', () => {
    let now = 0;
    let frame: FrameRequestCallback = () => {};
    vi.stubGlobal('performance', { now: () => now });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
    vi.stubGlobal('cancelAnimationFrame', () => {});

    const clock = createPreviewClock(1000);
    const times: number[] = [];
    let loops = 0;
    clock.setLoop(true);
    clock.onTick = time => times.push(time);
    clock.onLoop = () => { loops++; };
    clock.start();

    now = 1012;
    frame(now);
    expect(times).toEqual([12]);
    expect(loops).toBe(1);
    expect(clock.currentTime).toBe(12);

    now = 2004;
    frame(now);
    expect(times).toEqual([12, 4]);
    expect(loops).toBe(2);
    clock.stop();
  });
});
