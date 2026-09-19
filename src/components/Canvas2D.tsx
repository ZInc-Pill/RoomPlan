import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Point, Wall, PlacedItem, AppMode, Floor, CommentType } from '../types';
import { ITEM_CATALOG } from '../catalog';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  X, 
  Check, 
  Undo2, 
  Layers, 
  Square, 
  Pentagon, 
  Trash2, 
  Copy, 
  Magnet,
  Move
} from 'lucide-react';
import { getWallSegments } from '../utils/wallUtils';
import { RailingEndpoints } from './RailingEndpoints';
import { UniversalJoystick } from './UniversalJoystick';
import { pointToLineSegmentDistance, calculateBoxRadiusAlongVector, vectorLength } from '../utils/geometry';
import { cmToPx, pxToMeters, getGridSize } from '../utils/coordinates';
import { snapPointToGrid } from '../utils/snapping';
import { useCanvasViewport } from '../hooks/useCanvasViewport';
import { useCanvasSelection } from '../hooks/useCanvasSelection';
import { useFurnitureInteraction, getItemBounds } from '../hooks/useFurnitureInteraction';
import { useWallInteraction } from '../hooks/useWallInteraction';
import { useFloorInteraction } from '../hooks/useFloorInteraction';
import { SvgFloorPatterns } from './SvgFloorPatterns';
import { FLOOR_MATERIALS } from '../materials';
import { isInteractiveElement } from '../utils/input';

type RulerMeasurement = { id: string; start: Point; end: Point; createdAt: number };

interface Canvas2DProps {
  gridOption: 1 | 2 | 3;
  setGridOption: (option: 1 | 2 | 3) => void;
  walls: Wall[];
  floors: Floor[];
  items: PlacedItem[];
  comments: CommentType[];
  mode: AppMode;
  selectedItemIds: string[];
  selectedWallId: string | null;
  selectedFloorId: string | null;
  selectedCommentId: string | null;
  onUpdateWalls: (walls: Wall[]) => void;
  onUpdateFloors: (floors: Floor[]) => void;
  onUpdateItems: (items: PlacedItem[]) => void;
  onUpdateComments: (comments: CommentType[]) => void;
  onSelect: (itemIds: string[], wallId: string | null, floorId: string | null, commentId: string | null) => void;
  setMode?: (mode: AppMode) => void;
  onDuplicateFloor?: (id: string) => void;
  onDeleteFloor?: (id: string) => void;
  isDrawerOpen?: boolean;
}

