import type { Point, Wall } from '../types';

const samePoint = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) < 0.0001;

export function updateConnectedWall(walls: Wall[], id: string, updates: Partial<Wall>): Wall[] {
  const wall = walls.find(w => w.id === id);
  if (!wall) return walls;
  const changes = (['start', 'end'] as const).filter(key => updates[key] && !samePoint(wall[key], updates[key]!)).map(key => ({ from: wall[key], to: updates[key]! }));
  const connected = changes.length ? moveConnectedWallPoints(walls, changes) : walls;
  if (changes.length && connected === walls) return walls;
  return connected.map(current => current.id === id ? { ...current, ...updates, id: current.id } : current);
}

/** Resolve connections from the gesture's original geometry, never from a moving preview. */
export function moveConnectedWallPoints(original: Wall[], changes: { from: Point; to: Point }[]): Wall[] {
  const result = original.map(wall => {
    const start = changes.find(change => samePoint(wall.start, change.from))?.to ?? wall.start;
    const end = changes.find(change => samePoint(wall.end, change.from))?.to ?? wall.end;
    return start === wall.start && end === wall.end ? wall : { ...wall, start: { ...start }, end: { ...end } };
  });
  // Reject an entire move if it collapses any affected segment.
  if (result.some((wall, i) => wall !== original[i] && Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) <= 10)) return original;
  return result;
}
