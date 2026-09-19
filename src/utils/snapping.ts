import { Point, Wall } from '../types';
import { BoundingBox } from './geometry';

/**
 * Explicit default snapping thresholds (in WORLD units).
 * With WORLD_SCALE.PX_PER_METER = 40, 15 world units = 0.375m (37.5cm).
 */
export const SNAP_THRESHOLDS = {
  ITEM_TO_ITEM: 15,
} as const;

export interface SnapCandidate {
  point: Point;
  type: 'grid' | 'object-edge' | 'object-center';
  distance: number;
}

export interface SmartSnapCandidate {
  offset: number;
  score: number;
  type: 'wall' | 'object-edge' | 'object-center' | 'grid';
  targetValue: number;
}

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  guideX: number | null;
  guideY: number | null;
}

/**
 * Snaps a single coordinate to the nearest grid line in world coordinates.
 */
export const snapCoordinateToGrid = (coord: number, gridSize: number): number => {
  return Math.round(coord / gridSize) * gridSize;
};

/**
 * Snaps a delta displacement to the nearest grid step.
 * Useful when dragging whole groups, walls, or floors by grid increments.
 */
export const snapDeltaToGrid = (delta: number, gridSize: number): number => {
  return Math.round(delta / gridSize) * gridSize;
};

/**
 * Snaps a 2D world point to the active grid.
 */
export const snapPointToGrid = (pt: Point, gridSize: number): Point => {
  return {
    x: snapCoordinateToGrid(pt.x, gridSize),
    y: snapCoordinateToGrid(pt.y, gridSize),
  };
};

/**
 * Finds the optimal 1D snap coordinate for an object on the grid.
 * Evaluates candidate alignment for:
 * 1. Object center aligned to grid line
 * 2. Object left/top edge aligned to grid line
 * 3. Object right/bottom edge aligned to grid line
 * Chooses the one with minimal shift.
 */
export const get1DSnapCoordinate = (center: number, size: number, gridSize: number): number => {
  const cSnap = Math.round(center / gridSize) * gridSize;
  const lSnap = Math.round((center - size / 2) / gridSize) * gridSize + size / 2;
  const rSnap = Math.round((center + size / 2) / gridSize) * gridSize - size / 2;

  const dxC = Math.abs(cSnap - center);
  const dxL = Math.abs(lSnap - center);
  const dxR = Math.abs(rSnap - center);

  if (dxL <= dxC && dxL <= dxR) return lSnap;
  if (dxR <= dxC && dxR <= dxL) return rSnap;
  return cSnap;
};

/**
 * Scores a candidate based on distance and type.
 * Lower score is better.
 */
function createCandidate(
  offset: number, 
  targetValue: number, 
  type: SmartSnapCandidate['type'], 
  activeSnapValue: number | null,
  releaseThreshold: number
): SmartSnapCandidate {
  const distance = Math.abs(offset) * (18 / releaseThreshold);
  let score = distance;

  // Type-based penalties (lower is better)
  if (type === 'wall') {
    score += 0;
  } else if (type === 'object-edge') {
    score += 2;
  } else if (type === 'object-center') {
    score += 4;
  } else if (type === 'grid') {
    score += 15; // Grid is lowest priority compared to nearby objects
  }

  // Hysteresis: strongly prefer staying snapped to the currently active line if within release threshold
  if (activeSnapValue !== null && Math.abs(targetValue - activeSnapValue) < 0.1) {
    if (Math.abs(offset) <= releaseThreshold) {
      score -= 8; // Modest preference for a stable target
    }
  }

  return { offset, score, type, targetValue };
}

/**
 * Generates alignment shift candidates (offsets) between a moving item's bounding box
 * and an existing target item's bounding box.
 */
