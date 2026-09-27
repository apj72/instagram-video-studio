import type { TextLayer } from '../core/schema.ts';

export function drawHeadlineLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fillColor: string,
  effect: NonNullable<TextLayer['headlineEffect']>,
) {
  const offset = Math.max(0, effect.offset);
  const passes = effect.mode === 'stacked'
    ? [{ x: x + offset * 2, y: y + offset * 2, color: effect.backColor },
      { x: x + offset, y: y + offset, color: effect.midColor },
      { x, y, color: fillColor }]
    : [{ x, y, color: fillColor }];

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = effect.outlineColor;
  ctx.lineWidth = Math.max(0, effect.outlineWidth);
  for (const pass of passes) {
    if (ctx.lineWidth > 0) ctx.strokeText(text, pass.x, pass.y);
    ctx.fillStyle = pass.color;
    ctx.fillText(text, pass.x, pass.y);
  }
  ctx.restore();
}
