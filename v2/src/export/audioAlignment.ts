const ENDPOINT = '/api/video/align-duration';
const UNAVAILABLE = 'The audio export service could not be reached. Check that the local studio server is running, then retry export.';

/** Retain the completed browser render so a failed upload does not require rendering again. */
export class AudioAlignmentError extends Error {
  readonly encoded: Blob;
  readonly durationMs: number;
  readonly pcmAudio?: Blob;
  constructor(message: string, encoded: Blob, durationMs: number, pcmAudio?: Blob) {
    super(message);
    this.name = 'AudioAlignmentError';
    this.encoded = encoded;
    this.durationMs = durationMs;
    this.pcmAudio = pcmAudio;
  }
}

export async function checkAudioAlignmentService(signal?: AbortSignal, requirePcm = false): Promise<void> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, { method: 'GET', cache: 'no-store', signal });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new Error(UNAVAILABLE);
  }
  // Older local studio servers expose only POST on this route.
  if (response.status === 405) {
    if (requirePcm) throw new Error('Restart the local studio server to use the updated audio exporter.');
    return;
  }
  if (!response.headers.get('Content-Type')?.includes('application/json')) throw new Error(UNAVAILABLE);
  const result = await response.json();
  if (!response.ok || !result.available) throw new Error(result.error || 'FFmpeg is unavailable. Restart the local studio server with FFmpeg installed.');
  if (requirePcm && !result.pcmAudio) throw new Error('Restart the local studio server to use the updated audio exporter.');
}

export async function alignExportedVideo(encoded: Blob, durationMs: number, signal?: AbortSignal, pcmAudio?: Blob): Promise<Blob> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': pcmAudio ? 'application/octet-stream' : 'video/mp4',
          'X-Target-Duration-Seconds': String(durationMs / 1000),
          ...(pcmAudio ? { 'X-Video-Bytes': String(encoded.size) } : {}), },
        body: pcmAudio ? new Blob([encoded, pcmAudio]) : encoded, signal,
      });
      if (response.ok) {
        if (!response.headers.get('Content-Type')?.includes('video/mp4')) {
          throw new AudioAlignmentError(UNAVAILABLE, encoded, durationMs, pcmAudio);
        }
        return await response.blob();
      }
    } catch (cause) {
      if (signal?.aborted) throw cause;
      if (cause instanceof AudioAlignmentError) throw cause;
      if (attempt === 0) continue;
      throw new AudioAlignmentError(UNAVAILABLE, encoded, durationMs, pcmAudio);
    }
    if (response.status >= 502 && attempt === 0) continue;
    const detail = response.status === 404 ? UNAVAILABLE : await response.text();
    throw new AudioAlignmentError(detail || 'Could not finish the exported video. Retry export.', encoded, durationMs, pcmAudio);
  }
  throw new AudioAlignmentError(UNAVAILABLE, encoded, durationMs, pcmAudio);
}
