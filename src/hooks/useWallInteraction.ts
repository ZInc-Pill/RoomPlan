import { useState, useCallback, useEffect } from 'react';
import { Point, Wall, AppMode } from '../types';
import { moveConnectedWallPoints } from '../utils/wallConnections';
import { snapDeltaToGrid } from '../utils/snapping';

export const MIN_WALL_LENGTH = 10;
export const DEFAULT_WALL_THICKNESS = 8;

export interface DraggingWallState {
  id: string;
  startX: number;
  startY: number;
  origWall: Wall;
  originalWalls: Wall[];
}

export interface DraggingWallNodeState {
  id: string;
  node: 'start' | 'end';
  originalWalls: Wall[];
  anchor: Point;
}

/**
 * Pure helper to construct a new Wall object with a unique id
 */
export function createWall(start: Point, end: Point, thickness = DEFAULT_WALL_THICKNESS): Wall {
  return {
    id: Math.random().toString(36).substring(2, 9),
    start,
    end,
    thickness,
  };
}

/**
 * Pure helper to translate a wall segment by (dx, dy)
 * Preserves wall length, angle, and thickness exactly.
 */
export function moveWall(wall: Wall, dx: number, dy: number): Wall {
  return {
    ...wall,
    start: { x: wall.start.x + dx, y: wall.start.y + dy },
    end: { x: wall.end.x + dx, y: wall.end.y + dy },
  };
}

/**
 * Pure helper to move an individual endpoint of a wall.
 * Preserves the other endpoint and wall thickness.
 */
export function moveWallNode(wall: Wall, node: 'start' | 'end', newPt: Point): Wall {
  return {
    ...wall,
    [node]: newPt,
  };
}

/**
 * Pure helper to constrain a point orthogonally relative to an anchor point.
 * Selects horizontal or vertical axis based on largest absolute delta.
 */
export function calculateOrthogonalPoint(start: Point, cur: Point): Point {
  const dx = Math.abs(cur.x - start.x);
  const dy = Math.abs(cur.y - start.y);
  if (dx > dy) {
    return { x: cur.x, y: start.y };
  } else {
    return { x: start.x, y: cur.y };
  }
}

/**
 * Pure helper to check if distance between two points meets or exceeds MIN_WALL_LENGTH
 */
export function isMinimumWallLength(start: Point, end: Point, minLength = MIN_WALL_LENGTH): boolean {
  return Math.hypot(end.x - start.x, end.y - start.y) > minLength;
}

export interface UseWallInteractionProps {
  mode: AppMode;
  walls: Wall[];
  selectedWallId: string | null;
  currentGridSize: number;
  getPoint: (e: React.PointerEvent) => Point;
  snapToGrid: (pt: Point) => Point;
  selectWall: (e: React.PointerEvent, wallId: string) => void;
  onSelect: (itemIds: string[], wallId: string | null, floorId: string | null, commentId: string | null) => void;
  onUpdateWalls: (walls: Wall[]) => void;
  setMode?: (mode: AppMode) => void;
}

