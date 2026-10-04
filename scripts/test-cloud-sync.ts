import assert from "node:assert/strict";
import { ProjectSync } from "../src/cloud/ProjectSync";
import { applyChanges, changesBetween } from "../src/cloud/patches";
import {
  emptyDocument,
  documentHistory,
  initialHistory,
} from "../src/utils/documentHistory";
const doc = emptyDocument(),
  a = { ...doc, comments: [{ id: "a", x: 1, y: 2, text: "a" }] },
  b = { ...doc, comments: [{ id: "b", x: 3, y: 4, text: "b" }] };
assert.equal(applyChanges(b, changesBetween(doc, a)).comments.length, 2);
assert.throws(() =>
  applyChanges(
    { ...a, comments: [{ ...a.comments[0], text: "other" }] },
    changesBetween(a, doc),
  ),
);
const p = {
  id: "p",
  owner_id: "u",
  title: "Test",
  revision: 0,
  archived: false,
  updated_at: "",
  document: doc,
};
let calls = 0,
  resolve: any;
const sync = new ProjectSync(
  p,
  "editor",
  {
    save: async () => {
      calls++;
      return new Promise((r) => (resolve = r));
    },
    load: async () => p,
  },
  () => {},
);
sync.setEditing(true);
sync.changed(a, false);
await sync.flush();
assert.equal(calls, 0);
sync.setEditing(false);
const pending = sync.flush();
assert.equal(calls, 1);
sync.setEditing(true);
const c = { ...a, comments: [{ ...a.comments[0], x: 9 }] };
sync.changed(c, false);
resolve({
  ...p,
  revision: 1,
  document: applyChanges(b, changesBetween(doc, a)),
});
await pending;
assert.equal(sync.external, doc);
sync.setEditing(false);
assert.equal(sync.external.comments.length, 2);
assert.equal(sync.external.comments[0].id, "b");
assert.equal(sync.external.comments[1].x, 9);
sync.dispose();
const viewer = new ProjectSync(
  p,
  "viewer",
  {
    save: async () => {
      throw Error("viewer write");
    },
    load: async () => p,
  },
  () => {},
);
viewer.changed(a, false);
await viewer.flush();
assert.equal(viewer.dirty, false);
viewer.dispose();
let history = documentHistory(initialHistory(), {
  type: "update",
  update: () => a,
});
history = documentHistory(history, {
  type: "remote",
  document: applyChanges(b, changesBetween(doc, a)),
});
history = documentHistory(history, { type: "undo" });
assert.deepEqual(history.present, b);
console.log(
  "PASS: independent merges, conflicts, gesture ownership, deferred save acknowledgements, viewer writes, collaborative undo",
);
