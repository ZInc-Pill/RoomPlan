import React, { useState } from 'react';
import { AppMode, Wall, PlacedItem, Floor, CommentType } from '../types';
import { ITEM_CATALOG } from '../catalog';
import * as LucideIcons from 'lucide-react';
import { 
  Square, PenTool, MousePointer2, Box, Trash2, RotateCw, Monitor, Layers, MessageSquare, ListTree
} from 'lucide-react';

interface ToolbarProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  view3D: boolean;
  setView3D: (val: boolean) => void;
  onAddItem: (typeId: string) => void;
  onClear: () => void;
  walls: Wall[];
  floors: Floor[];
  items: PlacedItem[];
  comments: CommentType[];
  selectedItemIds: string[];
  selectedWallId: string | null;
  selectedFloorId: string | null;
  selectedCommentId: string | null;
  onSelect: (itemIds: string[], wallId: string | null, floorId: string | null, commentId: string | null) => void;
}

export function Toolbar({ 
  mode, setMode, view3D, setView3D, onAddItem, onClear,
  walls, floors, items, comments, selectedItemIds, selectedWallId, selectedFloorId, selectedCommentId, onSelect
}: ToolbarProps) {
  const [activeTab, setActiveTab] = useState<'assets' | 'layers'>('assets');
  const categories = Array.from(new Set(ITEM_CATALOG.map(i => i.category)));

  return (
    <aside className="w-72 bg-white border-r border-slate-200 hidden md:flex flex-col h-full z-10 relative shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="flex bg-slate-100 p-1 mx-5 mt-5 rounded-lg border border-slate-200">
        <button 
          onClick={() => setActiveTab('assets')}
          className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${activeTab === 'assets' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Assets
        </button>
        <button 
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1 ${activeTab === 'layers' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ListTree className="w-3 h-3" /> Layers
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {activeTab === 'assets' ? (
          <div className="space-y-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Furniture Library</h2>
            {categories.map(cat => (
              <div key={cat}>
                <h3 className="text-sm font-bold text-slate-700 mb-3 capitalize">{cat}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {ITEM_CATALOG.filter(i => i.category === cat).map(item => {
                    const Icon = (LucideIcons as any)[item.icon] || Box;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onAddItem(item.id)}
                        className="aspect-square bg-slate-50 rounded-lg border border-slate-200 flex flex-col items-center justify-center hover:border-indigo-300 hover:bg-indigo-50 transition-colors p-1"
                        title={item.name}
                      >
                        <Icon className="w-6 h-6 mb-1 text-slate-500" strokeWidth={1.5} />
                        <span className="text-[9px] font-bold text-slate-500 leading-tight truncate w-full">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                <span>Items ({items.length})</span>
              </h2>
              <div className="space-y-3">
                {categories.map(cat => {
                  const catItems = items.filter(i => {
                    const t = ITEM_CATALOG.find(c => c.id === i.typeId);
                    return t && t.category === cat;
                  });
                  if (catItems.length === 0) return null;
                  
                  return (
                    <div key={cat}>
                      <h3 className="text-[10px] font-bold text-slate-500 mb-1 capitalize px-2">{cat}</h3>
                      <div className="space-y-1">
                        {catItems.map((item, index) => {
                          const typeInfo = ITEM_CATALOG.find(i => i.id === item.typeId);
                          const isSelected = selectedItemIds.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              onClick={(e) => {
                                setMode('SELECT');
                                if (e.shiftKey || e.metaKey) {
                                  onSelect(
                                    isSelected ? selectedItemIds.filter(id => id !== item.id) : [...selectedItemIds, item.id],
                                    null, null, null
                                  );
                                } else {
                                  onSelect([item.id], null, null, null);
                                }
                              }}
                              className={`w-full text-left px-3 py-2 text-xs rounded-md font-medium transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
                            >
                              {typeInfo?.name || `Item ${index + 1}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && <p className="text-xs text-slate-400 italic px-2">No items</p>}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                <span>Walls ({walls.length})</span>
              </h2>
              <div className="space-y-1">
                {walls.map((wall, index) => {
                  const isSelected = wall.id === selectedWallId;
                  return (
                    <button
                      key={wall.id}
                      onClick={() => { setMode('SELECT'); onSelect([], wall.id, null, null); }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-md font-medium transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
                    >
                      Wall {index + 1}
                    </button>
                  );
                })}
                {walls.length === 0 && <p className="text-xs text-slate-400 italic px-2">No walls</p>}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                <span>Floors ({floors.length})</span>
              </h2>
              <div className="space-y-1">
                {floors.map((floor, index) => {
                  const isSelected = floor.id === selectedFloorId;
                  return (
                    <button
                      key={floor.id}
                      onClick={() => { setMode('SELECT'); onSelect([], null, floor.id, null); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md font-medium transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
                    >
                      <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: floor.color }}></div>
                      Floor {index + 1}
                    </button>
                  );
                })}
                {floors.length === 0 && <p className="text-xs text-slate-400 italic px-2">No floors</p>}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                <span>Comments ({comments.length})</span>
              </h2>
              <div className="space-y-1">
                {comments.map((comment, index) => {
                  const isSelected = comment.id === selectedCommentId;
                  return (
                    <button
                      key={comment.id}
                      onClick={() => { setMode('SELECT'); onSelect([], null, null, comment.id); }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-md font-medium transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
                      title={comment.text}
                    >
                      {comment.text || `Comment ${index + 1}`}
                    </button>
                  );
                })}
                {comments.length === 0 && <p className="text-xs text-slate-400 italic px-2">No comments</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
