import React from 'react';
import { Wall, PlacedItem, Floor, CommentType } from '../types';
import { ITEM_CATALOG } from '../catalog';
import { X, Trash2, Box, Layers as LayersIcon, Square, MessageSquare } from 'lucide-react';

interface MobileLayersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: PlacedItem[];
  walls: Wall[];
  floors: Floor[];
  comments: CommentType[];
  selectedItemIds: string[];
  selectedWallId: string | null;
  selectedFloorId: string | null;
  onSelect: (itemIds: string[], wallId: string | null, floorId: string | null, commentId: string | null) => void;
  onDeleteItem: (id: string) => void;
  onDeleteWall: (id: string) => void;
  onDeleteFloor: (id: string) => void;
  onDeleteComment: (id: string) => void;
}

export function MobileLayersDrawer({
  isOpen,
  onClose,
  items,
  walls,
  floors,
  comments,
  selectedItemIds,
  selectedWallId,
  selectedFloorId,
  onSelect,
  onDeleteItem,
  onDeleteWall,
  onDeleteFloor,
  onDeleteComment,
}: MobileLayersDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[75vh] h-[65vh] w-full z-10 animate-in slide-in-from-bottom duration-300 border-t border-slate-200">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1" />

        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Project Layers</h2>
            <p className="text-xs text-slate-500">{items.length} items • {walls.length} walls • {floors.length} floors</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
          {/* Furniture & Items */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Furniture & Openings ({items.length})
            </h3>
            {items.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-2">No items added yet</p>
            ) : (
              <div className="space-y-1.5">
                {items.map(item => {
                  const type = ITEM_CATALOG.find(c => c.id === item.typeId);
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelect([item.id], null, null, null);
                        onClose();
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all active:scale-[0.99] ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Box className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="text-xs font-semibold truncate">{type?.name || 'Item'}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Walls */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Walls ({walls.length})
            </h3>
            {walls.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-2">No walls drawn</p>
            ) : (
              <div className="space-y-1.5">
                {walls.map((wall, index) => {
                  const isSelected = selectedWallId === wall.id;
                  const lengthM = (Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) / 40).toFixed(2);
                  return (
                    <div
                      key={wall.id}
                      onClick={() => {
                        onSelect([], wall.id, null, null);
                        onClose();
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all active:scale-[0.99] ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        <span className="text-xs font-semibold truncate">Wall {index + 1} ({lengthM}m)</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteWall(wall.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Floors */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Floors ({floors.length})
            </h3>
            {floors.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-2">No floors created</p>
            ) : (
              <div className="space-y-1.5">
                {floors.map((floor, index) => {
                  const isSelected = selectedFloorId === floor.id;
                  return (
                    <div
                      key={floor.id}
                      onClick={() => {
                        onSelect([], null, floor.id, null);
                        onClose();
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all active:scale-[0.99] ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-4 h-4 rounded-xs border border-slate-300 shrink-0" style={{ backgroundColor: floor.color }} />
                        <span className="text-xs font-semibold truncate">Floor Area {index + 1}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFloor(floor.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes / Comments */}
          {comments.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                Notes ({comments.length})
              </h3>
              <div className="space-y-1.5">
                {comments.map((comment, index) => (
                  <div
                    key={comment.id}
                    onClick={() => {
                      onSelect([], null, null, comment.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl border bg-yellow-50/70 border-yellow-200 text-slate-800 hover:bg-yellow-100"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MessageSquare className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-xs font-semibold truncate">{comment.text || `Note ${index + 1}`}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteComment(comment.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
