import type { GroupLayer } from '../core/schema.ts';

/** Full-frame travel puts ordinary objects outside the visible canvas until their turn. */
export function getGroupEntranceOffset(group: GroupLayer, index: number, timeMs: number, width: number, height: number) {
  const entrance = group.entrance;
  if (!entrance || entrance.direction === 'none') return { x: 0, y: 0 };
  const start = entrance.startTime + index * entrance.stagger;
  const progress = Math.max(0, Math.min(1, (timeMs - start) / Math.max(1, entrance.duration)));
  const remaining = 1 - (1 - (1 - progress) ** 3);
  if (remaining === 0) return { x: 0, y: 0 };
  const reverse = entrance.alternate && index % 2 === 1 ? -1 : 1;
  switch (entrance.direction) {
    case 'left': return { x: -width * remaining * reverse, y: 0 };
    case 'right': return { x: width * remaining * reverse, y: 0 };
    case 'top': return { x: 0, y: -height * remaining * reverse };
    case 'bottom': return { x: 0, y: height * remaining * reverse };
  }
}
