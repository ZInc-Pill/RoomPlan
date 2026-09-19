import React, { useEffect, useState } from 'react';
import { PlacedItem, Wall, Floor } from '../types';
import { ITEM_CATALOG } from '../catalog';
import { cmToPx } from '../utils/coordinates';

interface Mobile3DControlDeckProps {
  isPanelOpen?: boolean;
  selectedItem: PlacedItem | null;
  selectedWall: Wall | null;
  selectedFloor: Floor | null;
  onNudgeItem: (dx: number, dy: number) => void;
  onNudgeWall: (dx: number, dy: number) => void;
  onNudgeFloor?: (dx: number, dy: number) => void;
  onRotateItem: (delta: number) => void;
  onElevateItem: (deltaCm: number) => void;
  onUpdateWall: (id: string, updates: Partial<Wall>) => void;
  onUpdateFloor: (id: string, updates: Partial<Floor>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenInspector: () => void;
  onDeselect: () => void;
  onOpenCatalog: () => void;
  onOpenLayers: () => void;
  onCameraPreset: (preset: 'perspective' | 'top' | 'isometric') => void;
  onFocusSelection: () => void;
  currentCameraPreset: 'perspective' | 'top' | 'isometric';
  onSnapshot?: () => void;
}


export function Mobile3DControlDeck(props: Mobile3DControlDeckProps) {
  const [tool, setTool] = useState<'move' | 'rotate' | 'height' | 'camera'>('move');
  const [stepCm, setStepCm] = useState(10);
  const selected = props.selectedItem || props.selectedWall || props.selectedFloor;
  useEffect(() => { setTool('move'); }, [selected?.id]);
  const name = props.selectedItem ? ITEM_CATALOG.find(item => item.id === props.selectedItem?.typeId)?.name || 'Object' : props.selectedWall ? 'Wall' : 'Floor';
  const move = (x: number, y: number) => {
    const dx = cmToPx(x * stepCm), dy = cmToPx(y * stepCm);
    if (props.selectedItem) props.onNudgeItem(dx, dy);
    else if (props.selectedWall) props.onNudgeWall(dx, dy);
    else props.onNudgeFloor?.(dx, dy);
  };
  if (props.isPanelOpen) return null;
  const button = 'min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 active:bg-indigo-100';
  return (
    <section aria-label="3D controls" data-editor-control className="fixed bottom-0 inset-x-0 z-30 md:hidden px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] pointer-events-none">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur pointer-events-auto max-h-[45dvh] overflow-y-auto overscroll-contain" onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <strong className="truncate text-sm">{selected ? name : 'Explore your room'}</strong>
          {selected && <button className={button} onClick={props.onDeselect} aria-label="Deselect object">Done</button>}
        </div>
        <p className="text-xs text-slate-500 mb-3">Drag the scene to orbit. Pinch to zoom. Use the buttons below to edit.</p>
        {selected && <div className="grid grid-cols-4 gap-1 mb-3" aria-label="Editing tools">
          {(['move', 'rotate', ...(props.selectedItem ? ['height'] : []), 'camera'] as const).map(value => <button key={value} aria-pressed={tool === value} className={button + (tool === value ? ' !bg-indigo-600 !text-white !border-indigo-600' : '')} onClick={() => setTool(value as typeof tool)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
        </div>}
        {selected && tool === 'move' && <>
          <div className="flex gap-2 items-center mb-2"><label className="text-xs flex-1" htmlFor="move-step">Move step</label><select id="move-step" value={stepCm} onChange={e => setStepCm(Number(e.target.value))} className={button}>{[1, 5, 10, 25, 50].map(value => <option key={value} value={value}>{value} cm</option>)}</select><button className={button} onClick={() => props.onCameraPreset('top')}>Top view</button></div>
          <div className="grid grid-cols-2 gap-2"><button className={button} onClick={() => move(-1, 0)}>−X</button><button className={button} onClick={() => move(1, 0)}>+X</button><button className={button} onClick={() => move(0, -1)}>−Z</button><button className={button} onClick={() => move(0, 1)}>+Z</button></div>
          <p className="text-xs text-slate-500 mt-2">Move along the room axes. Top view makes placement easier.</p>
        </>}
        {selected && tool === 'rotate' && <div className="grid grid-cols-2 gap-2">{[-45, -15, 15, 45].map(degrees => <button key={degrees} className={button} onClick={() => props.onRotateItem(degrees * Math.PI / 180)}>{degrees > 0 ? '+' : ''}{degrees}°</button>)}</div>}
        {props.selectedItem && tool === 'height' && <><p className="text-sm mb-2">Above floor: {Math.round((props.selectedItem.elevation || 0) * 10) / 10} cm</p><div className="grid grid-cols-2 gap-2"><button className={button} onClick={() => props.onElevateItem(-10)}>Lower 10 cm</button><button className={button} onClick={() => props.onElevateItem(10)}>Raise 10 cm</button></div></>}
        {(!selected || tool === 'camera') && <div className="grid grid-cols-3 gap-2">{(['perspective', 'top', 'isometric'] as const).map(preset => <button key={preset} aria-pressed={props.currentCameraPreset === preset} className={button} onClick={() => props.onCameraPreset(preset)}>{preset === 'top' ? 'Top' : preset === 'isometric' ? 'Isometric' : 'Perspective'}</button>)}</div>}
        <div className="grid grid-cols-3 gap-2 mt-3 border-t border-slate-100 pt-3">
          {selected ? <><button className={button} onClick={props.onOpenInspector}>Properties</button><button className={button} onClick={props.onFocusSelection}>Focus</button><button className={button} onClick={props.onDuplicate}>Duplicate</button></> : <><button className={button} onClick={props.onOpenCatalog}>Add item</button><button className={button} onClick={props.onOpenLayers}>Objects</button><button className={button} onClick={props.onSnapshot}>Snapshot</button></>}
        </div>
      </div>
    </section>
  );
}
