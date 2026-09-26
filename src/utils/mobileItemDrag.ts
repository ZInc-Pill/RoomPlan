import type { PlacedItem, Point, Wall } from '../types';
import { ITEM_CATALOG } from '../catalog';
import { cmToPx } from './coordinates';
import { getBoundingBox } from './geometry';
import { isOpening, openingValidationError } from './openingAttachment';
import { predictOpeningDrag, type OpeningDragPreview } from './openingDrag';
import { calculateItemSnap } from './snapping';

export interface MobileDragSession {
  pointerId: number;
  start: Point;
  originals: PlacedItem[];
  primaryId: string;
  moved: boolean;
}

export function startMobileDrag(pointerId: number, start: Point, item: PlacedItem, items: PlacedItem[], selectedIds: string[]): MobileDragSession {
  const ids = selectedIds.includes(item.id) ? selectedIds : [item.id];
  return { pointerId, start, primaryId: item.id, originals: items.filter(item => ids.includes(item.id)).map(item => ({ ...item })), moved: false };
}

/** Absolute displacement from the immutable start avoids stale React updates and accumulated drift. */
export function moveMobileDrag(session: MobileDragSession, point: Point, zoom: number): PlacedItem[] | null {
  const dx = point.x - session.start.x, dy = point.y - session.start.y;
  if (!session.moved && Math.hypot(dx, dy) * zoom < 3) return null;
  session.moved = true;
  return session.originals.map(item => {
    const moved = { ...item, x: item.x + dx, y: item.y + dy };
    if (!isOpening(item)) return moved;
    const { wallId, wallOffset, ...detached } = moved;
    return detached;
  });
}

const bounds = (item: PlacedItem) => {
  const type = ITEM_CATALOG.find(type => type.id === item.typeId)!;
  return getBoundingBox(item.x, item.y, cmToPx(item.width ?? type.width), cmToPx(item.depth ?? type.depth), item.rotation);
};

export function resolveMobileDrop(raw: PlacedItem[], items: PlacedItem[], walls: Wall[], zoom: number, grid: number, free: boolean): { items: PlacedItem[]; preview: OpeningDragPreview | null } {
  const ids = new Set(raw.map(item => item.id));
  const replace = (changes: PlacedItem[]) => {
    const byId = new Map(changes.map(item => [item.id, item]));
    return items.map(item => byId.get(item.id) ?? item);
  };
  if (raw.length === 1 && isOpening(raw[0])) {
    const preview = predictOpeningDrag(raw[0], walls, replace(raw), zoom, undefined, 32, true);
    // Occupied/undersized walls never block free placement or make the object jump back.
    return { items: replace([preview.valid && preview.placement ? preview.placement : raw[0]]), preview };
  }
  // Mixed groups preserve their shape and detach openings rather than snapping members independently.
  if (free || raw.some(isOpening)) return { items: replace(raw), preview: null };
  const boxes = raw.map(bounds);
  const left = Math.min(...boxes.map(box => box.left)), right = Math.max(...boxes.map(box => box.right));
  const top = Math.min(...boxes.map(box => box.top)), bottom = Math.max(...boxes.map(box => box.bottom));
  const center = { x: (left + right) / 2, y: (top + bottom) / 2 };
  const others = items.filter(item => !ids.has(item.id));
  const snap = calculateItemSnap(center, { left, right, top, bottom, w: right - left, d: bottom - top }, others.map(bounds), others.map(item => ({ x: item.x, y: item.y })), walls, grid, zoom, null, null, false);
  const result = replace(raw.map(item => ({ ...item, x: item.x + snap.x - center.x, y: item.y + snap.y - center.y })));
  return { items: openingValidationError({ items: result, walls, floors: [], comments: [] }) ? replace(raw) : result, preview: null };
}