export function Canvas2D({
  walls, floors, items, comments, mode, selectedItemIds, selectedWallId, selectedFloorId, selectedCommentId, 
  onUpdateWalls, onUpdateFloors, onUpdateItems, onUpdateComments, onSelect, setMode, onDuplicateFloor, onDeleteFloor,
  gridOption, setGridOption, isDrawerOpen = false
}: Canvas2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const currentGridSize = getGridSize(gridOption);



  const [rulers, setRulers] = useState<RulerMeasurement[]>([]);
  const [drawingRulerStart, setDrawingRulerStart] = useState<Point | null>(null);
  const [drawingRulerCurrent, setDrawingRulerCurrent] = useState<Point | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRulers(prev => prev.filter(r => now - r.createdAt < 60000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const snapToGrid = (pt: Point): Point => {
    return snapPointToGrid(pt, currentGridSize);
  };

  // Dragging Comment state
  const [draggingComment, setDraggingComment] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

  // Selection Hook
  const {
    selectionBox,
    selectItem,
    selectWall,
    selectFloor,
    selectComment,
    handlePointerDown: handleSelectionPointerDown,
    handlePointerMove: handleSelectionPointerMove,
    handlePointerUp: handleSelectionPointerUp,
    cancelSelectionBox,
  } = useCanvasSelection({
    mode,
    items,
    walls,
    floors,
    comments,
    selectedItemIds,
    selectedWallId,
    selectedFloorId,
    selectedCommentId,
    onSelect,
  });

  // Viewport Interaction Hook
  const cancelFurnitureDraggingRef = useRef<() => void>(() => {});
  const cancelWallInteractionRef = useRef<() => void>(() => {});
  const cancelFloorInteractionRef = useRef<() => void>(() => {});

  const cancelActiveInteractions = useCallback(() => {
    cancelWallInteractionRef.current();
    cancelFloorInteractionRef.current();
    setDrawingRulerStart(null);
    setDrawingRulerCurrent(null);
    cancelFurnitureDraggingRef.current();
    cancelSelectionBox();
  }, [cancelSelectionBox]);

  const {
    zoom,
    pan,
    isPanning,
    getPoint,
    handleZoomIn,
    handleZoomOut,
    handleFitScreen,
    handlePointerDown: handleViewportPointerDown,
    handlePointerMove: handleViewportPointerMove,
    handlePointerUp: handleViewportPointerUp,
  } = useCanvasViewport({
    containerRef,
    isPanMode: mode === 'PAN',
    onPinchStart: cancelActiveInteractions,
  });

  // Furniture Interaction Hook
  const {
    isDraggingItem,
    handleItemPointerDown,
    handlePointerMove: handleFurniturePointerMove,
    handlePointerUp: handleFurniturePointerUp,
    cancelDragging: cancelFurnitureDragging,
    snapGuides,
  } = useFurnitureInteraction({
    mode,
    items,
    walls,
    selectedItemIds,
    currentGridSize,
    zoom,
    getPoint,
    selectItem,
    onUpdateItems,
  });
  cancelFurnitureDraggingRef.current = cancelFurnitureDragging;

  // Wall Interaction Hook
  const {
    drawingStart,
    drawingCurrent,
    handleWallPointerDown,
    handleWallNodePointerDown,
    handlePointerDown: handleWallPointerDownCanvas,
    handlePointerMove: handleWallPointerMove,
    handlePointerUp: handleWallPointerUp,
    handleKeyDown: handleWallKeyDown,
    cancelInteraction: cancelWallInteraction,
    cancelDrawing: cancelWallDrawing,
  } = useWallInteraction({
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
  });
  cancelWallInteractionRef.current = cancelWallInteraction;

  // Floor Interaction Hook
  const {
    floorDrawMode,
    drawingFloorPts,
    rectStart,
    previewPt,
    hoveredFloorId,
    glideSnapMode,
    selectedFloor,
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
    handlePointerDownCanvas: handleFloorPointerDownCanvas,
    handlePointerMove: handleFloorPointerMove,
    handlePointerUp: handleFloorPointerUp,
    handleDoubleClickCanvas: handleFloorDoubleClickCanvas,
    handleKeyDown: handleFloorKeyDown,
    calculateArea,
    getCentroid,
  } = useFloorInteraction({
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
  });
  cancelFloorInteractionRef.current = cancelFloorInteraction;

  // Clean up ruler drawing state when exiting RULER mode
  useEffect(() => {
    if (mode !== 'RULER') {
      setDrawingRulerStart(null);
      setDrawingRulerCurrent(null);
    }
  }, [mode]);

  // Keyboard shortcut listener for Floor, Wall & Ruler tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInteractiveElement(e.target)) return;

      if (handleFloorKeyDown(e)) return;
      if (handleWallKeyDown(e)) return;

      if (mode === 'RULER' && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setDrawingRulerStart(null);
        setDrawingRulerCurrent(null);
        setMode?.('SELECT');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [mode, handleFloorKeyDown, handleWallKeyDown, setMode]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isDrawerOpen || (e.target instanceof Element && e.target.closest('button, input, textarea, select, [role="dialog"], [data-editor-control]'))) return;
    const { handled } = handleViewportPointerDown(e);
    if (handled) return;

    // If not left click
    if (e.button !== 0) return;

    const pt = getPoint(e);

    const { handled: wallHandled } = handleWallPointerDownCanvas(e, pt);
    if (wallHandled) return;

    const { handled: floorHandled } = handleFloorPointerDownCanvas(e, pt);
    if (floorHandled) return;

    if (mode === 'COMMENT') {
      const newComment: CommentType = {
        id: Math.random().toString(36).substr(2, 9),
        x: pt.x,
        y: pt.y,
        text: 'New Note'
      };
      onUpdateComments([...comments, newComment]);
      onSelect([], null, null, newComment.id);
    } else if (mode === 'RULER') {
      const snapped = snapToGrid(pt);
      setDrawingRulerStart(snapped);
      setDrawingRulerCurrent(snapped);
      onSelect([], null, null, null);
    } else {
      const { handled } = handleSelectionPointerDown(e, pt, containerRef.current);
      if (handled) return;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (handleViewportPointerMove(e)) return;
    
    const pt = getPoint(e);

    const { handled } = handleSelectionPointerMove(e, pt);
    if (handled) return;

    if (handleWallPointerMove(e, pt).handled) {
      return;
    } else if (handleFloorPointerMove(e, pt).handled) {
      return;
    } else if (mode === 'RULER' && drawingRulerStart) {
      setDrawingRulerCurrent(snapToGrid(pt));
    } else if (handleFurniturePointerMove(e, pt).handled) {
      return;
    } else if (mode === 'SELECT' && draggingComment) {
      const newComments = comments.map(c => {
        if (c.id === draggingComment.id) {
          return {
            ...c,
            x: pt.x - draggingComment.offsetX,
            y: pt.y - draggingComment.offsetY,
          };
        }
        return c;
      });
      onUpdateComments(newComments);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    handleViewportPointerUp(e);

    const { handled } = handleSelectionPointerUp(e);
    if (handled) return;

    handleWallPointerUp(e);

    if (mode === 'RULER' && drawingRulerStart && drawingRulerCurrent) {
      if (Math.hypot(drawingRulerCurrent.x - drawingRulerStart.x, drawingRulerCurrent.y - drawingRulerStart.y) > 5) {
        setRulers(prev => [...prev, {
          id: Math.random().toString(36).substring(2, 9),
          start: drawingRulerStart,
          end: drawingRulerCurrent,
          createdAt: Date.now()
        }]);
      }
      setDrawingRulerStart(null);
      setDrawingRulerCurrent(null);
    }

    handleFurniturePointerUp(e);
    handleFloorPointerUp(e);
    if (draggingComment) setDraggingComment(null);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (handleFloorDoubleClickCanvas(e).handled) return;
  };

  const handleCommentPointerDown = (e: React.PointerEvent, comment: CommentType) => {
    if (mode !== 'SELECT') return;
    e.stopPropagation();
    selectComment(e, comment.id);
    const pt = getPoint(e);
    setDraggingComment({
      id: comment.id,
      offsetX: pt.x - comment.x,
      offsetY: pt.y - comment.y,
    });
  };

  const pDistance = (x: number, y: number, x1: number, y1: number, x2: number, y2: number) => {
    return pointToLineSegmentDistance(x, y, x1, y1, x2, y2);
  };

  let smartMeasures: { start: Point, end: Point }[] = [];
  if (selectedItemIds.length === 1 && (mode === 'SELECT' || mode === 'RULER')) {
    const selectedItem = items.find(i => i.id === selectedItemIds[0]);
    if (selectedItem) {
      const bounds = getItemBounds(selectedItem);
      const closeWalls = walls.filter(w => pDistance(selectedItem.x, selectedItem.y, w.start.x, w.start.y, w.end.x, w.end.y).dist < 50);
      closeWalls.forEach(wall => {
        const proj = pDistance(selectedItem.x, selectedItem.y, wall.start.x, wall.start.y, wall.end.x, wall.end.y).closestPt;
        
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const len = vectorLength(dx, dy);
        if (len === 0) return;
        const nx = dx / len;
        const ny = dy / len;
        
        const radius = calculateBoxRadiusAlongVector(bounds.w, bounds.d, nx, ny);
        
        const dotStart = (wall.start.x - proj.x) * nx + (wall.start.y - proj.y) * ny;
        const dotEnd = (wall.end.x - proj.x) * nx + (wall.end.y - proj.y) * ny;
        
        const startMeasurePt = { x: proj.x + nx * (dotStart >= 0 ? 1 : -1) * radius, y: proj.y + ny * (dotStart >= 0 ? 1 : -1) * radius };
        const endMeasurePt = { x: proj.x + nx * (dotEnd >= 0 ? 1 : -1) * radius, y: proj.y + ny * (dotEnd >= 0 ? 1 : -1) * radius };
        
        smartMeasures.push({ start: startMeasurePt, end: wall.start });
        smartMeasures.push({ start: endMeasurePt, end: wall.end });
      });
    }
  }



  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-[#f8fafc] overflow-hidden select-none touch-none ${
        mode === 'DRAW_WALL' || mode === 'DRAW_FLOOR'
          ? 'cursor-crosshair'
          : mode === 'COMMENT'
          ? 'cursor-text'
          : mode === 'PAN'
          ? isPanning ? 'cursor-grabbing' : 'cursor-grab'
          : isPanning
          ? 'cursor-grabbing'
          : 'cursor-default'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      <div 
        id="grid-bg"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px),
            linear-gradient(to right, #94a3b8 1px, transparent 1px),
            linear-gradient(to bottom, #94a3b8 1px, transparent 1px)
          `,
          backgroundSize: `${currentGridSize * zoom}px ${currentGridSize * zoom}px, ${currentGridSize * zoom}px ${currentGridSize * zoom}px, ${currentGridSize * 5 * zoom}px ${currentGridSize * 5 * zoom}px, ${currentGridSize * 5 * zoom}px ${currentGridSize * 5 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
      />
      
      <div 
        id="transform-layer"
        className="absolute inset-0 w-full h-full origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
        }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
            </marker>
            <SvgFloorPatterns />
          </defs>
        {/* Floors */}
        {floors.map(floor => (
          <g 
            key={floor.id}
            onPointerEnter={() => setHoveredFloorId(floor.id)}
            onPointerLeave={() => setHoveredFloorId(null)}
          >
            <polygon
              points={floor.points.map(p => `${p.x},${p.y}`).join(' ')}
              fill={floor.material ? `url(#pattern-${floor.material})` : (floor.color || '#e2e8f0')}
              stroke={floor.id === selectedFloorId ? "#4f46e5" : "#94a3b8"}
              strokeWidth={floor.id === selectedFloorId ? 3 : 1}
              opacity={0.88}
              onPointerDown={(e) => handleFloorPointerDown(e, floor)}
              className={(mode === 'SELECT' || mode === 'DRAW_FLOOR') ? 'pointer-events-auto cursor-pointer' : 'pointer-events-auto'}
            />
            {(floor.id === hoveredFloorId || floor.id === selectedFloorId) && (
              <g className="pointer-events-none">
                {(() => {
                   const c = getCentroid(floor.points);
                   const area = calculateArea(floor.points);
                   return (
                     <text x={c.x} y={c.y} fill="#1e293b" fontSize="14" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle" className="drop-shadow-sm">
                       {area.toFixed(1)} m²
                     </text>
                   );
                })()}
              </g>
            )}
          </g>
        ))}

        {/* Placed Walls */}
        {walls.map(wall => {
          const segments = getWallSegments(wall, items);
          return (
          <g 
            key={wall.id} 
            onPointerDown={(e) => handleWallPointerDown(e, wall)} 
            className={mode === 'SELECT' ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : ''}
            style={wall.id === selectedWallId ? { filter: 'drop-shadow(0px 0px 8px rgba(99,102,241,0.6))' } : {}}
          >
            {segments.map((seg, i) => (
              <g key={i}>
                <line
                  x1={seg.start.x}
                  y1={seg.start.y}
                  x2={seg.end.x}
                  y2={seg.end.y}
                  stroke={wall.id === selectedWallId ? "#4f46e5" : "#334155"}
                  strokeWidth={wall.thickness}
                  strokeLinecap="square"
                />
                <line
                  x1={seg.start.x}
                  y1={seg.start.y}
                  x2={seg.end.x}
                  y2={seg.end.y}
                  stroke={wall.id === selectedWallId ? "#818cf8" : "#f1f5f9"}
                  strokeWidth={Math.max(2, wall.thickness - 4)}
                  strokeLinecap="square"
                />
              </g>
            ))}
            {/* Invisible thicker hit area for easier selection */}
            <line
              x1={wall.start.x}
              y1={wall.start.y}
              x2={wall.end.x}
              y2={wall.end.y}
              stroke="transparent"
              strokeWidth={30}
              strokeLinecap="round"
            />
            {/* Length label for selected wall */}
            {wall.id === selectedWallId && (
              <>
                <text 
                  x={(wall.start.x + wall.end.x) / 2} 
                  y={(wall.start.y + wall.end.y) / 2 - Math.max(15, wall.thickness / 2 + 10)}
                  fill="#4f46e5" fontSize="12" fontWeight="bold" textAnchor="middle"
                >
                  {pxToMeters(vectorLength(wall.end.x - wall.start.x, wall.end.y - wall.start.y)).toFixed(2)}m
                </text>
                {/* Start node with expanded touch target */}
                <circle 
                  cx={wall.start.x} cy={wall.start.y} r={20} 
                  fill="transparent"
                  className="pointer-events-auto cursor-move"
                  onPointerDown={(e) => handleWallNodePointerDown(e, wall.id, 'start')}
                />
                <circle 
                  cx={wall.start.x} cy={wall.start.y} r={7} 
                  fill="#ffffff" stroke="#4f46e5" strokeWidth={3}
                  className="pointer-events-none"
                />
                {/* End node with expanded touch target */}
                <circle 
                  cx={wall.end.x} cy={wall.end.y} r={20} 
                  fill="transparent"
                  className="pointer-events-auto cursor-move"
                  onPointerDown={(e) => handleWallNodePointerDown(e, wall.id, 'end')}
                />
                <circle 
                  cx={wall.end.x} cy={wall.end.y} r={7} 
                  fill="#ffffff" stroke="#4f46e5" strokeWidth={3}
                  className="pointer-events-none"
                />
              </>
            )}
          </g>
        );
        })}

        {/* Drawing Wall */}
        {mode === 'DRAW_WALL' && drawingStart && drawingCurrent && (
          <g>
            <line
              x1={drawingStart.x}
              y1={drawingStart.y}
              x2={drawingCurrent.x}
              y2={drawingCurrent.y}
              stroke="#4f46e5"
              strokeWidth={8}
              strokeLinecap="square"
              opacity={0.7}
            />
            <text 
              x={(drawingStart.x + drawingCurrent.x) / 2} 
              y={(drawingStart.y + drawingCurrent.y) / 2 - 15}
              fill="#4f46e5" fontSize="14" fontWeight="bold" textAnchor="middle"
            >
              {pxToMeters(vectorLength(drawingCurrent.x - drawingStart.x, drawingCurrent.y - drawingStart.y)).toFixed(2)}m
            </text>
          </g>
        )}

        {/* Drawing Floor Preview */}
        {mode === 'DRAW_FLOOR' && (
          <g>
            {floorDrawMode === 'rectangle' && rectStart && previewPt && (() => {
              const minX = Math.min(rectStart.x, previewPt.x);
              const maxX = Math.max(rectStart.x, previewPt.x);
              const minY = Math.min(rectStart.y, previewPt.y);
              const maxY = Math.max(rectStart.y, previewPt.y);
              const wM = pxToMeters(maxX - minX).toFixed(2);
              const hM = pxToMeters(maxY - minY).toFixed(2);
              const areaM2 = (pxToMeters(maxX - minX) * pxToMeters(maxY - minY)).toFixed(1);

              return (
                <g className="pointer-events-none">
                  <rect
                    x={minX}
                    y={minY}
                    width={maxX - minX}
                    height={maxY - minY}
                    fill="rgba(99, 102, 241, 0.15)"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <rect
                    x={(minX + maxX) / 2 - 58}
                    y={(minY + maxY) / 2 - 14}
                    width={116}
                    height={28}
                    rx={6}
                    fill="#1e293b"
                    opacity={0.9}
                  />
                  <text
                    x={(minX + maxX) / 2}
                    y={(minY + maxY) / 2 + 4}
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {wM}m × {hM}m ({areaM2}m²)
                  </text>
                </g>
              );
            })()}

            {floorDrawMode === 'polygon' && drawingFloorPts.length > 0 && (() => {
              const startPt = drawingFloorPts[0];
              const lastPt = drawingFloorPts[drawingFloorPts.length - 1];
              const activePreview = previewPt || lastPt;
              const isNearStart = drawingFloorPts.length >= 3 && Math.hypot(activePreview.x - startPt.x, activePreview.y - startPt.y) < 28 / zoom;

              const polyPts = [...drawingFloorPts];
              if (isNearStart) {
                polyPts.push(startPt);
              } else if (previewPt) {
                polyPts.push(previewPt);
              }

              const area = calculateArea(polyPts);
              const previewDist = previewPt ? pxToMeters(vectorLength(previewPt.x - lastPt.x, previewPt.y - lastPt.y)).toFixed(2) : '0.00';

              return (
                <g>
                  {/* Filled polygon preview */}
                  {polyPts.length >= 3 && (
                    <polygon
                      points={polyPts.map(p => `${p.x},${p.y}`).join(' ')}
                      fill={isNearStart ? "rgba(16, 185, 129, 0.22)" : "rgba(99, 102, 241, 0.18)"}
                      stroke="transparent"
                    />
                  )}

                  {/* Lines placed so far */}
                  <polyline
                    points={drawingFloorPts.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                  />

                  {/* Active preview line */}
                  {previewPt && (
                    <line
                      x1={lastPt.x}
                      y1={lastPt.y}
                      x2={isNearStart ? startPt.x : previewPt.x}
                      y2={isNearStart ? startPt.y : previewPt.y}
                      stroke={isNearStart ? "#10b981" : "#4f46e5"}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                  )}

                  {/* Dimension pill on active preview line */}
                  {previewPt && !isNearStart && Math.hypot(previewPt.x - lastPt.x, previewPt.y - lastPt.y) > 20 && (
                    <g className="pointer-events-none">
                      <rect
                        x={(lastPt.x + previewPt.x) / 2 - 20}
                        y={(lastPt.y + previewPt.y) / 2 - 10}
                        width={40}
                        height={20}
                        rx={4}
                        fill="#1e293b"
                        opacity={0.85}
                      />
                      <text
                        x={(lastPt.x + previewPt.x) / 2}
                        y={(lastPt.y + previewPt.y) / 2 + 4}
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {previewDist}m
                      </text>
                    </g>
                  )}

                  {/* Centroid area badge */}
                  {polyPts.length >= 3 && (() => {
                    const c = getCentroid(polyPts);
                    return (
                      <g className="pointer-events-none">
                        <rect
                          x={c.x - 38}
                          y={c.y - 12}
                          width={76}
                          height={24}
                          rx={6}
                          fill="#ffffff"
                          stroke={isNearStart ? "#10b981" : "#4f46e5"}
                          strokeWidth={1.5}
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.12))"
                        />
                        <text
                          x={c.x}
                          y={c.y + 4}
                          fill={isNearStart ? "#059669" : "#4338ca"}
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {area.toFixed(1)} m²
                        </text>
                      </g>
                    );
                  })()}

                  {/* Corner points */}
                  {drawingFloorPts.map((p, i) => (
                    <g key={`pt-${i}`}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={i === 0 ? 7 : 4.5}
                        fill={i === 0 ? "#4f46e5" : "#ffffff"}
                        stroke="#4f46e5"
                        strokeWidth={2}
                      />
                    </g>
                  ))}

                  {/* Pulsing Start Pin & Close Tooltip */}
                  {isNearStart && (
                    <g className="pointer-events-none">
                      <circle
                        cx={startPt.x}
                        cy={startPt.y}
                        r={18}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth={3}
                        className="animate-ping opacity-75"
                      />
                      <circle
                        cx={startPt.x}
                        cy={startPt.y}
                        r={9}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth={2.5}
                      />
                      <rect
                        x={startPt.x - 56}
                        y={startPt.y - 32}
                        width={112}
                        height={22}
                        rx={6}
                        fill="#065f46"
                      />
                      <text
                        x={startPt.x}
                        y={startPt.y - 17}
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        Click to Close Floor
                      </text>
                    </g>
                  )}
                </g>
              );
            })()}
          </g>
        )}
        {/* Smart Measures (selected item) */}
        {smartMeasures.map((measure, idx) => {
           const dist = vectorLength(measure.end.x - measure.start.x, measure.end.y - measure.start.y);
           const meters = pxToMeters(dist).toFixed(2);
           const cx = (measure.start.x + measure.end.x) / 2;
           const cy = (measure.start.y + measure.end.y) / 2;
           return (
             <g key={`sm-${idx}`} className="pointer-events-none">
               <line x1={measure.start.x} y1={measure.start.y} x2={measure.end.x} y2={measure.end.y} stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 4" />
               <rect x={cx - 20} y={cy - 10} width="40" height="20" fill="#f43f5e" rx="4" />
               <text x={cx} y={cy} fill="white" fontSize="10" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">{meters}m</text>
             </g>
           );
        })}

        {/* Permanent Rulers */}
        {rulers.map(ruler => {
           const dist = vectorLength(ruler.end.x - ruler.start.x, ruler.end.y - ruler.start.y);
           const meters = pxToMeters(dist).toFixed(2);
           const cx = (ruler.start.x + ruler.end.x) / 2;
           const cy = (ruler.start.y + ruler.end.y) / 2;
           return (
             <g key={ruler.id} className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); setRulers(prev => prev.filter(r => r.id !== ruler.id)); }}>
               <line x1={ruler.start.x} y1={ruler.start.y} x2={ruler.end.x} y2={ruler.end.y} stroke="#0ea5e9" strokeWidth="2" />
               <circle cx={ruler.start.x} cy={ruler.start.y} r="3" fill="#0ea5e9" />
               <circle cx={ruler.end.x} cy={ruler.end.y} r="3" fill="#0ea5e9" />
               <rect x={cx - 24} y={cy - 12} width="48" height="24" fill="#0ea5e9" rx="4" />
               <text x={cx} y={cy} fill="white" fontSize="11" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">{meters}m</text>
               <title>Click to remove</title>
             </g>
           );
        })}

        {/* Drawing Ruler Preview */}
        {mode === 'RULER' && drawingRulerStart && drawingRulerCurrent && (
          <g className="pointer-events-none">
            <line x1={drawingRulerStart.x} y1={drawingRulerStart.y} x2={drawingRulerCurrent.x} y2={drawingRulerCurrent.y} stroke="#0ea5e9" strokeWidth="2" strokeDasharray="4 4" />
            {(() => {
              const dist = vectorLength(drawingRulerCurrent.x - drawingRulerStart.x, drawingRulerCurrent.y - drawingRulerStart.y);
              const meters = pxToMeters(dist).toFixed(2);
              const cx = (drawingRulerStart.x + drawingRulerCurrent.x) / 2;
              const cy = (drawingRulerStart.y + drawingRulerCurrent.y) / 2;
              return (
                <g>
                  <rect x={cx - 24} y={cy - 12} width="48" height="24" fill="#0ea5e9" rx="4" />
                  <text x={cx} y={cy} fill="white" fontSize="11" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">{meters}m</text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Active Floor Handles, Edge Dimension Pills, and Midpoint '+' Splitters */}
        {selectedFloor && mode === 'SELECT' && (
          <g>
            {/* Edge dimension pills & Midpoint '+' buttons */}
            {selectedFloor.points.map((p1, i) => {
              const nextIdx = (i + 1) % selectedFloor.points.length;
              const p2 = selectedFloor.points[nextIdx];
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;
              const distM = pxToMeters(vectorLength(p2.x - p1.x, p2.y - p1.y)).toFixed(2);

              return (
                <g key={`floor-edge-${i}`}>
                  {/* Dimension Pill */}
                  <g className="pointer-events-none">
                    <rect
                      x={midX - 22}
                      y={midY - 10}
                      width={44}
                      height={20}
                      rx={6}
                      fill="#ffffff"
                      stroke="#6366f1"
                      strokeWidth={1.5}
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                    />
                    <text
                      x={midX}
                      y={midY + 3.5}
                      fill="#4338ca"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {distM}m
                    </text>
                  </g>

                  {/* Midpoint '+' handle to insert new vertex */}
                  <g
                    className="cursor-pointer pointer-events-auto group"
                    onPointerDown={(e) => handleFloorEdgeSplit(e, selectedFloor.id, i, midX, midY)}
                  >
                    <title>Click or drag to add corner</title>
                    <circle cx={midX} cy={midY - 18} r={14} fill="transparent" />
                    <circle
                      cx={midX}
                      cy={midY - 18}
                      r={7}
                      fill="#4f46e5"
                      stroke="#ffffff"
                      strokeWidth={2}
                      className="transition-transform group-hover:scale-125"
                    />
                    <line x1={midX - 3.5} y1={midY - 18} x2={midX + 3.5} y2={midY - 18} stroke="#ffffff" strokeWidth={1.5} strokeLinecap="round" />
                    <line x1={midX} y1={midY - 21.5} x2={midX} y2={midY - 14.5} stroke="#ffffff" strokeWidth={1.5} strokeLinecap="round" />
                  </g>
                </g>
              );
            })}

            {/* Corner vertex handles */}
            {selectedFloor.points.map((pt, i) => (
              <g key={`handle-${i}`}>
                <circle
                  cx={pt.x} cy={pt.y} r={22}
                  fill="transparent"
                  className="pointer-events-auto cursor-move"
                  onPointerDown={(e) => handleFloorNodePointerDown(e, selectedFloor.id, i)}
                  onDoubleClick={(e) => handleFloorNodeDoubleClick(e, selectedFloor.id, i)}
                >
                  <title>Drag to adjust corner • Double click to delete</title>
                </circle>
                <circle
                  cx={pt.x} cy={pt.y} r={7}
                  fill="#ffffff" stroke="#4f46e5" strokeWidth={3}
                  className="pointer-events-none"
                />
                <circle
                  cx={pt.x} cy={pt.y} r={2.5}
                  fill="#4f46e5"
                  className="pointer-events-none"
                />
              </g>
            ))}
          </g>
        )}
      </svg>

      {/* Items */}
      {items.map(item => {
        const typeInfo = ITEM_CATALOG.find(i => i.id === item.typeId);
        if (!typeInfo) return null;
        
        const isSelected = selectedItemIds.includes(item.id);
        const itemW = Number.isFinite(item.width) ? item.width! : typeInfo.width;
        const itemD = Number.isFinite(item.depth) ? item.depth! : typeInfo.depth;
        const itemRot = Number.isFinite(item.rotation) ? item.rotation : 0;
        const w = cmToPx(itemW);
        const d = cmToPx(itemD);
        
        return (
          <div
            key={item.id}
            onPointerDown={(e) => handleItemPointerDown(e, item)}
            className={`absolute shadow-sm transition-shadow pointer-events-auto ${typeInfo.shape !== 'door' ? 'overflow-hidden' : ''}`}
            style={{
              left: item.x,
              top: item.y,
              width: w,
              height: d,
              backgroundColor: typeInfo.shape !== 'door' && typeInfo.shape !== 'window' && typeInfo.shape !== 'corner_railing' ? typeInfo.color : 'transparent',
              transform: `translate(-50%, -50%) rotate(${itemRot}rad)`,
              borderRadius: typeInfo.shape === 'cylinder' ? '50%' : typeInfo.shape === 'door' ? '0' : '4px',
              border: isSelected ? '2px solid #4f46e5' : (typeInfo.shape === 'door' ? 'none' : '1px solid rgba(0,0,0,0.2)'),
              cursor: mode === 'SELECT' ? (isDraggingItem(item.id) ? 'grabbing' : 'grab') : 'default',
              boxShadow: isSelected ? '0 0 0 4px rgba(99, 102, 241, 0.25), 0 10px 15px -3px rgba(0,0,0,0.1)' : (typeInfo.shape === 'door' ? 'none' : '0 2px 4px rgba(0,0,0,0.05)'),
              transition: 'box-shadow 0.2s ease-out, border 0.2s ease-out',
              zIndex: isSelected ? 100 : 10
            }}
          >
            {typeInfo.shape === 'bed' && (
              <>
                <div className="absolute top-2 left-2 right-2 h-1/4 bg-white/50 rounded-sm"></div>
                <div className="absolute top-1/3 left-0 right-0 bottom-0 bg-white/20 border-t border-black/10"></div>
              </>
            )}
            {typeInfo.shape === 'sofa' && (
              <>
                <div className="absolute top-0 left-0 right-0 h-1/4 bg-black/10 rounded-t-sm"></div>
                <div className="absolute top-0 left-0 bottom-0 w-[15%] bg-black/10 rounded-l-sm"></div>
                <div className="absolute top-0 right-0 bottom-0 w-[15%] bg-black/10 rounded-r-sm"></div>
              </>
            )}
            {typeInfo.shape === 'table' && (
              <div className="absolute inset-1 border border-black/10 rounded-sm"></div>
            )}
            {typeInfo.shape === 'door' && (
              <div className="relative w-full h-full bg-white">
                {/* Door frame indicators */}
                <div className="absolute inset-y-0 left-0 w-1 bg-slate-400 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-1 bg-slate-400 pointer-events-none" />
                {/* Door swing arc */}
                <div 
                  className="absolute bottom-0 left-0 border-l-[2px] border-t-[2px] border-slate-400 rounded-tl-full pointer-events-none"
                  style={{ width: w, height: w, transformOrigin: 'bottom left' }}
                />
                {/* Door leaf */}
                <div 
                  className="absolute bottom-0 left-0 bg-slate-700 pointer-events-none" 
                  style={{ width: '3px', height: w }} 
                />
                {/* Selection border for door frame */}
                {isSelected && <div className="absolute inset-0 border-2 border-[#4f46e5] pointer-events-none" />}
              </div>
            )}
            {typeInfo.shape === 'window' && (
              <div className="w-full h-full flex flex-col justify-center border-y-[3px] border-slate-300 bg-white">
                <div className="w-full h-1.5 bg-cyan-400/50"></div>
              </div>
            )}
            {typeInfo.shape === 'bathtub' && (
              <div className="absolute inset-2 border border-black/10 rounded-[30%] bg-white/20"></div>
            )}
            {typeInfo.shape === 'toilet' && (
              <>
                <div className="absolute top-0 left-1/4 right-1/4 h-1/3 bg-black/10 rounded-t-sm"></div>
                <div className="absolute top-1/3 left-1/4 right-1/4 bottom-2 bg-white/40 border border-black/10 rounded-full"></div>
              </>
            )}
            {typeInfo.shape === 'counter' && (
              <div className="absolute top-0 left-0 right-0 h-1/5 bg-black/10 border-b border-black/10"></div>
            )}
            {(typeInfo.shape === 'base_cabinet' || typeInfo.shape === 'dishwasher') && (
              <div className="absolute top-1 left-1 right-1 h-2 bg-black/10 rounded-sm"></div>
            )}
            {typeInfo.shape === 'corner_cabinet' && (
              <>
                <div className="absolute top-1 left-1 right-1/2 bottom-1/2 bg-white/20 border border-black/10"></div>
                <div className="absolute top-1/2 left-1 right-1 bottom-1 bg-white/20 border border-black/10"></div>
              </>
            )}
            {typeInfo.shape === 'kitchen_island' && (
              <div className="absolute inset-2 border border-black/10 rounded-sm"></div>
            )}
            {typeInfo.shape === 'kitchen_sink' && (
              <>
                <div className="absolute top-1/4 left-1/4 right-1/4 bottom-1/4 bg-blue-500/20 border border-black/20 rounded-sm"></div>
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/20 rounded-full"></div>
              </>
            )}
            {typeInfo.shape === 'lounge_chair' && (
              <>
                <div className="absolute top-0 left-0 right-0 h-1/4 bg-black/10 rounded-t-lg"></div>
                <div className="absolute top-1/4 left-1/4 right-1/4 bottom-1/4 bg-white/10 rounded-sm"></div>
              </>
            )}
            {typeInfo.shape === 'tv_cabinet' && (
              <div className="absolute top-1/4 left-1 right-1 bottom-1/4 bg-black/20 border border-black/10 rounded-sm"></div>
            )}
            {typeInfo.shape === 'room_divider' && (
              <div className="absolute inset-y-0 left-1/2 w-0.5 bg-black/30 -translate-x-1/2"></div>
            )}
            {typeInfo.shape === 'railing' && (
              <div className="absolute inset-y-0 left-1/2 w-0.5 bg-black/50 -translate-x-1/2"></div>
            )}
            {typeInfo.shape === 'corner_railing' && (
              <>
                <div className="absolute inset-y-0 left-0 w-0.5 bg-slate-700"></div>
                <div className="absolute top-0 inset-x-0 h-0.5 bg-slate-700"></div>
              </>
            )}
            {typeInfo.shape === 'rug' && (
              <div className="absolute inset-2 border-2 border-dashed border-black/10 rounded-sm"></div>
            )}

            {isSelected && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none tracking-wider">
                {typeInfo.name}
              </div>
            )}
          </div>
        );
      })}

      {mode === 'SELECT' && !isDrawerOpen && selectedItemIds.length === 1 && items.filter(item => item.id === selectedItemIds[0] && ['railing', 'corner_railing'].includes(ITEM_CATALOG.find(type => type.id === item.typeId)?.shape || '')).map(item => (
        <RailingEndpoints key={item.id} item={item} zoom={zoom} gridSize={currentGridSize} getPoint={getPoint} onUpdate={updated => onUpdateItems(items.map(current => current.id === updated.id ? updated : current))} />
      ))}
      {/* Snap Guides */}
      {snapGuides.x !== null && (
        <div 
          className="absolute bg-indigo-500 pointer-events-none z-[150]"
          style={{ 
            left: snapGuides.x, 
            top: -10000, 
            width: Math.max(1, 1.5 / zoom), 
            height: 20000,
            transform: 'translateX(-50%)'
          }}
        />
      )}
      {snapGuides.y !== null && (
        <div 
          className="absolute bg-indigo-500 pointer-events-none z-[150]"
          style={{ 
            left: -10000, 
            top: snapGuides.y, 
            width: 20000, 
            height: Math.max(1, 1.5 / zoom),
            transform: 'translateY(-50%)'
          }}
        />
      )}

      {/* Comments */}
      {comments.map(comment => {
        const isSelected = comment.id === selectedCommentId;
        return (
          <div
            key={comment.id}
            onPointerDown={(e) => handleCommentPointerDown(e, comment)}
            className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: comment.x, top: comment.y }}
          >
            <textarea
              value={comment.text ?? ''}
              onChange={(e) => {
                const newComments = comments.map(c => c.id === comment.id ? { ...c, text: e.target.value } : c);
                onUpdateComments(newComments);
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => {
                if (mode === 'SELECT') {
                  e.stopPropagation();
                  onSelect([], null, null, comment.id);
                  const pt = getPoint(e);
                  setDraggingComment({
                    id: comment.id,
                    offsetX: pt.x - comment.x,
                    offsetY: pt.y - comment.y,
                  });
                }
              }}
              className={`resize-none bg-yellow-200/90 backdrop-blur-sm p-2 text-sm text-yellow-900 font-medium rounded-lg shadow-md border ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-yellow-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px] min-h-[60px] ${mode === 'SELECT' ? 'cursor-grab active:cursor-grabbing' : ''}`}
              placeholder="Type note..."
            />
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onUpdateComments(comments.filter(c => c.id !== comment.id));
              }}
              className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow border border-slate-200 text-slate-400 hover:text-red-500 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        );
      })}
      {selectionBox && mode === 'SELECT' && (
        <div 
          className="absolute border border-indigo-500 bg-indigo-500/10 pointer-events-none"
          style={{
            left: Math.min(selectionBox.start.x, selectionBox.current.x),
            top: Math.min(selectionBox.start.y, selectionBox.current.y),
            width: Math.abs(selectionBox.start.x - selectionBox.current.x),
            height: Math.abs(selectionBox.start.y - selectionBox.current.y),
          }}
        />
      )}
      </div>
      
      {/* Wall drawing helper banner for mobile */}
      {mode === 'DRAW_WALL' && drawingStart && (
        <div className="absolute top-16 md:top-6 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-xs px-3.5 py-1.5 rounded-full shadow-lg z-20 flex items-center gap-2 animate-in fade-in">
          <span>Tap or drag to finish wall</span>
          <button 
            onClick={cancelWallDrawing}
            className="text-slate-400 hover:text-white p-0.5 rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floor Drawing Mode HUD - Cancel, Undo, Finish & Shape toggles */}
      {mode === 'DRAW_FLOOR' && (
        <div className="absolute top-16 md:top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-30 pointer-events-auto max-w-[94vw] animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md text-white px-3 py-1.5 rounded-2xl shadow-xl border border-slate-800/80 text-xs">
            {/* Draw Mode Switcher - Primary Rectangle first, Secondary Freeform */}
            <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/60 mr-1">
              <button
                onClick={() => switchFloorDrawMode('rectangle')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  floorDrawMode === 'rectangle'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Rectangle (Primary - Click 2 opposite corners)"
              >
                <Square className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">Rectangle</span>
              </button>
              <button
                onClick={() => switchFloorDrawMode('polygon')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  floorDrawMode === 'polygon'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Freeform Polygon (Secondary - Click points to outline room)"
              >
                <Pentagon className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">Free</span>
              </button>
            </div>

            {/* Status indicator */}
            {floorDrawMode === 'polygon' && (
              <span className="font-semibold text-indigo-300 text-[11px] px-1.5">
                {drawingFloorPts.length === 0
                  ? 'Click to start'
                  : `${drawingFloorPts.length} ${drawingFloorPts.length === 1 ? 'pt' : 'pts'}`}
              </span>
            )}
            {floorDrawMode === 'rectangle' && (
              <span className="font-semibold text-indigo-300 text-[11px] px-1.5">
                {!rectStart ? 'Click 1st corner' : 'Click 2nd corner'}
              </span>
            )}

            <div className="w-px h-4 bg-slate-700 mx-0.5" />

            {/* Undo Point */}
            {floorDrawMode === 'polygon' && (
              <button
                onClick={handleUndoFloorPoint}
                disabled={drawingFloorPts.length === 0}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-medium"
                title="Undo last point (Backspace)"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Undo</span>
              </button>
            )}

            {/* Finish Floor Polygon */}
            {floorDrawMode === 'polygon' && (
              <button
                onClick={() => completeFloorPolygon(drawingFloorPts)}
                disabled={drawingFloorPts.length < 3}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-35 disabled:hover:bg-emerald-600 text-white rounded-lg font-semibold shadow-sm transition-colors"
                title="Finish Floor (Enter or double-click)"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Finish</span>
              </button>
            )}

            {/* Cancel Tool */}
            <button
              onClick={handleCancelDrawingFloor}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-rose-300 hover:text-white hover:bg-rose-900/40 transition-colors font-medium ml-0.5"
              title="Cancel (Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>

          {/* Helpful gesture guide */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 bg-white/90 backdrop-blur px-3 py-0.5 rounded-full border border-slate-200/80 shadow-sm pointer-events-none">
            {floorDrawMode === 'polygon' ? (
              <span>
                Tip: Click start point or press <kbd className="px-1 py-0.2 bg-slate-100 border rounded font-mono text-[10px]">Enter</kbd> to close • <kbd className="px-1 py-0.2 bg-slate-100 border rounded font-mono text-[10px]">Esc</kbd> to cancel
              </span>
            ) : (
              <span>
                Tip: Click two diagonal corners • Press <kbd className="px-1 py-0.2 bg-slate-100 border rounded font-mono text-[10px]">Esc</kbd> to cancel
              </span>
            )}
          </div>
        </div>
      )}

      {/* Floating Selected Floor Adjustment HUD */}
      {mode === 'SELECT' && selectedFloor && !isDrawerOpen && (
        <div className="absolute bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-28 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-20 flex flex-col gap-2 max-w-[95vw] animate-in fade-in slide-in-from-bottom-3 duration-150">
          {/* Header info */}
          <div className="flex items-center justify-between gap-3 px-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-bold text-slate-800">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Floor Surface
              </span>
              <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200/60">
                {calculateArea(selectedFloor.points).toFixed(1)} m²
              </span>
              <span className="text-slate-400 font-medium hidden sm:inline">
                {selectedFloor.points.length} vertices
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (onDuplicateFloor) onDuplicateFloor(selectedFloor.id);
                }}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Duplicate floor"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (onDeleteFloor) onDeleteFloor(selectedFloor.id);
                  else {
                    onUpdateFloors(floors.filter(f => f.id !== selectedFloor.id));
                    onSelect([], null, null, null);
                  }
                }}
                className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                title="Delete floor"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onSelect([], null, null, null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Deselect"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Color & Material Presets */}
          <div className="flex items-center gap-1.5 px-1 overflow-x-auto py-0.5">
            <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap mr-1">Material:</span>
            {FLOOR_MATERIALS.map(mat => {
              const isSelected = selectedFloor.material === mat.id || selectedFloor.color === mat.color;
              return (
                <button
                  key={mat.id}
                  onClick={() => {
                    onUpdateFloors(floors.map(f => f.id === selectedFloor.id ? { ...f, color: mat.color, material: mat.id } : f));
                  }}
                  title={mat.name}
                  className={`w-6 h-6 rounded-full border shadow-sm transition-transform flex-shrink-0 ${
                    isSelected ? 'ring-2 ring-indigo-600 scale-110 border-white' : 'border-slate-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: mat.color }}
                />
              );
            })}
            <label className="relative cursor-pointer flex-shrink-0" title="Custom color">
              <input
                type="color"
                value={selectedFloor.color || '#e2e8f0'}
                onChange={(e) => {
                  onUpdateFloors(floors.map(f => f.id === selectedFloor.id ? { ...f, color: e.target.value, material: undefined } : f));
                }}
                className="opacity-0 absolute inset-0 w-6 h-6 cursor-pointer"
              />
              <div className="w-6 h-6 rounded-full border border-dashed border-slate-400 flex items-center justify-center text-[10px] text-slate-500 hover:border-slate-700">
                +
              </div>
            </label>
          </div>

          {/* Universal Joystick Floor Surface Adjuster */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-slate-50/90 rounded-2xl p-2 sm:p-2.5 border border-slate-200/80 gap-2.5">
            <div className="flex items-center gap-2.5">
              <UniversalJoystick
                onMove={handleFloorGlideMove}
                onSingleNudge={handleFloorSingleNudge}
                variant="compact"
                theme="light"
                label="Glide"
              />
              <div className="text-[11px] text-slate-500 leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700 block">Glide Surface</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    glideSnapMode === 'snap' 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {glideSnapMode === 'snap' ? 'Snap on Grid' : 'Free Move'}
                  </span>
                </div>
                <span className="text-slate-400 text-[10px]">
                  {glideSnapMode === 'snap' ? 'Snaps to 0.5m grid increments' : 'Continuous free floating move'}
                </span>
              </div>
            </div>

            {/* Two Options: Snap on Grid (Primary) and Free Move (Secondary) */}
            <div className="flex items-center self-end sm:self-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/70 shadow-xs shrink-0">
              <button
                type="button"
                onClick={() => setGlideSnapMode('snap')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all whitespace-nowrap ${
                  glideSnapMode === 'snap'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Snap on Grid (Primary) - moves in 0.5m grid increments"
              >
                <Magnet className="w-3 h-3 shrink-0" />
                <span>Snap on Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setGlideSnapMode('free')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all whitespace-nowrap ${
                  glideSnapMode === 'free'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Free Move (Secondary) - smooth continuous movement without snapping"
              >
                <Move className="w-3 h-3 shrink-0" />
                <span>Free Move</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas UI Overlays */}
      <div className="hidden md:flex absolute top-6 left-6 items-center gap-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg border border-slate-200 shadow-sm pointer-events-none z-10">
        <span className="text-xs font-bold text-slate-500">
          SCALE: 1 Sub-Grid = {gridOption === 1 ? '0.5m' : gridOption === 2 ? '0.25m' : '0.125m'} | 1 Main Grid = {pxToMeters(currentGridSize * 5)}m
        </span>
        <div className="h-4 w-px bg-slate-200"></div>
        <span className="text-xs font-bold text-slate-800">
          WALLS: {walls.length}
        </span>
      </div>

      <div className="absolute top-16 md:top-6 right-3 md:right-6 flex items-center gap-1 bg-white/90 backdrop-blur p-1 rounded-xl border border-slate-200 shadow-sm z-10">
        <button 
          onClick={() => setGridOption(gridOption === 3 ? 1 : (gridOption + 1) as 1|2|3)}
          title={`Toggle Grid Size (Current: ${gridOption === 1 ? '0.5m' : gridOption === 2 ? '0.25m' : '0.125m'})`}
          className={`p-1.5 rounded-lg transition-colors bg-indigo-100 text-indigo-600 font-bold text-[10px] uppercase w-14`}
        >
          {gridOption === 1 ? '0.5M' : gridOption === 2 ? '0.25M' : '0.125M'}
        </button>
        <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
        <button 
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-slate-700 w-11 text-center cursor-pointer hover:bg-slate-100 py-1.5 rounded-lg" onClick={handleFitScreen} title="Reset Zoom & Pan">
          {Math.round(zoom * 100)}%
        </span>
        <button 
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
        <button 
          onClick={handleFitScreen}
          title="Fit to Screen"
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
