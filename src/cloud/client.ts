import { createClient } from "@supabase/supabase-js";
import { createAuthInitializer } from "./auth";

const env = (import.meta as any).env;
export const cloudConfigured = Boolean(
  env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
export const googleEnabled = env.VITE_GOOGLE_AUTH_ENABLED === "true";
export const supabase = cloudConfigured
  ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
export const initializeCloudAuth = supabase
  ? createAuthInitializer(supabase, location.href, url => history.replaceState(history.state, "", url))
  : null;
export const requireCloud = () => {
  if (!supabase) throw new Error("Cloud accounts are not configured yet.");
  return supabase;
};
