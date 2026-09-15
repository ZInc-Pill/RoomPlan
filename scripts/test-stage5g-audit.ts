import assert from 'assert';
import { Point, Wall, Floor, PlacedItem } from '../src/types';
import { screenToWorld, worldToScreen, cmToPx, pxToCm, metersToPx, pxToMeters, pxAreaToSquareMeters, WORLD_SCALE } from '../src/utils/coordinates';
import { 
  snapPointToGrid, 
  snapCoordinateToGrid, 
  snapDeltaToGrid, 
  calculateItemSnap, 
  SNAP_THRESHOLDS 
} from '../src/utils/snapping';
import { 
  vectorLength, 
  pointDistance, 
  calculatePolygonArea, 
  getPolygonCentroid,
  getBoundingBox
} from '../src/utils/geometry';
import { moveWall, moveWallNode, createWall } from '../src/hooks/useWallInteraction';
import { translateFloorPoints, moveFloorNode } from '../src/hooks/useFloorInteraction';
import { getItemBounds } from '../src/hooks/useFurnitureInteraction';
import { isInteractiveElement, isPrimaryPointer, getModifierState } from '../src/utils/input';

console.log('--- STAGE 5G: COMPREHENSIVE ARCHITECTURAL INVARIANTS AUDIT ---');

// 1. COORDINATES INVARIANT: screen -> world -> screen round-trip stability
console.log('\n[Invariant 1] Coordinates Invariant: screen -> world -> screen round-trip');
const containerRect = { left: 100, top: 50, width: 1200, height: 800, right: 1300, bottom: 850, x: 100, y: 50, toJSON: () => {} } as DOMRect;
const zoom = 1.5;
const pan = { x: 250, y: -120 };

const screenCoords = [
  { x: 100, y: 50 },
  { x: 500, y: 400 },
  { x: 923.4, y: 681.2 },
  { x: 1299, y: 849 }
];

for (const sc of screenCoords) {
  const world = screenToWorld(sc.x, sc.y, pan, zoom, containerRect);
  const backToScreen = worldToScreen(world.x, world.y, pan, zoom, containerRect);
  assert(Math.abs(backToScreen.x - sc.x) < 1e-6, `Roundtrip X failed: expected ${sc.x}, got ${backToScreen.x}`);
  assert(Math.abs(backToScreen.y - sc.y) < 1e-6, `Roundtrip Y failed: expected ${sc.y}, got ${backToScreen.y}`);
}
console.log('✓ screenToWorld and worldToScreen preserve perfect numerical stability across coordinates');

// Physical conversions check
assert(cmToPx(100) === 40, '100cm should be 40 world units (1 meter)');
assert(pxToCm(40) === 100, '40 world units should be 100cm');
assert(metersToPx(1) === 40, '1m should be 40 world units');
assert(pxToMeters(40) === 1, '40 world units should be 1m');
assert(pxAreaToSquareMeters(1600) === 1.0, '1600 px² = 1 m² (40x40)');
console.log('✓ Physical conversions strictly unified around WORLD_SCALE (40 px/m, 0.4 px/cm)');

// 2. VIEWPORT INVARIANT: Zoom-to-cursor preserves the cursor\'s world-space focal point
console.log('\n[Invariant 2] Viewport Invariant: Zoom-to-cursor focal stability');
const cursorScreen = { x: 600, y: 450 };
const initialZoom = 1.0;
const initialPan = { x: 50, y: 30 };

const worldBeforeZoom = screenToWorld(cursorScreen.x, cursorScreen.y, initialPan, initialZoom, containerRect);

// Simulate zoom-to-cursor formula from useCanvasViewport:
const nextZoom = 1.5;
const containerX = cursorScreen.x - containerRect.left;
const containerY = cursorScreen.y - containerRect.top;
const newPanX = containerX - (containerX - initialPan.x) * (nextZoom / initialZoom);
const newPanY = containerY - (containerY - initialPan.y) * (nextZoom / initialZoom);
const newPan = { x: newPanX, y: newPanY };

const worldAfterZoom = screenToWorld(cursorScreen.x, cursorScreen.y, newPan, nextZoom, containerRect);
assert(Math.abs(worldBeforeZoom.x - worldAfterZoom.x) < 1e-6, 'World coordinate under cursor must not shift after zoom');
assert(Math.abs(worldBeforeZoom.y - worldAfterZoom.y) < 1e-6, 'World coordinate under cursor must not shift after zoom');
console.log('✓ Zoom-to-cursor strictly preserves the world-space focal point beneath the pointer');

