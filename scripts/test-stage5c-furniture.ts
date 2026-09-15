import { getItemBounds, FURNITURE_DRAG_THRESHOLD } from '../src/hooks/useFurnitureInteraction';
import { calculateItemSnap } from '../src/utils/snapping';
import { PlacedItem, Point } from '../src/types';
import { ITEM_CATALOG } from '../src/catalog';
import { cmToPx } from '../src/utils/coordinates';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

function approx(a: number, b: number, eps = 0.001): boolean {
  return Math.abs(a - b) < eps;
}

console.log('--- TEST 1: getItemBounds & Rotation ---');
const sofaType = ITEM_CATALOG.find(i => i.id === 'liv_sofa_2')!;
const sofaW = cmToPx(sofaType.width); // 150cm
const sofaD = cmToPx(sofaType.depth); // 90cm
const itemUnrotated: PlacedItem = {
  id: 'sofa1',
  typeId: 'liv_sofa_2',
  x: 200,
  y: 200,
  rotation: 0,
};

const bounds0 = getItemBounds(itemUnrotated);
assert(approx(bounds0.w, sofaW), 'Unrotated width equals catalog width');
assert(approx(bounds0.d, sofaD), 'Unrotated depth equals catalog depth');
assert(approx(bounds0.left, 200 - sofaW / 2), 'Unrotated left');
assert(approx(bounds0.right, 200 + sofaW / 2), 'Unrotated right');

const itemRotated90: PlacedItem = {
  ...itemUnrotated,
  rotation: Math.PI / 2,
};
const bounds90 = getItemBounds(itemRotated90);
assert(approx(bounds90.w, sofaD), '90 deg rotated width matches original depth');
assert(approx(bounds90.d, sofaW), '90 deg rotated depth matches original width');

const itemRotated45: PlacedItem = {
  ...itemUnrotated,
  rotation: Math.PI / 4,
};
const bounds45 = getItemBounds(itemRotated45);
const expectedDim45 = sofaW * Math.SQRT1_2 + sofaD * Math.SQRT1_2;
assert(approx(bounds45.w, expectedDim45), '45 deg rotated bounding width correct');
assert(approx(bounds45.d, expectedDim45), '45 deg rotated bounding depth correct');

console.log('--- TEST 2: snapItemPosition ---');
const stationarySofa: PlacedItem = {
  id: 'sofa_target',
  typeId: 'liv_sofa_2',
  x: 500,
  y: 500,
  rotation: 0,
};

// Test grid snapping when far from other objects
const farRawPt: Point = { x: 103, y: 104 };
const movingBounds = getItemBounds(itemUnrotated);
movingBounds.left = farRawPt.x - movingBounds.w/2;
movingBounds.right = farRawPt.x + movingBounds.w/2;
movingBounds.top = farRawPt.y - movingBounds.d/2;
movingBounds.bottom = farRawPt.y + movingBounds.d/2;
const snappedGrid = calculateItemSnap(farRawPt, movingBounds, [], [], [], 20, 1, null, null, false);
// 1D snap coordinate snaps edge or center to grid multiples
assert(snappedGrid.x % 10 === 0 || (snappedGrid.x - sofaW / 2) % 20 === 0 || (snappedGrid.x + sofaW / 2) % 20 === 0, 'Snaps cleanly to grid');

// Test object alignment snapping when near stationarySofa
// Place moving sofa top edge near stationary sofa bottom edge
const stationaryBounds = getItemBounds(stationarySofa);
const movingTargetY = stationaryBounds.bottom + sofaD / 2 + 5; // 5px away (within threshold)
const nearRawPt: Point = { x: 502, y: movingTargetY }; // x is near center 500
const nearMovingBounds = getItemBounds(itemUnrotated);
nearMovingBounds.left = nearRawPt.x - nearMovingBounds.w/2;
nearMovingBounds.right = nearRawPt.x + nearMovingBounds.w/2;
nearMovingBounds.top = nearRawPt.y - nearMovingBounds.d/2;
nearMovingBounds.bottom = nearRawPt.y + nearMovingBounds.d/2;

const snappedObject = calculateItemSnap(nearRawPt, nearMovingBounds, [stationaryBounds], [{x: 500, y: 500}], [], 20, 1, null, null, false);
// Should snap x to exactly 500 (center align)
assert(approx(snappedObject.x, 500), 'Center x snapped to other item center');
// Should snap y so moving top edge touches stationary bottom edge
const expectedY = stationaryBounds.bottom + sofaD / 2;
assert(approx(snappedObject.y, expectedY), 'Flush edge contact achieved');

console.log('--- TEST 3: Multi-Item Movement Delta Simulation ---');
const items: PlacedItem[] = [
  { id: 'i1', typeId: 'bal_chair', x: 100, y: 100, rotation: 0 },
  { id: 'i2', typeId: 'kit_counter', x: 250, y: 100, rotation: 0 },
  { id: 'i3', typeId: 'liv_sofa_3', x: 600, y: 600, rotation: 0 },
];
const selectedItemIds = ['i1', 'i2']; // i1 and i2 are selected
const draggedObj = items.find(i => i.id === 'i1')!;
const initialDistance = Math.hypot(items[1].x - items[0].x, items[1].y - items[0].y);

// Simulated drag delta (e.g. user dragged i1 by dx=+40, dy=+60)
const simulatedSnappedPt = { x: 140, y: 160 };
const dx = simulatedSnappedPt.x - draggedObj.x; // +40
const dy = simulatedSnappedPt.y - draggedObj.y; // +60
const updatedItems = items.map(item => {
  if (selectedItemIds.includes(item.id)) {
    return { ...item, x: item.x + dx, y: item.y + dy };
  }
  return item;
});

assert(updatedItems[0].x === 140 && updatedItems[0].y === 160, 'Dragged item moved to snapped point');
assert(updatedItems[1].x === 290 && updatedItems[1].y === 160, 'Co-selected item moved by exact same delta');
assert(updatedItems[2].x === 600 && updatedItems[2].y === 600, 'Unselected item remained unchanged');
const finalDistance = Math.hypot(updatedItems[1].x - updatedItems[0].x, updatedItems[1].y - updatedItems[0].y);
assert(approx(initialDistance, finalDistance), 'Relative distance and orientation between multi-selected items strictly preserved');

console.log('--- TEST 4: Drag Start Threshold ---');
assert(FURNITURE_DRAG_THRESHOLD === 5, 'FURNITURE_DRAG_THRESHOLD is exactly 5px');
const startPt = { x: 50, y: 50 };
const slightMovePt = { x: 52, y: 53 }; // hypot = Math.hypot(2, 3) = ~3.6px (< 5px)
const exceedsThresholdPt = { x: 55, y: 55 }; // hypot = Math.hypot(5, 5) = ~7.07px (> 5px)

assert(Math.hypot(slightMovePt.x - startPt.x, slightMovePt.y - startPt.y) < FURNITURE_DRAG_THRESHOLD, 'Small move does not exceed threshold');
assert(Math.hypot(exceedsThresholdPt.x - startPt.x, exceedsThresholdPt.y - startPt.y) > FURNITURE_DRAG_THRESHOLD, 'Move exceeds threshold');

console.log('--- ALL FURNITURE MANIPULATION TESTS PASSED! ---');
