import assert from 'node:assert/strict';
import { calculateItemSnap } from '../src/utils/snapping';
import { getBoundingBox } from '../src/utils/geometry';

const point = { x: 103, y: 100 };
const bounds = getBoundingBox(point.x, point.y, 20, 20, 0);
const base = calculateItemSnap(point, bounds, [], [], [], 20, 1);
const distant = calculateItemSnap(point, bounds, [getBoundingBox(107, 1000, 20, 20, 0)], [{ x: 107, y: 1000 }], [], 20, 1);
assert.deepEqual(distant, base, 'distant objects must not pull across the room');
const nearby = calculateItemSnap(point, bounds, [getBoundingBox(125, 100, 20, 20, 0)], [{ x: 125, y: 100 }], [], 20, 1);
assert.equal(nearby.x, 105, 'nearby edges align flush');
const free = calculateItemSnap(point, bounds, [], [], [], 20, 1, null, null, true);
assert.equal(free.x, 103);
assert.equal(free.guideX, null);
for (const zoom of [0.1, 0.5, 1, 2, 4]) {
  const result = calculateItemSnap(point, bounds, [], [], [], 20, zoom);
  if (result.guideX !== null) assert.ok(Math.abs(result.guideX / 20 - Math.round(result.guideX / 20)) < 1e-8, 'grid guide lies on a grid line');
  assert.ok(Math.abs(result.x - point.x) <= Math.min(12 / zoom, 20));
}
console.log('Snapping refinement: proximity, flush alignment, free movement, guides and zoom limits passed.');
