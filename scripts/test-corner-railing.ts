import assert from 'node:assert/strict';
import { cornerRailingPoints, resizeCornerRailing } from '../src/utils/linearElement';
import { parseProject, serializeProject } from '../src/utils/projectFile';
import { emptyDocument } from '../src/utils/documentHistory';

for (const rotation of [0, Math.PI / 4, Math.PI / 2, -Math.PI / 3]) {
  const item = { id: 'corner', typeId: 'bal_corner_railing', x: 100, y: 100, width: 100, depth: 100, height: 110, rotation };
  const [corner, endA, endB] = cornerRailingPoints(item);
  for (const arm of [0, 1] as const) {
    const end = arm === 0 ? endA : endB;
    const next = resizeCornerRailing(item, arm, { x: corner.x + 2 * (end.x - corner.x), y: corner.y + 2 * (end.y - corner.y) }, 20);
    const [nextCorner, nextA, nextB] = cornerRailingPoints(next);
    assert.ok(Math.hypot(nextCorner.x - corner.x, nextCorner.y - corner.y) < 1e-8);
    const fixed = arm === 0 ? nextB : nextA, previous = arm === 0 ? endB : endA;
    assert.ok(Math.hypot(fixed.x - previous.x, fixed.y - previous.y) < 1e-8);
    assert.equal(arm === 0 ? next.width : next.depth, 200);
    assert.ok(Math.abs((nextA.x - nextCorner.x) * (nextB.x - nextCorner.x) + (nextA.y - nextCorner.y) * (nextB.y - nextCorner.y)) < 1e-8);
    assert.equal(next.height, 110);
    const doc = { ...emptyDocument(), items: [next] };
    assert.deepEqual(parseProject(serializeProject(doc)), doc);
  }
  assert.equal(resizeCornerRailing(item, 0, corner, 20).width, 10);
}
console.log('Corner railings: independent arms, fixed corner/opposite arm, right angle, rotation, minimum length and save round-trip passed.');
