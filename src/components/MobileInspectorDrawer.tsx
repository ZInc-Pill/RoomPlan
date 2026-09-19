import React, { useState, useRef, useEffect } from 'react';
import { pxToCm } from '../utils/coordinates';
import { Wall, PlacedItem, Floor } from '../types';
import { ITEM_CATALOG } from '../catalog';
import { RotateCw, RotateCcw, Copy, Trash2, X, ChevronDown, ChevronUp, Sliders, Move, Magnet } from 'lucide-react';
import { UniversalJoystick } from './UniversalJoystick';
import { MaterialPicker } from './MaterialPicker';

interface MobileInspectorDrawerProps {
  isOpen: boolean;
  gridSize: number;
  onClose: () => void;
  selectedItemIds: string[];
  selectedWallId: string | null;
  selectedFloorId: string | null;
  items: PlacedItem[];
  walls: Wall[];
  floors: Floor[];
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
  isOpen,
  gridSize,
  onClose,
  selectedItemIds,
  selectedWallId,
  selectedFloorId,
  items,
  walls,
  floors,
  onUpdateItem,
  onUpdateWall,
  onUpdateFloor,
  onDuplicate,
  onRotate,
  onDelete,
  onNudgeSelected,
}: MobileInspectorDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [glideSnapMode, setGlideSnapMode] = useState<'snap' | 'free'>('snap');
  const nudgeAccumulator = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => { nudgeAccumulator.current = { x: 0, y: 0 }; }, [gridSize, glideSnapMode, isOpen, selectedItemIds.join(','), selectedWallId, selectedFloorId]);

  const handleJoystickMove = (dx: number, dy: number) => {
    if (!onNudgeSelected) return;

    if (glideSnapMode === 'snap') {
      nudgeAccumulator.current.x += dx;
      nudgeAccumulator.current.y += dy;

      const SNAP_THRESHOLD = 12;
      const step = gridSize;
      let stepX = 0;
      let stepY = 0;

      if (Math.abs(nudgeAccumulator.current.x) >= SNAP_THRESHOLD) {
        stepX = Math.sign(nudgeAccumulator.current.x) * step;
        nudgeAccumulator.current.x = 0;
      }
      if (Math.abs(nudgeAccumulator.current.y) >= SNAP_THRESHOLD) {
        stepY = Math.sign(nudgeAccumulator.current.y) * step;
        nudgeAccumulator.current.y = 0;
      }

      if (stepX === 0 && stepY === 0) return;
      onNudgeSelected(stepX, stepY);
    } else {
      onNudgeSelected(dx, dy);
    }
  };

  const handleSingleNudge = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (!onNudgeSelected) return;
    const step = glideSnapMode === 'snap' ? gridSize : 4;
    if (dir === 'left') onNudgeSelected(-step, 0);
    else if (dir === 'right') onNudgeSelected(step, 0);
    else if (dir === 'up') onNudgeSelected(0, -step);
    else if (dir === 'down') onNudgeSelected(0, step);
  };

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
    <div className="fixed inset-x-0 bottom-0 z-40 md:hidden pointer-events-none pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      <div className="mx-3 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 pointer-events-auto overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header & Quick Action Row */}
        <div className="p-3 flex flex-wrap gap-2 items-center justify-between border-b border-slate-100">
          <div className="w-full min-w-0 pr-2">
            <h3 className="text-sm font-bold text-slate-900 truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-500 font-medium truncate">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {(selectedItem || selectedWall) && (
              <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
                <button
                  onClick={() => onRotate(-Math.PI / 4)}
                  className="w-11 h-11 rounded-lg hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition-all"
                  title="Rotate -45°"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-0.5" />
                <button
                  onClick={() => onRotate(Math.PI / 4)}
                  className="w-11 h-11 rounded-lg hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition-all"
                  title="Rotate +45°"
                >
                  <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                </button>
              </div>
            )}

            <button
              onClick={onDuplicate}
              className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition-all"
              title="Duplicate"
            >
              <Copy className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              onClick={onDelete}
              className="w-11 h-11 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center active:scale-95 transition-all"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center active:scale-95"
              title={isExpanded ? "Collapse properties" : "Expand properties"} aria-expanded={isExpanded}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <Sliders className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="w-11 h-11 rounded-full text-slate-400 hover:text-slate-600 flex items-center justify-center"
              title="Close properties" aria-label="Close properties"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Properties Drawer */}
        {isExpanded && (
          <div className="p-4 max-h-[45dvh] overflow-y-auto overscroll-contain space-y-4 animate-in fade-in duration-150">
            {/* Fine Position Glide via Universal Joystick */}
            {onNudgeSelected && (
              <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 block">Position Glide</span>
                    <span className="text-[11px] text-slate-500 block">
                      {glideSnapMode === 'snap' ? `Moves in ${pxToCm(gridSize)} cm steps` : 'Continuous free movement'}
                    </span>
                  </div>
                  <UniversalJoystick
                    onMove={handleJoystickMove}
                    onSingleNudge={handleSingleNudge}
                    variant="compact"
                    theme="light"
                    label="Glide"
                  />
                </div>

                {/* Two Options: Snap on Grid (Primary) & Free Move (Secondary) */}
                <div className="flex items-center justify-end bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/70 shadow-xs self-end">
                  <button
                    type="button"
                    onClick={() => setGlideSnapMode('snap')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      glideSnapMode === 'snap'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={`Move in ${pxToCm(gridSize)} cm steps`}
                  >
                    <Magnet className="w-2.5 h-2.5" />
                    <span>Snap on Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlideSnapMode('free')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      glideSnapMode === 'free'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Free Move (Secondary) - continuous smooth movement"
                  >
                    <Move className="w-2.5 h-2.5" />
                    <span>Free Move</span>
                  </button>
                </div>
              </div>
            )}
            {selectedItem && (
              <>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Width</span>
                    <span className="text-indigo-600">{Math.round(Number.isFinite(selectedItem.width) ? selectedItem.width! : (itemType?.width ?? 90))} cm</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="400"
                    step="5"
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
                    <span>Depth</span>
                    <span className="text-indigo-600">{Math.round(Number.isFinite(selectedItem.depth) ? selectedItem.depth! : (itemType?.depth ?? 60))} cm</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="400"
                    step="5"
                    value={Math.round(Number.isFinite(selectedItem.depth) ? selectedItem.depth! : (itemType?.depth ?? 60))}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onUpdateItem(selectedItem.id, { depth: Number.isFinite(val) ? val : 60 });
                    }}
                    className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Rotation</span>
                    <span className="text-indigo-600">
                      {Math.round(((Number.isFinite(selectedItem.rotation) ? selectedItem.rotation : 0) * 180) / Math.PI) % 360}°
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[0, 90, 180, 270].map(deg => (
                      <button
                        key={deg}
                        onClick={() => onUpdateItem(selectedItem.id, { rotation: (deg * Math.PI) / 180 })}
                        className="py-1.5 px-2 text-xs font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg border border-slate-200 active:scale-95 transition-all"
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Item Material & Finish */}
                <div className="pt-2 border-t border-slate-100">
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
                </div>
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
                    type="range"
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
                      onUpdateWall(selectedWall.id, { color: col });
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
                    onUpdateFloor(selectedFloor.id, { color: col });
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
