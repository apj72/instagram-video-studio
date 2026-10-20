import { describe, expect, it } from 'vitest';
import { textBoxLeft } from '../../src/render/textBox.ts';

describe('textBoxLeft', () => {
  it('centres the box on the anchor for centred text', () => {
    expect(textBoxLeft('center', 500, 200, 20)).toBe(400);
  });

  it('starts the box one padding before the anchor for left-aligned text', () => {
    expect(textBoxLeft('left', 500, 200, 20)).toBe(480);
  });

  it('ends the box one padding after the anchor for right-aligned text', () => {
    expect(textBoxLeft('right', 500, 200, 20) + 200).toBe(520);
  });

  it('wraps the text with equal padding on both sides whatever the alignment', () => {
    const padX = 24;
    const textWidth = 300;
    const boxWidth = textWidth + padX * 2;
    expect(textBoxLeft('left', 100, boxWidth, padX)).toBe(100 - padX);
    expect(textBoxLeft('right', 100 + textWidth, boxWidth, padX)).toBe(100 - padX);
    expect(textBoxLeft('center', 100 + textWidth / 2, boxWidth, padX)).toBe(100 - padX);
  });
});
