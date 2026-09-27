/** Read the exact FLAC stream length from STREAMINFO's sample count. */
export function flacDurationMs(header: Uint8Array): number | null {
  if (header.length < 42 || String.fromCharCode(...header.subarray(0, 4)) !== 'fLaC') return null;
  if ((header[4] & 0x7f) !== 0) return null;
  const blockLength = (header[5] << 16) | (header[6] << 8) | header[7];
  if (blockLength < 34) return null;
  const sampleRate = (header[18] << 12) | (header[19] << 4) | (header[20] >> 4);
  const samples = (header[21] & 0x0f) * 0x100000000
    + header[22] * 0x1000000 + header[23] * 0x10000 + header[24] * 0x100 + header[25];
  return sampleRate > 0 && samples > 0 ? samples / sampleRate * 1000 : null;
}
