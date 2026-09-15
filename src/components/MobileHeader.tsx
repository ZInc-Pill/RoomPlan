import React from 'react';
import { Undo2, Redo2, MoreVertical, LayoutGrid, Box } from 'lucide-react';

interface MobileHeaderProps {
  view3D: boolean;
  setView3D: (v: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenMenu: () => void;
}

export function MobileHeader({
  view3D,
  setView3D,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenMenu,
}: MobileHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-3 pt-[calc(0.4rem+env(safe-area-inset-top,0px))] pb-2 flex items-center justify-between md:hidden shadow-xs">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
          <LayoutGrid className="w-4 h-4" />
        </div>
        <span className="text-sm font-black text-slate-900 tracking-tight">RoomPlan</span>
      </div>

      {/* 2D / 3D Segmented Switch */}
      <div className="bg-slate-100 p-0.5 rounded-full flex items-center border border-slate-200/80">
        <button
          onClick={() => setView3D(false)}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            !view3D
              ? 'bg-white text-indigo-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          2D
        </button>
        <button
          onClick={() => setView3D(true)}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            view3D
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          3D
        </button>
      </div>

      {/* Quick History & Options */}
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded-xl transition-all ${
            canUndo
              ? 'text-slate-700 hover:bg-slate-100 active:scale-95'
              : 'text-slate-300 pointer-events-none'
          }`}
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded-xl transition-all ${
            canRedo
              ? 'text-slate-700 hover:bg-slate-100 active:scale-95'
              : 'text-slate-300 pointer-events-none'
          }`}
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenMenu}
          className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
          title="More options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
