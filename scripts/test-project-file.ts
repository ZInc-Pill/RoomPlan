import assert from 'node:assert/strict';
import { parseProject, serializeProject, PROJECT_LIMIT } from '../src/utils/projectFile';
import { emptyDocument } from '../src/utils/documentHistory';
import { ITEM_CATALOG } from '../src/catalog';

const plan = emptyDocument();
plan.items.push({ id: 'chair', typeId: ITEM_CATALOG[0].id, x: 10, y: 20, rotation: 0, elevation: 0 });
plan.floors.push({ id: 'floor', color: '#fff', points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 0, y: 40 }] });
assert.deepEqual(parseProject(serializeProject(plan)), plan);
assert.deepEqual(parseProject(JSON.stringify(plan)), plan, 'legacy unversioned exports remain supported');
assert.throws(() => parseProject('{broken'), /valid JSON/);
assert.throws(() => parseProject(JSON.stringify({ version: 99, document: plan })), /version/);
assert.throws(() => parseProject(JSON.stringify({ walls: [] })), /arrays/);
assert.throws(() => parseProject(' '.repeat(PROJECT_LIMIT + 1)), /large/);
for (const edit of [
  (d: typeof plan) => { d.items[0].x = Infinity; },
  (d: typeof plan) => { d.items[0].width = -1; },
  (d: typeof plan) => { d.items[0].typeId = 'not-a-real-item'; },
  (d: typeof plan) => { d.items[0].id = d.floors[0].id; },
  (d: typeof plan) => { d.floors[0].points = []; },
]) {
  const copy = structuredClone(plan); edit(copy);
  assert.throws(() => parseProject(JSON.stringify(copy)));
}
assert.deepEqual(parseProject(serializeProject(plan)), plan, 'failed validation leaves the input untouched');
console.log('Project files: versioned and legacy round trips, malformed files, dimensions, IDs, catalog and size limits passed.');
