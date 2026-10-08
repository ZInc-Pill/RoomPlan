import { isJapaneseIsland } from '../utils/japaneseIsland';
import { isStairSymbol } from '../utils/smallStairs';
import { isSeat,isTV,isCoffee,isRailing } from '../utils/furniturePack';
import { isShoji } from '../utils/shoji';
import { isStair } from '../utils/objectPack';
import { ObjectPackControls } from './ObjectPackControls';
import React, { useState, useRef, useEffect } from 'react';
import { pxToCm } from '../utils/coordinates';
import { Wall, PlacedItem, Floor } from '../types';
import { ITEM_CATALOG } from '../catalog';
import { RotateCw, RotateCcw, Copy, Trash2, X, ChevronDown, ChevronUp, Sliders, Move, Magnet } from 'lucide-react';
import { isOpening, attachNearestOpening } from '../utils/openingAttachment';
import { MaterialPicker } from './MaterialPicker';

interface MobileInspectorDrawerProps {
  glideSnapMode: 'snap' | 'free';
  setGlideSnapMode: (mode: 'snap' | 'free') => void;
  isOpen: boolean;
  gridSize: number;
  onClose: () => void;
  selectedItemIds: string[];
  selectedWallId: string | null;
  selectedFloorId: string | null;
  items: PlacedItem[];
  walls: Wall[];
  floors: Floor[];
  onUngroup?: (id:string)=>void;
  onUpdateItem: (id: string, updates: Partial<PlacedItem>) => void;
  onUpdateWall: (id: string, updates: Partial<Wall>) => void;
  onUpdateFloor: (id: string, updates: Partial<Floor>) => void;
  onDuplicate: () => void;
  onRotate: (delta?: number) => void;
  onDelete: () => void;
  onNudgeSelected?: (dx: number, dy: number) => void;
}

const FLOOR_COLOR_PRESETS = [
  { name: 'Light Oak', color: '#f5d0a9' },
  { name: 'Dark Walnut', color: '#8b5a2b' },
  { name: 'Modern Gray', color: '#e2e8f0' },
  { name: 'Slate Tile', color: '#94a3b8' },
  { name: 'White Marble', color: '#f8fafc' },
  { name: 'Warm Terracotta', color: '#ea580c' },
  { name: 'Sage Stone', color: '#cbd5e1' },
];

