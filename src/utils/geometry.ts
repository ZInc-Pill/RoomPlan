import { Point } from '../types';

/**
 * Calculates the absolute area of a polygon defined by a set of points.
 * Returns the area in square pixels.
 */
export const calculatePolygonArea = (pts: Point[]): number => {
  if (pts.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    let j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
};

/**
 * Calculates the perimeter length of a polygon in pixels.
 */
export const calculatePolygonPerimeter = (pts: Point[]): number => {
  if (pts.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < pts.length; i++) {
    const next = pts[(i + 1) % pts.length];
    perimeter += Math.hypot(next.x - pts[i].x, next.y - pts[i].y);
  }
  return perimeter;
};

/**
 * Finds the geometric centroid of a polygon.
 */
export const getPolygonCentroid = (pts: Point[]): Point => {
  if (pts.length === 0) return { x: 0, y: 0 };
  let x = 0, y = 0;
  pts.forEach(p => { x += p.x; y += p.y; });
  return { x: x / pts.length, y: y / pts.length };
};

/**
 * Calculates the shortest distance from a point to a line segment,
 * and returns the distance and the closest point on that segment.
 */
export const pointToLineSegmentDistance = (x: number, y: number, x1: number, y1: number, x2: number, y2: number): { dist: number, closestPt: Point } => {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) param = dot / len_sq;

  let xx, yy;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }

  const dx = x - xx;
  const dy = y - yy;
  return { dist: Math.sqrt(dx * dx + dy * dy), closestPt: { x: xx, y: yy } };
};

export interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
  w: number;
  d: number;
}

/**
 * Calculates the axis-aligned bounding box (AABB) for an object at any rotation.
 * Accurately supports 0°, 90°, 180°, 270° and arbitrary rotation angles.
 */
export const getBoundingBox = (
  x: number,
  y: number,
  width: number,
  depth: number,
  rotationRads: number
): BoundingBox => {
  const cos = Math.abs(Math.cos(rotationRads));
  const sin = Math.abs(Math.sin(rotationRads));

  // Guard against minute floating-point inaccuracies for cardinal angles
  const w = cos < 1e-9 ? depth : (sin < 1e-9 ? width : width * cos + depth * sin);
  const d = cos < 1e-9 ? width : (sin < 1e-9 ? depth : width * sin + depth * cos);

  return {
    left: x - w / 2,
    right: x + w / 2,
    top: y - d / 2,
    bottom: y + d / 2,
    w,
    d
  };
};

/**
 * Projects a box's extent along a normalized direction vector.
 * Useful for finding intersection boundaries from the center of a box.
 */
export const calculateBoxRadiusAlongVector = (w: number, d: number, nx: number, ny: number): number => {
  return Math.abs(nx * (w / 2)) + Math.abs(ny * (d / 2));
};

/**
 * Calculates the Euclidean distance between two points.
 */
export const pointDistance = (pt1: Point, pt2: Point): number => {
  return Math.hypot(pt2.x - pt1.x, pt2.y - pt1.y);
};

/**
 * Calculates the length of a vector given by dx, dy.
 */
export const vectorLength = (dx: number, dy: number): number => {
  return Math.hypot(dx, dy);
};

