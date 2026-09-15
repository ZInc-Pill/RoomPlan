import React, { useState, useRef } from 'react';
import { 
  RotateCw, 
  RotateCcw, 
  Copy, 
  Trash2, 
  X, 
  Sliders, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Plus, 
  Camera, 
  Eye, 
  Box, 
  Grid3X3,
  Move,
  Maximize2,
  Magnet
} from 'lucide-react';
import { PlacedItem, Wall, Floor } from '../types';
import { ITEM_CATALOG } from '../catalog';
import { UniversalJoystick } from './UniversalJoystick';

interface Mobile3DControlDeckProps {
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

const WALL_COLOR_OPTIONS = [
  { name: 'Pure White', color: '#f8fafc' },
  { name: 'Warm Cream', color: '#fef3c7' },
  { name: 'Light Concrete', color: '#e2e8f0' },
  { name: 'Classic Gray', color: '#cbd5e1' },
  { name: 'Navy Accent', color: '#334155' },
  { name: 'Sage Plaster', color: '#d1fae5' },
];

const calculateArea = (points: { x: number; y: number }[]) => {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2) / 1600; // 40px = 1m, so 1600 px² = 1m²
};

export function Mobile3DControlDeck({
  selectedItem,
  selectedWall,
  selectedFloor,
  onNudgeItem,
  onNudgeWall,
  onNudgeFloor,
  onRotateItem,
  onElevateItem,
  onUpdateWall,
  onUpdateFloor,
  onDuplicate,
  onDelete,
  onOpenInspector,
  onDeselect,
  onOpenCatalog,
  onOpenLayers,
  onCameraPreset,
  onFocusSelection,
  currentCameraPreset,
  onSnapshot,
}: Mobile3DControlDeckProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [snapMode, setSnapMode] = useState<boolean>(true); // default: snap grid enabled
  const nudgeAccumulator = useRef({ x: 0, y: 0 });

  const hasSelection = Boolean(selectedItem || selectedWall || selectedFloor);

  const itemType = selectedItem ? ITEM_CATALOG.find(c => c.id === selectedItem.typeId) : null;
  const itemWidth = selectedItem?.width ?? itemType?.width ?? 0;
  const itemDepth = selectedItem?.depth ?? itemType?.depth ?? 0;
  const itemHeight = selectedItem?.height ?? itemType?.height ?? 0;
  const itemElevation = selectedItem?.elevation ?? 0;

  const wallLengthM = selectedWall 
    ? (Math.hypot(selectedWall.end.x - selectedWall.start.x, selectedWall.end.y - selectedWall.start.y) / 40).toFixed(2)
    : '0';

  // Handle joystick movement with snap grid vs free mode
  const handleJoystickMove = (dx: number, dy: number) => {
    if (snapMode) {
      nudgeAccumulator.current.x += dx;
      nudgeAccumulator.current.y += dy;
      
      const SNAP_GRID = 10; // 10cm snap
      
      let appliedDx = 0;
      let appliedDy = 0;
      
      if (Math.abs(nudgeAccumulator.current.x) >= SNAP_GRID) {
        appliedDx = Math.sign(nudgeAccumulator.current.x) * SNAP_GRID;
        nudgeAccumulator.current.x -= appliedDx;
      }
      
      if (Math.abs(nudgeAccumulator.current.y) >= SNAP_GRID) {
        appliedDy = Math.sign(nudgeAccumulator.current.y) * SNAP_GRID;
        nudgeAccumulator.current.y -= appliedDy;
      }
      
      if (appliedDx === 0 && appliedDy === 0) return;
      
      if (selectedItem) onNudgeItem(appliedDx, appliedDy);
      else if (selectedWall) onNudgeWall(appliedDx, appliedDy);
      else if (selectedFloor && onNudgeFloor) onNudgeFloor(appliedDx, appliedDy);
    } else {
      // Free mode: smooth direct continuous nudge
      if (selectedItem) onNudgeItem(dx, dy);
      else if (selectedWall) onNudgeWall(dx, dy);
      else if (selectedFloor && onNudgeFloor) onNudgeFloor(dx, dy);
    }
  };

  const handleSingleNudge = (dir: 'up' | 'down' | 'left' | 'right') => {
    const step = snapMode ? 10 : 3;
    let dx = 0;
    let dy = 0;
    if (dir === 'up') dy = -step;
    else if (dir === 'down') dy = step;
    else if (dir === 'left') dx = -step;
    else if (dir === 'right') dx = step;

    if (selectedItem) onNudgeItem(dx, dy);
    else if (selectedWall) onNudgeWall(dx, dy);
    else if (selectedFloor && onNudgeFloor) onNudgeFloor(dx, dy);
  };

  if (!hasSelection) {
    // Unselected Mobile 3D Dock: Camera & Quick Actions
    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-col pointer-events-none md:hidden pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {/* Floating Camera Preset Pills */}
        <div className="px-4 pb-2 flex justify-center pointer-events-auto">
          <div className="flex items-center gap-1 bg-slate-900/90 text-white backdrop-blur-xl px-2.5 py-1.5 rounded-full shadow-xl border border-slate-700/60 text-xs">
            <button
              onClick={() => onCameraPreset('perspective')}
              className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
                currentCameraPreset === 'perspective' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              Perspective
            </button>
            <button
              onClick={() => onCameraPreset('top')}
              className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
                currentCameraPreset === 'top' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              Top-Down
            </button>
            <button
              onClick={() => onCameraPreset('isometric')}
              className={`px-2.5 py-1 rounded-full font-semibold transition-all flex items-center gap-1 ${
                currentCameraPreset === 'isometric' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>Isometric</span>
              {currentCameraPreset === 'isometric' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>
        </div>

        {/* Primary Bottom Navigation in 3D */}
        <div className="px-3 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-2 shadow-xl flex items-center justify-around max-w-sm mx-auto">
            <button
              onClick={onOpenCatalog}
              className="flex flex-col items-center justify-center p-2 rounded-xl text-slate-700 hover:text-indigo-600 active:scale-95 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/30">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-bold mt-1 text-slate-800">Add Item</span>
            </button>

            <button
              onClick={onOpenLayers}
              className="flex flex-col items-center justify-center p-2 rounded-xl text-slate-600 hover:text-indigo-600 active:scale-95 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold mt-1">Objects</span>
            </button>

            {onSnapshot && (
              <button
                onClick={onSnapshot}
                className="flex flex-col items-center justify-center p-2 rounded-xl text-slate-600 hover:text-indigo-600 active:scale-95 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold mt-1">Snapshot</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active Selection Mobile 3D Control Sheet (Compact by default, expandable)
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-col pointer-events-none md:hidden pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="mx-3 pointer-events-auto bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in slide-in-from-bottom duration-200">
        
        {/* Compact Primary Dock (Always visible upon selection) */}
        <div className="p-2.5 space-y-2">
          {/* Top Row: Object Info, Current Angle, and Quick Action Rotate Buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                {selectedItem ? <Box className="w-3.5 h-3.5" /> : selectedWall ? <Grid3X3 className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0 flex items-baseline gap-1.5 truncate">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {selectedItem ? (itemType?.name || 'Placed Object') : selectedWall ? 'Wall' : 'Floor'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-medium shrink-0">
                  {selectedItem 
                    ? `${itemWidth}×${itemDepth}cm` 
                    : selectedWall 
                      ? `${wallLengthM}m` 
                      : `${calculateArea(selectedFloor!.points).toFixed(1)}m²`}
                </span>
                {selectedItem && (
                  <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100/60 shrink-0">
                    {Math.round((((selectedItem.rotation * 180) / Math.PI) % 360 + 360) % 360)}°
                  </span>
                )}
              </div>
            </div>

            {/* Quick Rotate Buttons (Directly in main panel for items) */}
            {selectedItem && (
              <div className="flex items-center bg-indigo-50/80 p-0.5 rounded-xl border border-indigo-100 shrink-0">
                <button
                  onClick={() => onRotateItem(-Math.PI / 4)}
                  className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 active:scale-90 transition-all cursor-pointer"
                  title="Rotate -45°"
                >
                  <RotateCcw className="w-3 h-3 text-indigo-600" />
                  <span>-45°</span>
                </button>
                <div className="w-px h-3 bg-indigo-200 mx-0.5" />
                <button
                  onClick={() => onRotateItem(Math.PI / 4)}
                  className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 active:scale-90 transition-all cursor-pointer"
                  title="Rotate +45°"
                >
                  <RotateCw className="w-3 h-3 text-indigo-600" />
                  <span>+45°</span>
                </button>
              </div>
            )}

            {/* Deselect Close Button */}
            <button
              onClick={onDeselect}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 active:scale-95 transition-all shrink-0"
              title="Deselect"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bottom Row: Joystick (Move/Glide), Movement Mode (Snap/Free), Focus, and More/Less Toggle */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
            {/* Universal Joystick for intuitive tactile gliding */}
            <div className="shrink-0 flex items-center gap-2">
              <UniversalJoystick
                onMove={handleJoystickMove}
                onSingleNudge={handleSingleNudge}
                variant="compact"
                theme="light"
                label="Move"
              />

              {/* Snap on Grid (Primary) vs Free Move (Secondary) Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/70">
                <button
                  onClick={() => setSnapMode(true)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${
                    snapMode 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Snap on Grid (Primary) - snaps to 10cm grid"
                >
                  <Magnet className="w-2.5 h-2.5 shrink-0" />
                  <span>Snap on Grid</span>
                </button>
                <button
                  onClick={() => setSnapMode(false)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${
                    !snapMode 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Free Move (Secondary) - continuous movement without snapping"
                >
                  <Move className="w-2.5 h-2.5 shrink-0" />
                  <span>Free Move</span>
                </button>
              </div>
            </div>

            {/* Right: Duplicate, Focus in 3D & Expand Details */}
            <div className="flex items-center gap-1.5 shrink-0">
              {selectedItem && (
                <button
                  onClick={onDuplicate}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-emerald-700 active:scale-95 transition-all"
                  title="Clone Object"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={onFocusSelection}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95 transition-all"
                title="Focus in 3D"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  isExpanded 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                }`}
                title={isExpanded ? "Collapse Controls" : "Expand Details"}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isExpanded ? 'Less' : 'More'}</span>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Section: Detailed Controls Revealed On Demand */}
        {isExpanded && (
          <div className="border-t border-slate-100 p-3 space-y-3 bg-slate-50/60 animate-in slide-in-from-top-2 duration-150">
            
            {/* Placed Item Detailed Controls */}
            {selectedItem && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Rotation Controls */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Rotate</span>
                      <span className="text-[10px] font-mono text-indigo-600 font-bold">
                        {Math.round((((selectedItem.rotation * 180) / Math.PI) % 360 + 360) % 360)}°
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => onRotateItem(-Math.PI / 4)}
                        className="py-1.5 px-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 flex items-center justify-center gap-1 text-xs font-bold active:scale-95 transition-all"
                      >
                        <RotateCcw className="w-3 h-3 text-indigo-600" />
                        <span>-45°</span>
                      </button>
                      <button
                        onClick={() => onRotateItem(Math.PI / 4)}
                        className="py-1.5 px-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 flex items-center justify-center gap-1 text-xs font-bold active:scale-95 transition-all"
                      >
                        <RotateCw className="w-3 h-3 text-indigo-600" />
                        <span>+45°</span>
                      </button>
                    </div>
                  </div>

                  {/* Elevation Controls */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Elevation</span>
                      <span className="text-[10px] font-mono text-amber-600 font-bold">{itemElevation}cm</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => onElevateItem(-10)}
                        disabled={itemElevation <= 0}
                        className="py-1.5 px-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 flex items-center justify-center gap-1 text-xs font-bold active:scale-95 disabled:opacity-40 transition-all"
                      >
                        <ChevronDown className="w-3 h-3 text-amber-600" />
                        <span>-10cm</span>
                      </button>
                      <button
                        onClick={() => onElevateItem(10)}
                        className="py-1.5 px-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 flex items-center justify-center gap-1 text-xs font-bold active:scale-95 transition-all"
                      >
                        <ChevronUp className="w-3 h-3 text-amber-600" />
                        <span>+10cm</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60">
                  <button
                    onClick={onDuplicate}
                    className="py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-800 flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Clone</span>
                  </button>

                  <button
                    onClick={onOpenInspector}
                    className="py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-all"
                  >
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sizes</span>
                  </button>

                  <button
                    onClick={onDelete}
                    className="py-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}

            {/* Wall Detailed Controls */}
            {selectedWall && (
              <div className="space-y-3">
                {/* Wall Thickness */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Wall Thickness</span>
                    <span className="text-[11px] font-mono font-bold text-indigo-600">
                      {Math.round(selectedWall.thickness * 2.5)} cm
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[10, 15, 20, 25, 30].map(cm => {
                      const currentCm = Math.round(selectedWall.thickness * 2.5);
                      const isMatch = Math.abs(currentCm - cm) <= 2;
                      return (
                        <button
                          key={cm}
                          onClick={() => onUpdateWall(selectedWall.id, { thickness: cm / 2.5 })}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isMatch
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cm}cm
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Wall Height */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Wall Height</span>
                    <span className="text-[11px] font-mono font-bold text-indigo-600">
                      {((selectedWall.height || 150) / 50).toFixed(1)}m
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: '2.4m', val: 120 },
                      { label: '2.7m', val: 135 },
                      { label: '3.0m', val: 150 },
                      { label: '3.5m', val: 175 }
                    ].map(h => {
                      const currentH = selectedWall.height || 150;
                      const isMatch = Math.abs(currentH - h.val) < 5;
                      return (
                        <button
                          key={h.label}
                          onClick={() => onUpdateWall(selectedWall.id, { height: h.val })}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isMatch
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {h.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Wall Colors */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">Wall Color</span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {WALL_COLOR_OPTIONS.map(opt => {
                      const active = (selectedWall.color || '#e5e7eb').toLowerCase() === opt.color.toLowerCase();
                      return (
                        <button
                          key={opt.color}
                          onClick={() => onUpdateWall(selectedWall.id, { color: opt.color })}
                          title={opt.name}
                          className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
                            active ? 'border-indigo-600 scale-110 shadow-sm' : 'border-slate-200 hover:scale-105'
                          }`}
                          style={{ backgroundColor: opt.color }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Wall Delete */}
                <div className="pt-2 border-t border-slate-200/60">
                  <button
                    onClick={onDelete}
                    className="w-full py-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Wall</span>
                  </button>
                </div>
              </div>
            )}

            {/* Floor Detailed Controls */}
            {selectedFloor && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Surface Area</span>
                  <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200/60 text-xs">
                    {calculateArea(selectedFloor.points).toFixed(1)} m²
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1">Floor Material</span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {['#f8fafc', '#f5d0a9', '#8b5a2b', '#94a3b8', '#ea580c', '#e2e8f0', '#fed7aa'].map(color => (
                      <button
                        key={color}
                        onClick={() => onUpdateFloor(selectedFloor.id, { color })}
                        className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
                          selectedFloor.color === color ? 'border-indigo-600 scale-110 shadow-sm' : 'border-slate-200'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                  <button
                    onClick={onDuplicate}
                    className="py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 flex items-center justify-center gap-1 text-xs font-bold active:scale-95 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Clone</span>
                  </button>
                  <button
                    onClick={onDelete}
                    className="py-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 flex items-center justify-center gap-1 text-xs font-bold active:scale-95 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

