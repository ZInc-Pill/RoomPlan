import assert from 'node:assert/strict';
import { createLocalProjectStore, ProjectConflictError } from '../src/utils/localProjectStore';
import { AUTOSAVE_KEY, BACKUP_KEY } from '../src/utils/projectFile';
import { emptyDocument } from '../src/utils/documentHistory';

const data = new Map<string, string>();
let failKey = '';
const store = createLocalProjectStore({
  getItem: key => data.get(key) ?? null,
  setItem: (key, value) => { if (key === failKey) throw new Error('quota'); data.set(key, value); },
});
assert.equal(store.load(), null);
const first = emptyDocument();
const revision = store.save(first, null);
const next = { ...first, walls: [{ id: 'wall', thickness: 10, start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }] };
assert.throws(() => store.save(next, null), ProjectConflictError);
assert.deepEqual(store.load()?.document, first);
failKey = BACKUP_KEY;
assert.throws(() => store.save(next, revision), /quota/);
assert.equal(data.get(AUTOSAVE_KEY), revision);
failKey = AUTOSAVE_KEY;
assert.throws(() => store.save(next, revision), /quota/);
assert.deepEqual(store.load()?.document, first);
failKey = '';
store.save(next, revision);
assert.deepEqual(store.load()?.document, next);
assert.deepEqual(store.loadBackup(), first);
assert.throws(() => store.save(first, revision), ProjectConflictError);
data.set(AUTOSAVE_KEY, '{broken');
assert.throws(() => store.load(), /valid JSON/);
store.save(first, '{broken');
assert.equal(data.get(BACKUP_KEY), '{broken', 'invalid previous data is preserved for recovery');
console.log('Local project store: conflict, quota, backup and recovery checks passed');