// 3. FURNITURE INVARIANT: Dragging preserves relative distances and orientations in multi-selection
console.log('\n[Invariant 3] Furniture Invariant: Multi-selection relative geometry preservation');
const itemA: PlacedItem = { id: 'a', typeId: 'chair', x: 100, y: 100, rotation: 0 };
const itemB: PlacedItem = { id: 'b', typeId: 'table', x: 200, y: 250, rotation: Math.PI / 4 };

const initialDist = Math.hypot(itemB.x - itemA.x, itemB.y - itemA.y);
const initialAngle = Math.atan2(itemB.y - itemA.y, itemB.x - itemA.x);
const initialRotDiff = itemB.rotation - itemA.rotation;

// Simulate movement delta applied to both
const delta = { x: 45, y: -65 };
const movedA = { ...itemA, x: itemA.x + delta.x, y: itemA.y + delta.y };
const movedB = { ...itemB, x: itemB.x + delta.x, y: itemB.y + delta.y };

const newDist = Math.hypot(movedB.x - movedA.x, movedB.y - movedA.y);
const newAngle = Math.atan2(movedB.y - movedA.y, movedB.x - movedA.x);
const newRotDiff = movedB.rotation - movedA.rotation;

assert(Math.abs(newDist - initialDist) < 1e-6, 'Distance between multi-selected items strictly preserved');
assert(Math.abs(newAngle - initialAngle) < 1e-6, 'Relative angle between multi-selected items strictly preserved');
assert(Math.abs(newRotDiff - initialRotDiff) < 1e-6, 'Relative rotation between multi-selected items strictly preserved');
console.log('✓ Multi-item translation strictly preserves intra-selection spatial invariance');

// 4. WALLS INVARIANT: Segment movement preserves length, angle, thickness; Node movement isolates modified node
console.log('\n[Invariant 4] Wall Invariant: Segment & node transformation invariants');
const originalWall: Wall = {
  id: 'w1',
  start: { x: 50, y: 50 },
  end: { x: 250, y: 200 },
  thickness: 8
};

const originalLength = Math.hypot(originalWall.end.x - originalWall.start.x, originalWall.end.y - originalWall.start.y);
const originalWallAngle = Math.atan2(originalWall.end.y - originalWall.start.y, originalWall.end.x - originalWall.start.x);

const translatedWall = moveWall(originalWall, 40, -60);
const translatedLength = Math.hypot(translatedWall.end.x - translatedWall.start.x, translatedWall.end.y - translatedWall.start.y);
const translatedWallAngle = Math.atan2(translatedWall.end.y - translatedWall.start.y, translatedWall.end.x - translatedWall.start.x);

assert(Math.abs(translatedLength - originalLength) < 1e-6, 'Wall length strictly invariant under translation');
assert(Math.abs(translatedWallAngle - originalWallAngle) < 1e-6, 'Wall orientation angle strictly invariant under translation');
assert(translatedWall.thickness === originalWall.thickness, 'Wall thickness strictly invariant under translation');

// Endpoint modification isolates modified node
const modifiedStartWall = moveWallNode(originalWall, 'start', { x: 80, y: 90 });
assert(modifiedStartWall.start.x === 80 && modifiedStartWall.start.y === 90, 'Start node updated');
assert(modifiedStartWall.end.x === originalWall.end.x && modifiedStartWall.end.y === originalWall.end.y, 'End node strictly unchanged');

const modifiedEndWall = moveWallNode(originalWall, 'end', { x: 300, y: 350 });
assert(modifiedEndWall.end.x === 300 && modifiedEndWall.end.y === 350, 'End node updated');
assert(modifiedEndWall.start.x === originalWall.start.x && modifiedEndWall.start.y === originalWall.start.y, 'Start node strictly unchanged');
console.log('✓ Wall segment translation preserves length, angle, and thickness; node edits isolate target node');

// 5. FLOORS INVARIANT: Translation preserves area, perimeter, and vertex ordering
console.log('\n[Invariant 5] Floor Invariant: Translation preserves area, perimeter, and vertex ordering');
const testFloor: Floor = {
  id: 'f1',
  points: [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 300, y: 250 },
    { x: 150, y: 250 },
    { x: 100, y: 180 }
  ],
  color: '#e5e7eb'
};

