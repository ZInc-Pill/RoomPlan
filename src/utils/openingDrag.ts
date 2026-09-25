import type { PlacedItem, Wall } from '../types';
import { attachNearestOpening, openingValidationError } from './openingAttachment';

export interface OpeningDragPreview {
  raw: PlacedItem;
  placement: PlacedItem | null;
  wall: Wall | null;
  valid: boolean;
  message: string;
}

/** Screen-space attraction and a small switching margin avoid zoom-dependent sticking. */
export function predictOpeningDrag(raw: PlacedItem, walls: Wall[], items: PlacedItem[], zoom: number, previousWallId?: string): OpeningDragPreview {
  const candidates = walls.flatMap(wall => {
    const placement = attachNearestOpening(raw, [wall]);
    if (!placement) return [];
    const distance = Math.hypot(placement.x - raw.x, placement.y - raw.y) * zoom;
    return distance <= 56 ? [{ wall, placement, distance }] : [];
  }).sort((a, b) => a.distance - b.distance);
  let target = candidates[0];
  const previous = candidates.find(candidate => candidate.wall.id === previousWallId);
  if (previous && target && previous.distance <= target.distance + 6) target = previous;
  if (!target) {
    const free = !raw.wallId && walls.length === 0;
    return { raw, placement: free ? raw : null, wall: null, valid: free, message: free ? 'Release to place freely' : 'Move closer to a wall that fits' };
  }
  const error = openingValidationError({ walls, floors: [], comments: [], items: items.map(item => item.id === raw.id ? target.placement : item) });
  return { raw, placement: target.placement, wall: target.wall, valid: !error, message: error ? 'Blocked — overlaps another opening' : 'Release to place on this wall' };
}
