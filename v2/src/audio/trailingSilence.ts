const SILENCE_THRESHOLD = 10 ** (-50 / 20);
const MIN_TRAILING_SILENCE_MS = 250;

/** Return the end of audible samples only when there is a clear silent tail. */
export function audibleEndMs(channels: Float32Array[], sampleRate: number, sourceDurationMs: number): number {
  if (channels.length === 0 || sampleRate <= 0 || sourceDurationMs <= 0) return sourceDurationMs;
  const limit = Math.min(channels[0].length, Math.round(sourceDurationMs / 1000 * sampleRate));
  for (let sample = limit - 1; sample >= 0; sample--) {
    if (channels.some(channel => Math.abs(channel[sample]) > SILENCE_THRESHOLD)) {
      const endMs = (sample + 1) / sampleRate * 1000;
      return sourceDurationMs - endMs >= MIN_TRAILING_SILENCE_MS ? endMs : sourceDurationMs;
    }
  }
  return sourceDurationMs;
}
