export interface BackgroundPlacement {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/** Position a photo in the template frame, including zoom levels that reveal the background. */
export function getBackgroundPlacement(
  imageWidth: number,
  imageHeight: number,
  outputWidth: number,
  outputHeight: number,
  zoom: number,
  alignX: number,
  alignY: number,
): BackgroundPlacement {
  const coverScale = Math.max(outputWidth / imageWidth, outputHeight / imageHeight);
  const scale = coverScale * Math.max(0.01, zoom);
  const dw = imageWidth * scale;
  const dh = imageHeight * scale;
  // Larger photos are cropped by the frame; smaller photos can be placed inside it.
  const dx = (outputWidth - dw) * Math.max(0, Math.min(1, alignX));
  const dy = (outputHeight - dh) * Math.max(0, Math.min(1, alignY));
  return { dx, dy, dw, dh };
}
