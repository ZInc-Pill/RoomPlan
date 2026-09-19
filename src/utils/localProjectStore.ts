import { AUTOSAVE_KEY, BACKUP_KEY, parseProject, serializeProject } from './projectFile';
import type { PlanDocument } from './documentHistory';

export interface ProjectSnapshot { document: PlanDocument; revision: string }
export class ProjectConflictError extends Error {
  constructor() { super('The saved project changed. Export your work before reloading.'); }
}

// Browser-only adapter. A cloud repository must enforce revisions and ownership on
// the server; localStorage cannot provide atomic multi-tab compare-and-swap.
export function createLocalProjectStore(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  return {
    revision: () => storage.getItem(AUTOSAVE_KEY),
    load(): ProjectSnapshot | null {
      const revision = storage.getItem(AUTOSAVE_KEY);
      return revision === null ? null : { document: parseProject(revision), revision };
    },
    loadBackup(): PlanDocument | null {
      const backup = storage.getItem(BACKUP_KEY);
      return backup === null ? null : parseProject(backup);
    },
    save(document: PlanDocument, expectedRevision: string | null): string {
      const next = serializeProject(document);
      parseProject(next);
      const previous = storage.getItem(AUTOSAVE_KEY);
      if (previous !== expectedRevision) throw new ProjectConflictError();
      // Backup first: quota failures must not replace the current project.
      if (previous !== null) storage.setItem(BACKUP_KEY, previous);
      storage.setItem(AUTOSAVE_KEY, next);
      return next;
    },
  };
}

export const browserProjectStore = () => createLocalProjectStore(window.localStorage);
