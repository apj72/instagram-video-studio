import { afterEach, describe, expect, it, vi } from 'vitest';
import { seekVideoAssets } from '../../src/render/videoSync.ts';
import { VERSION1_TEMPLATES } from '../../src/templates/version1Events.ts';

class Decoder extends EventTarget {
  duration = 15;
  paused = true;
  seeking = false;
  readyState = 2;
  time = 0;
  decode = true;
  get currentTime() { return this.time; }
  set currentTime(value: number) {
    this.time = value;
    this.seeking = true;
    if (this.decode) setTimeout(() => { this.seeking = false; this.dispatchEvent(new Event('seeked')); }, 10);
  }
  pause() { this.paused = true; }
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

function setup() {
  vi.useFakeTimers();
  vi.stubGlobal('HTMLVideoElement', Decoder);
  const project = VERSION1_TEMPLATES[0].factory();
  const video = new Decoder();
  const assets = new Map([['version1-laser-video', video as unknown as HTMLVideoElement]]);
  return { project, video, assets };
}

describe('wait for export video decoding', () => {
  it('waits for seeked, rather than drawing as soon as currentTime changes', async () => {
    const { project, video, assets } = setup();
    let complete = false;
    const seek = seekVideoAssets(project, assets, 2500).then(() => { complete = true; });
    expect(video.currentTime).toBe(1.5);
    await vi.advanceTimersByTimeAsync(5);
    expect(complete).toBe(false);
    await vi.advanceTimersByTimeAsync(5);
    await seek;
    expect(complete).toBe(true);
  });

  it('fails a stalled decoder instead of exporting repeated still frames', async () => {
    const { project, video, assets } = setup();
    video.decode = false;
    const result = expect(seekVideoAssets(project, assets, 2500, 100)).rejects.toThrow('Timed out');
    await vi.advanceTimersByTimeAsync(100);
    await result;
  });

  it('supports cancellation while waiting for a frame', async () => {
    const { project, video, assets } = setup();
    video.decode = false;
    const controller = new AbortController();
    const result = expect(seekVideoAssets(project, assets, 2500, 10000, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await result;
  });
});
