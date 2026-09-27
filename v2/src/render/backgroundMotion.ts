import type { ProjectSettings } from '../core/schema.ts';

/** Full-canvas translation of the background photo at a given project time. */
export function getBackgroundSlideOffset(
  motion: ProjectSettings['backgroundMotion'], timeMs: number, width: number, height: number,
): { x: number; y: number } {
  if (!motion || motion.direction === 'none') return { x: 0, y: 0 };

  const duration = Math.max(1, motion.duration);
  const progress = Math.max(0, Math.min(1, (timeMs - motion.startTime) / duration));
  if (progress === 1) return { x: 0, y: 0 };
  const remaining = (1 - progress) ** 3; // ease out cubic, expressed as distance remaining
  switch (motion.direction) {
    case 'top': return { x: 0, y: -height * remaining };
    case 'bottom': return { x: 0, y: height * remaining };
    case 'left': return { x: -width * remaining, y: 0 };
    case 'right': return { x: width * remaining, y: 0 };
  }
}
