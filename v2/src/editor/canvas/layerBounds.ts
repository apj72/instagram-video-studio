import type { GroupLayer, Layer } from '../../core/schema.ts';
import { getAsset } from '../../core/assets.ts';
import { evaluateProperty } from '../../timeline/interpolation.ts';
import { getGroupEntranceOffset } from '../../render/groupMotion.ts';

export interface LayerBounds { x: number; y: number; width: number; height: number }

export function transformBoundsByGroup(bounds: LayerBounds, group: GroupLayer, memberIndex: number, timeMs: number, canvas: HTMLCanvasElement): LayerBounds {
  const width = canvas.width, height = canvas.height;
  const gx = (evaluateProperty(group.position.x, timeMs) - 0.5) * width;
  const gy = (evaluateProperty(group.position.y, timeMs) - 0.5) * height;
  const sx = evaluateProperty(group.scale.x, timeMs);
  const sy = evaluateProperty(group.scale.y, timeMs);
  const angle = evaluateProperty(group.rotation, timeMs) * Math.PI * 2;
  const offset = getGroupEntranceOffset(group, memberIndex, timeMs, width, height);
  const corners = [
    [bounds.x, bounds.y], [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height], [bounds.x + bounds.width, bounds.y + bounds.height],
  ].map(([x, y]) => {
    const dx = (x - width / 2) * sx, dy = (y - height / 2) * sy;
    return [width / 2 + dx * Math.cos(angle) - dy * Math.sin(angle) + gx + offset.x,
      height / 2 + dx * Math.sin(angle) + dy * Math.cos(angle) + gy + offset.y];
  });
  const xs = corners.map(point => point[0]), ys = corners.map(point => point[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function isCanvasWideLayer(layer: Layer, canvas: HTMLCanvasElement): boolean {
  return layer.type === 'effect' || layer.type === 'background-logo' || layer.type === 'group' ||
    (layer.type === 'shape' && layer.size.width >= canvas.width * 0.95 && layer.size.height >= canvas.height * 0.95);
}

export function getLayerBounds(layer: Layer, timeMs: number, canvas: HTMLCanvasElement): LayerBounds | null {
  if (isCanvasWideLayer(layer, canvas)) return null;
  const width = canvas.width;
  const height = canvas.height;
  const cx = evaluateProperty(layer.position.x, timeMs) * width;
  const cy = evaluateProperty(layer.position.y, timeMs) * height;
  const scale = evaluateProperty(layer.scale.x, timeMs);

  if (layer.type === 'text') {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const fontSize = evaluateProperty(layer.fontSize, timeMs);
    ctx.save();
    ctx.font = `${layer.fontWeight} ${fontSize}px ${layer.fontFamily}`;
    const lines = layer.text.split('\\n');
    const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width + Math.max(0, line.length - 1) * layer.letterSpacing));
    ctx.restore();
    const padX = Math.max(layer.background.enabled ? layer.background.paddingX : 0,
      layer.border.enabled ? layer.border.paddingX : 0);
    const padY = Math.max(layer.background.enabled ? layer.background.paddingY : 0,
      layer.border.enabled ? layer.border.paddingY : 0);
    const effectPad = layer.headlineEffect ? layer.headlineEffect.outlineWidth + layer.headlineEffect.offset * 2 : 0;
    const boxWidth = textWidth + padX * 2 + effectPad * 2;
    const boxHeight = lines.length * fontSize * layer.lineHeight + padY * 2 + effectPad * 2;
    const x = layer.textAlign === 'left' ? cx - padX - effectPad
      : layer.textAlign === 'right' ? cx - boxWidth + padX + effectPad
        : cx - boxWidth / 2;
    return { x, y: cy - boxHeight / 2, width: boxWidth, height: boxHeight };
  }

  if (layer.type === 'shape') {
    const boxWidth = layer.size.width * scale;
    const boxHeight = layer.size.height * scale;
    return { x: cx - boxWidth / 2, y: cy - boxHeight / 2, width: boxWidth, height: boxHeight };
  }

  if (layer.type === 'image') {
    const image = layer.assetId ? getAsset(layer.assetId) as HTMLImageElement | undefined : undefined;
    const aspect = image?.naturalWidth && image?.naturalHeight
      ? image.naturalWidth / image.naturalHeight : layer.size.width / layer.size.height;
    const boxWidth = width * scale;
    const boxHeight = boxWidth / aspect;
    return { x: cx - boxWidth / 2, y: cy - boxHeight / 2, width: boxWidth, height: boxHeight };
  }

  const boxWidth = width * Math.max(0.1, scale);
  const boxHeight = height * 0.25;
  return { x: cx - boxWidth / 2, y: cy - boxHeight / 2, width: boxWidth, height: boxHeight };
}
