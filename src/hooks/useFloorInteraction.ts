import { useState, useRef, useCallback, useEffect } from 'react';
import { Point, Floor, AppMode } from '../types';
import { snapDeltaToGrid } from '../utils/snapping';
import { calculatePolygonArea, getPolygonCentroid } from '../utils/geometry';
import { pxAreaToSquareMeters } from '../utils/coordinates';

// --- Pure Constants ---
export const MIN_RECT_FLOOR_SIZE = 20; // 20 world units minimum width & height
export const POLYGON_CLOSING_RADIUS_PX = 28; // Screen-pixel radius for snapping to polygon start point
export const MIN_POLYGON_POINTS = 3; // Minimum points for a valid floor polygon
export const MIN_DRAG_POINT_DISTANCE = 5; // Minimum delta to reject duplicate consecutive points

// --- Pure Geometric Helpers ---

/**
 * Constructs 4 corner points for an axis-aligned rectangle from two diagonal corners.
 */
export const createRectanglePoints = (p1: Point, p2: Point): Point[] => {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
};

/**
 * Checks whether a rectangle defined by two points meets the minimum size threshold.
 */
export const isMinimumRectangleSize = (
  p1: Point,
  p2: Point,
  minSize: number = MIN_RECT_FLOOR_SIZE
): boolean => {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);
  return maxX - minX >= minSize && maxY - minY >= minSize;
};

/**
 * Checks whether a preview point is within closing radius of the start point,
 * taking viewport zoom into account (closing threshold is defined in screen pixels).
 */
export const isNearPolygonStart = (
  startPt: Point,
  testPt: Point,
  zoom: number,
  closingRadiusPx: number = POLYGON_CLOSING_RADIUS_PX
): boolean => {
  const dist = Math.hypot(testPt.x - startPt.x, testPt.y - startPt.y);
  return dist < closingRadiusPx / (zoom || 1);
};

/**
 * Translates an array of points by a given delta (dx, dy).
 * Preserves point ordering, relative distances, area, and perimeter.
 */
export const translateFloorPoints = (
  points: Point[],
  dx: number,
  dy: number
): Point[] => {
  return points.map(p => ({ x: p.x + dx, y: p.y + dy }));
};

/**
 * Updates a single vertex in a polygon while leaving all other vertices invariant.
 */
export const moveFloorNode = (
  points: Point[],
  index: number,
  newPt: Point
): Point[] => {
  if (index < 0 || index >= points.length) return points;
  const next = [...points];
  next[index] = newPt;
  return next;
};

/**
 * Inserts a new vertex into a polygon at the specified index.
 */
export const insertFloorNode = (
  points: Point[],
  index: number,
  newPt: Point
): Point[] => {
  const next = [...points];
  next.splice(index, 0, newPt);
  return next;
};

/**
 * Deletes a vertex from a polygon if it has more than the minimum allowed vertices (3).
 */
export const deleteFloorNode = (
  points: Point[],
  index: number
): Point[] => {
  if (points.length <= MIN_POLYGON_POINTS) return points;
  if (index < 0 || index >= points.length) return points;
  return points.filter((_, idx) => idx !== index);
};

/**
 * Constrains a point orthogonally (horizontal or vertical) relative to the last point,
 * based on whether horizontal or vertical delta is dominant.
 */
export const calculateOrthogonalFloorPoint = (
  lastPt: Point,
  current: Point
): Point => {
  const dx = Math.abs(current.x - lastPt.x);
  const dy = Math.abs(current.y - lastPt.y);
  if (dx > dy) {
    return { x: current.x, y: lastPt.y };
  } else {
    return { x: lastPt.x, y: current.y };
  }
};

/**
 * Pure calculation of floor area in square meters from world polygon coordinates.
 */
export const calculateFloorArea = (pts: Point[]): number => {
  const areaPx = calculatePolygonArea(pts);
  return pxAreaToSquareMeters(areaPx);
};

/**
 * Pure calculation of floor polygon centroid in world coordinates.
 */
export const getFloorCentroid = (pts: Point[]): Point => {
  return getPolygonCentroid(pts);
};

// --- Hook Interfaces ---

