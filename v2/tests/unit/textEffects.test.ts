import { describe, expect, it } from 'vitest';
import { drawHeadlineLine } from '../../src/render/textEffects.ts';

describe('headline text effects', () => {
  it('draws the stacked colors behind the main fill in order', () => {
    const fills: Array<{ text: string; x: number; y: number; color: string }> = [];
    const strokes: Array<{ x: number; y: number; color: string }> = [];
    const ctx = {
      save() {}, restore() {}, lineJoin: 'miter', lineWidth: 0, strokeStyle: '', fillStyle: '',
      strokeText(_text: string, x: number, y: number) { strokes.push({ x, y, color: this.strokeStyle }); },
      fillText(text: string, x: number, y: number) { fills.push({ text, x, y, color: this.fillStyle }); },
    } as unknown as CanvasRenderingContext2D;

    drawHeadlineLine(ctx, 'MIX', 100, 200, '#FFFFFF', {
      mode: 'stacked', outlineColor: '#000000', outlineWidth: 12,
      offset: 7, midColor: '#FF7A1A', backColor: '#FF2E93',
    });

    expect(fills).toEqual([
      { text: 'MIX', x: 114, y: 214, color: '#FF2E93' },
      { text: 'MIX', x: 107, y: 207, color: '#FF7A1A' },
      { text: 'MIX', x: 100, y: 200, color: '#FFFFFF' },
    ]);
    expect(strokes).toHaveLength(3);
    expect(strokes.every(stroke => stroke.color === '#000000')).toBe(true);
  });
});
