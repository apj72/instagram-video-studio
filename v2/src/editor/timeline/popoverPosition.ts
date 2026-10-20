interface Point { x: number; y: number }
interface Size { width: number; height: number }

/** Keep a fixed popover fully inside the viewport, preferring below its trigger. */
export function fitPopoverToViewport(anchor: Point, popover: Size, viewport: Size, margin = 8, gap = 6): Point {
  const maxX = Math.max(margin, viewport.width - popover.width - margin);
  const maxY = Math.max(margin, viewport.height - popover.height - margin);
  const below = anchor.y + gap;
  const above = anchor.y - popover.height - gap;
  const preferredY = below + popover.height + margin <= viewport.height ? below
    : above >= margin ? above : below;
  return {
    x: Math.max(margin, Math.min(anchor.x, maxX)),
    y: Math.max(margin, Math.min(preferredY, maxY)),
  };
}
