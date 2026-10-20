import type { TextLayer } from '../core/schema.ts';

/**
 * Left edge of a text layer's background or border box.
 *
 * The renderer and the editor's selection bounds both need this, and they drifted apart once:
 * the renderer centred every box while the editor placed it against the text's alignment.
 */
export function textBoxLeft(align: TextLayer['textAlign'], centreX: number, boxWidth: number, padX: number): number {
  if (align === 'left') return centreX - padX;
  if (align === 'right') return centreX - boxWidth + padX;
  return centreX - boxWidth / 2;
}
