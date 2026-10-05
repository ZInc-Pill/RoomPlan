import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAuthInitializer, signInRedirect } from "../src/cloud/auth";

async function run(url: string, mode: "success" | "missing" | "expired" | "offline") {
  let verified = 0, cleaned = "";
  const user = { id: "user" };
  const client = { auth: {
    initialize: async () => ({ error: mode === "expired" ? new Error("expired") : null }),
    verifyOtp: async (input: unknown) => {
      assert.deepEqual(input, { token_hash: "test-token", type: "email" });
      verified++;
      if (mode === "offline") throw new Error("network");
      return { error: mode === "expired" ? new Error("expired") : null };
    },
    getSession: async () => ({ data: { session: mode === "success" ? { user } : null }, error: null }),
  } } as unknown as SupabaseClient;
  const initialize = createAuthInitializer(client, url, value => { cleaned = value; });
  const [a, b] = await Promise.all([initialize(), initialize()]);
  assert.equal(a, b);
  return { ...a, verified, cleaned };
}
const callback = "https://roomplan.online/?token_hash=test-token&type=email&invite=abc";
const success = await run(callback, "success");
assert.equal(success.user?.id, "user");
assert.equal(success.error, "");
assert.equal(success.verified, 1);
assert.equal(success.cleaned, "https://roomplan.online/?auth=email&invite=abc");
for (const mode of ["missing", "expired", "offline"] as const) {
  const failed = await run(callback, mode);
  assert.ok(failed.error);
  assert.equal(failed.user, null);
  assert.equal(failed.cleaned, "https://roomplan.online/?auth=email&invite=abc");
}
const missingVerifier = await run("https://roomplan.online/?code=test-code", "missing");
assert.ok(missingVerifier.error);
assert.equal(missingVerifier.cleaned, "https://roomplan.online/?auth=email");
assert.equal((await run("https://roomplan.online/", "missing")).error, "");
assert.ok((await run("https://roomplan.online/#error=access_denied", "expired")).error);
const invalid = await run(callback.replace("type=email", "type=recovery"), "missing");
assert.equal(invalid.verified, 0);
assert.ok(invalid.error);
assert.equal(signInRedirect("https://roomplan.online/?local=1&project=p&code=secret#access_token=secret"), "https://roomplan.online/?auth=email&project=p");
console.log("Cloud auth callback regressions passed");