export interface UseFloorInteractionProps {
  mode: AppMode;
  floors: Floor[];
  selectedFloorId: string | null;
  currentGridSize: number;
  zoom: number;
  getPoint: (e: React.PointerEvent) => Point;
  snapToGrid: (pt: Point) => Point;
  selectFloor: (e: React.PointerEvent, floorId: string) => void;
  onSelect: (itemIds: string[], wallId: string | null, floorId: string | null, commentId: string | null) => void;
  onUpdateFloors: (floors: Floor[]) => void;
  setMode?: (mode: AppMode) => void;
}

export interface UseFloorInteractionReturn {
  // Drawing state
  floorDrawMode: 'rectangle' | 'polygon';
  drawingFloorPts: Point[];
  rectStart: Point | null;
  previewPt: Point | null;
  isDrawingFloor: boolean;

  // Manipulation state
  draggingFloor: { id: string; startX: number; startY: number; origPoints: Point[] } | null;
  draggingFloorNode: { id: string; index: number } | null;
  hoveredFloorId: string | null;
  glideSnapMode: 'snap' | 'free';
  selectedFloor: Floor | null;

  // Setters & Actions
  setFloorDrawMode: React.Dispatch<React.SetStateAction<'rectangle' | 'polygon'>>;
  switchFloorDrawMode: (newMode: 'rectangle' | 'polygon') => void;
  setHoveredFloorId: (id: string | null) => void;
  setGlideSnapMode: (mode: 'snap' | 'free') => void;
  completeFloorPolygon: (pts: Point[]) => void;
  handleCancelDrawingFloor: () => void;
  handleUndoFloorPoint: () => void;
  cancelFloorInteraction: () => void;

  // Glide joystick handlers
  handleFloorGlideMove: (dx: number, dy: number) => void;
  handleFloorSingleNudge: (dir: 'up' | 'down' | 'left' | 'right') => void;

  // Pointer & Event Handlers
  handleFloorPointerDown: (e: React.PointerEvent, floor: Floor) => void;
  handleFloorNodePointerDown: (e: React.PointerEvent, floorId: string, index: number) => void;
  handleFloorNodeDoubleClick: (e: React.MouseEvent, floorId: string, index: number) => void;
  handleFloorEdgeSplit: (e: React.PointerEvent, floorId: string, edgeIndex: number, midX: number, midY: number) => void;
  handlePointerDownCanvas: (e: React.PointerEvent, pt: Point) => { handled: boolean };
  handlePointerMove: (e: React.PointerEvent, pt: Point) => { handled: boolean };
  handlePointerUp: (e: React.PointerEvent) => { handled: boolean };
  handleDoubleClickCanvas: (e: React.MouseEvent) => { handled: boolean };
  handleKeyDown: (e: KeyboardEvent) => boolean;

  // Geometry computation
  calculateArea: (pts: Point[]) => number;
  getCentroid: (pts: Point[]) => Point;
}

