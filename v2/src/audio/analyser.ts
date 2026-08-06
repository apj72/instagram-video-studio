import { signal } from '@preact/signals';
import type { AudioRenderData } from '../render/engine.ts';

export const audioLoaded = signal(false);
export const detectedBpm = signal<number | null>(null);

let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let audioBuffer: AudioBuffer | null = null;
let startOffset = 0;
let isPlaying = false;

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export async function loadAudioFile(file: File): Promise<void> {
  const ctx = getContext();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  audioLoaded.value = true;

  analyserNode = ctx.createAnalyser();
  analyserNode.fftSize = 256;
  analyserNode.smoothingTimeConstant = 0.4;

  gainNode = ctx.createGain();
  gainNode.connect(analyserNode);
  analyserNode.connect(ctx.destination);

  detectedBpm.value = detectBpm(audioBuffer);
}

export function playAudio(fromMs: number = 0): void {
  if (!audioBuffer || !gainNode) return;
  stopAudio();

  const ctx = getContext();
  sourceNode = ctx.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(gainNode!);

  startOffset = fromMs / 1000;
  sourceNode.start(0, startOffset);
  isPlaying = true;

  sourceNode.onended = () => { isPlaying = false; };
}

export function stopAudio(): void {
  if (sourceNode && isPlaying) {
    sourceNode.stop();
    sourceNode.disconnect();
    sourceNode = null;
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
  return audioBuffer ? audioBuffer.duration * 1000 : 0;
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
