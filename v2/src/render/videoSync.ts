import type { Layer, Project, VideoLayer } from '../core/schema.ts';

/**
 * Drives video layers from the timeline.
 *
 * The renderer draws whatever frame a `<video>` element happens to be showing, and nothing was
 * moving it. On export that froze the background, because 450 frames render far faster than the
 * element plays. These helpers put the element where the timeline says it should be.
 */

/** Where in the source clip a layer should be at this point on the timeline, looping to fill. */
export function videoSourceTime(layer: VideoLayer, assetDuration: number, timeMs: number): number {
  if (!Number.isFinite(assetDuration) || assetDuration <= 0) return 0;
  const elapsed = Math.max(0, timeMs - layer.inTime) / 1000;
  const wrapped = elapsed % assetDuration;
  // Never land exactly on the final frame boundary, where some decoders report the clip as ended.
  return Math.min(wrapped, Math.max(0, assetDuration - 1 / 1000));
}

function videoLayers(layers: Layer[]): VideoLayer[] {
  return layers.filter((layer): layer is VideoLayer => layer.type === 'video' && layer.assetId !== null);
}

function element(assets: Map<string, HTMLImageElement | HTMLVideoElement>, layer: VideoLayer) {
  const asset = layer.assetId ? assets.get(layer.assetId) : undefined;
  if (!(asset instanceof HTMLVideoElement)) return null;
  if (!Number.isFinite(asset.duration) || asset.duration <= 0) return null;
  return asset;
}

function seekTo(video: HTMLVideoElement, target: number, timeoutMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      video.removeEventListener('seeked', done);
      video.removeEventListener('error', failed);
      signal?.removeEventListener('abort', aborted);
      clearTimeout(timer);
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error); else resolve();
    };
    const done = () => finish();
    const failed = () => finish(new Error('Could not decode a background video frame. Try exporting again.'));
    const aborted = () => finish(new DOMException('Export cancelled', 'AbortError'));
    // A slow decoder must produce an error instead of silently encoding a stale frame.
    const timer = setTimeout(() => finish(new Error('Timed out waiting for a background video frame. Try exporting again.')), timeoutMs);
    video.addEventListener('seeked', done);
    video.addEventListener('error', failed);
    signal?.addEventListener('abort', aborted, { once: true });
    if (signal?.aborted) { aborted(); return; }
    try { video.currentTime = target; } catch { failed(); }
  });
}

/**
 * Parks every video layer on its exact frame and waits for the decoder. Use before rendering a
 * frame that has to be right, which means every frame of an export.
 */
export async function seekVideoAssets(
  project: Project,
  assets: Map<string, HTMLImageElement | HTMLVideoElement>,
  timeMs: number,
  timeoutMs = 10000,
  signal?: AbortSignal,
): Promise<void> {
  const pending: Promise<void>[] = [];
  for (const layer of videoLayers(project.layers)) {
    if (!layer.visible || timeMs < layer.inTime || timeMs > layer.outTime) continue;
    const video = element(assets, layer);
    if (!video) continue;
    if (!video.paused) video.pause();
    const target = videoSourceTime(layer, video.duration, timeMs);
    if (!video.seeking && video.readyState >= 2 && Math.abs(video.currentTime - target) < 1e-6) continue;
    pending.push(seekTo(video, target, timeoutMs, signal));
  }
  await Promise.all(pending);
}

/**
 * Keeps the preview roughly honest without seeking on every frame, which stutters. While the
 * clock runs the element plays and is only nudged back when it drifts; when it stops, the
 * element is put exactly where the playhead is so scrubbing shows the right frame.
 */
export function followVideoAssets(
  project: Project,
  assets: Map<string, HTMLImageElement | HTMLVideoElement>,
  timeMs: number,
  playing: boolean,
  driftSeconds = 0.25,
): void {
  for (const layer of videoLayers(project.layers)) {
    const video = element(assets, layer);
    if (!video) continue;
    const target = videoSourceTime(layer, video.duration, timeMs);
    const live = timeMs >= layer.inTime && timeMs <= layer.outTime;
    if (!playing || !live) {
      if (!video.paused) video.pause();
      if (Math.abs(video.currentTime - target) > 1 / 60) video.currentTime = target;
      continue;
    }
    if (Math.abs(video.currentTime - target) > driftSeconds) video.currentTime = target;
    if (video.paused) void video.play().catch(() => {});
  }
}