export function MobileInspectorDrawer({
  glideSnapMode, setGlideSnapMode,
  isOpen,
  gridSize,
  onClose,
  selectedItemIds,
  selectedWallId,
  selectedFloorId,
  items,
  walls,
  floors,
  onUngroup,
  onUpdateItem,
  onUpdateWall,
  onUpdateFloor,
  onDuplicate,
  onRotate,
  onDelete,
  onNudgeSelected,
}: MobileInspectorDrawerProps) {
  if (!isOpen) return null;

  const selectedItem = selectedItemIds.length === 1 ? items.find(i => i.id === selectedItemIds[0]) : null;
  const isMultiSelect = selectedItemIds.length > 1;
  const selectedWall = selectedWallId ? walls.find(w => w.id === selectedWallId) : null;
  const selectedFloor = selectedFloorId ? floors.find(f => f.id === selectedFloorId) : null;

  const itemType = selectedItem ? ITEM_CATALOG.find(c => c.id === selectedItem.typeId) : null;

  if (!selectedItem && !isMultiSelect && !selectedWall && !selectedFloor) return null;

  let title = 'Selected Object';
  let subtitle = '';

  if (isMultiSelect) {
    title = `${selectedItemIds.length} Items Selected`;
    subtitle = 'Multi-selection active';
  } else if (selectedItem) {
    title = itemType?.name || 'Placed Item';
    subtitle = `${selectedItem.width || itemType?.width || 0} × ${selectedItem.depth || itemType?.depth || 0} cm`;
  } else if (selectedWall) {
    const lenM = (Math.hypot(selectedWall.end.x - selectedWall.start.x, selectedWall.end.y - selectedWall.start.y) / 40).toFixed(2);
    title = 'Structural Wall';
    subtitle = `Length: ${lenM}m • Thickness: ${selectedWall.thickness}cm`;
  } else if (selectedFloor) {
    title = 'Room Floor Area';
    subtitle = `${selectedFloor.points.length} vertices`;
  }

  return (
    <div className="mobile-panel-content">
      <div className="bg-white flex flex-col h-full min-h-0">
        <div className="p-3 flex items-center justify-between border-b shrink-0">
          <div><h3 className="font-semibold">Properties: {title}</h3><p className="text-xs text-slate-500">{subtitle}</p></div>
          <button onClick={onClose} aria-label="Collapse properties" className="min-w-11 min-h-11"><X size={20} /></button>
        </div>
        {true && (
          <div className="p-4 overflow-y-auto min-h-0 overscroll-contain space-y-4">
            {selectedItem && isOpening(selectedItem) && <button className="border rounded-lg px-3 text-sm" onClick={() => {
              if (selectedItem.wallId) onUpdateItem(selectedItem.id, { wallId: undefined, wallOffset: undefined });
              else { const attached = attachNearestOpening(selectedItem, walls); if (attached) onUpdateItem(selectedItem.id, attached); }
            }}>{selectedItem.wallId ? 'Detach from wall' : 'Attach to nearest wall'}</button>}
            {selectedItem && <ObjectPackControls item={selectedItem} onUpdate={onUpdateItem} onUngroup={onUngroup} />}
            {selectedItem && (
              <>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Width</span>
                    <span className="text-indigo-600">{Math.round(Number.isFinite(selectedItem.width) ? selectedItem.width! : (itemType?.width ?? 90))} cm</span>
                  </div>
                  <input
                    type="range" aria-label="Width in centimeters"
                    min={isSeat(selectedItem)||isTV(selectedItem)||isCoffee(selectedItem)||isRailing(selectedItem)?1:30}
                    max="400"
                    step={isSeat(selectedItem)||isTV(selectedItem)||isCoffee(selectedItem)||isRailing(selectedItem)?1:5}
                    value={Math.round(Number.isFinite(selectedItem.width) ? selectedItem.width! : (itemType?.width ?? 90))}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onUpdateItem(selectedItem.id, { width: Number.isFinite(val) ? val : 90 });
                    }}
                    className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{isStair(selectedItem) ? 'Length' : 'Depth'}</span>
                    <span className="text-indigo-600">{Math.round(Number.isFinite(selectedItem.depth) ? selectedItem.depth! : (itemType?.depth ?? 60))} cm</span>
                  </div>
                  <input
                    type="range" aria-label={isStair(selectedItem) ? "Length in centimeters" : "Depth in centimeters"}
                    min={(isOpening(selectedItem)||isTV(selectedItem)||selectedItem.typeId==='bal_railing') ? 1 : 30}
                    max="400"
                    step={isOpening(selectedItem)||isSeat(selectedItem)||isTV(selectedItem)||isCoffee(selectedItem)||isRailing(selectedItem)?1:5}
                    value={Math.round(Number.isFinite(selectedItem.depth) ? selectedItem.depth! : (itemType?.depth ?? 60))}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onUpdateItem(selectedItem.id, { depth: Number.isFinite(val) ? val : 60 });
                    }}
                    className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {!isStair(selectedItem) && !isStairSymbol(selectedItem) && <label className="block text-xs font-semibold">Elevation (cm)<input aria-label="Elevation in centimeters" type="number" min="0" step="5" value={selectedItem.elevation ?? 0} onChange={e => onUpdateItem(selectedItem.id, { elevation: Math.max(0, Number(e.target.value)) })} className="w-full border rounded p-2" /></label>}
                {!isStairSymbol(selectedItem) && <label className="block text-xs font-semibold">{isStair(selectedItem) ? (selectedItem.stairDirection === 'down' ? 'Descent' : 'Rise') : 'Height'} (cm)<input aria-label={isStair(selectedItem) ? "Rise or descent in centimeters" : "Height in centimeters"} type="number" min="1" value={selectedItem.height ?? itemType?.height ?? 100} onChange={e => onUpdateItem(selectedItem.id, { height: Math.max(1, Number(e.target.value)) })} className="w-full border rounded p-2" /></label>}
                {/* Item Material & Finish */}
                {!isJapaneseIsland(selectedItem) && !isShoji(selectedItem) && !isSeat(selectedItem) && !isTV(selectedItem) && !isCoffee(selectedItem) && !isRailing(selectedItem) && <div className="pt-2 border-t border-slate-100">
                  <MaterialPicker
                    mode="item"
                upholstery={selectedItem.typeId.startsWith("liv_sofa_") || ["bed_single", "bed_queen", "bed_king"].includes(selectedItem.typeId)}
                    compact={true}
                    currentMaterial={selectedItem.material}
                    currentColor={selectedItem.color}
                    onSelectMaterial={(matId, defColor) => {
                      onUpdateItem(selectedItem.id, { material: matId, color: defColor });
                    }}
                    onSelectColor={(col) => {
                      onUpdateItem(selectedItem.id, { color: col });
                    }}
                  />
                </div>}
              </>
            )}

            {selectedWall && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Wall Thickness</span>
                    <span className="text-indigo-600">{Math.round(Number.isFinite(selectedWall.thickness) ? selectedWall.thickness : 8)} cm</span>
                  </div>
                  <input
                    type="range" aria-label="Wall thickness in centimeters"
                    min="5"
                    max="40"
                    step="1"
                    value={Math.round(Number.isFinite(selectedWall.thickness) ? selectedWall.thickness : 8)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onUpdateWall(selectedWall.id, { thickness: Number.isFinite(val) ? val : 8 });
                    }}
                    className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <MaterialPicker
                    mode="wall"
                    compact={true}
                    currentMaterial={selectedWall.material}
                    currentColor={selectedWall.color}
                    onSelectMaterial={(matId, defColor) => {
                      onUpdateWall(selectedWall.id, { material: matId, color: defColor });
                    }}
                    onSelectColor={(col) => {
                      onUpdateWall(selectedWall.id, { color: col, material: undefined });
                    }}
                  />
                </div>
              </div>
            )}

            {selectedFloor && (
              <div className="space-y-2">
                <MaterialPicker
                  mode="floor"
                  compact={true}
                  currentMaterial={selectedFloor.material}
                  currentColor={selectedFloor.color}
                  onSelectMaterial={(matId, defColor) => {
                    onUpdateFloor(selectedFloor.id, { material: matId, color: defColor });
                  }}
                  onSelectColor={(col) => {
                    onUpdateFloor(selectedFloor.id, { color: col, material: undefined });
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