export const useFloorInteraction = ({
  mode,
  floors,
  selectedFloorId,
  currentGridSize,
  zoom,
  getPoint,
  snapToGrid,
  selectFloor,
  onSelect,
  onUpdateFloors,
  setMode,
}: UseFloorInteractionProps): UseFloorInteractionReturn => {
  // Drawing Floor state
  const [drawingFloorPts, setDrawingFloorPts] = useState<Point[]>([]);
  const [previewPt, setPreviewPt] = useState<Point | null>(null);
  const [floorDrawMode, setFloorDrawMode] = useState<'rectangle' | 'polygon'>('rectangle');
  const [rectStart, setRectStart] = useState<Point | null>(null);

  // Dragging Floor state
  const [draggingFloor, setDraggingFloor] = useState<{
    id: string;
    startX: number;
    startY: number;
    origPoints: Point[];
  } | null>(null);
  const [draggingFloorNode, setDraggingFloorNode] = useState<{ id: string; index: number } | null>(null);

  // Floor Glide movement mode: 'snap' (Primary) vs 'free' (Secondary)
  const [glideSnapMode, setGlideSnapMode] = useState<'snap' | 'free'>('snap');
  const floorGlideAccumulator = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Floor Hover state
  const [hoveredFloorId, setHoveredFloorId] = useState<string | null>(null);

  // Current selected floor entity
  const selectedFloor = selectedFloorId ? floors.find(f => f.id === selectedFloorId) || null : null;

  // Mode reset effect
  useEffect(() => {
    if (mode !== 'DRAW_FLOOR') {
      setDrawingFloorPts([]);
      setPreviewPt(null);
      setRectStart(null);
      setFloorDrawMode('rectangle');
    }
  }, [mode]);

  // Mode switcher with state cleanup
  const switchFloorDrawMode = useCallback((newMode: 'rectangle' | 'polygon') => {
    setFloorDrawMode(newMode);
    if (newMode === 'rectangle') {
      setDrawingFloorPts([]);
    } else {
      setRectStart(null);
    }
  }, []);

  // Complete floor polygon creation
  const completeFloorPolygon = useCallback((pts: Point[]) => {
    if (pts.length < MIN_POLYGON_POINTS) return;
    const newId = Math.random().toString(36).substr(2, 9);
    const newFloor: Floor = {
      id: newId,
      points: pts,
      color: '#e2e8f0',
    };
    onUpdateFloors([...floors, newFloor]);
    setDrawingFloorPts([]);
    setPreviewPt(null);
    setRectStart(null);
    onSelect([], null, newId, null);
    setMode?.('SELECT');
  }, [floors, onUpdateFloors, onSelect, setMode]);

  // Cancel floor drawing
  const handleCancelDrawingFloor = useCallback(() => {
    if (drawingFloorPts.length > 0 || rectStart) {
      setDrawingFloorPts([]);
      setPreviewPt(null);
      setRectStart(null);
    } else {
      setMode?.('SELECT');
    }
  }, [drawingFloorPts, rectStart, setMode]);

  // Undo last polygon point
  const handleUndoFloorPoint = useCallback(() => {
    if (drawingFloorPts.length > 0) {
      setDrawingFloorPts(pts => pts.slice(0, -1));
    }
  }, [drawingFloorPts]);

  // Cancellation for active interactions (e.g. on viewport pinch-zoom)
  const cancelFloorInteraction = useCallback(() => {
    setDraggingFloor(null);
    setDraggingFloorNode(null);
    setDrawingFloorPts([]);
    setPreviewPt(null);
    setRectStart(null);
  }, []);

  // Floor pointer down in SELECT mode
  const handleFloorPointerDown = useCallback((e: React.PointerEvent, floor: Floor) => {
    if (mode !== 'SELECT') return;
    e.stopPropagation();
    selectFloor(e, floor.id);
    const pt = getPoint(e);
    setDraggingFloor({
      id: floor.id,
      startX: pt.x,
      startY: pt.y,
      origPoints: floor.points.map(p => ({ ...p })),
    });
  }, [mode, selectFloor, getPoint]);

  // Corner vertex pointer down
  const handleFloorNodePointerDown = useCallback((e: React.PointerEvent, floorId: string, index: number) => {
    e.stopPropagation();
    setDraggingFloorNode({ id: floorId, index });
  }, []);

  // Corner vertex double-click (delete vertex if > 3 vertices)
  const handleFloorNodeDoubleClick = useCallback((e: React.MouseEvent, floorId: string, index: number) => {
    e.stopPropagation();
    const targetFloor = floors.find(f => f.id === floorId);
    if (!targetFloor || targetFloor.points.length <= MIN_POLYGON_POINTS) return;

    const newPts = deleteFloorNode(targetFloor.points, index);
    onUpdateFloors(floors.map(f => f.id === floorId ? { ...f, points: newPts } : f));
  }, [floors, onUpdateFloors]);

  // Edge midpoint '+' button (insert vertex)
  const handleFloorEdgeSplit = useCallback((
    e: React.PointerEvent,
    floorId: string,
    edgeIndex: number,
    midX: number,
    midY: number
  ) => {
    e.stopPropagation();
    const targetFloor = floors.find(f => f.id === floorId);
    if (!targetFloor) return;

    const newPt = snapToGrid({ x: midX, y: midY });
    const newPts = insertFloorNode(targetFloor.points, edgeIndex + 1, newPt);
    onUpdateFloors(floors.map(f => f.id === floorId ? { ...f, points: newPts } : f));
    setDraggingFloorNode({ id: floorId, index: edgeIndex + 1 });
  }, [floors, snapToGrid, onUpdateFloors]);

  // Canvas pointer down when mode === 'DRAW_FLOOR'
  const handlePointerDownCanvas = useCallback((_e: React.PointerEvent, pt: Point): { handled: boolean } => {
    if (mode !== 'DRAW_FLOOR') return { handled: false };

    const snapped = snapToGrid(pt);
    onSelect([], null, null, null);

    if (floorDrawMode === 'rectangle') {
      if (!rectStart) {
        setRectStart(snapped);
        setPreviewPt(snapped);
      } else {
        if (isMinimumRectangleSize(rectStart, snapped, MIN_RECT_FLOOR_SIZE)) {
          const rectPts = createRectanglePoints(rectStart, snapped);
          completeFloorPolygon(rectPts);
        }
      }
      return { handled: true };
    }

    // Freeform polygon mode
    if (drawingFloorPts.length >= MIN_POLYGON_POINTS) {
      const startPt = drawingFloorPts[0];
      if (isNearPolygonStart(startPt, snapped, zoom, POLYGON_CLOSING_RADIUS_PX)) {
        completeFloorPolygon(drawingFloorPts);
        return { handled: true };
      }
    }

    // Ignore duplicate click if identical to last point
    if (drawingFloorPts.length > 0) {
      const lastPt = drawingFloorPts[drawingFloorPts.length - 1];
      if (Math.hypot(snapped.x - lastPt.x, snapped.y - lastPt.y) < MIN_DRAG_POINT_DISTANCE) {
        return { handled: true };
      }
    }

    setDrawingFloorPts(prev => [...prev, snapped]);
    setPreviewPt(snapped);
    return { handled: true };
  }, [mode, floorDrawMode, rectStart, drawingFloorPts, zoom, snapToGrid, onSelect, completeFloorPolygon]);

  // Canvas pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent, pt: Point): { handled: boolean } => {
    if (mode === 'DRAW_FLOOR') {
      let cur = snapToGrid(pt);
      if (floorDrawMode === 'rectangle') {
        setPreviewPt(cur);
      } else {
        if (e.shiftKey && drawingFloorPts.length > 0) {
          const lastPt = drawingFloorPts[drawingFloorPts.length - 1];
          cur = calculateOrthogonalFloorPoint(lastPt, cur);
        }
        setPreviewPt(cur);
      }
      return { handled: true };
    }

    if (mode === 'SELECT' && draggingFloor) {
      const dx = snapDeltaToGrid(pt.x - draggingFloor.startX, currentGridSize);
      const dy = snapDeltaToGrid(pt.y - draggingFloor.startY, currentGridSize);
      if (dx !== 0 || dy !== 0) {
        const newFloors = floors.map(f => {
          if (f.id === draggingFloor.id) {
            return {
              ...f,
              points: translateFloorPoints(draggingFloor.origPoints, dx, dy),
            };
          }
          return f;
        });
        onUpdateFloors(newFloors);
      }
      return { handled: true };
    }

    if (mode === 'SELECT' && draggingFloorNode) {
      const snapped = snapToGrid(pt);
      const newFloors = floors.map(f => {
        if (f.id === draggingFloorNode.id) {
          return {
            ...f,
            points: moveFloorNode(f.points, draggingFloorNode.index, snapped),
          };
        }
        return f;
      });
      onUpdateFloors(newFloors);
      return { handled: true };
    }

    return { handled: false };
  }, [mode, floorDrawMode, drawingFloorPts, draggingFloor, draggingFloorNode, currentGridSize, floors, snapToGrid, onUpdateFloors]);

  // Canvas pointer up
  const handlePointerUp = useCallback((_e: React.PointerEvent): { handled: boolean } => {
    let handled = false;
    if (draggingFloor) {
      setDraggingFloor(null);
      handled = true;
    }
    if (draggingFloorNode) {
      setDraggingFloorNode(null);
      handled = true;
    }
    return { handled };
  }, [draggingFloor, draggingFloorNode]);

  // Double click canvas to finish polygon
  const handleDoubleClickCanvas = useCallback((e: React.MouseEvent): { handled: boolean } => {
    if (mode === 'DRAW_FLOOR' && drawingFloorPts.length >= MIN_POLYGON_POINTS) {
      e.stopPropagation();
      completeFloorPolygon(drawingFloorPts);
      return { handled: true };
    }
    return { handled: false };
  }, [mode, drawingFloorPts, completeFloorPolygon]);

  // Floor keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent): boolean => {
    if (mode !== 'DRAW_FLOOR') return false;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancelDrawingFloor();
      return true;
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      setFloorDrawMode(prev => {
        if (prev === 'rectangle') {
          setRectStart(null);
          return 'polygon';
        } else {
          setDrawingFloorPts([]);
          return 'rectangle';
        }
      });
      return true;
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      e.stopPropagation();
      handleUndoFloorPoint();
      return true;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (drawingFloorPts.length >= MIN_POLYGON_POINTS) {
        completeFloorPolygon(drawingFloorPts);
      }
      return true;
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      if (drawingFloorPts.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        handleUndoFloorPoint();
        return true;
      }
    }
    return false;
  }, [mode, handleCancelDrawingFloor, handleUndoFloorPoint, completeFloorPolygon, drawingFloorPts.length]);

  // Floor Glide Joystick Handlers: Snap on Grid (Primary) vs Free Move (Secondary)
  const handleFloorGlideMove = useCallback((dx: number, dy: number) => {
    if (!selectedFloor) return;
    const gridStep = currentGridSize;

    if (glideSnapMode === 'snap') {
      floorGlideAccumulator.current.x += dx;
      floorGlideAccumulator.current.y += dy;

      const SNAP_THRESHOLD = 12;
      let stepX = 0;
      let stepY = 0;

      if (Math.abs(floorGlideAccumulator.current.x) >= SNAP_THRESHOLD) {
        stepX = Math.sign(floorGlideAccumulator.current.x) * gridStep;
        floorGlideAccumulator.current.x = 0;
      }
      if (Math.abs(floorGlideAccumulator.current.y) >= SNAP_THRESHOLD) {
        stepY = Math.sign(floorGlideAccumulator.current.y) * gridStep;
        floorGlideAccumulator.current.y = 0;
      }

      if (stepX === 0 && stepY === 0) return;

      onUpdateFloors(floors.map(f => f.id === selectedFloor.id ? {
        ...f,
        points: f.points.map(p => ({
          x: Math.round((p.x + stepX) / gridStep) * gridStep,
          y: Math.round((p.y + stepY) / gridStep) * gridStep,
        }))
      } : f));
    } else {
      // Free move (secondary): smooth direct continuous glide without grid lock
      onUpdateFloors(floors.map(f => f.id === selectedFloor.id ? {
        ...f,
        points: translateFloorPoints(f.points, dx, dy),
      } : f));
    }
  }, [selectedFloor, currentGridSize, glideSnapMode, floors, onUpdateFloors]);

  const handleFloorSingleNudge = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedFloor) return;
    const gridStep = currentGridSize;

    if (glideSnapMode === 'snap') {
      let stepX = 0;
      let stepY = 0;
      if (dir === 'left') stepX = -gridStep;
      else if (dir === 'right') stepX = gridStep;
      else if (dir === 'up') stepY = -gridStep;
      else if (dir === 'down') stepY = gridStep;

      onUpdateFloors(floors.map(f => f.id === selectedFloor.id ? {
        ...f,
        points: f.points.map(p => ({
          x: Math.round((p.x + stepX) / gridStep) * gridStep,
          y: Math.round((p.y + stepY) / gridStep) * gridStep,
        }))
      } : f));
    } else {
      const microStep = 4;
      let dx = 0;
      let dy = 0;
      if (dir === 'left') dx = -microStep;
      else if (dir === 'right') dx = microStep;
      else if (dir === 'up') dy = -microStep;
      else if (dir === 'down') dy = microStep;

      onUpdateFloors(floors.map(f => f.id === selectedFloor.id ? {
        ...f,
        points: translateFloorPoints(f.points, dx, dy),
      } : f));
    }
  }, [selectedFloor, currentGridSize, glideSnapMode, floors, onUpdateFloors]);

  return {
    floorDrawMode,
    drawingFloorPts,
    rectStart,
    previewPt,
    isDrawingFloor: mode === 'DRAW_FLOOR',
    draggingFloor,
    draggingFloorNode,
    hoveredFloorId,
    glideSnapMode,
    selectedFloor,
    setFloorDrawMode,
    switchFloorDrawMode,
    setHoveredFloorId,
    setGlideSnapMode,
    completeFloorPolygon,
    handleCancelDrawingFloor,
    handleUndoFloorPoint,
    cancelFloorInteraction,
    handleFloorGlideMove,
    handleFloorSingleNudge,
    handleFloorPointerDown,
    handleFloorNodePointerDown,
    handleFloorNodeDoubleClick,
    handleFloorEdgeSplit,
    handlePointerDownCanvas,
    handlePointerMove,
    handlePointerUp,
    handleDoubleClickCanvas,
    handleKeyDown,
    calculateArea: calculateFloorArea,
    getCentroid: getFloorCentroid,
  };
};
