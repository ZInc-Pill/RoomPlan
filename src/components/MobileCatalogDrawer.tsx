import React, { useMemo, useRef, useState } from 'react';
import { ITEM_CATALOG } from '../catalog';
import { X, Search, Plus, Box } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface MobileCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (typeId: string) => void;
}

export function MobileCatalogDrawer({ isOpen, onClose, onAddItem }: MobileCatalogDrawerProps) {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const results = useRef<HTMLDivElement>(null);
  const categories = useMemo(() => Array.from(new Set(ITEM_CATALOG.map(i => i.category))), []);
  const filtered = useMemo(() => ITEM_CATALOG.filter(item =>
    (category === 'all' || item.category === category) &&
    `${item.name} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase())), [category, query]);
  if (!isOpen) return null;
  return <section className="mobile-catalog" aria-label="Add objects">
    <header><div><h2>Add objects</h2><p>Tap an item to add it to your room.</p></div><button aria-label="Close catalog" onClick={onClose}><X size={22} /></button></header>
    <div className="catalog-filters">
      <label className="catalog-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="Search objects" placeholder="Search objects" value={query} onChange={e => { setQuery(e.target.value); results.current?.scrollTo(0,0); }} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={18} /></button>}</label>
      <label className="catalog-category">Category<select aria-label="Object category" value={category} onChange={e => { setCategory(e.target.value); results.current?.scrollTo(0,0); }}><option value="all">All categories</option>{categories.map(cat => <option key={cat} value={cat}>{cat[0].toUpperCase() + cat.slice(1)}</option>)}</select></label>
    </div>
    <div className="catalog-results" ref={results}>
      <p className="catalog-count" role="status">{filtered.length} {filtered.length === 1 ? 'object' : 'objects'}</p>
      {!filtered.length ? <div className="catalog-empty"><h3>No matching objects</h3><p>Try a different search or browse all categories.</p><button onClick={() => { setQuery(''); setCategory('all'); }}>Reset filters</button></div> : <div className="catalog-grid">{filtered.map(item => {
        const Icon = (LucideIcons as any)[item.icon] || Box;
        return <button key={item.id} className="catalog-card" aria-label={`Add ${item.name}`} onClick={() => { onAddItem(item.id); onClose(); }}><span className="catalog-card-icon"><Icon size={26} aria-hidden="true" /><Plus size={16} aria-hidden="true" /></span><strong>{item.name}</strong><span>{item.width} × {item.depth} cm</span></button>;
      })}</div>}
    </div>
  </section>;
}
