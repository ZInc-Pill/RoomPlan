import { applyChanges, changesBetween, same } from "./patches";
import type { PlanDocument } from "../utils/documentHistory";
import { parseProject } from "../utils/projectFile";
import type { Project, Role } from "./api";

export type SyncTransport = {
  save: (
    id: string,
    changes: ReturnType<typeof changesBetween>,
  ) => Promise<Project>;
  load: (id: string) => Promise<Project>;
};
/** One in-flight request; server is authoritative. Retry is idempotent at entity level. */
export class ProjectSync {
  base: Project;
  draft: PlanDocument;
  documentEditing = false;
  pointerEditing = false;
  saving = false;
  conflict = false;
  disposed = false;
  status = "Saved to cloud";
  role: Role;
  external: PlanDocument;
  error = "";
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queued: Project | undefined;
  constructor(
    project: Project,
    role: Role,
    private transport: SyncTransport,
    private notify: () => void,
  ) {
    this.base = project;
    this.draft = project.document;
    this.external = project.document;
    this.role = role;
  }
  private acknowledgement: { saved: Project; sent: PlanDocument } | undefined;
  get editing() {
    return this.documentEditing || this.pointerEditing;
  }
  get dirty() {
    return !same(this.base.document, this.draft);
  }
  changed(document: PlanDocument, editing: boolean) {
    if (this.role === "viewer" || this.disposed) return;
    this.draft = document;
    this.documentEditing = editing;
    if (this.dirty && !this.conflict) this.status = "Unsaved changes";
    this.settle();
    this.notify();
    this.schedule();
  }
  setEditing(value: boolean) {
    this.pointerEditing = value;
    this.settle();
    this.schedule();
  }
  private settle() {
    if (this.disposed || this.editing || this.saving || this.conflict) return;
    if (this.acknowledgement) {
      const { saved, sent } = this.acknowledgement;
      this.acknowledgement = undefined;
      try {
        this.accept(saved, sent);
      } catch (e) {
        this.fail(e, true);
        return;
      }
    }
    if (this.queued) {
      const q = this.queued;
      this.queued = undefined;
      this.receive(q);
    }
  }
  private accept(saved: Project, sent: PlanDocument) {
    const merged = applyChanges(
      saved.document,
      changesBetween(sent, this.draft),
    );
    parseProject(JSON.stringify(merged));
    this.base = saved;
    this.draft = merged;
    this.external = merged;
    this.error = "";
    this.status = this.dirty ? "Unsaved changes" : "Saved to cloud";
    this.notify();
  }
  receive(project: Project) {
    if (this.disposed || project.revision <= this.base.revision) return;
    if (this.editing || this.saving || this.conflict) {
      this.queued = project;
      return;
    }
    try {
      const merged = applyChanges(
        project.document,
        changesBetween(this.base.document, this.draft),
      );
      // Validate the combined wall/opening geometry before it reaches the editor.
      parseProject(JSON.stringify(merged));
      this.base = project;
      this.draft = merged;
      this.external = merged;
      this.error = "";
      this.status = this.dirty ? "Unsaved changes" : "Live · saved to cloud";
      this.notify();
      this.schedule();
    } catch (e) {
      this.fail(e, true);
    }
  }
  private schedule() {
    clearTimeout(this.timer);
    if (
      !this.disposed &&
      !this.editing &&
      !this.saving &&
      !this.conflict &&
      this.dirty &&
      this.role !== "viewer"
    )
      this.timer = setTimeout(() => void this.flush(), 450);
  }
  async flush() {
    if (
      this.disposed ||
      this.saving ||
      this.editing ||
      this.conflict ||
      !this.dirty ||
      this.role === "viewer"
    )
      return;
    this.saving = true;
    this.status = "Saving to cloud…";
    this.notify();
    const sent = this.draft;
    try {
      const saved = await this.transport.save(
        this.base.id,
        changesBetween(this.base.document, sent),
      );
      if (this.disposed) return;
      if (this.editing) this.acknowledgement = { saved, sent };
      else this.accept(saved, sent);
    } catch (e) {
      this.fail(e, true);
    } finally {
      this.saving = false;
      this.settle();
      if (!this.disposed) {
        this.notify();
        if (this.queued && !this.editing && !this.conflict) {
          const q = this.queued;
          this.queued = undefined;
          this.receive(q);
        }
        this.schedule();
      }
    }
  }
  fail(error: unknown, conflict = false) {
    if (this.disposed) return;
    this.error = error instanceof Error ? error.message : String(error);
    this.conflict = conflict;
    this.status = "Sync paused · your edits are retained";
    this.notify();
  }
  async retry() {
    try {
      const remote = await this.transport.load(this.base.id);
      this.conflict = false;
      this.error = "";
      if (remote.revision > this.base.revision) this.receive(remote);
      else this.schedule();
      this.notify();
    } catch (e) {
      this.fail(e, true);
    }
  }
  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
  }
}
