import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
);
await db.exec(
  readFileSync("supabase/migrations/202610040001_roomplan_cloud.sql", "utf8"),
);
const owner = "00000000-0000-0000-0000-000000000001",
  editor = "00000000-0000-0000-0000-000000000002",
  viewer = "00000000-0000-0000-0000-000000000003",
  stranger = "00000000-0000-0000-0000-000000000004";
for (const [i, id] of [owner, editor, viewer, stranger].entries())
  await db.query("insert into auth.users values($1,$2,now())", [
    id,
    `${i}@example.com`,
  ]);
const as = async (id: string) => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
};
const rpc = async (name: string, args: unknown[]) =>
  (
    await db.query<any>(
      `select to_jsonb(public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")})) as result`,
      args,
    )
  ).rows[0].result;
await as(owner);
const id = await rpc("rp_create_project", ["Test"]);
const invite = await rpc("rp_invite", [id, "1@example.com", "editor"]);
await as(stranger);
assert.equal((await db.query("select * from rp_projects")).rows.length, 0);
await assert.rejects(() => rpc("rp_accept_invite", [invite.token]));
await assert.rejects(() => rpc("rp_save_changes", [id, "[]"]));
await as(editor);
await rpc("rp_accept_invite", [invite.token]);
assert.equal((await db.query("select * from rp_projects")).rows.length, 1);
await assert.rejects(() => rpc("rp_invite", [id, "3@example.com", "editor"]));
await assert.rejects(() => db.exec("update rp_projects set title='Hacked'"));
const change = {
  collection: "comments",
  id: "a",
  before: null,
  after: { id: "a", x: 0, y: 0, text: "hello" },
};
await rpc("rp_save_changes", [id, JSON.stringify([change])]);
await rpc("rp_save_changes", [id, JSON.stringify([change])]);
await assert.rejects(() =>
  rpc("rp_save_changes", [
    id,
    JSON.stringify([
      { ...change, before: null, after: { ...change.after, text: "conflict" } },
    ]),
  ]),
);
await as(owner);
await assert.rejects(() =>
  rpc("rp_create_project", [
    "Invalid",
    JSON.stringify({
      walls: [],
      floors: [],
      items: [{ id: "bad", typeId: "unknown", x: 0, y: 0, rotation: 0 }],
      comments: [],
    }),
  ]),
);
await assert.rejects(() =>
  rpc("rp_create_project", [
    "Invalid",
    JSON.stringify({
      walls: [],
      floors: [],
      items: [],
      comments: [{ id: "bad", x: "bad", y: 0, text: "x" }],
    }),
  ]),
);
const token = await rpc("rp_share_link", [id, "viewer"]);
await as(viewer);
await rpc("rp_join_link", [token]);
await assert.rejects(() => rpc("rp_save_changes", [id, "[]"]));
await as(owner);
await rpc("rp_manage_member", [id, editor, null]);
await as(editor);
assert.equal((await db.query("select * from rp_projects")).rows.length, 0);
await as(owner);
await rpc("rp_share_link", [id, null]);
await as(stranger);
await assert.rejects(() => rpc("rp_join_link", [token]));
await db.close();
console.log(
  "PASS: migration, RLS isolation, owner/editor/viewer, invitation email matching, atomic conflicts, retry, revocation",
);
