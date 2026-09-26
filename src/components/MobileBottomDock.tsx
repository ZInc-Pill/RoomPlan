import React, { useState, useRef, useEffect } from 'react';
import { 
  MousePointer2, 
  PenTool, 
  Layers, 
  Ruler, 
  Hand, 
  Plus, 
  RotateCw, 
  RotateCcw,
  Copy, 
  Trash2, 
  Sliders, 
  ListTree,
  MessageSquare,
  Move,
  Magnet
} from 'lucide-react';
import { AppMode } from '../types';
import { UniversalJoystick } from './UniversalJoystick';

interface MobileBottomDockProps {
  glideSnapMode: 'snap' | 'free';
  setGlideSnapMode: (mode: 'snap' | 'free') => void;
  gridSize: number;
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  onOpenCatalog: () => void;
  onOpenLayers: () => void;
  selectedItemIds: string[];
  selectedWallId: string | null;
  selectedFloorId: string | null;
  onRotate: (delta?: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  itemCount: number;
  onOpenInspector: () => void;
  isInspectorOpen?: boolean;
  onNudgeSelected?: (dx: number, dy: number) => void;
}

export function MobileBottomDock({
  glideSnapMode, setGlideSnapMode,
  gridSize, mode,
  setMode,
  onOpenCatalog,
  onOpenLayers,
  selectedItemIds,
  selectedWallId,
  selectedFloorId,
  onRotate,
  onDuplicate,
  onDelete,
  itemCount,
  onOpenInspector,
  isInspectorOpen = false,
  onNudgeSelected,
}: MobileBottomDockProps) {
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const handleJoystickMove = (dx: number, dy: number) => {
    onNudgeSelected?.(dx, dy);
  };

  const handleSingleNudge = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (!onNudgeSelected) return;
    const step = glideSnapMode === 'snap' ? gridSize : 4;
    if (dir === 'left') onNudgeSelected(-step, 0);
    else if (dir === 'right') onNudgeSelected(step, 0);
    else if (dir === 'up') onNudgeSelected(0, -step);
    else if (dir === 'down') onNudgeSelected(0, step);
  };

