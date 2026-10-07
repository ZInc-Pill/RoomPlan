import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import App from "../App";
import { supabase, googleEnabled, requireCloud, initializeCloudAuth } from "./client";
import { signInRedirect } from "./auth";
import {
  check,
  createProject,
  downloadDocument,
  listProjects,
  loadProject,
  projectRole,
  saveChanges,
  updateProject,
  validateProject,
  openGuest,
  saveGuest,
  type Project,
  type ProjectCard,
  type Role,
} from "./api";
import { ProjectSync } from "./ProjectSync";
import { same } from "./patches";
import { readSavedProject } from "../hooks/useProjectAutosave";
import "./cloud.css";
import { CollaborationLoop, guestToken, guestHref, safePeers, cursorColor, type Collaborator, type CollaboratorCursor } from "./collaboration";
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const href = (key: string, value: string) =>
  `${location.origin}${location.pathname}?${key}=${encodeURIComponent(value)}`;
function go(key?: string, value?: string) {
  location.assign(key ? href(key, value!) : location.pathname);
}

export default function CloudWorkspace() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(!supabase),
    [error, setError] = useState("");
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [sentEmail, setSentEmail] = useState(""), [emailCode, setEmailCode] = useState("");
  const params = new URLSearchParams(location.search);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    initializeCloudAuth!().then(({ user, error }) => {
      if (!active) return;
      setError(error);
      setUser(user);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  const token = guestToken(location.href);
  if (token) return <GuestLoader key={token} token={token} />;
  if (params.has("local"))
    return (
      <div className="cloud-editor">
        <div className="cloud-bar">
          <button onClick={() => go()}>Projects</button>
          <span>Local project · stored on this device</span>
        </div>
        <div className="cloud-canvas">
          <App embedded />
        </div>
      </div>
    );
  if (!ready) return <div className="cloud-page">Loading your workspace…</div>;
  if (user) return <SignedWorkspace key={user.id} user={user} />;
  return (
    <main className="cloud-page">
      <header className="cloud-brand">
        RoomPlan<span>.Online</span>
      </header>
      <section className="cloud-auth">
        <p className="cloud-eyebrow">YOUR SPACE, TOGETHER</p>
        <h1>A home for your room plans.</h1>
        <p>
          Create, save and share your projects. Sign in with a secure email
          link.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              check(
                await requireCloud().auth.signInWithOtp({
                  email,
                  options: { emailRedirectTo: signInRedirect(location.href) },
                }),
              );
              setNotice("Check your email for your sign-in link.");
              setSentEmail(email.trim());
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <button className="primary" disabled={busy || !supabase}>
            {busy ? "Sending…" : "Continue with email"}
          </button>
        </form>
        {sentEmail && (
          <form onSubmit={async e => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const result = await requireCloud().auth.verifyOtp({ email: sentEmail, token: emailCode.trim(), type: "email" });
              check(result);
              if (!result.data.session) throw new Error("Sign-in could not be completed. Request a new email.");
              setUser(result.data.session.user);
              setEmailCode("");
            } catch (e) { setError(message(e)); }
            finally { setBusy(false); }
          }}>
            <label>Email code
              <input inputMode="numeric" autoComplete="one-time-code" required value={emailCode}
                onChange={e => setEmailCode(e.target.value)} placeholder="Code from your email" />
            </label>
            <button className="primary" disabled={busy}>{busy ? "Verifying…" : "Verify email code"}</button>
          </form>
        )}
        {googleEnabled && (
          <button
            onClick={async () => {
              try {
                check(
                  await requireCloud().auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: signInRedirect(location.href) },
                  }),
                );
              } catch (e) {
                setError(message(e));
              }
            }}
          >
            Continue with Google
          </button>
        )}
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert">{error}</p>}
        {!supabase && <p>Cloud connection is not configured yet.</p>}
        <button onClick={() => go("local", "1")}>Open local workspace</button>
      </section>
    </main>
  );
}
function SignedWorkspace({ user }: { user: User }) {
  const params = new URLSearchParams(location.search),
    id = params.get("project"),
    invite = params.get("invite"),
    share = params.get("share");
  const [error, setError] = useState(""),
    [joining, setJoining] = useState(false);
  if (invite || share)
    return (
      <main className="cloud-page">
        <h1>Join shared project</h1>
        <p>
          Signed in as {user.email}. Email invitations must match this address.
        </p>
        <button
          disabled={joining}
          onClick={async () => {
            setJoining(true);
            try {
              const id = check(
                await requireCloud().rpc(
                  invite ? "rp_accept_invite" : "rp_join_link",
                  { p_token: invite || share },
                ),
              );
              go("project", id);
            } catch (e) {
              setError(message(e));
              setJoining(false);
            }
          }}
        >
          Accept access
        </button>
        <p role="alert">{error}</p>
        <button onClick={() => go()}>Back to projects</button>
      </main>
    );
  return id ? <ProjectLoader id={id} user={user} /> : <Dashboard user={user} />;
}
export function Dashboard({ user }: { user: User }) {
  const [projects, setProjects] = useState<ProjectCard[]>([]),
    [invitations, setInvitations] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [title, setTitle] = useState("Untitled room"),
    [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [more, setMore] = useState(false);
  const refresh = async (offset = 0) => {
    setBusy(true);
    try {
      const p = await listProjects(offset);
      setProjects((old) => (offset ? [...old, ...p] : p));
      setMore(p.length === 50);
      if (!offset)
        setInvitations(
          check(await requireCloud().rpc("rp_pending_invites")) ?? [],
        );
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  const create = async (local = false) => {
    setBusy(true);
    try {
      const doc = local ? readSavedProject() : undefined;
      if (local && !doc)
        throw new Error("No local project found on this device.");
      go("project", await createProject(title, doc));
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  };
  const visibleProjects = projects
          .filter(
            (p) =>
              p.title.toLowerCase().includes(query.toLowerCase()) &&
              (filter === "archived" ? p.archived : !p.archived) &&
              (filter === "own"
                ? p.owner_id === user.id
                : filter === "shared"
                  ? p.owner_id !== user.id
                  : true),
          );
  return (
    <main className="cloud-page">
      <header className="cloud-heading">
        <div className="cloud-brand">
          RoomPlan<span>.Online</span>
        </div>
        <button onClick={() => requireCloud().auth.signOut()}>Sign out</button>
      </header>
      <p>{user.email}</p>
      <h1>Your projects</h1>
      <form
        className="cloud-create"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <input
          aria-label="New project name"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="primary" disabled={busy}>
          New project
        </button>
        <button type="button" disabled={busy} onClick={() => void create(true)}>
          Import local plan
        </button>
      </form>
      <button onClick={() => go("local", "1")}>Open local workspace</button>
      {error && (
        <div role="alert" className="cloud-error">
          {error}
          <p>
            If the cloud tables are missing, run the RoomPlan migration in
            Supabase first.
          </p>
          <button onClick={() => void refresh()}>Retry</button>
        </div>
      )}
      {invitations.map((i) => (
        <div className="cloud-invite" key={i.token}>
          <span>
            {i.title} · invited as {i.role}
          </span>
          <button onClick={() => go("invite", i.token)}>
            Review invitation
          </button>
        </div>
      ))}
      <div className="cloud-filters">
        <input
          type="search"
          placeholder="Search loaded projects"
          aria-label="Search projects"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Project filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All active projects</option>
          <option value="own">Owned by me</option>
          <option value="shared">Shared with me</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="cloud-grid">
        {visibleProjects
          .map((p) => (
            <article key={p.id} className="cloud-card">
              <div className="cloud-card-icon" aria-hidden="true"><LayoutGrid size={26} strokeWidth={1.5} /></div>
              <button
                className="cloud-project-title"
                onClick={() => go("project", p.id)}
              >
                {p.title}
              </button>
              <p>
                {p.owner_id === user.id ? "Owned by you" : "Shared with you"} ·{" "}
                {new Date(p.updated_at).toLocaleDateString()}
              </p>
              {p.owner_id === user.id && (
                <div className="cloud-actions">
                  <button
                    onClick={async () => {
                      const name = prompt("Project name", p.title);
                      if (!name?.trim()) return;
                      try {
                        await updateProject(p, name, p.archived);
                        await refresh();
                      } catch (e) {
                        setError(message(e));
                      }
                    }}
                  >
                    Rename
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await updateProject(p, p.title, !p.archived);
                        await refresh();
                      } catch (e) {
                        setError(message(e));
                      }
                    }}
                  >
                    {p.archived ? "Restore" : "Archive"}
                  </button>
                </div>
              )}
            </article>
          ))}
      </div>
      {!visibleProjects.length && !busy && !error && (
        <div className="cloud-empty"><LayoutGrid size={32} aria-hidden="true" /><h2>{projects.length ? "No matching projects" : "Make room for your ideas"}</h2><p>{projects.length ? "Try another search or choose a different project filter." : "Create your first room plan, or import the plan saved on this device."}</p></div>
      )}
      {more && (
        <button disabled={busy} onClick={() => void refresh(projects.length)}>
          Load more
        </button>
      )}
    </main>
  );
}
function ProjectLoader({ id, user }: { id: string; user: User }) {
  const [loaded, setLoaded] = useState<{ project: Project; role: Role } | null>(
      null,
    ),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const project = await loadProject(id),
          role = await projectRole(project, user.id);
        if (active) setLoaded({ project, role });
      } catch (e) {
        if (active) setError(message(e));
      }
    })();
    return () => {
      active = false;
    };
  }, [id, user.id]);
  if (!loaded)
    return (
      <main className="cloud-page">
        <button onClick={() => go()}>Projects</button>
        <p role={error ? "alert" : "status"}>{error || "Opening project…"}</p>
      </main>
    );
  return (
    <CloudEditor project={loaded.project} role={loaded.role} user={user} />
  );
}
function GuestLoader({ token }: { token: string }) {
  const [loaded, setLoaded] = useState<Awaited<ReturnType<typeof openGuest>> | null>(null), [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void openGuest(token).then(p => { if (active) setLoaded(p); }).catch(e => { if (active) setError(message(e)); });
    return () => { active = false; };
  }, [token]);
  if (!loaded) return <main className="cloud-page"><h1>Shared room plan</h1><p role={error ? "alert" : "status"}>{error || "Opening shared project…"}</p><button onClick={() => go()}>Open RoomPlan</button></main>;
  return <CloudEditor project={loaded.project} role={loaded.role} guest={token} expiresAt={loaded.expiresAt} />;
}
function CloudEditor({
  project,
  role,
  user,
  guest,
  expiresAt,
}: {
  project: Project;
  role: Role;
  user?: User;
  guest?: string;
  expiresAt?: string | null;
}) {
  const [, render] = useState(0),
    [sharing, setSharing] = useState(false),
    [blocked, setBlocked] = useState(false),
    [recovery, setRecovery] = useState(false),
    [accessEnded, setAccessEnded] = useState(false),
    [presenceStatus, setPresenceStatus] = useState("Connecting collaboration…"),
    [peers, setPeers] = useState<Collaborator[]>([]);
  const presence = useRef<CollaborationLoop | null>(null);
  const session = useRef(crypto.randomUUID());
  const syncRef = useRef<ProjectSync | null>(null);
  if (!syncRef.current)
    syncRef.current = new ProjectSync(
      project,
      role,
      { save: (id, changes) => guest ? saveGuest(guest, changes) : saveChanges(id, changes), load: id => guest ? openGuest(guest).then(p => p.project) : loadProject(id) },
      () => render((n) => n + 1),
    );
  const sync = syncRef.current,
    key = `roomplan.recovery.${user?.id ?? "guest"}.${project.id}.${guest ? guest.slice(0, 24) : "member"}`;
  const onCursor = useCallback((cursor: CollaboratorCursor | null) => presence.current?.point(cursor), []);
  const onDocument = useCallback(
    (doc: any, editing: boolean) => {
      sync.changed(doc, editing);
    },
    [sync],
  );
  useEffect(() => {
    sync.disposed = false;
    try {
      setRecovery(!!localStorage.getItem(key));
    } catch {}
    const pointers = new Set<number>();
    const down = (e: PointerEvent) => {
      if (sync.role === "viewer") return;
      pointers.add(e.pointerId);
      sync.setEditing(true);
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      setTimeout(() => {
        if (!pointers.size) sync.setEditing(false);
      }, 0);
    };
    const blur = () => {
      pointers.clear();
      setTimeout(() => sync.setEditing(false), 0);
    };
    const unload = (e: BeforeUnloadEvent) => {
      if (sync.dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", up, true);
    window.addEventListener("blur", blur);
    window.addEventListener("beforeunload", unload);
    const refresh = async () => {
      try {
        const loaded = guest ? await openGuest(guest) : null;
        const p = loaded?.project ?? await loadProject(project.id);
        const r = loaded?.role ?? await projectRole(p, user!.id);
        if (sync.disposed) return;
        sync.role = r;
        setBlocked(p.archived);
        sync.receive(p);
        render((n) => n + 1);
      } catch (e) {
        if (sync.disposed) return;
        setBlocked(true);
        if ((e as any).code === "42501" || (e as any).code === "PGRST116") setAccessEnded(true);
        sync.fail(e, true);
      }
    };
    const channel = guest ? null : requireCloud()
      .channel(`project:${project.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rp_projects",
          filter: `id=eq.${project.id}`,
        },
        (payload) => {
          try {
            sync.receive(validateProject(payload.new));
            setBlocked(!!payload.new.archived);
          } catch (e) {
            sync.fail(e, true);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void refresh();
      });
    const loop = new CollaborationLoop(async cursor => {
      try {
        const result = check(await requireCloud().rpc("rp_collaborate", { p_project: project.id, p_session: session.current, p_revision: sync.base.revision, p_cursor: cursor, p_token: guest ?? null }));
        if (sync.disposed) return;
        const statusChanged = sync.role !== result.role || (!sync.conflict && !!sync.error);
        sync.role = result.role;
        if (!sync.conflict) sync.error = "";
        setBlocked(false);
        setPresenceStatus("Live collaboration");
        const nextPeers = safePeers(result.peers);
        setPeers(previous => same(previous, nextPeers) ? previous : nextPeers);
        if (result.project) sync.receive(validateProject(result.project));
        if (statusChanged) render(n => n + 1);
      } catch (e) {
        if (sync.disposed) return;
        if (["42501", "PGRST116"].includes((e as any).code)) { setAccessEnded(true); setBlocked(true); loop.stop(); }
        else if ((e as any).code === "PGRST202") {
          // A room opened before a migration must recover once its RPC becomes available.
          loop.retryAfter(5000);
          setPresenceStatus("Collaboration is waiting for the database update. Retrying…");
        }
        else {
          loop.retryAfter(3000);
          setPresenceStatus(`Collaboration interrupted: ${message(e)}. Retrying…`);
        }
      }
    });
    presence.current = loop;
    loop.wake();
    const visible = () => { if (!document.hidden) { loop.point(null); void refresh(); } };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    // Polling covers websocket disconnects and access revocation; cursor updates batch revision checks.
    const interval = setInterval(() => { if (!document.hidden) void refresh(); }, 5000);
    return () => {
      sync.dispose();
      clearInterval(interval);
      loop.stop();
      presence.current = null;
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", visible);
      if (channel) void requireCloud().removeChannel(channel);
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", up, true);
      window.removeEventListener("blur", blur);
      window.removeEventListener("beforeunload", unload);
    };
  }, [sync]);
  useEffect(() => {
    try {
      if (sync.dirty)
        localStorage.setItem(
          key,
          JSON.stringify({ version: 1, document: sync.draft }),
        );
    } catch {}
  });
  useEffect(() => {
    if (!guest || !expiresAt) return;
    const deadline = Date.parse(expiresAt);
    const checkExpiry = () => { if (Date.now() >= deadline) { setAccessEnded(true); setBlocked(true); presence.current?.stop(); } };
    checkExpiry();
    const interval = setInterval(checkExpiry, 500);
    return () => clearInterval(interval);
  }, [guest, expiresAt]);
  if (accessEnded) return <main className="cloud-page"><h1>Access ended</h1><p>This link has expired, was revoked, or you no longer have access. Ask the owner for a new link.</p>{sync.dirty && <button onClick={() => downloadDocument(sync.draft, project.title)}>Download unsaved work</button>}<button onClick={() => go()}>Open RoomPlan</button></main>;
  return (
    <div className="cloud-editor">
      <header className="cloud-bar">
        <button
          onClick={() => {
            if (
              !sync.dirty ||
              confirm(
                "Leave this project with unsaved edits? Choose Cancel to stay and export your work first.",
              )
            )
              go();
          }}
        >
          Projects
        </button>
        <strong>{sync.base.title}</strong>
        {guest && <small>Guest · {sync.role === "viewer" ? "Can view" : "Can edit"}{expiresAt ? ` · Ends ${new Date(expiresAt).toLocaleString()}` : " · No expiry"}</small>}
        <span>
          {sync.role === "viewer"
            ? "View only"
            : blocked
              ? "Editing unavailable"
              : sync.status}
        </span>
        <button onClick={() => downloadDocument(sync.draft, project.title)}>
          Export
        </button>
        {sync.role === "owner" && (
          <button onClick={() => setSharing(true)}>Share</button>
        )}
      </header>
      <div className="collaboration-people" role="status">{presenceStatus}<small> · Cursors appear when others move inside the same 2D or 3D view.</small></div>
      {peers.length > 0 && <div className="collaboration-people" aria-label={`${peers.length} other people in this project`}>{peers.slice(0,4).map(p => <span key={p.id} className="collaboration-person" style={{color:cursorColor(p.id)}}>{p.name}</span>)}{peers.length>4 && <small>+{peers.length-4} more</small>}</div>}
      {recovery && (
        <div className="cloud-error">
          A recovery copy exists on this device.
          <button
            onClick={() => {
              const raw = localStorage.getItem(key);
              if (raw) {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(
                  new Blob([raw], { type: "application/json" }),
                );
                a.download = "RoomPlan-recovery.json";
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 1000);
              }
            }}
          >
            Download recovery
          </button>
          <button onClick={() => setRecovery(false)}>Dismiss</button>
        </div>
      )}
      {sync.error && (
        <div role="alert" className="cloud-error">
          {sync.error}
          <button onClick={() => void sync.retry()}>Retry</button>
          {!guest && <button
            onClick={async () => {
              try {
                go(
                  "project",
                  await createProject(`${project.title} copy`, sync.draft),
                );
              } catch (e) {
                sync.fail(e, true);
              }
            }}
          >
            Save my work as a copy
          </button>}
        </div>
      )}
      <div className="cloud-canvas">
        <App
          embedded
          initial={project.document}
          external={sync.external}
          readOnly={sync.role === "viewer" || blocked || project.archived}
          cloudStatus={sync.status}
          onDocument={onDocument}
          collaborators={peers}
          onCursor={onCursor}
        />
      </div>
      {sharing && (
        <SharePanel project={project} close={() => setSharing(false)} />
      )}
    </div>
  );
}
export function SharePanel({
  project,
  close,
}: {
  project: Project;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [members, setMembers] = useState<any[]>([]),
    [invites, setInvites] = useState<any[]>([]),
    [email, setEmail] = useState(""),
    [role, setRole] = useState("viewer"),
    [error, setError] = useState(""),
    [link, setLink] = useState(""),
    [busy, setBusy] = useState(false),
    [delivery, setDelivery] = useState("");
  const [duration, setDuration] = useState("24h"), [links, setLinks] = useState<any[]>([]);
  const refresh = async () => {
    setLinks(check(await requireCloud().from("rp_guest_links").select("*").eq("project_id", project.id).order("created_at", { ascending: false })));
    setMembers(
      check(
        await requireCloud()
          .from("rp_members")
          .select("*")
          .eq("project_id", project.id),
      ),
    );
    setInvites(
      check(
        await requireCloud()
          .from("rp_invitations")
          .select("*")
          .eq("project_id", project.id),
      ),
    );
  };
  useEffect(() => {
    dialog.current?.showModal();
    void refresh().catch((e) => setError(message(e)));
    const element = dialog.current;
    return () => element?.close();
  }, []);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <dialog ref={dialog} className="cloud-dialog" onCancel={close}>
      <div className="cloud-heading">
        <h2>Share {project.title}</h2>
        <button aria-label="Close sharing" onClick={close}>
          Close
        </button>
      </div>
      <p>
        Invite a verified account. Viewers can explore; editors can change the
        plan.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            let invitation: any;
            if ((import.meta as any).env.VITE_INVITE_EMAIL_ENABLED === "true") {
              const result = check(
                await requireCloud().functions.invoke("invite-project", {
                  body: { projectId: project.id, email, role },
                }),
              );
              if (result.error) throw new Error(result.error);
              invitation = result.invitation;
              setDelivery(
                result.delivery === "sent"
                  ? "Invitation email sent."
                  : "Invitation created, but email was not delivered. Copy its link below.",
              );
            } else {
              invitation = check(
                await requireCloud().rpc("rp_invite", {
                  p_project: project.id,
                  p_email: email,
                  p_role: role,
                }),
              );
              setDelivery("Invitation created. Copy its link below.");
            }
            setLink(href("invite", invitation.token));
            setEmail("");
          });
        }}
      >
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <select
          aria-label="Invitation permission"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="viewer">Can view</option>
          <option value="editor">Can edit</option>
        </select>
        <button disabled={busy} className="primary">
          Create invitation
        </button>
      </form>
      <p>
        Invitations appear in the recipient dashboard. You can also copy and
        send an invitation link.
      </p>
      {delivery && <p role="status">{delivery}</p>}
      {link && (
        <label>
          Share link
          <input readOnly value={link} onFocus={(e) => e.target.select()} />
          <button
            onClick={() =>
              void navigator.clipboard
                .writeText(link)
                .catch((e) => setError(message(e)))
            }
          >
            Copy link
          </button>
        </label>
      )}
      <h3>People with access</h3>
      <p>You · Owner</p>
      {members.map((m) => (
        <div className="cloud-member" key={m.user_id}>
          <span>{m.email}</span>
          <select
            aria-label={`Access for ${m.email}`}
            value={m.role}
            disabled={busy}
            onChange={(e) =>
              void run(async () => {
                check(
                  await requireCloud().rpc("rp_manage_member", {
                    p_project: project.id,
                    p_user: m.user_id,
                    p_role: e.target.value || null,
                  }),
                );
              })
            }
          >
            <option value="viewer">Can view</option>
            <option value="editor">Can edit</option>
            <option value="">Remove access</option>
          </select>
        </div>
      ))}
      <h3>Pending invitations</h3>
      {invites.map((i) => (
        <div className="cloud-member" key={i.id}>
          <span>
            {i.email} · {i.role}
          </span>
          <button onClick={() => setLink(href("invite", i.token))}>
            Get link
          </button>
          <button
            className="danger" disabled={busy}
            onClick={() =>
              void run(async () => {
                check(
                  await requireCloud().rpc("rp_revoke_invite", { p_id: i.id }),
                );
              })
            }
          >
            Revoke
          </button>
        </div>
      ))}
      <h3>Anyone with a link</h3>
      <p>
        No registration required. Anyone with this link gets its permission until it expires or you revoke it. An editor link allows changes to your plan.
      </p>
      <label>Link duration<select value={duration} onChange={e => setDuration(e.target.value)}>
        <option value="1h">1 hour</option><option value="24h">24 hours</option><option value="7d">7 days</option><option value="unlimited">Unlimited</option>
      </select></label>
      <div className="cloud-actions">
        {["viewer", "editor"].map((r) => (
          <button
            key={r}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const created = check(
                  await requireCloud().rpc("rp_create_guest_link", {
                    p_project: project.id,
                    p_role: r,
                    p_duration: duration,
                  }),
                );
                setLink(guestHref(created.token));
              })
            }
          >
            Create {r} link
          </button>
        ))}
      </div>
      {links.map(l => {
        const inactive = l.revoked_at || (l.expires_at && Date.parse(l.expires_at) <= Date.now());
        return <div className="cloud-member" key={l.token}>
          <span>{l.role === 'editor' ? 'Can edit' : 'Can view'} · {l.revoked_at ? 'Revoked' : inactive ? 'Expired' : l.expires_at ? `Ends ${new Date(l.expires_at).toLocaleString()}` : 'Unlimited'}</span>
          {!inactive && <><button onClick={() => setLink(guestHref(l.token))}>Get link</button><button className="danger" disabled={busy} onClick={() => void run(async () => {
            check(await requireCloud().rpc('rp_revoke_guest_link', { p_token: l.token }));
            if (link === guestHref(l.token)) setLink('');
          })}>Revoke link</button></>}
        </div>;
      })}
      {error && <p role="alert">{error}</p>}
    </dialog>
  );
}
