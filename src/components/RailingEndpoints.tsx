import React, { useRef } from 'react';
import type { PlacedItem, Point } from '../types';
import { railingEndpoints, resizeRailing, cornerRailingPoints, resizeCornerRailing } from '../utils/linearElement';

export function RailingEndpoints({ item, zoom, gridSize, getPoint, onUpdate }: {
  item: PlacedItem;
  zoom: number;
  gridSize: number;
  getPoint: (event: { clientX: number; clientY: number }) => Point;
  onUpdate: (item: PlacedItem) => void;
}) {
  const isCorner = item.typeId === 'bal_corner_railing';
  const points = isCorner ? cornerRailingPoints(item).slice(1) : railingEndpoints(item);
  const drag = useRef<{ original: PlacedItem; endpoint: 0 | 1; pointerId: number; start: Point; moved: boolean } | null>(null);
  const move = (event: React.PointerEvent) => {
    event.stopPropagation();
    const active = drag.current;
    if (!active || event.pointerId !== active.pointerId) return;
    const point = getPoint(event);
    if (!active.moved && Math.hypot(point.x - active.start.x, point.y - active.start.y) * zoom < 4) return;
    active.moved = true;
    onUpdate((isCorner ? resizeCornerRailing : resizeRailing)(active.original, active.endpoint, point, gridSize, event.altKey));
  };
  return <>
    {points.map((point, index) => <button
      key={index}
      aria-label={isCorner ? `Corner railing arm ${index + 1}` : `Railing ${index === 0 ? 'start' : 'end'} endpoint`}
      title={isCorner ? "Drag along the arm; lengths snap to grid increments. Alt bypasses snapping." : "Drag endpoint to resize on the grid; Alt bypasses snapping"}
      data-editor-control
      className="absolute z-[160] rounded-full border-2 border-indigo-600 bg-white/80 flex items-center justify-center touch-none"
      style={{ left: point.x, top: point.y, width: 36 / zoom, height: 36 / zoom, transform: 'translate(-50%, -50%)', pointerEvents: 'auto' }}
      onPointerDown={event => {
        if (event.button !== 0 || !event.isPrimary) return;
        event.preventDefault(); event.stopPropagation();
        drag.current = { original: item, endpoint: index as 0 | 1, pointerId: event.pointerId, start: getPoint(event), moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={move}
      onPointerUp={event => {
        move(event);
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={event => {
        event.stopPropagation();
        if (drag.current) onUpdate(drag.current.original);
        drag.current = null;
      }}
      onLostPointerCapture={() => { drag.current = null; }}
      onClick={event => event.stopPropagation()}
    ><span style={{ width: 8 / zoom, height: 8 / zoom }} className="rounded-full bg-indigo-600 pointer-events-none" /></button>)}
    <div className="absolute pointer-events-none z-[160] whitespace-nowrap rounded bg-white px-2 py-1 text-xs text-indigo-800 shadow" style={{ left: item.x, top: item.y, transform: `translate(-50%, -170%) scale(${1 / zoom})`, transformOrigin: 'center bottom' }}>
      {((item.width ?? 100) / 100).toFixed(2)} m {isCorner ? `× ${((item.depth ?? 100) / 100).toFixed(2)} m · drag either arm` : "· drag either end"}
    </div>
  </>;
}
