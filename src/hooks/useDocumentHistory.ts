import { useCallback, useEffect, useReducer } from 'react';
import { documentHistory, initialHistory, type PlanDocument } from '../utils/documentHistory';

import { readSavedProject } from './useProjectAutosave';

export function useDocumentHistory() {
  const [state, dispatch] = useReducer(documentHistory, undefined, () => ({ ...initialHistory(), present: readSavedProject() || initialHistory().present }));
  useEffect(() => {
    const pointers = new Set<number>();
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      pointers.add(event.pointerId);
      dispatch({ type: 'begin' });
    };
    const up = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      // Commit after the editor's pointer-up handler applies its final geometry.
      queueMicrotask(() => { if (!pointers.size) dispatch({ type: 'commit' }); });
    };
    const cancel = () => {
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
  }, []);
  const update = useCallback((change: (document: PlanDocument) => PlanDocument) => dispatch({ type: 'update', update: change }), []);
  return { state, update, undo: () => dispatch({ type: 'undo' }), redo: () => dispatch({ type: 'redo' }) };
}
