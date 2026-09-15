import { useState, useCallback } from 'react';
import { Point, PlacedItem, Wall, Floor, CommentType } from '../types';
import { getPolygonCentroid } from '../utils/geometry';

export interface UseCanvasSelectionOptions {
  mode: string;
  items: PlacedItem[];
  walls: Wall[];
  floors: Floor[];
  comments: CommentType[];
  selectedItemIds: string[];
  selectedWallId: string | null;
  selectedFloorId: string | null;
  selectedCommentId: string | null;
  onSelect: (itemIds: string[], wallId: string | null, floorId: string | null, commentId: string | null) => void;
}

export interface UseCanvasSelectionReturn {
  selectionBox: { start: Point; current: Point } | null;
  selectItem: (e: React.PointerEvent | React.MouseEvent, itemId: string) => void;
  selectWall: (e: React.PointerEvent | React.MouseEvent, wallId: string) => void;
  selectFloor: (e: React.PointerEvent | React.MouseEvent, floorId: string) => void;
  selectComment: (e: React.PointerEvent | React.MouseEvent, commentId: string) => void;
  clearSelection: () => void;
  handlePointerDown: (e: React.PointerEvent, pt: Point, containerTarget: EventTarget | null) => { handled: boolean };
  handlePointerMove: (e: React.PointerEvent, pt: Point) => { handled: boolean };
  handlePointerUp: (e: React.PointerEvent) => { handled: boolean };
  cancelSelectionBox: () => void;
}

export function useCanvasSelection({
  mode,
  items,
  walls,
  floors,
  comments, // We might not need this right now, but good to have
  selectedItemIds,
  selectedWallId,
  selectedFloorId,
  selectedCommentId,
  onSelect,
}: UseCanvasSelectionOptions): UseCanvasSelectionReturn {
  const [selectionBox, setSelectionBox] = useState<{ start: Point; current: Point } | null>(null);

  const selectItem = useCallback((e: React.PointerEvent | React.MouseEvent, itemId: string) => {
    let newSelection = [...selectedItemIds];
    if (e.shiftKey || e.metaKey) {
      if (newSelection.includes(itemId)) {
        newSelection = newSelection.filter(id => id !== itemId);
      } else {
        newSelection.push(itemId);
      }
    } else {
      if (!newSelection.includes(itemId)) {
        newSelection = [itemId];
      }
    }
    onSelect(newSelection, null, null, null);
  }, [selectedItemIds, onSelect]);

  const selectWall = useCallback((e: React.PointerEvent | React.MouseEvent, wallId: string) => {
    onSelect(e.shiftKey ? selectedItemIds : [], wallId, e.shiftKey ? selectedFloorId : null, null);
  }, [selectedItemIds, selectedFloorId, onSelect]);

  const selectFloor = useCallback((e: React.PointerEvent | React.MouseEvent, floorId: string) => {
    onSelect(e.shiftKey ? selectedItemIds : [], e.shiftKey ? selectedWallId : null, floorId, null);
  }, [selectedItemIds, selectedWallId, onSelect]);

  const selectComment = useCallback((e: React.PointerEvent | React.MouseEvent, commentId: string) => {
    onSelect([], null, null, commentId);
  }, [onSelect]);

  const clearSelection = useCallback(() => {
    onSelect([], null, null, null);
  }, [onSelect]);

  const cancelSelectionBox = useCallback(() => {
    setSelectionBox(null);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, pt: Point, containerTarget: EventTarget | null): { handled: boolean } => {
    if (mode === 'SELECT') {
      const target = e.target as Element;
      const isBackground = target === containerTarget || target.tagName === 'svg' || target.id === 'grid-bg' || target.id === 'transform-layer';
      if (isBackground) {
        clearSelection();
        setSelectionBox({ start: pt, current: pt });
        return { handled: true };
      }
    }
    return { handled: false };
  }, [mode, clearSelection]);

  const handlePointerMove = useCallback((e: React.PointerEvent, pt: Point): { handled: boolean } => {
    if (selectionBox) {
      setSelectionBox({ ...selectionBox, current: pt });
      return { handled: true };
    }
    return { handled: false };
  }, [selectionBox]);

  const handlePointerUp = useCallback((e: React.PointerEvent): { handled: boolean } => {
    if (selectionBox) {
      const minX = Math.min(selectionBox.start.x, selectionBox.current.x);
      const maxX = Math.max(selectionBox.start.x, selectionBox.current.x);
      const minY = Math.min(selectionBox.start.y, selectionBox.current.y);
      const maxY = Math.max(selectionBox.start.y, selectionBox.current.y);
      
      const newSelectedIds: string[] = e.shiftKey ? [...selectedItemIds] : [];
      let selWallId = e.shiftKey ? selectedWallId : null;
      let selFloorId = e.shiftKey ? selectedFloorId : null;
      
      items.forEach(item => {
        if (item.x >= minX && item.x <= maxX && item.y >= minY && item.y <= maxY) {
          if (!newSelectedIds.includes(item.id)) {
            newSelectedIds.push(item.id);
          }
        }
      });
      
      walls.forEach(w => {
         const cx = (w.start.x + w.end.x)/2;
         const cy = (w.start.y + w.end.y)/2;
         if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
           selWallId = w.id; // selects one wall inside box
         }
      });
      
      floors.forEach(f => {
         const c = getPolygonCentroid(f.points);
         if (c.x >= minX && c.x <= maxX && c.y >= minY && c.y <= maxY) {
           selFloorId = f.id; // selects one floor inside box
         }
      });

      onSelect(newSelectedIds, selWallId, selFloorId, null);
      setSelectionBox(null);
      return { handled: true };
    }
    return { handled: false };
  }, [selectionBox, selectedItemIds, selectedWallId, selectedFloorId, items, walls, floors, onSelect]);

  return {
    selectionBox,
    selectItem,
    selectWall,
    selectFloor,
    selectComment,
    clearSelection,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    cancelSelectionBox,
  };
}
