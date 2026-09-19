import React from 'react';
import { Wall, PlacedItem, Floor } from '../types';
import { ITEM_CATALOG } from '../catalog';
import { Trash2, RotateCw, RotateCcw, Settings2, Scaling, Copy } from 'lucide-react';
import { MaterialPicker } from './MaterialPicker';

interface PropertiesPanelProps {
  selectedItemIds: string[];
  selectedWallId: string | null;
  selectedFloorId: string | null;
  items: PlacedItem[];
  walls: Wall[];
  floors: Floor[];
  onUpdateItem: (id: string, updates: Partial<PlacedItem>) => void;
  onUpdateWall: (id: string, updates: Partial<Wall>) => void;
  onUpdateFloor: (id: string, updates: Partial<Floor>) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

const WALL_COLOR_PRESETS = [
  { name: 'Pure White', color: '#f8fafc' },
  { name: 'Warm Cream', color: '#fef3c7' },
  { name: 'Light Concrete', color: '#e2e8f0' },
  { name: 'Classic Gray', color: '#cbd5e1' },
  { name: 'Navy Accent', color: '#334155' },
  { name: 'Terracotta', color: '#ffedd5' },
];

export function PropertiesPanel({
  selectedItemIds,
  selectedWallId,
  selectedFloorId,
  items,
  walls,
  floors,
  onUpdateItem,
  onUpdateWall,
  onUpdateFloor,
  onDelete,
  onDuplicate
}: PropertiesPanelProps) {
  
  if (selectedItemIds.length === 0 && !selectedWallId && !selectedFloorId) return null;

  const selectedItem = selectedItemIds.length === 1 ? items.find(i => i.id === selectedItemIds[0]) : null;
  const selectedWall = selectedWallId ? walls.find(w => w.id === selectedWallId) : null;
  const selectedFloor = selectedFloorId ? floors.find(f => f.id === selectedFloorId) : null;

  const itemType = selectedItem ? ITEM_CATALOG.find(c => c.id === selectedItem.typeId) : null;

  const calculateFloorArea = (points: { x: number; y: number }[]) => {
    if (points.length < 3) return 0;
    let a = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      a += points[i].x * points[j].y;
      a -= points[j].x * points[i].y;
    }
    return Math.abs(a / 2) / 1600;
  };

  return (
    <aside className="hidden md:flex w-72 shrink-0 bg-white/80 backdrop-blur-xl border-l border-slate-200 h-full flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10 relative transition-transform duration-300 ease-out">
      <div className="p-5 border-b border-slate-100 flex items-center gap-2">
        <Settings2 className="w-5 h-5 text-indigo-500" />
        <h2 className="text-sm font-bold text-slate-800 tracking-tight">Inspector</h2>
      </div>

      <div className="flex-1 p-5 overflow-y-auto space-y-6">
        {selectedWall && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Object Type</label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-medium flex items-center justify-between">
                <span>Structural Wall</span>
                <span className="text-xs font-mono font-bold text-indigo-600">
                  {(Math.hypot(selectedWall.end.x - selectedWall.start.x, selectedWall.end.y - selectedWall.start.y) / 40).toFixed(2)}m
                </span>
              </div>
            </div>

            {/* Thickness presets and slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Thickness (cm)</label>
                <span className="text-xs font-mono text-slate-600 font-bold">
                  {Number.isFinite(selectedWall.thickness) ? Math.round(selectedWall.thickness * 2.5) : 20}cm
                </span>
              </div>
              <div className="flex items-center gap-1 mb-2">
                {[10, 15, 20, 25, 30].map(cm => {
                  const isCurrent = Math.abs(Math.round(selectedWall.thickness * 2.5) - cm) <= 2;
                  return (
                    <button
                      key={cm}
                      onClick={() => onUpdateWall(selectedWall.id, { thickness: cm / 2.5 })}
                      className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all ${
                        isCurrent
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cm}cm
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="10" 
                  max="50" 
                  step="2.5"
                  value={Number.isFinite(selectedWall.thickness) ? Math.round(selectedWall.thickness * 2.5) : 20}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateWall(selectedWall.id, { thickness: Number.isFinite(val) ? val / 2.5 : 8 });
                  }}
                  className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <input 
                  type="number"
                  min="10" max="50"
                  value={Number.isFinite(selectedWall.thickness) ? Math.round(selectedWall.thickness * 2.5) : 20}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!Number.isNaN(val)) {
                      onUpdateWall(selectedWall.id, { thickness: val / 2.5 });
                    }
                  }}
                  className="w-14 px-1.5 py-1 text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 font-bold">cm</span>
              </div>
            </div>

            {/* Height presets and slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Wall Height</label>
                <span className="text-xs font-mono text-slate-600 font-bold">
                  {((selectedWall.height || 150) / 50).toFixed(2)}m
                </span>
              </div>
              <div className="flex items-center gap-1 mb-2">
                {[
                  { label: '2.4m', val: 120 },
                  { label: '2.7m', val: 135 },
                  { label: '3.0m', val: 150 },
                  { label: '3.5m', val: 175 }
                ].map(h => {
                  const isCurrent = Math.abs((selectedWall.height || 150) - h.val) <= 5;
                  return (
                    <button
                      key={h.label}
                      onClick={() => onUpdateWall(selectedWall.id, { height: h.val })}
                      className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all ${
                        isCurrent
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {h.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="100" 
                  max="225" 
                  step="5"
                  value={selectedWall.height || 150}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateWall(selectedWall.id, { height: val });
                  }}
                  className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <input 
                  type="number"
                  min="2" max="4.5" step="0.1"
                  value={((selectedWall.height || 150) / 50).toFixed(2)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!Number.isNaN(val)) {
                      onUpdateWall(selectedWall.id, { height: val * 50 });
                    }
                  }}
                  className="w-14 px-1.5 py-1 text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 font-bold">m</span>
              </div>
            </div>

            {/* Wall Material & Texture Picker */}
            <MaterialPicker
              mode="wall"
              currentMaterial={selectedWall.material}
              currentColor={selectedWall.color}
              onSelectMaterial={(materialId, defaultColor) => {
                onUpdateWall(selectedWall.id, { material: materialId, color: defaultColor });
              }}
              onSelectColor={(color) => {
                onUpdateWall(selectedWall.id, { color, material: undefined });
              }}
            />
            
            <div className="pt-4">
              <button 
                onClick={onDelete}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 hover:border-red-300 transition-all shadow-sm active:scale-95"
              >
                <Trash2 className="w-4 h-4" /> Delete Wall
              </button>
            </div>
          </div>
        )}

