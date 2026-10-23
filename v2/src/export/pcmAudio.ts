import type { AudioTrack } from '../core/schema.ts';

/** Lossless float PCM handoff: AAC encoding happens once, in the local export service. */
export function exportPcmWav(buffer: AudioBuffer, audio: AudioTrack, durationMs: number): Blob {
  const rate = buffer.sampleRate;
  const start = Math.max(0, Math.round((audio.trim.start + audio.offset) * rate / 1000));
  const endMs = Math.min(audio.trim.end > 0 ? audio.trim.end : durationMs, durationMs) + audio.offset;
  const end = Math.min(buffer.length, Math.round(endMs * rate / 1000));
  const frames = Math.max(0, end - start);
  if (frames === 0) throw new Error('The selected audio range is empty. Check the audio trim and offset.');
  const channels = buffer.numberOfChannels, bytesPerFrame = channels * 4;
  const pcmBytes = frames * bytesPerFrame;
  const data = new ArrayBuffer(44 + pcmBytes);
  const view = new DataView(data);
  const string = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  string(0, 'RIFF'); view.setUint32(4, 36 + pcmBytes, true); string(8, 'WAVE');
  string(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 3, true); // IEEE float PCM
  view.setUint16(22, channels, true); view.setUint32(24, rate, true);
  view.setUint32(28, rate * bytesPerFrame, true); view.setUint16(32, bytesPerFrame, true);
  view.setUint16(34, 32, true); string(36, 'data'); view.setUint32(40, pcmBytes, true);
  const source = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      view.setFloat32(44 + frame * bytesPerFrame + channel * 4, source[channel][start + frame] * audio.volume, true);
    }
  }
  return new Blob([data], { type: 'audio/wav' });
}
