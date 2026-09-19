import { useEffect, useRef, useState } from 'react';
import { AUTOSAVE_KEY } from '../utils/projectFile';
import { browserProjectStore, ProjectConflictError } from '../utils/localProjectStore';
import type { PlanDocument } from '../utils/documentHistory';

export function readSavedProject(): PlanDocument | undefined {
  try { return browserProjectStore().load()?.document; } catch { return undefined; }
}

export function useProjectAutosave(document: PlanDocument, editing: boolean) {
  const [status, setStatus] = useState('Saved on this device');
  const latest = useRef(document);
  const blocked = useRef(false);
  const revision = useRef<string | null>(null);
  const persisted = useRef(JSON.stringify(document));
  const save = useRef(() => {});
  save.current = () => {
    if (blocked.current || persisted.current === JSON.stringify(latest.current)) return;
    try {
      revision.current = browserProjectStore().save(latest.current, revision.current);
      persisted.current = JSON.stringify(latest.current);
      setStatus('Saved on this device');
    } catch (error) {
      if (error instanceof ProjectConflictError) { blocked.current = true; setStatus(error.message); }
      else setStatus('Could not autosave — export JSON to keep your work');
    }
  };
  useEffect(() => {
    try {
      revision.current = browserProjectStore().revision();
      const saved = browserProjectStore().load();
      if (saved) { setStatus('Recovered saved project'); }
      else setStatus('Local autosave ready');
    } catch { setStatus('Saved project could not be recovered — original data preserved'); }
    const hidden = () => { if (documentVisibility()) save.current(); };
    const changed = (event: StorageEvent) => {
      if (event.key === AUTOSAVE_KEY) { blocked.current = true; setStatus('Changed in another tab — export your work, then reload'); }
    };
    const flush = () => save.current();
    window.addEventListener('pagehide', flush);
    documentGlobal().addEventListener('visibilitychange', hidden);
    window.addEventListener('storage', changed);
    return () => { window.removeEventListener('pagehide', flush); documentGlobal().removeEventListener('visibilitychange', hidden); window.removeEventListener('storage', changed); };
  }, []);
  useEffect(() => {
    if (editing) return;
    latest.current = document;
    if (persisted.current === JSON.stringify(document) || blocked.current) return;
    setStatus('Saving…');
    const timer = setTimeout(() => save.current(), 500);
    return () => clearTimeout(timer);
  }, [document, editing]);
  return status;
}
// Keep the browser document distinct from the editor document.
const documentGlobal = () => window.document;
const documentVisibility = () => window.document.visibilityState === 'hidden';
