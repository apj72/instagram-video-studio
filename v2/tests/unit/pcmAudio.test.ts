import { describe, expect, it } from 'vitest';
import { exportPcmWav } from '../../src/export/pcmAudio.ts';
import { createDefaultProject } from '../../src/core/schema.ts';

function buffer(rate: number, ...channels: Float32Array[]): AudioBuffer {
  return { sampleRate: rate, length: channels[0].length, numberOfChannels: channels.length,
    getChannelData: (channel: number) => channels[channel] } as AudioBuffer;
}

describe('lossless audio export handoff', () => {
  it('preserves every sample, including deliberately silent loop boundaries', async () => {
    const left = new Float32Array([0, .25, -.25, .75, -.5, 0]);
    const right = new Float32Array([0, .125, -.125, .5, -.75, 0]);
    const wav = exportPcmWav(buffer(48000, left, right), createDefaultProject().audio, 6 / 48000 * 1000);
    const bytes = await wav.arrayBuffer(), view = new DataView(bytes);
    expect(view.getUint16(20, true)).toBe(3); // float PCM, no codec delay
    expect(view.getUint32(24, true)).toBe(48000);
    expect(view.getUint32(40, true)).toBe(6 * 2 * 4);
    for (let sample = 0; sample < left.length; sample++) {
      expect(view.getFloat32(44 + sample * 8, true)).toBe(left[sample]);
      expect(view.getFloat32(48 + sample * 8, true)).toBe(right[sample]);
    }
  });

  it('does not add a sample at fractional millisecond endpoints', async () => {
    const samples = new Float32Array(12345).fill(.25);
    const wav = exportPcmWav(buffer(44100, samples), createDefaultProject().audio, 12345 / 44100 * 1000);
    const view = new DataView(await wav.arrayBuffer());
    expect(view.getUint32(40, true) / 4).toBe(12345);
  });

  it('applies the selected source range and volume without fades or padding', async () => {
    const samples = new Float32Array([.1, .2, .3, .4, .5]);
    const audio = { ...createDefaultProject().audio, trim: { start: 1, end: 3 }, offset: 1, volume: .5 };
    const wav = exportPcmWav(buffer(1000, samples), audio, 5);
    const view = new DataView(await wav.arrayBuffer());
    expect(view.getUint32(40, true)).toBe(8);
    expect(view.getFloat32(44, true)).toBeCloseTo(.15);
    expect(view.getFloat32(48, true)).toBeCloseTo(.2);
  });
});
