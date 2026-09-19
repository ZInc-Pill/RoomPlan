import assert from 'node:assert/strict';
import { moveConnectedWallPoints, updateConnectedWall } from '../src/utils/wallConnections';
const walls = [
  { id: 'a', start: { x: 0, y: 0 }, end: { x: 100, y: 0 }, thickness: 8 },
  { id: 'b', start: { x: 100, y: 0 }, end: { x: 100, y: 100 }, thickness: 8 },
  { id: 'c', start: { x: 100, y: 0 }, end: { x: 200, y: 0 }, thickness: 8 },
  { id: 'd', start: { x: 101, y: 0 }, end: { x: 201, y: 0 }, thickness: 8 },
];
const moved = moveConnectedWallPoints(walls, [{ from: { x: 100, y: 0 }, to: { x: 120, y: 20 } }]);
assert.deepEqual(moved[0].end, moved[1].start);
assert.deepEqual(moved[1].start, moved[2].start);
assert.equal(moved[3], walls[3], 'nearby endpoints do not accidentally join');
assert.deepEqual(moved[1].end, walls[1].end);
assert.deepEqual(walls[0].end, { x: 100, y: 0 }, 'original document remains unchanged');
const collapsed = moveConnectedWallPoints(walls, [{ from: { x: 100, y: 0 }, to: { x: 100, y: 100 } }]);
assert.equal(collapsed, walls, 'collapse rejected atomically');
const translated = moveConnectedWallPoints(walls, [{ from: walls[0].start, to: { x: 0, y: 20 } }, { from: walls[0].end, to: { x: 100, y: 20 } }]);
assert.equal(translated[0].end.x - translated[0].start.x, 100);
assert.deepEqual(translated[0].end, translated[1].start);
console.log('Wall connections: shared corners, multiple joins, nearby isolation, collapse prevention and wall translation passed.');

const updated = updateConnectedWall(walls, 'a', { end: { x: 140, y: 20 }, color: '#fff' });
assert.deepEqual(updated[0].end, updated[1].start);
assert.equal(updated[0].color, '#fff');
assert.equal(updated[1].color, undefined);
assert.equal(updateConnectedWall(walls, 'a', { end: { x: 100, y: 100 } }), walls);
assert.deepEqual(updateConnectedWall(walls, 'a', { color: '#fff' })[1], walls[1]);
