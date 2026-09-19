import { Wall, PlacedItem, Point } from '../types';
import { ITEM_CATALOG } from '../catalog';
import { cmToPx } from './coordinates';

export function getWallHoles(wall: Wall, items: PlacedItem[]): { t1: number, t2: number, item: PlacedItem }[] {
  const holes: { t1: number, t2: number, item: PlacedItem }[] = [];
  
  const wx = wall.end.x - wall.start.x;
  const wy = wall.end.y - wall.start.y;
  const wallLen = Math.hypot(wx, wy);
  if (wallLen === 0) return holes;

  const wxNorm = wx / wallLen;
  const wyNorm = wy / wallLen;

  items.forEach(item => {
    const typeInfo = ITEM_CATALOG.find(i => i.id === item.typeId);
    if (!typeInfo || (typeInfo.shape !== 'door' && typeInfo.shape !== 'window')) return;
    
    if (item.wallId && item.wallId !== wall.id) return;
    const vx = item.x - wall.start.x;
    const vy = item.y - wall.start.y;
    
    const proj = vx * wxNorm + vy * wyNorm;
    const perp = Math.abs(vx * (-wyNorm) + vy * wxNorm);
    
    if (perp < wall.thickness / 2 + 10 && proj > 0 && proj < wallLen) {
      const width = cmToPx(item.width || typeInfo.width);
      let hStart = (proj - width / 2) / wallLen;
      let hEnd = (proj + width / 2) / wallLen;
      holes.push({ t1: Math.max(0, hStart), t2: Math.min(1, hEnd), item });
    }
  });

  return holes.sort((a, b) => a.t1 - b.t1);
}

export function getWallSegments(wall: Wall, items: PlacedItem[]): { start: Point, end: Point }[] {
  const segments: { start: Point, end: Point }[] = [];
  
  const holes = getWallHoles(wall, items);
  
  const wx = wall.end.x - wall.start.x;
  const wy = wall.end.y - wall.start.y;
  const wallLen = Math.hypot(wx, wy);
  if (wallLen === 0) return [{ start: wall.start, end: wall.end }];
  
  // Merge holes for segment rendering
  const mergedHoles: { t1: number, t2: number }[] = [];
  holes.forEach(h => {
    if (mergedHoles.length === 0) {
      mergedHoles.push({ t1: h.t1, t2: h.t2 });
    } else {
      const last = mergedHoles[mergedHoles.length - 1];
      if (h.t1 <= last.t2) {
        last.t2 = Math.max(last.t2, h.t2);
      } else {
        mergedHoles.push({ t1: h.t1, t2: h.t2 });
      }
    }
  });

  let currentT = 0;
  mergedHoles.forEach(h => {
    if (h.t1 > currentT) {
      segments.push({
        start: { x: wall.start.x + wx * currentT, y: wall.start.y + wy * currentT },
        end: { x: wall.start.x + wx * h.t1, y: wall.start.y + wy * h.t1 }
      });
    }
    currentT = Math.max(currentT, h.t2);
  });

  if (currentT < 1) {
    segments.push({
      start: { x: wall.start.x + wx * currentT, y: wall.start.y + wy * currentT },
      end: wall.end
    });
  }

  return segments;
}
