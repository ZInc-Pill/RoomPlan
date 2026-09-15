import {
  createRectanglePoints,
  isMinimumRectangleSize,
  translateFloorPoints,
  moveFloorNode,
  insertFloorNode,
  deleteFloorNode,
  calculateFloorArea,
  getFloorCentroid,
  calculateOrthogonalFloorPoint,
  isNearPolygonStart,
  MIN_RECT_FLOOR_SIZE,
  MIN_POLYGON_POINTS,
  POLYGON_CLOSING_RADIUS_PX,
} from '../src/hooks/useFloorInteraction';
import { calculatePolygonArea } from '../src/utils/geometry';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✓ ${msg}`);
  }
}

console.log('--- Testing Stage 5E: Floor Manipulation Refactor ---');

// 1. Rectangle floor creation & minimum size threshold
console.log('\n[1] Rectangle floor creation:');
const validCorner1 = { x: 0, y: 0 };
const validCorner2 = { x: 100, y: 80 };
assert(isMinimumRectangleSize(validCorner1, validCorner2, MIN_RECT_FLOOR_SIZE) === true, '100x80 rect meets minimum size');

const invalidCorner1 = { x: 0, y: 0 };
const invalidCorner2 = { x: 15, y: 80 };
assert(isMinimumRectangleSize(invalidCorner1, invalidCorner2, MIN_RECT_FLOOR_SIZE) === false, '15x80 rect rejected (< 20 width)');

const rectPts = createRectanglePoints(validCorner1, validCorner2);
assert(rectPts !== null, 'Valid rectangle points created');
assert(rectPts?.length === 4, 'Rectangle has exactly 4 vertices');
assert(rectPts![0].x === 0 && rectPts![0].y === 0, 'Top-left corner is (0,0)');
assert(rectPts![1].x === 100 && rectPts![1].y === 0, 'Top-right corner is (100,0)');
assert(rectPts![2].x === 100 && rectPts![2].y === 80, 'Bottom-right corner is (100,80)');
assert(rectPts![3].x === 0 && rectPts![3].y === 80, 'Bottom-left corner is (0,80)');

// Invariance test: reversed corner drag
const reversedRectPts = createRectanglePoints({ x: 100, y: 80 }, { x: 0, y: 0 });
assert(reversedRectPts !== null, 'Reversed rectangle points created');
assert(
  reversedRectPts![0].x === 0 &&
  reversedRectPts![1].x === 100 &&
  reversedRectPts![2].x === 100 &&
  reversedRectPts![3].x === 0,
  'Normalized corners invariant to drag direction'
);

// 2. Floor polygon translation
console.log('\n[2] Floor translation:');
const origArea = calculatePolygonArea(rectPts!);
const translated = translateFloorPoints(rectPts!, 25, -15);
const newArea = calculatePolygonArea(translated);
assert(Math.abs(origArea - newArea) < 0.001, 'Floor area strictly invariant under translation');
assert(translated[0].x === 25 && translated[0].y === -15, 'Vertex 0 translated by (25, -15)');
assert(translated[2].x === 125 && translated[2].y === 65, 'Vertex 2 translated by (25, -15)');

// 3. Floor vertex manipulation (corner drag)
console.log('\n[3] Floor vertex manipulation:');
const movedVertexPts = moveFloorNode(rectPts!, 1, { x: 120, y: -10 });
assert(movedVertexPts[1].x === 120 && movedVertexPts[1].y === -10, 'Vertex 1 moved to target coordinate');
assert(movedVertexPts[0].x === 0 && movedVertexPts[0].y === 0, 'Vertex 0 remains unchanged');
assert(movedVertexPts[2].x === 100 && movedVertexPts[2].y === 80, 'Vertex 2 remains unchanged');
assert(movedVertexPts[3].x === 0 && movedVertexPts[3].y === 80, 'Vertex 3 remains unchanged');

// 4. Floor edge split (midpoint vertex insertion)
console.log('\n[4] Floor edge split (midpoint insertion):');
const splitPts = insertFloorNode(rectPts!, 1, { x: 50, y: 0 });
assert(splitPts.length === 5, 'Points count increased to 5 after edge split');
assert(splitPts[1].x === 50 && splitPts[1].y === 0, 'New vertex inserted at index 1');
assert(splitPts[0].x === 0 && splitPts[0].y === 0, 'Original vertex 0 intact');
assert(splitPts[2].x === 100 && splitPts[2].y === 0, 'Original vertex 1 shifted to index 2');

// 5. Floor vertex deletion (double-click corner)
console.log('\n[5] Floor vertex deletion:');
const deletedPts = deleteFloorNode(splitPts, 1);
assert(deletedPts.length === 4, 'Points count decreased to 4 after vertex deletion');
assert(deletedPts[1].x === 100 && deletedPts[1].y === 0, 'Original vertex at index 2 shifted back to index 1');

// Cannot delete below MIN_POLYGON_POINTS (3)
const triangle = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 50, y: 80 },
];
const failedDelete = deleteFloorNode(triangle, 0);
assert(failedDelete.length === 3, 'Cannot delete vertex when points count is <= MIN_POLYGON_POINTS');

// 6. Floor Area & Centroid calculations
console.log('\n[6] Area & Centroid:');
// 100 x 80 rectangle in world coords (40 px = 1 meter -> 2.5m x 2.0m = 5.0 m²)
const areaM2 = calculateFloorArea(rectPts!);
assert(Math.abs(areaM2 - 5.0) < 0.01, `Area calculation is 5.0 m² (got ${areaM2.toFixed(2)})`);
const centroid = getFloorCentroid(rectPts!);
assert(Math.abs(centroid.x - 50) < 0.01 && Math.abs(centroid.y - 40) < 0.01, 'Centroid correctly at (50, 40)');

// 7. Orthogonal snap calculation (Shift key)
console.log('\n[7] Orthogonal calculation (Shift key):');
const startPt = { x: 100, y: 100 };
const mostlyHorizontal = { x: 200, y: 120 };
const orthoH = calculateOrthogonalFloorPoint(startPt, mostlyHorizontal);
assert(orthoH.x === 200 && orthoH.y === 100, 'Mostly horizontal snapped to horizontal (y=100)');

const mostlyVertical = { x: 120, y: 250 };
const orthoV = calculateOrthogonalFloorPoint(startPt, mostlyVertical);
assert(orthoV.x === 100 && orthoV.y === 250, 'Mostly vertical snapped to vertical (x=100)');

// 8. Polygon closure detection
console.log('\n[8] Polygon closure detection:');
const polyStart = { x: 50, y: 50 };
// At zoom = 1, threshold is 28 world units
assert(isNearPolygonStart(polyStart, { x: 60, y: 60 }, 1) === true, 'Distance ~14.14 is within closure threshold (28)');
assert(isNearPolygonStart(polyStart, { x: 90, y: 90 }, 1) === false, 'Distance ~56.57 is outside closure threshold (28)');
// At zoom = 2, threshold is 28 / 2 = 14 world units
assert(isNearPolygonStart(polyStart, { x: 60, y: 60 }, 2) === false, 'Distance ~14.14 outside closure threshold at zoom 2 (14)');

console.log('\n All Stage 5E Floor Manipulation tests passed successfully!');
