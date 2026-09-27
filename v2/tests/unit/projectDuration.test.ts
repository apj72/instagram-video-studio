import { describe, expect, it } from 'vitest';
import { createDefaultProject, type BackgroundLogoLayer, type EffectLayer, type VideoLayer } from '../../src/core/schema.ts';
import { TONY_TEMPLATES } from '../../src/templates/tonyBrand.ts';
import { resizeProjectDuration, scaleProjectTimeline } from '../../src/core/projectDuration.ts';

describe('project duration from audio', () => {
  it('keeps the exact duration and extends full-length layers', () => {
    const original = createDefaultProject();
    const sourceMs = 1000 * 88201 / 44100;
    const resized = resizeProjectDuration(original, sourceMs);
    expect(resized.settings.duration).toBe(sourceMs);
    expect(resized.layers.find(layer => layer.outTime === sourceMs)).toBeDefined();
  });

  it('scales entrances, keyframes, effect times, video transitions, background motion and audio fades', () => {
    const original = TONY_TEMPLATES.find(template => template.id === 'tony-square-cover-motion')!.factory();
    const previous = original.settings.duration;
    const target = previous * 1.5;
    original.settings.backgroundMotion = { direction: 'left', startTime: 2000, duration: 1000 };
    original.audio.fadeInDuration = 800;
    const base = original.layers[0];
    const effect = { ...base, id: 'timed-effect', type: 'effect', effectType: 'blur-transition',
      config: { startTime: 2000, endTime: 9000, maxBlur: 20, speed: 3 } } as EffectLayer;
    const video = { ...base, id: 'timed-video', type: 'video', assetId: null,
      orientation: 'horizontal', thickness: 100, videoPan: 0,
      fadeInTime: 1000, fadeOutTime: 9000, fadeDuration: 500,
      slideIn: 'left', slideOut: 'right', slideInTime: 1000,
      slideInDuration: 500, slideOutTime: 9500, slideOutDuration: 400 } as VideoLayer;
    const logo = { ...base, id: 'timed-logo', type: 'background-logo', assetId: null,
      logoScale: 1, speed: 3, clockDir: 3 } as BackgroundLogoLayer;
    original.layers.push(effect, video, logo);

    const text = original.layers.find(layer => layer.type === 'text' && layer.position.x.keyframes.length > 1)!;
    if (text.type !== 'text') throw new Error('Expected a text layer.');
    text.typewriter = { enabled: true, speed: 30, cursor: false, cursorChar: '|' };
    const oldKeyframe = text.position.x.keyframes[1].time;
    const scaled = scaleProjectTimeline(original, previous, target);
    const scaledText = scaled.layers.find(layer => layer.id === text.id)!;
    const scaledEffect = scaled.layers.find(layer => layer.id === effect.id) as EffectLayer;
    const scaledVideo = scaled.layers.find(layer => layer.id === video.id) as VideoLayer;

    expect(scaled.settings.duration).toBe(target);
    expect(scaledText.position.x.keyframes[1].time).toBe(oldKeyframe * 1.5);
    if (scaledText.type !== 'text') throw new Error('Expected a text layer.');
    expect(scaledText.typewriter?.speed).toBe(20);
    expect(scaledText.outTime).toBe(target);
    expect(scaled.settings.backgroundMotion).toEqual({ direction: 'left', startTime: 3000, duration: 1500 });
    expect(scaledEffect.config).toEqual({ startTime: 3000, endTime: 13500, maxBlur: 20, speed: 2 });
    expect(scaledVideo.slideOutTime).toBe(14250);
    expect(scaledVideo.fadeDuration).toBe(750);
    expect((scaled.layers.find(layer => layer.id === logo.id) as BackgroundLogoLayer).speed).toBe(2);
    expect(scaled.audio.fadeInDuration).toBe(1200);
    expect(original.layers.find(layer => layer.id === text.id)!.position.x.keyframes[1].time).toBe(oldKeyframe);
  });

  it('can scale after audio has already extended full-length layers', () => {
    const original = createDefaultProject();
    const previous = original.settings.duration;
    const target = previous * 1.5;
    original.layers[0].opacity.keyframes.push({ time: previous / 2, value: 0.5, easing: 'linear' });
    const extended = resizeProjectDuration(original, target);
    const scaled = scaleProjectTimeline(extended, previous, target, true);
    expect(extended.layers[0].opacity.keyframes[1].time).toBe(previous / 2);
    expect(scaled.layers[0].opacity.keyframes[1].time).toBe(target / 2);
    expect(scaled.layers[0].outTime).toBe(target);
  });
});
