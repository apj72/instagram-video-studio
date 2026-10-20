import { describe, expect, it } from 'vitest';
import { videoSourceTime } from '../../src/render/videoSync.ts';
import type { VideoLayer } from '../../src/core/schema.ts';

function layer(inTime: number): VideoLayer {
  return {
    id: 'v', type: 'video', name: 'Footage', visible: true, locked: false,
    opacity: { keyframes: [{ time: 0, value: 1, easing: 'linear' }] },
    position: { x: { keyframes: [{ time: 0, value: 0.5, easing: 'linear' }] }, y: { keyframes: [{ time: 0, value: 0.5, easing: 'linear' }] } },
    scale: { x: { keyframes: [{ time: 0, value: 1, easing: 'linear' }] }, y: { keyframes: [{ time: 0, value: 1, easing: 'linear' }] } },
    rotation: { keyframes: [{ time: 0, value: 0, easing: 'linear' }] },
    inTime, outTime: 15000, blendMode: 'source-over',
    assetId: 'clip', orientation: 'vertical', thickness: 1080, videoPan: 0,
    fadeInTime: 0, fadeOutTime: 0, fadeDuration: 0,
    slideIn: 'bottom', slideOut: 'none', slideInTime: inTime, slideInDuration: 700,
    slideOutTime: 0, slideOutDuration: 0,
  };
}

describe('videoSourceTime', () => {
  it('starts the clip when the layer appears, not when the timeline does', () => {
    const l = layer(1000);
    expect(videoSourceTime(l, 15, 1000)).toBe(0);
    expect(videoSourceTime(l, 15, 3500)).toBeCloseTo(2.5, 5);
  });

  it('holds on the first frame before the layer appears', () => {
    expect(videoSourceTime(layer(1000), 15, 0)).toBe(0);
    expect(videoSourceTime(layer(1000), 15, 999)).toBe(0);
  });

  it('loops a clip shorter than the timeline', () => {
    const l = layer(0);
    expect(videoSourceTime(l, 4, 5000)).toBeCloseTo(1, 5);
    expect(videoSourceTime(l, 4, 9000)).toBeCloseTo(1, 5);
  });

  it('never lands on the very end, where decoders report the clip as finished', () => {
    expect(videoSourceTime(layer(0), 4, 4000)).toBeLessThan(4);
    expect(videoSourceTime(layer(0), 4, 8000)).toBeLessThan(4);
  });

  it('gives up safely on an asset with no usable duration', () => {
    expect(videoSourceTime(layer(0), Number.NaN, 5000)).toBe(0);
    expect(videoSourceTime(layer(0), 0, 5000)).toBe(0);
    expect(videoSourceTime(layer(0), Number.POSITIVE_INFINITY, 5000)).toBe(0);
  });
});
