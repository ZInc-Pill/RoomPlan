import type { PlacedItem, Point } from '../types';
import { cmToPx, pxToCm } from './coordinates';
import { snapPointToGrid } from './snapping';

/** Corner is the local top-left; arms extend along the item's local X and Y axes. */
export function cornerRailingPoints(item: PlacedItem): [Point, Point, Point] {
  const w = cmToPx(item.width ?? 100), d = cmToPx(item.depth ?? 100);
  const transform = (x: number, y: number) => ({ x: item.x + x * Math.cos(item.rotation) - y * Math.sin(item.rotation), y: item.y + x * Math.sin(item.rotation) + y * Math.cos(item.rotation) });
  return [transform(-w / 2, -d / 2), transform(w / 2, -d / 2), transform(-w / 2, d / 2)];
}

export function resizeCornerRailing(item: PlacedItem, arm: 0 | 1, pointer: Point, gridSize: number, free = false): PlacedItem {
  const [corner] = cornerRailingPoints(item);
  const cos = Math.cos(item.rotation), sin = Math.sin(item.rotation);
  const dx = pointer.x - corner.x, dy = pointer.y - corner.y;
  const projected = arm === 0 ? dx * cos + dy * sin : -dx * sin + dy * cos;
  const length = Math.max(cmToPx(10), free ? projected : Math.round(projected / gridSize) * gridSize);
  const w = arm === 0 ? length : cmToPx(item.width ?? 100);
  const d = arm === 1 ? length : cmToPx(item.depth ?? 100);
  return { ...item, width: pxToCm(w), depth: pxToCm(d), x: corner.x + w / 2 * cos - d / 2 * sin, y: corner.y + w / 2 * sin + d / 2 * cos };
}

export function railingEndpoints(item: PlacedItem): [Point, Point] {
  const half = cmToPx(item.width ?? 100) / 2;
  const dx = Math.cos(item.rotation) * half, dy = Math.sin(item.rotation) * half;
  return [{ x: item.x - dx, y: item.y - dy }, { x: item.x + dx, y: item.y + dy }];
}

export function resizeRailing(item: PlacedItem, endpoint: 0 | 1, pointer: Point, gridSize: number, free = false): PlacedItem {
  const ends = railingEndpoints(item);
  ends[endpoint] = free ? pointer : snapPointToGrid(pointer, gridSize);
  const [start, end] = ends;
  const dx = end.x - start.x, dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  // Keep a usable segment rather than flipping through a zero-length element.
  if (length < cmToPx(10)) return item;
  return { ...item, x: (start.x + end.x) / 2, y: (start.y + end.y) / 2, width: pxToCm(length), rotation: Math.atan2(dy, dx) };
}
