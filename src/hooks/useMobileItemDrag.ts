import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlacedItem } from '../types';
import type { UseFurnitureInteractionOptions } from './useFurnitureInteraction';
import { startMobileDrag, moveMobileDrag, resolveMobileDrop, type MobileDragSession } from '../utils/mobileItemDrag';
import type { OpeningDragPreview } from '../utils/openingDrag';

export function useMobileItemDrag(options: UseFurnitureInteractionOptions & { onCommit: (items: PlacedItem[]) => void }) {
  const latest = useRef(options); latest.current = options;
  const session = useRef<MobileDragSession | null>(null);
  const frame = useRef<number | null>(null);
  const point = useRef({ x: 0, y: 0 });
  const capture = useRef<Element | null>(null);
  const [visual, setVisual] = useState<{ items: PlacedItem[]; preview: OpeningDragPreview | null } | null>(null);
  const clear = useCallback(() => {
    const old = session.current;
    session.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (old && capture.current?.hasPointerCapture(old.pointerId)) capture.current.releasePointerCapture(old.pointerId);
    capture.current = null;
    setVisual(null);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') clear(); };
    window.addEventListener('blur', clear);
    window.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', clear);
    return () => {
      window.removeEventListener('blur', clear); window.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', clear);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [clear]);
  useEffect(() => { clear(); }, [options.mode, clear]);
  const down = (event: React.PointerEvent, item: PlacedItem) => {
    const o = latest.current;
    if (session.current || o.mode !== 'SELECT' || !event.isPrimary || event.button !== 0) return;
    event.stopPropagation(); event.preventDefault();
    const start = o.getPoint(event);
    session.current = startMobileDrag(event.pointerId, start, item, o.items, o.selectedItemIds);
    point.current = start;
    capture.current = event.currentTarget;
    event.currentTarget.setPointerCapture(event.pointerId);
    o.selectItem(event, item.id);
  };
  const move = (event: React.PointerEvent) => {
    if (!session.current) return false;
    if (session.current.pointerId !== event.pointerId) return true;
    point.current = latest.current.getPoint(event);
    if (frame.current === null) frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const s = session.current, o = latest.current;
      if (!s) return;
      const raw = moveMobileDrag(s, point.current, o.zoom);
      if (raw) {
        const preview = raw.length === 1 ? resolveMobileDrop(raw, o.items, o.walls, o.zoom, o.currentGridSize, true).preview : null;
        setVisual({ items: raw, preview });
      }
    });
    return true;
  };
  const up = (event: React.PointerEvent) => {
    const s = session.current, o = latest.current;
    if (!s) return false;
    if (s.pointerId !== event.pointerId) return true;
    // Read the actual release point, even if the last animation frame has not run yet.
    if (event.type === 'pointerup') {
      const raw = moveMobileDrag(s, o.getPoint(event), o.zoom);
      if (raw) o.onCommit(resolveMobileDrop(raw, o.items, o.walls, o.zoom, o.currentGridSize, !!o.freeDrag).items);
    }
    clear();
    return true;
  };
  return { down, move, up, cancel: clear, active: () => !!session.current, isDragging: (id: string) => session.current?.originals.some(item => item.id === id) ?? false, visual };
}
