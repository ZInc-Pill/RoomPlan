import assert from 'node:assert';
import {
  MIN_WALL_LENGTH,
  DEFAULT_WALL_THICKNESS,
  createWall,
  moveWall,
  moveWallNode,
  calculateOrthogonalPoint,
  isMinimumWallLength,
} from '../src/hooks/useWallInteraction';
import { Wall, Point } from '../src/types';
import { snapPointToGrid, snapDeltaToGrid } from '../src/utils/snapping';
import { vectorLength } from '../src/utils/geometry';

console.log('--- TEST 1: Wall Creation & Minimum Length Threshold ---');

const ptA: Point = { x: 100, y: 100 };
const ptShort: Point = { x: 105, y: 100 }; // dist = 5 (< 10)
const ptExact10: Point = { x: 110, y: 100 }; // dist = 10 (not > 10)
const ptValid: Point = { x: 150, y: 100 }; // dist = 50 (> 10)

assert.strictEqual(isMinimumWallLength(ptA, ptShort, MIN_WALL_LENGTH), false, 'Dist 5 should be rejected');
assert.strictEqual(isMinimumWallLength(ptA, ptExact10, MIN_WALL_LENGTH), false, 'Dist 10 should be rejected');
assert.strictEqual(isMinimumWallLength(ptA, ptValid, MIN_WALL_LENGTH), true, 'Dist 50 should be accepted');

const newWall = createWall(ptA, ptValid, 12);
assert(typeof newWall.id === 'string' && newWall.id.length > 0, 'Wall should have generated id');
assert.deepStrictEqual(newWall.start, ptA, 'Start point matches');
assert.deepStrictEqual(newWall.end, ptValid, 'End point matches');
assert.strictEqual(newWall.thickness, 12, 'Thickness matches');

const defaultWall = createWall(ptA, ptValid);
assert.strictEqual(defaultWall.thickness, DEFAULT_WALL_THICKNESS, 'Default thickness is 8');
console.log('✅ PASSED: Wall creation & min-length thresholds verified');

console.log('--- TEST 2: Wall Segment Translation (Length, Angle & Thickness Invariant) ---');

const initialWall: Wall = {
  id: 'wall-1',
  start: { x: 200, y: 150 },
  end: { x: 350, y: 270 }, // dx = 150, dy = 120
  thickness: 8,
};

const initialLength = vectorLength(
  initialWall.end.x - initialWall.start.x,
  initialWall.end.y - initialWall.start.y
);
const initialAngle = Math.atan2(
  initialWall.end.y - initialWall.start.y,
  initialWall.end.x - initialWall.start.x
);

// Translate by dx = 40, dy = -60
const translatedWall = moveWall(initialWall, 40, -60);
assert.deepStrictEqual(translatedWall.start, { x: 240, y: 90 }, 'Start point translated');
assert.deepStrictEqual(translatedWall.end, { x: 390, y: 210 }, 'End point translated');
assert.strictEqual(translatedWall.thickness, 8, 'Thickness remains 8');

const newLength = vectorLength(
  translatedWall.end.x - translatedWall.start.x,
  translatedWall.end.y - translatedWall.start.y
);
const newAngle = Math.atan2(
  translatedWall.end.y - translatedWall.start.y,
  translatedWall.end.x - translatedWall.start.x
);

assert(Math.abs(newLength - initialLength) < 1e-9, 'Wall length must be strictly invariant during segment translation');
assert(Math.abs(newAngle - initialAngle) < 1e-9, 'Wall angle must be strictly invariant during segment translation');
console.log('✅ PASSED: Wall translation preserves length, angle, and thickness');

console.log('--- TEST 3: Wall Endpoint (Node) Movement ---');

// Move start node
const startMoved = moveWallNode(initialWall, 'start', { x: 180, y: 120 });
assert.deepStrictEqual(startMoved.start, { x: 180, y: 120 }, 'Start node updated');
assert.deepStrictEqual(startMoved.end, initialWall.end, 'End node unchanged');
assert.strictEqual(startMoved.thickness, initialWall.thickness, 'Thickness unchanged');

// Move end node
const endMoved = moveWallNode(initialWall, 'end', { x: 400, y: 300 });
assert.deepStrictEqual(endMoved.end, { x: 400, y: 300 }, 'End node updated');
assert.deepStrictEqual(endMoved.start, initialWall.start, 'Start node unchanged');
assert.strictEqual(endMoved.thickness, initialWall.thickness, 'Thickness unchanged');
console.log('✅ PASSED: Endpoint manipulation correctly isolates modified node');

console.log('--- TEST 4: Orthogonal Snapping Constraint ---');

const origin: Point = { x: 100, y: 100 };
// Pointer at (180, 120): |dx|=80, |dy|=20 => should constrain to horizontal (180, 100)
const horiz = calculateOrthogonalPoint(origin, { x: 180, y: 120 });
assert.deepStrictEqual(horiz, { x: 180, y: 100 }, 'Constrained horizontally when |dx| > |dy|');

// Pointer at (110, 200): |dx|=10, |dy|=100 => should constrain to vertical (100, 200)
const vert = calculateOrthogonalPoint(origin, { x: 110, y: 200 });
assert.deepStrictEqual(vert, { x: 100, y: 200 }, 'Constrained vertically when |dy| > |dx|');
console.log('✅ PASSED: Orthogonal point calculation correct');

console.log('--- TEST 5: Grid Snapping Integration ---');

const gridSize = 20;
// Test segment delta snapping
const rawDeltaX = 23;
const rawDeltaY = -38;
const snappedDx = snapDeltaToGrid(rawDeltaX, gridSize);
const snappedDy = snapDeltaToGrid(rawDeltaY, gridSize);
assert.strictEqual(snappedDx, 20, 'Snapped delta X is 20');
assert.strictEqual(snappedDy, -40, 'Snapped delta Y is -40');

// Test node coordinate snapping
const rawNodePt = { x: 137, y: 262 };
const snappedNodePt = snapPointToGrid(rawNodePt, gridSize);
assert.strictEqual(snappedNodePt.x, 140, 'Snapped node X is 140');
assert.strictEqual(snappedNodePt.y, 260, 'Snapped node Y is 260');
console.log('✅ PASSED: Grid snapping works for both deltas and absolute points');

console.log('--- ALL WALL MANIPULATION TESTS PASSED! ---');