export const generateItemAlignmentOffsets = (
  movingBounds: BoundingBox,
  movingCenter: Point,
  targetBounds: BoundingBox,
  targetCenter: Point
): { xOffsets: number[]; yOffsets: number[] } => {
  const xOffsets = [
    targetBounds.right - movingBounds.left,   // moving left edge flush to target right edge
    targetBounds.left - movingBounds.right,   // moving right edge flush to target left edge
    targetBounds.left - movingBounds.left,    // left-to-left edge align
    targetBounds.right - movingBounds.right,  // right-to-right edge align
    targetCenter.x - movingCenter.x           // center-to-center align
  ];
  const yOffsets = [
    targetBounds.bottom - movingBounds.top,   // moving top edge flush to target bottom edge
    targetBounds.top - movingBounds.bottom,   // moving bottom edge flush to target top edge
    targetBounds.top - movingBounds.top,      // top-to-top edge align
    targetBounds.bottom - movingBounds.bottom,// bottom-to-bottom edge align
    targetCenter.y - movingCenter.y           // center-to-center align
  ];
  return { xOffsets, yOffsets };
};

/**
 * Deterministically selects the best offset from a set of candidates within a threshold.
 * Selects candidate with the smallest absolute displacement.
 */
export const selectBestOffset = (offsets: number[], threshold: number): number | null => {
  let bestOffset: number | null = null;
  let minAbs = threshold;

  for (const offset of offsets) {
    const abs = Math.abs(offset);
    if (abs < minAbs) {
      minAbs = abs;
      bestOffset = offset;
    }
  }

  return bestOffset;
};

/**
 * Calculates the smartly snapped position for an item.
 * Evaluates candidates (walls, objects, grid) using a scoring system.
 */
