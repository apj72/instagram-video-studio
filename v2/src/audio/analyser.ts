import { signal } from '@preact/signals';
import type { AudioRenderData } from '../render/engine.ts';
import { flacDurationMs } from './flac.ts';
import { audibleEndMs } from './trailingSilence.ts';

export const audioLoaded = signal(false);
export const detectedBpm = signal<number | null>(null);
export const audioLoadError = signal('');

let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let audioBuffer: AudioBuffer | null = null;
let audioFile: File | null = null;
let sourceDurationMs = 0;
let audibleDurationMs = 0;
let loadedAssetId: string | null = null;
let startOffset = 0;
let isPlaying = false;
let audioLoopEnabled = false;
let audioLoopDurationMs = 0;
let audioPlaybackRate = 1;

function nativeLoopEndSeconds(): number | null {
  if (!audioLoopEnabled || !audioBuffer || audioLoopDurationMs <= 0) return null;
  const end = audioLoopDurationMs / 1000;
  // The audio cannot fill a longer video seamlessly. Let the visual clock restart it instead.
  return end <= audioBuffer.duration + 0.002 ? Math.min(end, audioBuffer.duration) : null;
}

export function setAudioLoop(enabled: boolean, durationMs: number): void {
  audioLoopEnabled = enabled;
  audioLoopDurationMs = durationMs;
  if (sourceNode) {
    const end = nativeLoopEndSeconds();
    sourceNode.loopStart = 0;
    sourceNode.loopEnd = end ?? 0;
    sourceNode.loop = end !== null;
  }
}

export function isAudioNativeLooping(): boolean {
  return Boolean(sourceNode?.loop);
}

export function setAudioPlaybackRate(rate: number): void {
  audioPlaybackRate = rate;
  if (sourceNode) sourceNode.playbackRate.value = rate;
}

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

async function decodeFile(ctx: AudioContext, file: File): Promise<AudioBuffer> {
  try {
    return await ctx.decodeAudioData(await file.arrayBuffer());
  } catch (originalError) {
    if (!/\.flac$/i.test(file.name)) throw originalError;
    let response: Response;
    try {
      response = await fetch('/api/audio/convert-flac', {
        method: 'POST',
        headers: { 'Content-Type': 'audio/flac' },
        body: file,
      });
    } catch {
      throw new Error('This browser could not decode FLAC, and the local FLAC converter is unavailable.');
    }
    if (!response.ok) {
      if (response.status === 404) throw new Error('This browser could not decode FLAC. Open the app through its local Vite server for FLAC conversion.');
      throw new Error(await response.text() || 'FLAC conversion failed.');
    }
    return ctx.decodeAudioData(await response.arrayBuffer());
  }
}

export async function loadAudioFile(file: File, assetId: string | null = null): Promise<void> {
  const ctx = getContext();
  const decoded = await decodeFile(ctx, file);
  const exactFlacDuration = /\.flac$/i.test(file.name)
    ? flacDurationMs(new Uint8Array(await file.slice(0, 42).arrayBuffer()))
    : null;
  stopAudio();
  gainNode?.disconnect();
  analyserNode?.disconnect();
  audioBuffer = decoded;
  audioFile = file;
  sourceDurationMs = exactFlacDuration ?? decoded.duration * 1000;
  audibleDurationMs = audibleEndMs(
    Array.from({ length: decoded.numberOfChannels }, (_, channel) => decoded.getChannelData(channel)),
    decoded.sampleRate, sourceDurationMs,
  );
  loadedAssetId = assetId;

  analyserNode = ctx.createAnalyser();
  analyserNode.fftSize = 256;
  analyserNode.smoothingTimeConstant = 0.4;

  gainNode = ctx.createGain();
  gainNode.connect(analyserNode);
  analyserNode.connect(ctx.destination);

  detectedBpm.value = detectBpm(decoded);
  audioLoadError.value = '';
  audioLoaded.value = true;
}

export function getAudioFile(): File | null { return audioFile; }
export function getLoadedAudioAssetId(): string | null { return loadedAssetId; }

export function clearAudio(): void {
  stopAudio();
  gainNode?.disconnect();
  analyserNode?.disconnect();
  gainNode = null;
  analyserNode = null;
  audioBuffer = null;
  audioFile = null;
  sourceDurationMs = 0;
  audibleDurationMs = 0;
  loadedAssetId = null;
  detectedBpm.value = null;
  audioLoadError.value = '';
  audioLoaded.value = false;
}

