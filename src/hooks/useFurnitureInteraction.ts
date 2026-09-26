import { isOpening } from '../utils/openingAttachment';
import { predictOpeningDrag, type OpeningDragPreview } from '../utils/openingDrag';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Point, PlacedItem, Wall } from '../types';
import { ITEM_CATALOG } from '../catalog';
import { cmToPx } from '../utils/coordinates';
import { getBoundingBox, BoundingBox } from '../utils/geometry';
import { calculateItemSnap, SnapResult } from '../utils/snapping';
import { getModifierState } from '../utils/input';

export const FURNITURE_DRAG_THRESHOLD = 5;

export function getItemBounds(item: PlacedItem): BoundingBox {
  const typeInfo = ITEM_CATALOG.find(i => i.id === item.typeId);
  const w = cmToPx(item.width || typeInfo?.width || 0);
  const d = cmToPx(item.depth || typeInfo?.depth || 0);
  return getBoundingBox(item.x, item.y, w, d, item.rotation);
}

export interface DraggingItemState {
  id: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  hasMoved: boolean;
}

export interface UseFurnitureInteractionOptions {
  freeDrag?: boolean;
  mode: string;
  items: PlacedItem[];
  walls: Wall[];
  selectedItemIds: string[];
  currentGridSize: number;
  zoom: number;
  getPoint: (e: { clientX: number; clientY: number }) => Point;
  selectItem: (e: React.PointerEvent | React.MouseEvent, itemId: string) => void;
  onUpdateItems: (items: PlacedItem[]) => void;
}

export interface UseFurnitureInteractionResult {
  draggingItem: DraggingItemState | null;
  isDraggingItem: (id: string) => boolean;
  handleItemPointerDown: (e: React.PointerEvent, item: PlacedItem) => void;
  handlePointerMove: (e: React.PointerEvent, pt: Point) => { handled: boolean };
  handlePointerUp: (e?: React.PointerEvent) => { handled: boolean };
  cancelDragging: () => void;
  getItemBounds: (item: PlacedItem) => BoundingBox;
  snapGuides: { x: number | null; y: number | null };
  openingPreview: OpeningDragPreview | null;
}

