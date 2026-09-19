import assert from 'node:assert/strict';
import { railingEndpoints, resizeRailing } from '../src/utils/linearElement';
import { documentHistory, initialHistory } from '../src/utils/documentHistory';
const item = { id: 'rail', typeId: 'bal_railing', x: 100, y: 100, width: 100, depth: 5, height: 110, rotation: 0 };
const originalEnds = railingEndpoints(item);
assert.deepEqual(originalEnds, [{ x: 80, y: 100 }, { x: 120, y: 100 }]);
const extended = resizeRailing(item, 1, { x: 162, y: 101 }, 20);
assert.equal(extended.width, 200);
assert.deepEqual(railingEndpoints(extended), [{ x: 80, y: 100 }, { x: 160, y: 100 }]);
for (const endpoint of [0, 1] as const) {
  const angled = resizeRailing(item, endpoint, { x: 160, y: 160 }, 20);
  const fixed = railingEndpoints(angled)[1 - endpoint];
  assert.ok(Math.hypot(fixed.x - originalEnds[1 - endpoint].x, fixed.y - originalEnds[1 - endpoint].y) < 1e-8);
  assert.equal(angled.height, 110);
  assert.equal(angled.depth, 5);
}
assert.equal(resizeRailing(item, 1, originalEnds[0], 20), item, 'zero length rejected');
const free = railingEndpoints(resizeRailing(item, 1, { x: 163, y: 102 }, 20, true))[1];
assert.ok(Math.hypot(free.x - 163, free.y - 102) < 1e-8);
let history = initialHistory();
history = documentHistory(history, { type: 'update', update: d => ({ ...d, items: [item] }) });
history = documentHistory(history, { type: 'begin' });
history = documentHistory(history, { type: 'update', update: d => ({ ...d, items: [extended] }) });
history = documentHistory(history, { type: 'commit' });
history = documentHistory(history, { type: 'undo' });
assert.deepEqual(history.present.items[0], item);
console.log('Railing endpoints: length, grid, fixed endpoint, rotation, dimensions, free movement and undo passed.');