        {selectedFloor && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Object Type</label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-medium flex items-center justify-between">
                <span>Floor Area</span>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  {calculateFloorArea(selectedFloor.points).toFixed(2)} m²
                </span>
              </div>
            </div>

            {/* Floor Material & Texture Picker */}
            <MaterialPicker
              mode="floor"
              currentMaterial={selectedFloor.material}
              currentColor={selectedFloor.color}
              onSelectMaterial={(materialId, defaultColor) => {
                onUpdateFloor(selectedFloor.id, { material: materialId, color: defaultColor });
              }}
              onSelectColor={(color) => {
                onUpdateFloor(selectedFloor.id, { color, material: undefined });
              }}
            />
            
            <div className="pt-4 space-y-2">
              {onDuplicate && (
                <button 
                  onClick={onDuplicate}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-all shadow-sm active:scale-95"
                >
                  <Copy className="w-4 h-4" /> Duplicate Floor
                </button>
              )}
              <button 
                onClick={onDelete}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 hover:border-red-300 transition-all shadow-sm active:scale-95"
              >
                <Trash2 className="w-4 h-4" /> Delete Floor
              </button>
            </div>
          </div>
        )}

        {selectedItemIds.length > 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Selection</label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-medium">
                {selectedItemIds.length} Items Selected
              </div>
            </div>
            
            <div className="pt-4">
              <button 
                onClick={onDelete}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 hover:border-red-300 transition-all shadow-sm active:scale-95"
              >
                <Trash2 className="w-4 h-4" /> Delete All Selected
              </button>
            </div>
          </div>
        )}

        {selectedItem && itemType && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Object Type</label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-medium flex items-center justify-between">
                {itemType.name}
                <div 
                  className="w-4 h-4 rounded-sm border border-slate-300"
                  style={{ backgroundColor: itemType.color }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Rotation</label>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  step="15"
                  value={Number.isFinite(selectedItem.rotation) ? Math.round(selectedItem.rotation * (180 / Math.PI)) % 360 : 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateItem(selectedItem.id, { rotation: Number.isFinite(val) ? val * (Math.PI / 180) : 0 });
                  }}
                  className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <input 
                  type="number"
                  min="0" max="360"
                  value={Number.isFinite(selectedItem.rotation) ? Math.round(selectedItem.rotation * (180 / Math.PI)) % 360 : 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!Number.isNaN(val)) {
                      onUpdateItem(selectedItem.id, { rotation: val * (Math.PI / 180) });
                    }
                  }}
                  className="w-14 px-1.5 py-1 text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 font-bold w-2">°</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Dimensions (cm)</label>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 w-10 uppercase">Width</span>
                <input 
                  type="range" min="10" max="500" step="1"
                  value={Math.round(Number.isFinite(selectedItem.width) ? selectedItem.width! : (itemType.width ?? 90))}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateItem(selectedItem.id, { width: Number.isFinite(val) ? val : 90 });
                  }}
                  className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <input 
                  type="number"
                  min="10" max="1000"
                  value={Math.round(Number.isFinite(selectedItem.width) ? selectedItem.width! : (itemType.width ?? 90))}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!Number.isNaN(val)) {
                      onUpdateItem(selectedItem.id, { width: val });
                    }
                  }}
                  className="w-14 px-1.5 py-1 text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 w-10 uppercase">Depth</span>
                <input 
                  type="range" min="10" max="500" step="1"
                  value={Math.round(Number.isFinite(selectedItem.depth) ? selectedItem.depth! : (itemType.depth ?? 60))}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateItem(selectedItem.id, { depth: Number.isFinite(val) ? val : 60 });
                  }}
                  className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <input 
                  type="number"
                  min="10" max="1000"
                  value={Math.round(Number.isFinite(selectedItem.depth) ? selectedItem.depth! : (itemType.depth ?? 60))}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!Number.isNaN(val)) {
                      onUpdateItem(selectedItem.id, { depth: val });
                    }
                  }}
                  className="w-14 px-1.5 py-1 text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 w-10 uppercase">Height</span>
                <input 
                  type="range" min="10" max="500" step="1"
                  value={Math.round(Number.isFinite(selectedItem.height) ? selectedItem.height! : (itemType.height ?? 100))}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateItem(selectedItem.id, { height: Number.isFinite(val) ? val : 100 });
                  }}
                  className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <input 
                  type="number"
                  min="10" max="1000"
                  value={Math.round(Number.isFinite(selectedItem.height) ? selectedItem.height! : (itemType.height ?? 100))}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!Number.isNaN(val)) {
                      onUpdateItem(selectedItem.id, { height: val });
                    }
                  }}
                  className="w-14 px-1.5 py-1 text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 w-10 uppercase" title="Height from floor">Elev.</span>
                <input 
                  type="range" min="0" max="300" step="1"
                  value={Math.round(Number.isFinite(selectedItem.elevation) ? selectedItem.elevation! : 0)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateItem(selectedItem.id, { elevation: Number.isFinite(val) ? val : 0 });
                  }}
                  className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <input 
                  type="number"
                  min="-100" max="1000"
                  value={Math.round(Number.isFinite(selectedItem.elevation) ? selectedItem.elevation! : 0)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!Number.isNaN(val)) {
                      onUpdateItem(selectedItem.id, { elevation: val });
                    }
                  }}
                  className="w-14 px-1.5 py-1 text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Item Material & Finish Picker */}
            <div className="pt-2 border-t border-slate-100">
              <MaterialPicker
                mode="item"
                upholstery={selectedItem.typeId.startsWith("liv_sofa_") || ["bed_single", "bed_queen", "bed_king"].includes(selectedItem.typeId)}
                currentMaterial={selectedItem.material}
                currentColor={selectedItem.color}
                onSelectMaterial={(materialId, defaultColor) => {
                  onUpdateItem(selectedItem.id, { material: materialId, color: defaultColor });
                }}
                onSelectColor={(color) => {
                  onUpdateItem(selectedItem.id, { color });
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button 
                onClick={() => {
                  const currentRot = Number.isFinite(selectedItem.rotation) ? selectedItem.rotation : 0;
                  onUpdateItem(selectedItem.id, { rotation: currentRot - Math.PI / 4 });
                }}
                className="flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Rotate -45°"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-500" /> -45°
              </button>
              <button 
                onClick={() => {
                  const currentRot = Number.isFinite(selectedItem.rotation) ? selectedItem.rotation : 0;
                  onUpdateItem(selectedItem.id, { rotation: currentRot + Math.PI / 4 });
                }}
                className="flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Rotate +45°"
              >
                <RotateCw className="w-3.5 h-3.5 text-indigo-500" /> +45°
              </button>
              <button 
                onClick={onDelete}
                className="flex items-center justify-center gap-1.5 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50 hover:border-red-300 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
