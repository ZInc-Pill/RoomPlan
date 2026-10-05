import type { SupabaseClient } from "@supabase/supabase-js";

const retryMessage = "This sign-in link has expired or could not be completed. Request a new link and open it in the same browser, or use your email code.";

// Redirect only to workspace routes, never back to an expired auth callback.
export function signInRedirect(url: string) {
  const target = new URL(url);
  const query = new URLSearchParams();
  // Give email templates a stable query delimiter before appending token_hash.
  query.set("auth", "email");
  for (const key of ["project", "invite", "share"]) {
    const value = target.searchParams.get(key);
    if (value) query.set(key, value);
  }
  target.search = query.toString();
  target.hash = "";
  return target.toString();
}

export function createAuthInitializer(
  client: SupabaseClient,
  url: string,
  replaceUrl: (url: string) => void,
) {
  let pending: Promise<Awaited<ReturnType<typeof complete>>> | undefined;
  async function complete() {
    const target = new URL(url);
    const hash = new URLSearchParams(target.hash.slice(1));
    const callback = ["code", "token_hash", "error", "error_description", "error_code"].some(
      key => target.searchParams.has(key) || hash.has(key),
    ) || hash.has("access_token");
    let error = "";
    try {
      // Surface initialization failures; getSession alone can hide callback errors.
      const initialized = await client.auth.initialize();
      if (initialized.error) error = retryMessage;
      const token = target.searchParams.get("token_hash");
      if (token) {
        // An email token is verified by Supabase, without a browser-bound PKCE verifier.
        if (target.searchParams.get("type") !== "email") error = retryMessage;
        else {
          const result = await client.auth.verifyOtp({ token_hash: token, type: "email" });
          error = result.error ? retryMessage : "";
        }
      }
      const result = await client.auth.getSession();
      if (result.error || (callback && !result.data.session)) error = retryMessage;
      return { user: result.data.session?.user ?? null, error };
    } catch {
      return { user: null, error: "Unable to complete sign-in. Check your connection and try again." };
    } finally {
      if (callback) replaceUrl(signInRedirect(url));
    }
  }
  // React StrictMode must never redeem a one-time email token twice.
  return () => pending ??= complete();
}
