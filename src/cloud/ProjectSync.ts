import { applyChanges, changesBetween, same } from "./patches";
import type { PlanDocument } from "../utils/documentHistory";
import { parseProject } from "../utils/projectFile";
import type { Project, Role } from "./api";

export type SyncTransport = {
  save: (id: string, changes: ReturnType<typeof changesBetween>) => Promise<Project>;
  load: (id: string) => Promise<Project>;
};
export function saveError(error: unknown) {
  const value = error as { code?: string; message?: string };
  const text = value?.message || String(error);
  if (/jwt|session|refresh token/i.test(text) || value?.code === 'PGRST301')
    return `Your session expired. Sign in again, then retry. Your draft is retained. (${text})`;
  if (/unknown furniture|unknown.*type/i.test(text) || value?.code === 'PGRST202')
    return `The cloud database may need the latest RoomPlan migration. Your draft is retained. (${text})`;
  if (value?.code === '42501') return `You no longer have permission to save. Export your draft or ask the owner for edit access. (${text})`;
  if (/fetch|network/i.test(text)) return `Cannot reach cloud storage. Check your connection and retry. (${text})`;
  return text;
}
/** Serial, compare-before saves. Only acknowledged snapshots become the base. */
export class ProjectSync {
  base: Project;
  draft: PlanDocument;
  external: PlanDocument;
  role: Role;
  documentEditing = false;
  pointerEditing = false;
  saving = false;
  conflict = false;
  disposed = false;
  offline = false;
  error = '';
  checkpoint?: () => void;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queued: Project | undefined;
  private acknowledgement: { saved: Project; sent: PlanDocument } | undefined;
  private retrying = false;
  private requested = false;
  constructor(project: Project, role: Role, private transport: SyncTransport, private notify: () => void) {
    this.base = project;
    this.draft = this.external = project.document;
    this.role = role;
  }
  get editing() { return this.documentEditing || this.pointerEditing; }
  get dirty() { return !same(this.base.document, this.draft); }
  get lastSavedAt() { return this.base.updated_at; }
  get status() {
    if (this.offline) return 'Offline';
    if (this.saving || this.retrying || this.acknowledgement) return 'Saving…';
    if (this.error) return 'Save failed';
    return this.dirty ? 'Unsaved changes' : 'Saved to cloud';
  }
  private emit() { if (!this.disposed) { this.checkpoint?.(); this.notify(); } }
  changed(document: PlanDocument, editing: boolean) {
    if (this.role === 'viewer' || this.disposed) return;
    this.draft = document;
    this.documentEditing = editing;
    this.settle(); this.emit(); this.schedule();
  }
  setEditing(value: boolean) {
    this.pointerEditing = value;
    this.settle();
    if (!value) this.emit();
    this.schedule();
  }
  setOnline(online: boolean) {
    const reconnect = this.offline && online;
    this.offline = !online;
    this.emit();
    if (reconnect) void this.retry();
    else this.schedule();
  }
  private settle() {
    if (this.disposed || this.editing || this.saving || this.conflict || this.retrying) return;
    if (this.acknowledgement) {
      const { saved, sent } = this.acknowledgement;
      this.acknowledgement = undefined;
      try { this.accept(saved, sent); } catch (e) { this.fail(e, true); return; }
    }
    if (this.queued) {
      const q = this.queued; this.queued = undefined; this.receive(q);
    }
  }
  private accept(saved: Project, sent: PlanDocument) {
    if (saved.id !== this.base.id || saved.revision < this.base.revision)
      throw new Error('An outdated save response was received. Retry to reconcile your retained draft.');
    const merged = applyChanges(saved.document, changesBetween(sent, this.draft));
    parseProject(JSON.stringify(merged));
    this.base = saved; this.draft = this.external = merged; this.error = '';
    this.emit();
  }
  receive(project: Project) {
    if (this.disposed || project.id !== this.base.id || project.revision <= this.base.revision) return;
    if (this.editing || this.saving || this.conflict || this.retrying || this.acknowledgement) {
      if (!this.queued || project.revision > this.queued.revision) this.queued = project;
      return;
    }
    try {
      const merged = applyChanges(project.document, changesBetween(this.base.document, this.draft));
      parseProject(JSON.stringify(merged));
      this.base = project; this.draft = this.external = merged;
      // Presence/read success must not erase a failed write.
      if (!this.dirty) this.error = '';
      this.emit(); this.schedule();
    } catch (e) { this.fail(e, true); }
  }
  private schedule() {
    clearTimeout(this.timer);
    if (!this.disposed && !this.editing && !this.saving && !this.retrying && !this.acknowledgement &&
        !this.conflict && !this.error && !this.offline && this.dirty && this.role !== 'viewer' && !this.base.archived)
      this.timer = setTimeout(() => void this.flush(), this.requested ? 0 : 450);
  }
  async saveNow() {
    this.requested = true;
    if (this.error || this.conflict) await this.retry();
    else await this.flush();
  }
  async flush() {
    if (this.disposed || this.saving || this.retrying || this.editing || this.acknowledgement || this.offline ||
        this.conflict || this.error || !this.dirty || this.role === 'viewer' || this.base.archived) return;
    clearTimeout(this.timer);
    this.requested = false; this.saving = true; this.emit();
    const sent = this.draft;
    try {
      const saved = await this.transport.save(this.base.id, changesBetween(this.base.document, sent));
      if (this.disposed) return;
      if (this.editing) this.acknowledgement = { saved, sent };
      else this.accept(saved, sent);
    } catch (e) {
      this.fail(e, (e as {code?: string})?.code === '40001' || /collaborator|outdated save/i.test(String(e)));
    } finally {
      this.saving = false;
      this.settle(); this.emit(); this.schedule();
    }
  }
  fail(error: unknown, conflict = false) {
    if (this.disposed) return;
    this.error = saveError(error); this.conflict = conflict;
    clearTimeout(this.timer); this.emit();
  }
  async retry() {
    if (this.disposed || this.saving || this.retrying || this.offline || this.role === 'viewer') return;
    this.retrying = true; this.emit();
    try {
      const remote = await this.transport.load(this.base.id);
      if (this.disposed) return;
      this.conflict = false; this.error = '';
      // Queue while retrying so a newer realtime snapshot always wins.
      this.receive(remote);
    } catch (e) { this.fail(e); }
    finally { this.retrying = false; this.settle(); this.emit(); }
    if (!this.error) { this.requested = true; this.schedule(); await this.flush(); }
  }
  restore(base: Project, draft: PlanDocument) {
    if (this.role === 'viewer' || this.editing || this.saving || this.dirty || base.id !== this.base.id) return false;
    try {
      const merged = applyChanges(this.base.document, changesBetween(base.document, draft));
      parseProject(JSON.stringify(merged));
      this.draft = this.external = merged; this.emit(); this.schedule(); return true;
    } catch (e) { this.fail(e, true); return false; }
  }
  dispose() { this.disposed = true; clearTimeout(this.timer); }
}
