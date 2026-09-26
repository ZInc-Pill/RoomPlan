import { reconcileOpenings, openingValidationError } from './openingAttachment';
import type { Wall, Floor, PlacedItem, CommentType } from '../types';

export type PlanDocument = { walls: Wall[]; floors: Floor[]; items: PlacedItem[]; comments: CommentType[] };
export type HistoryState = { error?: string; past: PlanDocument[]; present: PlanDocument; future: PlanDocument[]; start: PlanDocument | null };
export type HistoryAction =
  | { type: 'update'; update: (document: PlanDocument) => PlanDocument; exactPlacement?: boolean }
  | { type: 'begin' | 'commit' | 'cancel' | 'undo' | 'redo' };
export const emptyDocument = (): PlanDocument => ({ walls: [], floors: [], items: [], comments: [] });
export const initialHistory = (): HistoryState => ({ past: [], present: emptyDocument(), future: [], start: null });
const equal = (a: PlanDocument, b: PlanDocument) => a === b || JSON.stringify(a) === JSON.stringify(b);
const append = (past: PlanDocument[], document: PlanDocument) => [...past, document].slice(-100);

export function documentHistory(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'begin': return state.start ? state : { ...state, start: state.present };
    case 'update': {
      const requested = action.update(state.present);
      // A drag has already resolved its target. Validate it without applying a second snap policy.
      const present = action.exactPlacement
        ? (openingValidationError(requested) ? state.present : requested)
        : reconcileOpenings(state.present, requested);
      if (present === state.present && requested !== state.present) return { ...state, error: 'Edit not applied: an attached opening would overlap another opening or no longer fit its wall.' };
      if (present === state.present) return state;
      if (state.start) return { ...state, present, error: undefined };
      if (equal(present, state.present)) return state;
      return { ...state, past: append(state.past, state.present), present, future: [], error: undefined };
    }
    case 'commit':
      if (!state.start) return state;
      return equal(state.start, state.present)
        ? { ...state, present: state.start, start: null }
        : { ...state, past: append(state.past, state.start), future: [], start: null };
    case 'cancel': return state.start ? { ...state, present: state.start, start: null } : state;
    case 'undo': {
      const settled = documentHistory(state, { type: 'commit' });
      if (!settled.past.length) return settled;
      return { past: settled.past.slice(0, -1), present: settled.past.at(-1)!, future: [settled.present, ...settled.future], start: null };
    }
    case 'redo': {
      const settled = documentHistory(state, { type: 'commit' });
      if (!settled.future.length) return settled;
      return { past: append(settled.past, settled.present), present: settled.future[0], future: settled.future.slice(1), start: null };
    }
  }
}