export function playAudio(fromMs: number = 0): void {
  if (!audioBuffer || !gainNode) return;
  stopAudio();

  const ctx = getContext();
  sourceNode = ctx.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.playbackRate.value = audioPlaybackRate;
  sourceNode.connect(gainNode!);

  const loopEnd = nativeLoopEndSeconds();
  if (loopEnd !== null) {
    sourceNode.loopStart = 0;
    sourceNode.loopEnd = loopEnd;
    sourceNode.loop = true;
  }

  startOffset = fromMs / 1000;
  if (startOffset >= audioBuffer.duration) { sourceNode.disconnect(); sourceNode = null; return; }
  void ctx.resume();
  sourceNode.start(0, startOffset);
  isPlaying = true;

  const startedNode = sourceNode;
  sourceNode.onended = () => {
    if (sourceNode === startedNode) {
      sourceNode = null;
      isPlaying = false;
      startedNode.disconnect();
    }
  };
}

export function stopAudio(): void {
  if (sourceNode) {
    const stoppedNode = sourceNode;
    sourceNode = null;
    stoppedNode.onended = null;
    if (isPlaying) stoppedNode.stop();
    stoppedNode.disconnect();
  }
  isPlaying = false;
}

export function seekAudio(timeMs: number): void {
  if (!audioBuffer) return;
  if (isPlaying) {
    playAudio(timeMs);
  } else {
    startOffset = timeMs / 1000;
  }
}

export function setVolume(vol: number): void {
  if (gainNode) {
    gainNode.gain.value = Math.max(0, Math.min(1, vol));
  }
}

export function getAudioRenderData(): AudioRenderData | null {
  if (!analyserNode || !isPlaying) return null;

  const freqData = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteFrequencyData(freqData);

  const timeData = new Uint8Array(analyserNode.fftSize);
  analyserNode.getByteTimeDomainData(timeData);

  const bands = 32;
  const spectrum = new Float32Array(bands);
  const binsPerBand = Math.floor(freqData.length / bands);
  for (let i = 0; i < bands; i++) {
    let sum = 0;
    for (let j = 0; j < binsPerBand; j++) {
      sum += freqData[i * binsPerBand + j];
    }
    spectrum[i] = (sum / binsPerBand) / 255;
  }

  const waveform = new Float32Array(128);
  const step = timeData.length / 128;
  for (let i = 0; i < 128; i++) {
    waveform[i] = (timeData[Math.floor(i * step)] - 128) / 128;
  }

  let rmsL = 0, rmsR = 0;
  for (let i = 0; i < bands; i++) {
    const v = spectrum[i];
    if (i % 2 === 0) rmsL += v * v;
    else rmsR += v * v;
  }
  rmsL = Math.sqrt(rmsL / (bands / 2));
  rmsR = Math.sqrt(rmsR / (bands / 2));

  return { spectrum, waveform, vuLeft: rmsL, vuRight: rmsR };
}

export function getAudioBuffer(): AudioBuffer | null {
  return audioBuffer;
}

export function getAudioDuration(): number {
  return sourceDurationMs;
}

export function getAudioAudibleDuration(): number {
  return audibleDurationMs;
}

function detectBpm(buffer: AudioBuffer): number {
  const sampleRate = buffer.sampleRate;
  const data = buffer.getChannelData(0);

  const windowSize = 1024;
  const hopSize = 512;
  const numWindows = Math.floor((data.length - windowSize) / hopSize);
  const energy = new Float32Array(numWindows);

  for (let w = 0; w < numWindows; w++) {
    let sum = 0;
    const start = w * hopSize;
    for (let i = 0; i < windowSize; i++) {
      sum += data[start + i] * data[start + i];
    }
    energy[w] = sum / windowSize;
  }

  const diff = new Float32Array(numWindows - 1);
  for (let i = 1; i < numWindows; i++) {
    diff[i - 1] = Math.max(0, energy[i] - energy[i - 1]);
  }

  const minBpm = 80, maxBpm = 180;
  const windowsPerSec = sampleRate / hopSize;
  let bestBpm = 120;
  let bestCorr = 0;

  for (let bpm = minBpm; bpm <= maxBpm; bpm++) {
    const lag = Math.round((60 / bpm) * windowsPerSec);
    if (lag >= diff.length / 2) continue;

    let corr = 0;
    let count = 0;
    for (let i = 0; i < diff.length - lag; i++) {
      corr += diff[i] * diff[i + lag];
      count++;
    }
    corr /= count;

    if (corr > bestCorr) {
      bestCorr = corr;
      bestBpm = bpm;
    }
  }

  return bestBpm;
}