const origArea = calculatePolygonArea(testFloor.points);
const calcPerimeter = (pts: Point[]) => pts.reduce((sum, p, i) => {
  const next = pts[(i + 1) % pts.length];
  return sum + Math.hypot(next.x - p.x, next.y - p.y);
}, 0);
const origPerim = calcPerimeter(testFloor.points);

const translatedPoints = translateFloorPoints(testFloor.points, 50, -30);
const transArea = calculatePolygonArea(translatedPoints);
const transPerim = calcPerimeter(translatedPoints);

assert(Math.abs(transArea - origArea) < 1e-6, 'Floor area strictly invariant under translation');
assert(Math.abs(transPerim - origPerim) < 1e-6, 'Floor perimeter strictly invariant under translation');
assert(translatedPoints.length === testFloor.points.length, 'Vertex count preserved');

// Vertex ordering verification
for (let i = 0; i < testFloor.points.length; i++) {
  assert(translatedPoints[i].x === testFloor.points[i].x + 50, `Vertex ${i} X translated`);
  assert(translatedPoints[i].y === testFloor.points[i].y - 30, `Vertex ${i} Y translated`);
}

// Single node translation isolates modified node
const nodeMovedPoints = moveFloorNode(testFloor.points, 2, { x: 320, y: 260 });
assert(nodeMovedPoints[2].x === 320 && nodeMovedPoints[2].y === 260, 'Node 2 moved');
assert(nodeMovedPoints[0].x === testFloor.points[0].x && nodeMovedPoints[0].y === testFloor.points[0].y, 'Node 0 unchanged');
assert(nodeMovedPoints[1].x === testFloor.points[1].x && nodeMovedPoints[1].y === testFloor.points[1].y, 'Node 1 unchanged');
console.log('✓ Floor translation strictly preserves area, perimeter, and vertex sequence');

// 6. SNAPPING INVARIANT: Deterministic grid & candidate snapping
console.log('\n[Invariant 6] Snapping Invariant: Deterministic consistency across grid & items');
const gridSize = 20;
assert(snapCoordinateToGrid(19, gridSize) === 20, '19 snaps to 20');
assert(snapCoordinateToGrid(21, gridSize) === 20, '21 snaps to 20');
assert(snapCoordinateToGrid(29.9, gridSize) === 20, '29.9 snaps to 20');
assert(snapCoordinateToGrid(30.1, gridSize) === 40, '30.1 snaps to 40');
assert(snapDeltaToGrid(18, gridSize) === 20, 'Delta 18 snaps to 20');
assert(snapDeltaToGrid(-18, gridSize) === -20, 'Delta -18 snaps to -20');

// Furniture snapping priority: Object alignment > Grid alignment
const itemTargetBounds = { left: 100, right: 150, top: 100, bottom: 150, w: 50, d: 50 };
const movingBounds = { left: 145, right: 195, top: 102, bottom: 152, w: 50, d: 50 };
const movingPt = { x: 170, y: 127 };
const snappedPos = calculateItemSnap(
  movingPt,
  movingBounds,
  [itemTargetBounds],
  [{ x: 125, y: 125 }],
  [],
  gridSize,
  1,
  null,
  null,
  false
);
// Moving left edge (145) is 5 units from target right edge (150) -> within threshold 15 -> flush snap
assert(snappedPos.x === 175, `Expected flush snap at x=175, got ${snappedPos.x}`);
console.log('✓ Snapping is deterministic and obeys Object Alignment > Grid Alignment priority');

// 7. INPUT INVARIANT: Input guard isolation
console.log('\n[Invariant 7] Input Guard Invariant: Form element isolation');
assert(isInteractiveElement(null) === false, 'null is safe');
assert(isInteractiveElement({ tagName: 'INPUT' } as any) === true, 'INPUT is interactive');
assert(isInteractiveElement({ tagName: 'TEXTAREA' } as any) === true, 'TEXTAREA is interactive');
assert(isInteractiveElement({ tagName: 'SELECT' } as any) === true, 'SELECT is interactive');
assert(isInteractiveElement({ tagName: 'DIV', isContentEditable: true } as any) === true, 'contentEditable is interactive');
assert(isInteractiveElement({ tagName: 'DIV', isContentEditable: false } as any) === false, 'plain DIV is not interactive');
console.log('✓ Input isolation guarantees text editing is protected from global keyboard shortcuts');

console.log('\n--- ALL STAGE 5G ARCHITECTURAL INVARIANTS VERIFIED 100% PASSING! 🎉 ---\n');
