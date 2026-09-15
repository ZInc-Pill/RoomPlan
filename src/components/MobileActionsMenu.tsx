import React from 'react';
import { X, Download, Upload, Camera, Trash2, Maximize2, RefreshCw } from 'lucide-react';

interface MobileActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onOpen: () => void;
  onScreenshot: () => void;
  onClear: () => void;
}

export function MobileActionsMenu({
  isOpen,
  onClose,
  onSave,
  onOpen,
  onScreenshot,
  onClear,
}: MobileActionsMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col w-full z-10 animate-in slide-in-from-bottom duration-300 border-t border-slate-200 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1" />

        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Project Options</h2>
            <p className="text-xs text-slate-500">Save, export or reset your floor plan</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <button
            onClick={() => {
              onScreenshot();
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 text-left active:scale-[0.99] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Export Screenshot</div>
              <div className="text-xs text-slate-500">Save high-res PNG of your floor plan</div>
            </div>
          </button>

          <button
            onClick={() => {
              onSave();
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 text-left active:scale-[0.99] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Save Layout (.json)</div>
              <div className="text-xs text-slate-500">Download project file to continue later</div>
            </div>
          </button>

          <button
            onClick={() => {
              onOpen();
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 text-left active:scale-[0.99] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Load Project (.json)</div>
              <div className="text-xs text-slate-500">Import a previously saved layout</div>
            </div>
          </button>

          <div className="pt-2">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear the plan? All walls, items and floors will be removed.')) {
                  onClear();
                }
                onClose();
              }}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/80 text-left active:scale-[0.99] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-rose-700">Clear Plan</div>
                <div className="text-xs text-rose-500">Start over with a blank canvas</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
