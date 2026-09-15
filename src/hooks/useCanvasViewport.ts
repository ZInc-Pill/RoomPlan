import { useState, useRef, useEffect, useCallback } from 'react';
import { Point } from '../types';
import { screenToWorld, worldToScreen } from '../utils/coordinates';
import { isInteractiveElement } from '../utils/input';

export const VIEWPORT_LIMITS = {
  MIN_ZOOM: 0.05,
  MAX_ZOOM: 10,
  PINCH_MIN_ZOOM: 0.2,
  PINCH_MAX_ZOOM: 6,
  ZOOM_STEP_FACTOR: 1.05,
} as const;

export interface UseCanvasViewportOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isPanMode?: boolean;
  onPinchStart?: () => void;
}

export interface UseCanvasViewportReturn {
  zoom: number;
  pan: Point;
  isPanning: boolean;
  isPinching: boolean;
  spacePressed: boolean;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<Point>>;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleFitScreen: () => void;
  getPoint: (e: { clientX: number; clientY: number }) => Point;
  screenToWorldCoord: (clientX: number, clientY: number) => Point;
  worldToScreenCoord: (worldX: number, worldY: number) => Point;
  handlePointerDown: (e: React.PointerEvent) => { handled: boolean; isMultiTouch: boolean };
  handlePointerMove: (e: React.PointerEvent) => boolean;
  handlePointerUp: (e: React.PointerEvent) => { wasPanning: boolean };
}

export function useCanvasViewport({
  containerRef,
  isPanMode = false,
  onPinchStart,
}: UseCanvasViewportOptions): UseCanvasViewportReturn {
  // Authoritative Viewport State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);

  // Synchronized refs for fresh access in native listeners and calculations
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const panRef = useRef(pan);
  panRef.current = pan;

  const spacePressedRef = useRef(spacePressed);
  spacePressedRef.current = spacePressed;

  // Viewport gesture tracking refs
  const panStartRef = useRef<Point | null>(null);
  const activePointers = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const pinchStart = useRef<{
    dist: number;
    zoom: number;
    pan: Point;
    midpoint: Point;
  } | null>(null);

  // Coordinate conversion helpers using centralized coordinates.ts
  const screenToWorldCoord = useCallback((clientX: number, clientY: number): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return screenToWorld(clientX, clientY, panRef.current, zoomRef.current, rect);
  }, [containerRef]);

  const worldToScreenCoord = useCallback((worldX: number, worldY: number): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return worldToScreen(worldX, worldY, panRef.current, zoomRef.current, rect);
  }, [containerRef]);

  const getPoint = useCallback((e: { clientX: number; clientY: number }): Point => {
    return screenToWorldCoord(e.clientX, e.clientY);
  }, [screenToWorldCoord]);

  // Spacebar pan detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInteractiveElement(e.target)) return;
      if (e.key === ' ' && !spacePressedRef.current) {
        setSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Native non-passive Wheel / Trackpad listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSpeed = e.deltaMode === 1 ? 0.02 : e.deltaMode === 2 ? 0.5 : 0.001;
        const zoomFactor = Math.exp(-e.deltaY * zoomSpeed);
        
        const prevZoom = zoomRef.current;
        const prevPan = panRef.current;
        const newZoom = Math.min(
          Math.max(VIEWPORT_LIMITS.MIN_ZOOM, prevZoom * zoomFactor),
          VIEWPORT_LIMITS.MAX_ZOOM
        );

        const rect = container.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        const sceneX = (cursorX - prevPan.x) / prevZoom;
        const sceneY = (cursorY - prevPan.y) / prevZoom;

        setPan({
          x: cursorX - sceneX * newZoom,
          y: cursorY - sceneY * newZoom,
        });
        setZoom(newZoom);
      } else {
        setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef]);

  // Explicit Zoom actions
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(VIEWPORT_LIMITS.MAX_ZOOM, z * VIEWPORT_LIMITS.ZOOM_STEP_FACTOR));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(VIEWPORT_LIMITS.MIN_ZOOM, z / VIEWPORT_LIMITS.ZOOM_STEP_FACTOR));
  }, []);

  const handleFitScreen = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Pointer gesture handlers
  const handlePointerDown = useCallback((e: React.PointerEvent): { handled: boolean; isMultiTouch: boolean } => {
    activePointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    // Multi-touch pinch & pan gesture (2+ fingers)
    if (activePointers.current.size >= 2) {
      onPinchStart?.();
      setIsPanning(false);
      setIsPinching(true);

      const pts = Array.from(activePointers.current.values());
      const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
      const midpoint = {
        x: (pts[0].clientX + pts[1].clientX) / 2,
        y: (pts[0].clientY + pts[1].clientY) / 2,
      };

      pinchStart.current = {
        dist,
        zoom: zoomRef.current,
        pan: { ...panRef.current },
        midpoint,
      };
      return { handled: true, isMultiTouch: true };
    }

    if (isInteractiveElement(e.target)) {
      return { handled: false, isMultiTouch: false };
    }

    const shouldPan = isPanMode || e.button === 1 || (e.button === 0 && spacePressedRef.current);
    if (shouldPan) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
      return { handled: true, isMultiTouch: false };
    }

    return { handled: false, isMultiTouch: false };
  }, [isPanMode, onPinchStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent): boolean => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    }

    // Multi-touch pinch-to-zoom & two-finger pan
    if (activePointers.current.size >= 2 && pinchStart.current && containerRef.current) {
      const pts = Array.from(activePointers.current.values());
      const currentDist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
      const currentMid = {
        x: (pts[0].clientX + pts[1].clientX) / 2,
        y: (pts[0].clientY + pts[1].clientY) / 2,
      };

      const { dist: startDist, zoom: startZoom, pan: startPan, midpoint: startMid } = pinchStart.current;
      if (startDist > 0) {
        const scale = currentDist / startDist;
        const nextZoom = Math.min(
          Math.max(VIEWPORT_LIMITS.PINCH_MIN_ZOOM, startZoom * scale),
          VIEWPORT_LIMITS.PINCH_MAX_ZOOM
        );

        const rect = containerRef.current.getBoundingClientRect();
        const sceneX = (startMid.x - rect.left - startPan.x) / startZoom;
        const sceneY = (startMid.y - rect.top - startPan.y) / startZoom;

        const newPanX = (currentMid.x - rect.left) - sceneX * nextZoom;
        const newPanY = (currentMid.y - rect.top) - sceneY * nextZoom;

        setZoom(nextZoom);
        setPan({ x: newPanX, y: newPanY });
      }
      return true;
    }

    if (isPanning) {
      if (panStartRef.current) {
        setPan({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
      } else {
        setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
      }
      return true;
    }

    return false;
  }, [containerRef, isPanning]);

  const handlePointerUp = useCallback((e: React.PointerEvent): { wasPanning: boolean } => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      pinchStart.current = null;
      setIsPinching(false);
    }

    const wasPanning = isPanning;
    setIsPanning(false);
    panStartRef.current = null;

    return { wasPanning };
  }, [isPanning]);

  return {
    zoom,
    pan,
    isPanning,
    isPinching,
    spacePressed,
    setZoom,
    setPan,
    handleZoomIn,
    handleZoomOut,
    handleFitScreen,
    getPoint,
    screenToWorldCoord,
    worldToScreenCoord,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
