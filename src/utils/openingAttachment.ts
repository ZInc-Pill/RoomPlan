import type { PlacedItem, Wall } from '../types';
import type { PlanDocument } from './documentHistory';
import { ITEM_CATALOG } from '../catalog';
import { cmToPx, pxToCm } from './coordinates';

export const isOpening = (item: PlacedItem) => ['door', 'window'].includes(ITEM_CATALOG.find(type => type.id === item.typeId)?.shape || '');

/** Joystick directions follow the host wall: left/up toward its start, right/down toward its end. */
export function nudgeOpeningAlongWall(item: PlacedItem, walls: Wall[], dx: number, dy: number): PlacedItem {
  const wall = walls.find(wall => wall.id === item.wallId);
  if (!wall || !isOpening(item)) return { ...item, x: item.x + dx, y: item.y + dy };
  const distance = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
  return placeOpening(item, wall, (item.wallOffset ?? 0) + pxToCm(distance)) ?? item;
}

export function openingValidationError(document: PlanDocument): string | null {
  const spans = new Map<string, { start: number; end: number }[]>();
  for (const item of document.items) {
    if (!item.wallId) continue;
    const wall = document.walls.find(w => w.id === item.wallId);
    const type = ITEM_CATALOG.find(t => t.id === item.typeId);
    if (!wall || !type || !isOpening(item) || !Number.isFinite(item.wallOffset)) return 'Invalid wall attachment.';
    const placed = placeOpening(item, wall, item.wallOffset!);
    if (!placed || Math.abs(placed.wallOffset! - item.wallOffset!) > 0.0001) return 'Opening does not fit inside its wall. Increase the wall size or reduce the opening.';
    if (Math.hypot(placed.x - item.x, placed.y - item.y) > 0.0001 || Math.abs(Math.sin(placed.rotation - item.rotation)) > 0.0001) return 'Opening position does not match its wall attachment.';
    const half = (item.width ?? type.width) / 2;
    const span = { start: item.wallOffset! - half, end: item.wallOffset! + half };
    const existing = spans.get(item.wallId) ?? [];
    // The current wall mesh supports side-by-side openings, not stacked cutouts.
    if (existing.some(other => span.start < other.end - 0.0001 && span.end > other.start + 0.0001)) return 'Openings cannot overlap along the same wall. Move one farther along the wall.';
    existing.push(span); spans.set(item.wallId, existing);
  }
  return null;
}

export function placeOpening(item: PlacedItem, wall: Wall, offsetCm: number): PlacedItem | null {
  const type = ITEM_CATALOG.find(type => type.id === item.typeId);
  if (!type || !isOpening(item)) return null;
  const dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy), half = cmToPx(item.width ?? type.width) / 2;
  if (length < half * 2 || length === 0 || cmToPx((item.height ?? type.height) + (item.elevation ?? 0)) > (wall.height ?? 150)) return null;
  const offset = Math.max(half, Math.min(length - half, cmToPx(offsetCm)));
  return { ...item, wallId: wall.id, wallOffset: pxToCm(offset), depth: pxToCm(wall.thickness), x: wall.start.x + dx * offset / length, y: wall.start.y + dy * offset / length, rotation: Math.atan2(dy, dx) };
}

export function attachNearestOpening(item: PlacedItem, walls: Wall[]): PlacedItem | null {
  let nearest: PlacedItem | null = null, distance = Infinity;
  for (const wall of walls) {
    const dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y, length = Math.hypot(dx, dy);
    if (!length) continue;
    const offset = ((item.x - wall.start.x) * dx + (item.y - wall.start.y) * dy) / length;
    const placed = placeOpening(item, wall, pxToCm(offset));
    if (!placed) continue;
    const gap = Math.hypot(placed.x - item.x, placed.y - item.y);
    if (gap < distance) { nearest = placed; distance = gap; }
  }
  return nearest;
}

/** Wall and opening updates are one document command and one undo step. */
export function reconcileOpenings(previous: PlanDocument, next: PlanDocument): PlanDocument {
  let invalid = false;
  const items = next.items.map(item => {
    const old = previous.items.find(i => i.id === item.id);
    const manuallyMoved = old && (old.x !== item.x || old.y !== item.y);
    // Apply wall priority only to movement, never imports, colour edits or an explicit detach.
    if (manuallyMoved && isOpening(item) && old.wallId === item.wallId) {
      const nearby = attachNearestOpening(item, next.walls);
      if (nearby && Math.hypot(nearby.x - item.x, nearby.y - item.y) <= 24) item = nearby;
    }
    if (!item.wallId) return item;
    const wall = next.walls.find(w => w.id === item.wallId);
    if (!wall) { const { wallId, wallOffset, ...detached } = item; return detached; }
    const dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y, length = Math.hypot(dx, dy);
    const offset = manuallyMoved && length ? pxToCm(((item.x - wall.start.x) * dx + (item.y - wall.start.y) * dy) / length) : item.wallOffset ?? 0;
    const placed = placeOpening(item, wall, offset);
    if (!placed) { invalid = true; return item; }
    return placed;
  });
  const result = { ...next, items };
  return invalid || openingValidationError(result) ? previous : result;
}