export function useWallInteraction({
  mode,
  walls,
  selectedWallId,
  currentGridSize,
  getPoint,
  snapToGrid,
  selectWall,
  onSelect,
  onUpdateWalls,
  setMode,
}: UseWallInteractionProps) {
  // Drawing Wall state
  const [drawingStart, setDrawingStart] = useState<Point | null>(null);
  const [drawingCurrent, setDrawingCurrent] = useState<Point | null>(null);

  // Dragging Wall state (whole segment)
  const [draggingWall, setDraggingWall] = useState<DraggingWallState | null>(null);

  // Dragging Wall Node state (start or end node)
  const [draggingWallNode, setDraggingWallNode] = useState<DraggingWallNodeState | null>(null);

  // Clean up drawing state when exiting DRAW_WALL mode
  useEffect(() => {
    if (mode !== 'DRAW_WALL') {
      setDrawingStart(null);
      setDrawingCurrent(null);
    }
  }, [mode]);

  // Cancel in-progress wall interactions (e.g. on pinch-to-zoom or tool switch)
  const cancelInteraction = useCallback(() => {
    setDrawingStart(null);
    setDrawingCurrent(null);
    setDraggingWall(null);
    setDraggingWallNode(null);
  }, []);

  // Specifically cancel active drawing
  const cancelDrawing = useCallback(() => {
    setDrawingStart(null);
    setDrawingCurrent(null);
  }, []);

  /**
   * Pointer down on a wall segment
   */
  const handleWallPointerDown = useCallback((e: React.PointerEvent, wall: Wall) => {
    if (mode !== 'SELECT' || e.button !== 0 || !e.isPrimary) return;
    e.stopPropagation();
    selectWall(e, wall.id);
    const pt = getPoint(e);
    setDraggingWall({
      id: wall.id,
      startX: pt.x,
      startY: pt.y,
      origWall: { ...wall },
      originalWalls: walls,
    });
  }, [mode, selectWall, getPoint, walls]);

  /**
   * Pointer down on an endpoint handle (start or end)
   */
  const handleWallNodePointerDown = useCallback((e: React.PointerEvent, wallId: string, node: 'start' | 'end') => {
    if (mode !== 'SELECT' || e.button !== 0 || !e.isPrimary) return;
    e.stopPropagation();
    const wall = walls.find(w => w.id === wallId);
    if (wall) setDraggingWallNode({ id: wallId, node, originalWalls: walls, anchor: wall[node] });
  }, [mode, walls]);

  /**
   * Background pointer down (handles DRAW_WALL start or second-tap completion)
   */
  const handlePointerDown = useCallback((e: React.PointerEvent, pt: Point): { handled: boolean } => {
    if (mode === 'DRAW_WALL') {
      const snapped = snapToGrid(pt);
      if (drawingStart) {
        // Second tap to complete wall
        if (isMinimumWallLength(drawingStart, snapped)) {
          const newWall = createWall(drawingStart, snapped, DEFAULT_WALL_THICKNESS);
          onUpdateWalls([...walls, newWall]);
          setDrawingStart(null);
          setDrawingCurrent(null);
          return { handled: true };
        }
      }
      setDrawingStart(snapped);
      setDrawingCurrent(snapped);
      onSelect([], null, null, null);
      return { handled: true };
    }
    return { handled: false };
  }, [mode, drawingStart, snapToGrid, walls, onUpdateWalls, onSelect]);

  /**
   * Pointer move handler (handles drawing preview, wall segment drag, wall node drag)
   */
  const handlePointerMove = useCallback((e: React.PointerEvent, pt: Point): { handled: boolean } => {
    if (mode === 'DRAW_WALL' && drawingStart) {
      let cur = snapToGrid(pt);
      if (e.shiftKey) {
        cur = calculateOrthogonalPoint(drawingStart, cur);
      }
      setDrawingCurrent(cur);
      return { handled: true };
    }

    if (mode === 'SELECT' && draggingWall) {
      const dx = snapDeltaToGrid(pt.x - draggingWall.startX, currentGridSize);
      const dy = snapDeltaToGrid(pt.y - draggingWall.startY, currentGridSize);

      const moved = moveWall(draggingWall.origWall, dx, dy);
      const newWalls = moveConnectedWallPoints(draggingWall.originalWalls, [
        { from: draggingWall.origWall.start, to: moved.start },
        { from: draggingWall.origWall.end, to: moved.end },
      ]);
      onUpdateWalls(newWalls);
      return { handled: true };
    }

    if (mode === 'SELECT' && draggingWallNode) {
      const snapped = snapToGrid(pt);
      const newWalls = moveConnectedWallPoints(draggingWallNode.originalWalls, [{ from: draggingWallNode.anchor, to: snapped }]);
      onUpdateWalls(newWalls);
      return { handled: true };
    }

    return { handled: false };
  }, [mode, drawingStart, draggingWall, draggingWallNode, snapToGrid, currentGridSize, walls, onUpdateWalls]);

  /**
   * Pointer up handler (handles drag-release completion for DRAW_WALL and cleanup of dragging states)
   */
  const handlePointerUp = useCallback((e: React.PointerEvent): { handled: boolean } => {
    let handled = false;

    if (mode === 'DRAW_WALL' && drawingStart && drawingCurrent) {
      if (isMinimumWallLength(drawingStart, drawingCurrent)) {
        const newWall = createWall(drawingStart, drawingCurrent, DEFAULT_WALL_THICKNESS);
        onUpdateWalls([...walls, newWall]);
        setDrawingStart(null);
        setDrawingCurrent(null);
        handled = true;
      }
      // If dist <= 10, keep drawingStart so the user can tap second point on mobile!
    }

    if (draggingWall) {
      setDraggingWall(null);
      handled = true;
    }
    if (draggingWallNode) {
      setDraggingWallNode(null);
      handled = true;
    }

    return { handled };
  }, [mode, drawingStart, drawingCurrent, draggingWall, draggingWallNode, walls, onUpdateWalls]);

  /**
   * Keyboard shortcut listener for Wall drawing tool
   */
  const handleKeyDown = useCallback((e: KeyboardEvent): boolean => {
    if (mode === 'DRAW_WALL') {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelDrawing();
        setMode?.('SELECT');
        return true;
      }
    }
    return false;
  }, [mode, cancelDrawing, setMode]);

  return {
    drawingStart,
    drawingCurrent,
    draggingWall,
    draggingWallNode,
    handleWallPointerDown,
    handleWallNodePointerDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleKeyDown,
    cancelInteraction,
    cancelDrawing,
  };
}