export const calculateItemSnap = (
  rawPt: Point,
  itemBounds: BoundingBox,
  otherItemsBounds: BoundingBox[],
  otherItemsCenters: Point[],
  walls: Wall[],
  gridSize: number,
  zoom: number,
  activeSnapX: number | null = null,
  activeSnapY: number | null = null,
  isFreeMove: boolean = false
): SnapResult => {
  if (isFreeMove) {
    return {
      x: rawPt.x,
      y: rawPt.y,
      snappedX: false,
      snappedY: false,
      guideX: null,
      guideY: null
    };
  }

  const { w, d } = itemBounds;
  
  // Screen-space thresholds with world-space caps prevent long pulls when zoomed out.
  const snapThreshold = Math.min(12 / Math.max(zoom, 0.05), 20);
  const releaseThreshold = Math.min(18 / Math.max(zoom, 0.05), 30); // Hysteresis threshold

  const candidatesX: SmartSnapCandidate[] = [];
  const candidatesY: SmartSnapCandidate[] = [];

  // 1. Grid Candidates
  const gridSnapX = get1DSnapCoordinate(rawPt.x, w, gridSize);
  const gridSnapY = get1DSnapCoordinate(rawPt.y, d, gridSize);
  
  // Return the actual edge or centre that lands on a grid line.
  const gridGuide = (center: number, size: number) => {
    const positions = [center - size / 2, center + size / 2, center];
    return positions.reduce((best, value) => Math.abs(value / gridSize - Math.round(value / gridSize)) < Math.abs(best / gridSize - Math.round(best / gridSize)) ? value : best);
  };
  const gridGuideX = gridGuide(gridSnapX, w);
  const gridGuideY = gridGuide(gridSnapY, d);

  if (Math.abs(gridSnapX - rawPt.x) <= releaseThreshold) {
    candidatesX.push(createCandidate(gridSnapX - rawPt.x, gridGuideX, 'grid', activeSnapX, releaseThreshold));
  }
  if (Math.abs(gridSnapY - rawPt.y) <= releaseThreshold) {
    candidatesY.push(createCandidate(gridSnapY - rawPt.y, gridGuideY, 'grid', activeSnapY, releaseThreshold));
  }

  // 2. Object Candidates
  for (let i = 0; i < otherItemsBounds.length; i++) {
    const tb = otherItemsBounds[i];
    const tc = otherItemsCenters[i];
    
    // Only nearby objects attract; alignment across the room is surprising on touch.
    const nearbyY = itemBounds.bottom >= tb.top - releaseThreshold && itemBounds.top <= tb.bottom + releaseThreshold;
    const nearbyX = itemBounds.right >= tb.left - releaseThreshold && itemBounds.left <= tb.right + releaseThreshold;
    if (nearbyY) {
    // X alignments
    candidatesX.push(createCandidate(tb.right - itemBounds.left, tb.right, 'object-edge', activeSnapX, releaseThreshold));
    candidatesX.push(createCandidate(tb.left - itemBounds.right, tb.left, 'object-edge', activeSnapX, releaseThreshold));
    candidatesX.push(createCandidate(tb.left - itemBounds.left, tb.left, 'object-edge', activeSnapX, releaseThreshold));
    candidatesX.push(createCandidate(tb.right - itemBounds.right, tb.right, 'object-edge', activeSnapX, releaseThreshold));
    candidatesX.push(createCandidate(tc.x - rawPt.x, tc.x, 'object-center', activeSnapX, releaseThreshold));

    }
    if (nearbyX) {
    // Y alignments
    candidatesY.push(createCandidate(tb.bottom - itemBounds.top, tb.bottom, 'object-edge', activeSnapY, releaseThreshold));
    candidatesY.push(createCandidate(tb.top - itemBounds.bottom, tb.top, 'object-edge', activeSnapY, releaseThreshold));
    candidatesY.push(createCandidate(tb.top - itemBounds.top, tb.top, 'object-edge', activeSnapY, releaseThreshold));
    candidatesY.push(createCandidate(tb.bottom - itemBounds.bottom, tb.bottom, 'object-edge', activeSnapY, releaseThreshold));
    candidatesY.push(createCandidate(tc.y - rawPt.y, tc.y, 'object-center', activeSnapY, releaseThreshold));
    }
  }

  // 3. Wall Candidates
  for (const wall of walls) {
    const wx1 = wall.start.x, wy1 = wall.start.y;
    const wx2 = wall.end.x, wy2 = wall.end.y;
    const thickness = wall.thickness || 8;
    const halfThick = thickness / 2;

    // Check if wall is orthogonal
    if (Math.abs(wx1 - wx2) < 0.1) {
      // Vertical wall
      const minY = Math.min(wy1, wy2);
      const maxY = Math.max(wy1, wy2);
      // Only snap if we are vertically within the wall's extent
      if (itemBounds.bottom > minY - snapThreshold && itemBounds.top < maxY + snapThreshold) {
        const leftEdge = wx1 - halfThick;
        const rightEdge = wx1 + halfThick;
        
        candidatesX.push(createCandidate(leftEdge - itemBounds.right, leftEdge, 'wall', activeSnapX, releaseThreshold));
        candidatesX.push(createCandidate(rightEdge - itemBounds.left, rightEdge, 'wall', activeSnapX, releaseThreshold));
      }
    } else if (Math.abs(wy1 - wy2) < 0.1) {
      // Horizontal wall
      const minX = Math.min(wx1, wx2);
      const maxX = Math.max(wx1, wx2);
      // Only snap if we are horizontally within the wall's extent
      if (itemBounds.right > minX - snapThreshold && itemBounds.left < maxX + snapThreshold) {
        const topEdge = wy1 - halfThick;
        const bottomEdge = wy1 + halfThick;
        
        candidatesY.push(createCandidate(topEdge - itemBounds.bottom, topEdge, 'wall', activeSnapY, releaseThreshold));
        candidatesY.push(createCandidate(bottomEdge - itemBounds.top, bottomEdge, 'wall', activeSnapY, releaseThreshold));
      }
    }
  }

  // Choose best candidates within threshold
  let bestX: SmartSnapCandidate | null = null;
  let bestY: SmartSnapCandidate | null = null;

  for (const c of candidatesX) {
    if (Math.abs(c.offset) <= snapThreshold || (activeSnapX !== null && Math.abs(c.targetValue - activeSnapX) < 0.1 && Math.abs(c.offset) <= releaseThreshold)) {
      if (!bestX || c.score < bestX.score) bestX = c;
    }
  }

  for (const c of candidatesY) {
    if (Math.abs(c.offset) <= snapThreshold || (activeSnapY !== null && Math.abs(c.targetValue - activeSnapY) < 0.1 && Math.abs(c.offset) <= releaseThreshold)) {
      if (!bestY || c.score < bestY.score) bestY = c;
    }
  }

  return {
    x: bestX ? rawPt.x + bestX.offset : rawPt.x,
    y: bestY ? rawPt.y + bestY.offset : rawPt.y,
    snappedX: bestX !== null,
    snappedY: bestY !== null,
    guideX: bestX ? bestX.targetValue : null,
    guideY: bestY ? bestY.targetValue : null
  };
};
