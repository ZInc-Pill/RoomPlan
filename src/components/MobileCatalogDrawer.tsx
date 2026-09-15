import React, { useState, useMemo } from 'react';
import { ITEM_CATALOG } from '../catalog';
import { X, Search, Check, Box } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface MobileCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (typeId: string) => void;
}

export function MobileCatalogDrawer({ isOpen, onClose, onAddItem }: MobileCatalogDrawerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(ITEM_CATALOG.map(i => i.category)))];
  }, []);

  const filteredItems = useMemo(() => {
    return ITEM_CATALOG.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleSelect = (id: string) => {
    onAddItem(id);
    setLastAddedId(id);
    setTimeout(() => {
      setLastAddedId(null);
      onClose();
    }, 280);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Bottom Sheet Modal */}
      <div className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[82vh] h-[75vh] w-full z-10 animate-in slide-in-from-bottom duration-300 ease-out border-t border-slate-200">
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add Elements</h2>
            <p className="text-xs text-slate-500">Tap to place directly into your floor plan</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 pt-3 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search furniture, doors, windows..."
              className="w-full bg-slate-100/80 border border-slate-200/80 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Categories Pills */}
        <div className="px-5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {cat === 'all' ? 'All Items' : cat}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-3 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-medium">No elements found</p>
              <p className="text-xs text-slate-400 mt-1">Try another search term or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 pb-8">
              {filteredItems.map(item => {
                const IconComponent = (LucideIcons as any)[item.icon] || Box;
                const isJustAdded = lastAddedId === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`flex flex-col p-3 rounded-2xl border text-left transition-all relative group active:scale-[0.98] ${
                      isJustAdded
                        ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/30'
                        : 'border-slate-200/80 bg-slate-50/70 hover:border-indigo-300 hover:bg-indigo-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={`p-2 rounded-xl ${isJustAdded ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-600 shadow-xs border border-slate-100'}`}>
                        {isJustAdded ? (
                          <Check className="w-5 h-5 animate-in zoom-in-50 duration-150" />
                        ) : (
                          <IconComponent className="w-5 h-5" strokeWidth={1.8} />
                        )}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {item.category}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-slate-800 leading-snug line-clamp-1 mb-1">
                      {item.name}
                    </span>

                    <span className="text-[11px] font-medium text-slate-500">
                      {item.width} × {item.depth} cm
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
