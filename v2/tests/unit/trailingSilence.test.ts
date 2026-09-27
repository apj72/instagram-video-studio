import { describe, expect, it } from 'vitest';
import { audibleEndMs } from '../../src/audio/trailingSilence.ts';

describe('audio silent tail', () => {
  it('finds audible end when a file has a substantial silent tail', () => {
    const samples = new Float32Array(2000);
    samples[1523] = 0.1;
    expect(audibleEndMs([samples], 1000, 2000)).toBe(1524);
  });

  it('keeps the source length when the tail is short or low-level audio continues', () => {
    const samples = new Float32Array(2000);
    samples[1900] = 0.1;
    expect(audibleEndMs([samples], 1000, 2000)).toBe(2000);
    samples[1800] = 0.004;
    expect(audibleEndMs([samples], 1000, 2000)).toBe(2000);
  });
});
