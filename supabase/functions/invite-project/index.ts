// Deploy with Supabase CLI. All project access is checked using the caller's JWT.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
const appUrl = Deno.env.get("APP_URL") || "";
const allowedOrigin = appUrl ? new URL(appUrl).origin : "";
Deno.serve(async (request: Request) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== allowedOrigin
  )
    return reply({ error: "Origin not allowed" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return reply({ error: "POST required" }, 405);
  try {
    if (!appUrl) throw new Error("APP_URL is not configured");
    const auth = request.headers.get("Authorization");
    if (!auth) return reply({ error: "Sign in required" }, 401);
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: auth } },
        auth: { persistSession: false },
      },
    );
    const { data: user, error: authError } = await client.auth.getUser();
    if (authError || !user.user)
      return reply({ error: "Sign in required" }, 401);
    const body = await request.json();
    const { data: invite, error } = await client.rpc("rp_invite", {
      p_project: body.projectId,
      p_email: body.email,
      p_role: body.role,
    });
    if (error) return reply({ error: error.message }, 400);
    const { data: project, error: projectError } = await client
      .from("rp_projects")
      .select("title")
      .eq("id", body.projectId)
      .single();
    if (projectError) throw projectError;
    const key = Deno.env.get("RESEND_API_KEY"),
      from = Deno.env.get("INVITE_FROM_EMAIL");
    if (!key || !from)
      return reply({ invitation: invite, delivery: "not_configured" });
    const url = new URL(appUrl);
    url.search = "";
    url.hash = "";
    url.searchParams.set("invite", invite.token);
    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `invite-${invite.token}`,
        },
        body: JSON.stringify({
          from,
          to: [invite.email],
          subject: `Invitation to ${project.title}`,
          text: `You are invited to ${project.title} in RoomPlan with ${invite.role} access. Sign in using ${invite.email} to accept:\n\n${url.toString()}\n\nThis invitation expires in seven days.`,
        }),
      });
    } catch {
      return reply({ invitation: invite, delivery: "failed" });
    }
    return reply({
      invitation: invite,
      delivery: response.ok ? "sent" : "failed",
    });
  } catch (error) {
    console.error(
      "Invitation delivery failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return reply({ error: "Could not create invitation. Please retry." }, 500);
  }
});