  // Only show floating quick actions for elements without dedicated on-canvas HUD (items & walls).
  // Floors have their own complete dedicated HUD in Canvas2D, avoiding double overlapping layers.
  const hasQuickActions = !isInspectorOpen && !selectedFloorId && (selectedItemIds.length > 0 || !!selectedWallId);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-col pointer-events-none md:hidden">
      {/* Universal Floating Joystick for smooth thumb gliding on mobile */}
      {hasQuickActions && isJoystickActive && onNudgeSelected && (
        <div className="self-end mr-3 mb-2 pointer-events-auto flex flex-col items-center bg-slate-900/95 text-white backdrop-blur-xl p-2.5 rounded-3xl shadow-2xl border border-slate-700/70 animate-in zoom-in-95 fade-in duration-150">
          <div className="flex items-center justify-between w-full px-1 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">Glide</span>
            <button
              onClick={() => setIsJoystickActive(false)}
              className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-[11px] leading-none ml-2"
              title="Close Joystick"
            >
              ×
            </button>
          </div>
          <UniversalJoystick key={[glideSnapMode, gridSize, ...selectedItemIds, selectedWallId, selectedFloorId].join(':')} snapRepeat={glideSnapMode === 'snap'}
            onMove={handleJoystickMove}
            onSingleNudge={handleSingleNudge}
            variant="standard"
            theme="dark"
          />

          {/* Two Options: Snap on Grid (Primary) & Free Move (Secondary) */}
          <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/80 mt-2 shadow-xs">
            <button
              type="button"
              onClick={() => setGlideSnapMode('snap')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                glideSnapMode === 'snap'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={`Move by ${gridSize / 0.4} cm grid steps`}
            >
              <Magnet className="w-2.5 h-2.5" />
              <span>{gridSize / 0.4} cm</span>
            </button>
            <button
              type="button"
              onClick={() => setGlideSnapMode('free')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                glideSnapMode === 'free'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Free Move (Secondary) - continuous smooth movement"
            >
              <Move className="w-2.5 h-2.5" />
              <span>Free</span>
            </button>
          </div>
        </div>
      )}

      {/* Contextual Quick Action Floating Bar when items or walls are selected */}
      {hasQuickActions && (
        <div className="px-4 pb-2 flex justify-center pointer-events-auto animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex flex-wrap justify-center items-center gap-1.5 w-full max-w-md bg-slate-900/90 text-white backdrop-blur-xl px-2 py-2 rounded-2xl shadow-xl border border-slate-700/50">
            {/* Joystick Toggle Pill */}
            {onNudgeSelected && (
              <button
                onClick={() => setIsJoystickActive(prev => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full active:scale-95 transition-all ${
                  isJoystickActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
                title="Toggle Movement Joystick"
              >
                <Move className="w-3.5 h-3.5" />
                <span>Glide</span>
              </button>
            )}

            {(selectedItemIds.length > 0 || !!selectedWallId) && (
              <div className="flex items-center bg-slate-800/80 rounded-full border border-slate-700/50 p-0.5">
                <button
                  onClick={() => onRotate(-Math.PI / 4)}
                  className="flex items-center gap-0.5 px-2 py-1 text-xs font-semibold rounded-full hover:bg-slate-700 active:scale-95 transition-all text-slate-200"
                  title="Rotate -45°"
                >
                  <RotateCcw className="w-3 h-3 text-indigo-400" />
                  <span>-45°</span>
                </button>
                <div className="w-px h-3 bg-slate-700 mx-0.5" />
                <button
                  onClick={() => onRotate(Math.PI / 4)}
                  className="flex items-center gap-0.5 px-2 py-1 text-xs font-semibold rounded-full hover:bg-slate-700 active:scale-95 transition-all text-slate-200"
                  title="Rotate +45°"
                >
                  <RotateCw className="w-3 h-3 text-indigo-400" />
                  <span>+45°</span>
                </button>
              </div>
            )}

            <button
              onClick={onDuplicate}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full hover:bg-slate-800 active:scale-95 transition-all text-slate-200"
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span>Clone</span>
            </button>

            <button
              onClick={onOpenInspector}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full hover:bg-slate-800 active:scale-95 transition-all text-indigo-300"
              title="Edit dimensions"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Edit</span>
            </button>

            <div className="w-px h-4 bg-slate-700 mx-0.5" />

            <button
              onClick={onDelete}
              className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded-full active:scale-95 transition-all"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Touch-Friendly Navigation Dock */}
      <nav 
        aria-label="Mobile Navigation Dock"
        className="bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-2 py-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] pointer-events-auto pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Select Tool */}
          <button
            onClick={() => setMode('SELECT')}
            className={`flex flex-col items-center justify-center min-w-[48px] py-1 px-2 rounded-xl transition-all ${
              mode === 'SELECT' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${mode === 'SELECT' ? 'bg-indigo-50 shadow-sm' : ''}`}>
              <MousePointer2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Select</span>
          </button>

          {/* Draw Wall */}
          <button
            onClick={() => setMode('DRAW_WALL')}
            className={`flex flex-col items-center justify-center min-w-[48px] py-1 px-2 rounded-xl transition-all ${
              mode === 'DRAW_WALL' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${mode === 'DRAW_WALL' ? 'bg-indigo-50 shadow-sm' : ''}`}>
              <PenTool className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Wall</span>
          </button>

          {/* Primary Floating Action: Add Item */}
          <div className="flex flex-col items-center justify-center -mt-5">
            <button
              onClick={onOpenCatalog}
              className="w-13 h-13 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/35 active:scale-90 hover:bg-indigo-700 transition-all border-4 border-white"
              title="Add Furniture & Elements"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
            <span className="text-[10px] font-bold text-slate-700 mt-0.5">Add</span>
          </div>

          {/* Draw Floor */}
          <button
            onClick={() => setMode('DRAW_FLOOR')}
            className={`flex flex-col items-center justify-center min-w-[48px] py-1 px-2 rounded-xl transition-all ${
              mode === 'DRAW_FLOOR' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${mode === 'DRAW_FLOOR' ? 'bg-indigo-50 shadow-sm' : ''}`}>
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Floor</span>
          </button>

          {/* Pan / Hand Mode for 1-finger canvas moving */}
          <button
            onClick={() => setMode(mode === 'PAN' ? 'SELECT' : 'PAN')}
            className={`flex flex-col items-center justify-center min-w-[48px] py-1 px-2 rounded-xl transition-all ${
              mode === 'PAN' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${mode === 'PAN' ? 'bg-indigo-50 shadow-sm' : ''}`}>
              <Hand className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Pan</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
