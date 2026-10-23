import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioAlignmentError, alignExportedVideo, checkAudioAlignmentService } from '../../src/export/audioAlignment.ts';

afterEach(() => vi.unstubAllGlobals());
const input = new Blob(['encoded mp4'], { type: 'video/mp4' });
const success = () => new Response(input, { headers: { 'Content-Type': 'video/mp4' } });

describe('audio export connection recovery', () => {
  it('retries a failed connection using the completed render', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(success());
    vi.stubGlobal('fetch', fetcher);
    const output = await alignExportedVideo(input, 15000);
    expect(await output.text()).toBe('encoded mp4');
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [, options] of fetcher.mock.calls) {
      expect(options.body).toBe(input);
      expect(options.headers['X-Target-Duration-Seconds']).toBe('15');
    }
  });

  it('retains the render for manual retry when the service remains unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const failure = await alignExportedVideo(input, 15000).catch(error => error);
    expect(failure).toBeInstanceOf(AudioAlignmentError);
    expect(failure.encoded).toBe(input);
    expect(failure.durationMs).toBe(15000);
  });

  it('rejects a static server returning HTML instead of an MP4', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html/>', { headers: { 'Content-Type': 'text/html' } })));
    await expect(alignExportedVideo(input, 15000)).rejects.toBeInstanceOf(AudioAlignmentError);
    await expect(checkAudioAlignmentService()).rejects.toThrow('local studio server');
  });

  it('reports missing FFmpeg before rendering, and accepts older POST-only local servers', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ available: false, error: 'FFmpeg unavailable' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    })).mockResolvedValueOnce(new Response(null, { status: 405 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(checkAudioAlignmentService()).rejects.toThrow('FFmpeg unavailable');
    await expect(checkAudioAlignmentService()).resolves.toBeUndefined();
  });

  it('hands off the original PCM separately and keeps it for retry', async () => {
    const pcm = new Blob(['original samples'], { type: 'audio/wav' });
    const fetcher = vi.fn().mockResolvedValue(new Response('offline', { status: 404 }));
    vi.stubGlobal('fetch', fetcher);
    const error = await alignExportedVideo(input, 15000, undefined, pcm).catch(error => error);
    expect(error.pcmAudio).toBe(pcm);
    const options = fetcher.mock.calls[0][1];
    expect(options.headers['X-Video-Bytes']).toBe(String(input.size));
    expect(await options.body.text()).toBe('encoded mp4original samples');
  });

  it('requires the new server capability for PCM exports', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ available: true }), {
      headers: { 'Content-Type': 'application/json' },
    })));
    await expect(checkAudioAlignmentService(undefined, true)).rejects.toThrow('Restart');
  });

  it('does not retry a cancelled export', async () => {
    const controller = new AbortController();
    controller.abort();
    const abort = new DOMException('Cancelled', 'AbortError');
    const fetcher = vi.fn().mockRejectedValue(abort);
    vi.stubGlobal('fetch', fetcher);
    await expect(alignExportedVideo(input, 15000, controller.signal)).rejects.toBe(abort);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
