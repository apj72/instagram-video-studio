import { describe, expect, it } from 'vitest';
import { flacDurationMs } from '../../src/audio/flac.ts';

describe('FLAC stream duration', () => {
  it('uses STREAMINFO sample count and sample rate', () => {
    const header = new Uint8Array(42);
    header.set([0x66, 0x4c, 0x61, 0x43, 0x80, 0, 0, 34]);
    const sampleRate = 44100;
    const samples = 88201;
    header[18] = sampleRate >> 12;
    header[19] = (sampleRate >> 4) & 0xff;
    header[20] = (sampleRate & 0x0f) << 4;
    header[21] = (samples / 0x100000000) & 0x0f;
    header[22] = (samples >>> 24) & 0xff;
    header[23] = (samples >>> 16) & 0xff;
    header[24] = (samples >>> 8) & 0xff;
    header[25] = samples & 0xff;
    expect(flacDurationMs(header)).toBeCloseTo(samples / sampleRate * 1000, 9);
  });

  it('ignores files without FLAC STREAMINFO', () => {
    expect(flacDurationMs(new Uint8Array(42))).toBeNull();
  });
});