export function useFurnitureInteraction({
  freeDrag = false,
  mode,
  items,
  walls,
  selectedItemIds,
  currentGridSize,
  zoom,
  getPoint,
  selectItem,
  onUpdateItems,
}: UseFurnitureInteractionOptions): UseFurnitureInteractionResult {
  const [draggingItem, setDraggingItem] = useState<DraggingItemState | null>(null);
  const [openingPreview, setOpeningPreview] = useState<OpeningDragPreview | null>(null);
  const previewRef = useRef<OpeningDragPreview | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  const activeSnapXRef = useRef<number | null>(null);
  const activeSnapYRef = useRef<number | null>(null);

  // Keep references to avoid stale closure during rapid pointer events
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const wallsRef = useRef(walls);
  wallsRef.current = walls;
  const selectedItemIdsRef = useRef(selectedItemIds);
  selectedItemIdsRef.current = selectedItemIds;

  const handleItemPointerDown = useCallback((e: React.PointerEvent, item: PlacedItem) => {
    if (mode !== 'SELECT' || e.button !== 0 || !e.isPrimary) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    previewRef.current = null;
    setOpeningPreview(null);
    selectItem(e, item.id);
    const pt = getPoint(e);
    
    // Check if alt is held (free movement)
    const isFreeMove = freeDrag || getModifierState(e).alt;
    
    setDraggingItem({
      id: item.id,
      pointerId: e.pointerId,
      offsetX: pt.x - item.x,
      offsetY: pt.y - item.y,
      startX: pt.x,
      startY: pt.y,
      hasMoved: false,
    });
    
    activeSnapXRef.current = null;
    activeSnapYRef.current = null;
    setSnapGuides({ x: null, y: null });
  }, [mode, selectItem, getPoint]);

  const handlePointerMove = useCallback((e: React.PointerEvent, pt: Point): { handled: boolean } => {
    if (mode !== 'SELECT' || !draggingItem) {
      return { handled: false };
    }
    if (e.pointerId !== draggingItem.pointerId) return { handled: true };

    if (!draggingItem.hasMoved) {
      if (Math.hypot(pt.x - draggingItem.startX, pt.y - draggingItem.startY) * zoom > FURNITURE_DRAG_THRESHOLD) {
        setDraggingItem(prev => (prev ? { ...prev, hasMoved: true } : null));
      } else {
        return { handled: true };
      }
    }

    const currentItems = itemsRef.current;
    const activeSelectedIds = selectedItemIdsRef.current.includes(draggingItem.id)
      ? selectedItemIdsRef.current
      : [draggingItem.id];
    
    // The primary dragged object
    const draggedObj = currentItems.find(i => i.id === draggingItem.id);
    if (!draggedObj) return { handled: true };

    // Calculate group bounds
    let groupMinX = Infinity, groupMaxX = -Infinity;
    let groupMinY = Infinity, groupMaxY = -Infinity;
    
    const selectedItems = currentItems.filter(i => activeSelectedIds.includes(i.id));
    selectedItems.forEach(item => {
      const b = getItemBounds(item);
      if (b.left < groupMinX) groupMinX = b.left;
      if (b.right > groupMaxX) groupMaxX = b.right;
      if (b.top < groupMinY) groupMinY = b.top;
      if (b.bottom > groupMaxY) groupMaxY = b.bottom;
    });

    const groupW = groupMaxX - groupMinX;
    const groupD = groupMaxY - groupMinY;
    const groupCenterX = groupMinX + groupW / 2;
    const groupCenterY = groupMinY + groupD / 2;
    
    // We want the primary dragged object to determine the base offset
    // so the pointer remains relative to where the user clicked.
    // We calculate where the group center WOULD BE based on raw pointer + offsets.
    
    // Where would draggedObj be if completely free?
    const rawDraggedX = pt.x - draggingItem.offsetX;
    const rawDraggedY = pt.y - draggingItem.offsetY;
    
    // Keep the document stable until drop; raw pointer movement never inherits a snap.
    if (activeSelectedIds.length === 1 && isOpening(draggedObj)) {
      setSnapGuides({ x: null, y: null });
      const preview = predictOpeningDrag({ ...draggedObj, x: rawDraggedX, y: rawDraggedY }, wallsRef.current, currentItems, zoom, previewRef.current?.wall?.id);
      previewRef.current = preview;
      setOpeningPreview(preview);
      return { handled: true };
    }

    // What is the displacement from draggedObj to group center?
    const dispX = groupCenterX - draggedObj.x;
    const dispY = groupCenterY - draggedObj.y;
    
    // So raw group center is:
    const rawGroupPt = {
      x: rawDraggedX + dispX,
      y: rawDraggedY + dispY
    };

    const groupBounds = {
      left: rawGroupPt.x - groupW / 2,
      right: rawGroupPt.x + groupW / 2,
      top: rawGroupPt.y - groupD / 2,
      bottom: rawGroupPt.y + groupD / 2,
      w: groupW,
      d: groupD
    };

    const otherItems = currentItems.filter(i => !activeSelectedIds.includes(i.id));
    const otherBounds = otherItems.map(getItemBounds);
    const otherCenters = otherItems.map(i => ({ x: i.x, y: i.y }));

    const isFreeMove = freeDrag || getModifierState(e).alt;

    const snapResult = calculateItemSnap(
      rawGroupPt,
      groupBounds,
      otherBounds,
      otherCenters,
      wallsRef.current,
      currentGridSize,
      zoom,
      activeSnapXRef.current,
      activeSnapYRef.current,
      isFreeMove
    );

    activeSnapXRef.current = snapResult.snappedX ? snapResult.guideX : null;
    activeSnapYRef.current = snapResult.snappedY ? snapResult.guideY : null;
    setSnapGuides({ x: snapResult.guideX, y: snapResult.guideY });

    // The group moved by (snapResult.x - groupCenterX)
    const dx = snapResult.x - groupCenterX;
    const dy = snapResult.y - groupCenterY;

    if (dx !== 0 || dy !== 0) {
      const newItems = currentItems.map(item => {
        if (activeSelectedIds.includes(item.id)) {
          return { ...item, x: item.x + dx, y: item.y + dy };
        }
        return item;
      });
      onUpdateItems(newItems);
    }

    return { handled: true };
  }, [mode, draggingItem, currentGridSize, zoom, onUpdateItems, freeDrag]);

  const handlePointerUp = useCallback((_e?: React.PointerEvent): { handled: boolean } => {
    if (draggingItem) {
      if (_e && _e.pointerId !== draggingItem.pointerId) return { handled: true };
      const preview = previewRef.current;
      if (_e?.type !== 'pointercancel' && preview?.valid && preview.placement) {
        onUpdateItems(itemsRef.current.map(item => item.id === preview.placement!.id ? preview.placement! : item));
      }
      previewRef.current = null;
      setOpeningPreview(null);
      setDraggingItem(null);
      setSnapGuides({ x: null, y: null });
      activeSnapXRef.current = null;
      activeSnapYRef.current = null;
      return { handled: true };
    }
    return { handled: false };
  }, [draggingItem, onUpdateItems]);

  const cancelDragging = useCallback(() => {
    previewRef.current = null;
    setOpeningPreview(null);
    setDraggingItem(null);
    setSnapGuides({ x: null, y: null });
    activeSnapXRef.current = null;
    activeSnapYRef.current = null;
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') cancelDragging(); };
    window.addEventListener('blur', cancelDragging);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('blur', cancelDragging);
      window.removeEventListener('keydown', onKey);
    };
  }, [cancelDragging]);

  const isDraggingItem = useCallback((id: string) => {
    return draggingItem?.id === id;
  }, [draggingItem]);

  return {
    draggingItem,
    isDraggingItem,
    handleItemPointerDown,
    handlePointerMove,
    handlePointerUp,
    cancelDragging,
    getItemBounds,
    snapGuides,
    openingPreview,
  };
}
