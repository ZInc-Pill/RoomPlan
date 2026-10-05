import { useCallback, useEffect, useReducer, useRef } from 'react';
import { documentHistory, initialHistory, type PlanDocument } from '../utils/documentHistory';

import { readSavedProject } from './useProjectAutosave';
import { MobileDragHistoryGate } from '../utils/mobileGestureOwnership';

export function useDocumentHistory(initial?: PlanDocument, external?: PlanDocument, readOnly = false) {
  const [state, dispatch] = useReducer(documentHistory, undefined, () => ({ ...initialHistory(), present: initial ?? readSavedProject() ?? initialHistory().present }));
  useEffect(() => { if (readOnly) dispatch({ type: 'cancel' }); }, [readOnly]);
  useEffect(() => {
    // View navigation must not start document transactions or defer remote comments.
    if (readOnly) return;
    const pointers = new Set<number>();
    const mobileDrags = new MobileDragHistoryGate();
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (mobileDrags.down(event.pointerId, event.target instanceof Element && !!event.target.closest('[data-mobile-drag-object]'))) return;
      pointers.add(event.pointerId);
      dispatch({ type: 'begin' });
    };
    const up = (event: PointerEvent) => {
      if (mobileDrags.end(event.pointerId)) return;
      pointers.delete(event.pointerId);
      // Commit after the editor's pointer-up handler applies its final geometry.
      queueMicrotask(() => { if (!pointers.size) dispatch({ type: 'commit' }); });
    };
    const cancel = (event: Event) => {
      if (event instanceof PointerEvent && mobileDrags.end(event.pointerId)) return;
      mobileDrags.clear();
      pointers.clear();
      queueMicrotask(() => dispatch({ type: 'cancel' }));
    };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', cancel, true);
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', cancel, true);
      window.removeEventListener('blur', cancel);
    };
  }, [readOnly]);
  const appliedExternal = useRef(external);
  useEffect(() => { if (external && external !== appliedExternal.current && !state.start) { appliedExternal.current = external; dispatch({ type: 'remote', document: external }); } }, [external, Boolean(state.start)]);
  const update = useCallback((change: (document: PlanDocument) => PlanDocument, exactPlacement = false) => { if (!readOnly) dispatch({ type: 'update', update: change, exactPlacement }); }, [readOnly]);
  return { state, update, undo: () => { if (!readOnly) dispatch({ type: 'undo' }); }, redo: () => { if (!readOnly) dispatch({ type: 'redo' }); } };
}
