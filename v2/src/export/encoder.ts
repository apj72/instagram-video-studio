import { Output, Mp4OutputFormat, BufferTarget, CanvasSource, AudioBufferSource, QUALITY_HIGH } from 'mediabunny';
import type { Project } from '../core/schema.ts';
import type { ExportPreset } from '../core/schema.ts';
import { renderFrame } from '../render/engine.ts';
import { getAudioBuffer } from '../audio/analyser.ts';

export interface ExportProgress {
  phase: 'encoding' | 'muxing-audio' | 'finalizing' | 'done' | 'error';
  currentFrame: number;
  totalFrames: number;
  percent: number;
  error?: string;
}

export type ProgressCallback = (progress: ExportProgress) => void;

function trimAudioBuffer(
  buffer: AudioBuffer,
  startMs: number,
  endMs: number,
  ctx: OfflineAudioContext,
): AudioBuffer {
  const sr = buffer.sampleRate;
  const startSample = Math.floor((startMs / 1000) * sr);
  const endSample = Math.min(buffer.length, Math.ceil((endMs / 1000) * sr));
  const length = endSample - startSample;
  if (length <= 0) return ctx.createBuffer(buffer.numberOfChannels, 1, sr);

  const trimmed = ctx.createBuffer(buffer.numberOfChannels, length, sr);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = trimmed.getChannelData(ch);
    dst.set(src.subarray(startSample, endSample));
  }
  return trimmed;
}

export async function exportMp4(
  project: Project,
  assets: Map<string, HTMLImageElement | HTMLVideoElement>,
  preset: ExportPreset,
  onProgress: ProgressCallback,
  abortSignal?: AbortSignal,
): Promise<Blob | null> {
  const { width, height, duration, fps } = project.settings;
  const totalFrames = Math.ceil((duration / 1000) * fps);
  const frameDuration = 1 / fps;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create OffscreenCanvas 2D context');

  const target = new BufferTarget();

  const videoSource = new CanvasSource(canvas, {
    codec: preset.codec as 'avc',
    quality: QUALITY_HIGH,
    keyFrameInterval: 2,
  });

  const audioBuffer = getAudioBuffer();
  const hasAudio = audioBuffer !== null && !project.audio.muted;

  let audioSource: AudioBufferSource | null = null;
  if (hasAudio) {
    audioSource = new AudioBufferSource({
      codec: 'aac',
      quality: QUALITY_HIGH,
    });
  }

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target,
  });

  output.addVideoTrack(videoSource);
  if (audioSource) {
    output.addAudioTrack(audioSource);
  }

  for (let frame = 0; frame < totalFrames; frame++) {
    if (abortSignal?.aborted) {
      return null;
    }

    const timeMs = (frame / fps) * 1000;
    const frameNumber = frame;

    renderFrame(project, ctx as unknown as CanvasRenderingContext2D, timeMs, frameNumber, assets, null);

    await videoSource.add(frame * frameDuration, frameDuration);

    if (frame % 10 === 0 || frame === totalFrames - 1) {
      onProgress({
        phase: 'encoding',
        currentFrame: frame + 1,
        totalFrames,
        percent: ((frame + 1) / totalFrames) * 90,
      });
    }
  }

  if (audioSource && audioBuffer) {
    onProgress({
      phase: 'muxing-audio',
      currentFrame: totalFrames,
      totalFrames,
      percent: 92,
    });

    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate,
    );

    const offset = project.audio.offset;
    const trimStart = project.audio.trim.start;
    const trimEnd = project.audio.trim.end > 0 ? project.audio.trim.end : duration;
    const trimmed = trimAudioBuffer(audioBuffer, trimStart + offset, Math.min(trimEnd + offset, duration + offset), offlineCtx);

    const vol = project.audio.volume;
    if (vol < 1) {
      for (let ch = 0; ch < trimmed.numberOfChannels; ch++) {
        const data = trimmed.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
          data[i] *= vol;
        }
      }
    }

    await audioSource.add(trimmed);
  }

  onProgress({
    phase: 'finalizing',
    currentFrame: totalFrames,
    totalFrames,
    percent: 95,
  });

  await output.finalize();

  const buffer = target.buffer;
  if (!buffer) {
    onProgress({
      phase: 'error',
      currentFrame: totalFrames,
      totalFrames,
      percent: 100,
      error: 'No output buffer produced',
    });
    return null;
  }

  onProgress({
    phase: 'done',
    currentFrame: totalFrames,
    totalFrames,
    percent: 100,
  });

  return new Blob([buffer], { type: 'video/mp4' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function supportsWebCodecs(): boolean {
  return typeof VideoEncoder !== 'undefined';
}

export async function exportFallback(
  project: Project,
  assets: Map<string, HTMLImageElement | HTMLVideoElement>,
  onProgress: ProgressCallback,
): Promise<Blob | null> {
  const { width, height, duration, fps } = project.settings;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp8',
    videoBitsPerSecond: 5_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<Blob | null>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      onProgress({ phase: 'done', currentFrame: 0, totalFrames: 0, percent: 100 });
      resolve(blob);
    };

    recorder.start();
    const totalFrames = Math.ceil((duration / 1000) * fps);
    let frame = 0;

    function nextFrame() {
      if (frame >= totalFrames) {
        recorder.stop();
        return;
      }
      const timeMs = (frame / fps) * 1000;
      renderFrame(project, ctx!, timeMs, frame, assets, null);
      frame++;
      onProgress({
        phase: 'encoding',
        currentFrame: frame,
        totalFrames,
        percent: (frame / totalFrames) * 100,
      });
      requestAnimationFrame(nextFrame);
    }
    nextFrame();
  });
}
