import React, { useState } from 'react';
import { 
  FLOOR_MATERIALS, 
  WALL_MATERIALS, 
  ITEM_FINISHES, 
  MaterialDef 
} from '../materials';
import { Palette, Sparkles, Check } from 'lucide-react';

interface MaterialPickerProps {
  mode: 'floor' | 'wall' | 'item';
  currentMaterial?: string;
  currentColor?: string;
  onSelectMaterial: (materialId: string, defaultColor?: string) => void;
  onSelectColor: (color: string) => void;
  compact?: boolean;
}

export function MaterialPicker({
  mode,
  currentMaterial,
  currentColor,
  onSelectMaterial,
  onSelectColor,
  compact = false
}: MaterialPickerProps) {
  const materials: MaterialDef[] = 
    mode === 'floor' 
      ? FLOOR_MATERIALS 
      : mode === 'wall' 
      ? WALL_MATERIALS 
      : ITEM_FINISHES;

  const categories = Array.from(new Set(materials.map(m => m.category)));
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredMaterials = activeCategory === 'all'
    ? materials
    : materials.filter(m => m.category === activeCategory);

  const activeMat = materials.find(m => m.id === currentMaterial);

  // Quick preset palette options based on mode
  const colorPresets = mode === 'floor'
    ? ['#e2b17a', '#d49b5e', '#5c3a21', '#f3e8d8', '#f8fafc', '#1e293b', '#cbd5e1', '#e2e8f0', '#c25e38', '#e7e2d7']
    : mode === 'wall'
    ? ['#f8fafc', '#f5efe6', '#993d28', '#f1f5f9', '#c8955c', '#94a3b8', '#8da399', '#334155', '#eef0eb', '#1e293b']
    : ['#d4a373', '#5c3d2e', '#ede4d4', '#222225', '#f6f3eb', '#3f3f46', '#94a3b8', '#064e3b', '#1e3a8a', '#9a3412', '#d97706', '#1e2022', '#e2e8f0'];

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {mode === 'floor' ? 'Floor Material' : mode === 'wall' ? 'Wall Finish' : 'Item Finish'}
          </span>
          {activeMat && (
            <span className="text-[11px] font-medium text-indigo-600 truncate max-w-[140px]">
              {activeMat.name}
            </span>
          )}
        </div>

        {/* Scrollable Material Swatches */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
          {materials.map(mat => {
            const isSelected = currentMaterial === mat.id;
            return (
              <button
                key={mat.id}
                onClick={() => onSelectMaterial(mat.id, mat.color)}
                title={`${mat.name} - ${mat.description || ''}`}
                className={`relative group shrink-0 w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center ${
                  isSelected 
                    ? 'border-indigo-600 scale-105 shadow-md ring-2 ring-indigo-500/20' 
                    : 'border-slate-200 hover:border-indigo-300 hover:scale-102'
                }`}
                style={{ backgroundColor: mat.color }}
              >
                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}

          {/* Custom Color Input */}
          <label className="relative shrink-0 w-10 h-10 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 flex items-center justify-center cursor-pointer bg-slate-50 transition-all">
            <input
              type="color"
              value={currentColor || '#cbd5e1'}
              onChange={(e) => onSelectColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Pick Custom Tint"
            />
            <Palette className="w-4 h-4 text-slate-500" />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header & Category Tabs */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>{mode === 'floor' ? 'Floor Material & Texture' : mode === 'wall' ? 'Wall Finish & Texture' : 'Material Finish'}</span>
          </label>
          {activeMat && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/50">
              {activeMat.name}
            </span>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all shrink-0 ${
              activeCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all shrink-0 ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Materials */}
      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
        {filteredMaterials.map(mat => {
          const isSelected = currentMaterial === mat.id;
          return (
            <button
              key={mat.id}
              onClick={() => onSelectMaterial(mat.id, mat.color)}
              className={`flex items-center gap-2 p-1.5 rounded-xl border text-left transition-all relative ${
                isSelected 
                  ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-500/20' 
                  : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div 
                className="w-8 h-8 rounded-lg shrink-0 border border-black/10 shadow-xs relative flex items-center justify-center"
                style={{ backgroundColor: mat.color }}
              >
                {isSelected && (
                  <div className="w-3.5 h-3.5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-800 block truncate leading-tight">
                  {mat.name}
                </span>
                <span className="text-[10px] text-slate-400 capitalize block truncate">
                  {mat.category}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tint & Color Bar */}
      <div className="pt-2 border-t border-slate-100 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Color Tint / Solid Tone
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {currentColor || activeMat?.color || '#ffffff'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {colorPresets.map(color => {
            const isMatch = (currentColor || '').toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                onClick={() => onSelectColor(color)}
                className={`w-6 h-6 rounded-full shrink-0 border transition-all ${
                  isMatch ? 'border-indigo-600 scale-110 shadow-sm ring-2 ring-indigo-400/30' : 'border-slate-300 hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            );
          })}

          <label 
            className="w-6 h-6 rounded-full border border-dashed border-slate-400 flex items-center justify-center shrink-0 cursor-pointer hover:border-indigo-500 transition-all bg-slate-50"
            title="Custom Color"
          >
            <input
              type="color"
              value={currentColor || '#cbd5e1'}
              onChange={(e) => onSelectColor(e.target.value)}
              className="opacity-0 absolute w-0 h-0"
            />
            <Palette className="w-3 h-3 text-slate-500" />
          </label>
        </div>
      </div>
    </div>
  );
}
