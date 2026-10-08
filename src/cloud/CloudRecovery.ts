import type { ProjectSync } from './ProjectSync';
import type { Project } from './api';
import type { PlanDocument } from '../utils/documentHistory';
import { parseProject } from '../utils/projectFile';
export type Recovery = { key: string; document: PlanDocument; base?: Project };
/** Each tab owns its checkpoint; acknowledging one tab never deletes another's work. */
export class CloudRecovery {
  readonly key: string;
  error = '';
  private restoredKey?: string;
  constructor(private storage: Storage, private prefix: string, session: string) {
    this.key = `${prefix}.${session}`;
  }
  pending(): Recovery[] {
    const copies: Recovery[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i)!;
      if (key === this.key || !(key === this.prefix || key.startsWith(`${this.prefix}.`))) continue;
      try {
        const value = JSON.parse(this.storage.getItem(key)!);
        const document = parseProject(JSON.stringify(value.document));
        const base = value.version === 2 ? value.base as Project : undefined;
        if (base) parseProject(JSON.stringify(base.document));
        copies.push({ key, document, base });
      } catch { /* Invalid/legacy data is left untouched. */ }
    }
    return copies;
  }
  markRestored(key: string) { this.restoredKey = key; }
  checkpoint(sync: ProjectSync) {
    // Checkpoint committed edits, not every animation frame of a gesture.
    if (sync.editing) return;
    try {
      if (sync.dirty) {
        this.storage.setItem(this.key, JSON.stringify({ version: 2, base: sync.base, document: sync.draft }));
      } else {
        this.storage.removeItem(this.key);
        if (this.restoredKey) { this.storage.removeItem(this.restoredKey); this.restoredKey = undefined; }
      }
      this.error = '';
    } catch {
      this.error = 'Local recovery storage is unavailable. Export your unsaved work before closing this page.';
    }
  }
}
