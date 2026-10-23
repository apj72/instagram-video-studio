import { Output, Mp4OutputFormat, BufferTarget, CanvasSource } from 'mediabunny';
import type { Project } from '../core/schema.ts';
import type { ExportPreset } from '../core/schema.ts';
import { renderFrame } from '../render/engine.ts';
import { alignExportedVideo, checkAudioAlignmentService } from './audioAlignment.ts';
import { createExportVideoAssets } from './videoAssets.ts';
import { exportPcmWav } from './pcmAudio.ts';
import { seekVideoAssets } from '../render/videoSync.ts';
import { getAudioBuffer, getLoadedAudioAssetId } from '../audio/analyser.ts';

export interface ExportProgress {
  phase: 'encoding' | 'muxing-audio' | 'finalizing' | 'done' | 'error';
  currentFrame: number;
  totalFrames: number;
  percent: number;
  error?: string;
}

export type ProgressCallback = (progress: ExportProgress) => void;

export async function exportMp4(
  project: Project,
  assets: Map<string, HTMLImageElement | HTMLVideoElement>,
  preset: ExportPreset,
  onProgress: ProgressCallback,
  abortSignal?: AbortSignal,
): Promise<Blob | null> {
  // Freeze the edit state, and give each video layer an independent decoder for this render.
  project = structuredClone(project);
  const media = await createExportVideoAssets(project, assets, abortSignal);
  project = media.project;
  assets = media.assets;
  try {
    const { width, height, duration, fps } = project.settings;
    const totalFrames = Math.ceil((duration / 1000) * fps);
    const frameDuration = 1 / fps;

    const canvas = new OffscreenCanvas(width, height);
    // H.264 output is SDR; convert wide-gamut photos to sRGB before encoding.
    const ctx = canvas.getContext('2d', { colorSpace: 'srgb' });
    if (!ctx) throw new Error('Failed to create OffscreenCanvas 2D context');

    const target = new BufferTarget();

    const videoSource = new CanvasSource(canvas, {
      codec: 'avc',
      bitrate: preset.bitrate,
      keyFrameInterval: 2,
    });

    const audioBuffer = getAudioBuffer();
    if (project.audio.assetId && (getLoadedAudioAssetId() !== project.audio.assetId || !audioBuffer)) {
      throw new Error('The audio file is not loaded. Choose it again in Audio before exporting.');
    }
    const hasAudio = !!project.audio.assetId && audioBuffer !== null && !project.audio.muted;

    if (hasAudio) await checkAudioAlignmentService(abortSignal, true);

    const pcmAudio = hasAudio && audioBuffer ? exportPcmWav(audioBuffer, project.audio, duration) : undefined;

    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target,
    });

    output.addVideoTrack(videoSource);
    await output.start();

    for (let frame = 0; frame < totalFrames; frame++) {
      if (abortSignal?.aborted) {
        return null;
      }

      const timeMs = (frame / fps) * 1000;
      const frameNumber = frame;

      // Park video layers on this exact frame; left to play freely they barely advance,
      // because frames render far faster than real time.
      await seekVideoAssets(project, assets, timeMs, 10000, abortSignal);
      renderFrame(project, ctx as unknown as CanvasRenderingContext2D, timeMs, frameNumber, assets, null);

      await videoSource.add(frame * frameDuration, Math.min(frameDuration, duration / 1000 - frame * frameDuration));

      if (frame % 10 === 0 || frame === totalFrames - 1) {
        onProgress({
          phase: 'encoding',
          currentFrame: frame + 1,
          totalFrames,
          percent: ((frame + 1) / totalFrames) * 90,
        });
      }
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

    const encoded = new Blob([buffer], { type: 'video/mp4' });
    const result = hasAudio ? await alignExportedVideo(encoded, duration, abortSignal, pcmAudio) : encoded;
    onProgress({ phase: 'done', currentFrame: totalFrames, totalFrames, percent: 100 });
    return result;
  } finally {
    media.dispose();
  }
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
  const ctx = canvas.getContext('2d', { colorSpace: 'srgb' });
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
