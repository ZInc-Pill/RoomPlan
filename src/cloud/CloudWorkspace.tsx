import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import App from "../App";
import { supabase, googleEnabled, requireCloud } from "./client";
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
  type Project,
  type ProjectCard,
  type Role,
} from "./api";
import { ProjectSync } from "./ProjectSync";
import { readSavedProject } from "../hooks/useProjectAutosave";
import "./cloud.css";
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
  const params = new URLSearchParams(location.search);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
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
                  options: { emailRedirectTo: location.href },
                }),
              );
              setNotice("Check your email for your sign-in link.");
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
        {googleEnabled && (
          <button
            onClick={async () => {
              try {
                check(
                  await requireCloud().auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: location.href },
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
function Dashboard({ user }: { user: User }) {
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
        {projects
          .filter(
            (p) =>
              p.title.toLowerCase().includes(query.toLowerCase()) &&
              (filter === "archived" ? p.archived : !p.archived) &&
              (filter === "own"
                ? p.owner_id === user.id
                : filter === "shared"
                  ? p.owner_id !== user.id
                  : true),
          )
          .map((p) => (
            <article key={p.id} className="cloud-card">
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
      {!projects.length && !busy && !error && (
        <p>Create your first room plan to get started.</p>
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
function CloudEditor({
  project,
  role,
  user,
}: {
  project: Project;
  role: Role;
  user: User;
}) {
  const [, render] = useState(0),
    [sharing, setSharing] = useState(false),
    [blocked, setBlocked] = useState(false),
    [recovery, setRecovery] = useState(false);
  const syncRef = useRef<ProjectSync | null>(null);
  if (!syncRef.current)
    syncRef.current = new ProjectSync(
      project,
      role,
      { save: saveChanges, load: loadProject },
      () => render((n) => n + 1),
    );
  const sync = syncRef.current,
    key = `roomplan.recovery.${user.id}.${project.id}`;
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
        const p = await loadProject(project.id);
        const r = await projectRole(p, user.id);
        sync.role = r;
        setBlocked(p.archived);
        sync.receive(p);
        render((n) => n + 1);
      } catch (e) {
        setBlocked(true);
        sync.fail(e, true);
      }
    };
    const channel = requireCloud()
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
    const interval = setInterval(() => void refresh(), 15000);
    return () => {
      sync.dispose();
      clearInterval(interval);
      void requireCloud().removeChannel(channel);
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
          <button
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
          </button>
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
        />
      </div>
      {sharing && (
        <SharePanel project={project} close={() => setSharing(false)} />
      )}
    </div>
  );
}
function SharePanel({
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
  const refresh = async () => {
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
            disabled={busy}
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
        Requires sign-in. Links expire in seven days. Revoking a link prevents
        new joins; remove existing members above.
      </p>
      <div className="cloud-actions">
        {["viewer", "editor"].map((r) => (
          <button
            key={r}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const token = check(
                  await requireCloud().rpc("rp_share_link", {
                    p_project: project.id,
                    p_role: r,
                  }),
                );
                setLink(href("share", token));
              })
            }
          >
            New {r} link
          </button>
        ))}
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              check(
                await requireCloud().rpc("rp_share_link", {
                  p_project: project.id,
                  p_role: null,
                }),
              );
              setLink("");
            })
          }
        >
          Disable link
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </dialog>
  );
}
