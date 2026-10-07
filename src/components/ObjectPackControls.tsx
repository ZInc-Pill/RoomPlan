import type { PlacedItem } from '../types';
import { DIVIDER_STYLES, isStair, isGlassDoor } from '../utils/objectPack';
import { ITEM_CATALOG } from '../catalog';

export function ObjectPackControls({item,onUpdate}: {item:PlacedItem;onUpdate:(id:string,updates:Partial<PlacedItem>)=>void}) {
  const update=(patch:Partial<PlacedItem>)=>onUpdate(item.id,patch);
  const stairs=isStair(item),divider=item.typeId==='kit_island_divider';
  const opening=ITEM_CATALOG.find(t=>t.id===item.typeId)?.shape==='window'||isGlassDoor(item);
  if(!stairs&&!divider&&!opening) return null;
  return <section className="space-y-3 border-t border-slate-200 pt-3" aria-label="Object options">
    {stairs && <>
      <label className="block text-xs font-semibold">Direction<select aria-label="Stair direction" className="w-full min-h-11 border border-slate-200 rounded-lg px-2 mt-1" value={item.stairDirection??'up'} onChange={e=>update({stairDirection:e.target.value as 'up'|'down'})}><option value="up">Up (+1)</option><option value="down">Down (−1)</option></select></label>
      <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={item.stairRailings??true} onChange={e=>update({stairRailings:e.target.checked})}/>Railings</label>
      <p className="text-xs text-slate-500">Decorative stairs. Rise or descent sets the vertical distance. A down stair’s floor opening follows its footprint.</p>
    </>}
    {divider && <>
      <label className="block text-xs font-semibold">Divider<select aria-label="Divider style" className="w-full min-h-11 border border-slate-200 rounded-lg px-2 mt-1" value={item.dividerStyle??'solid'} onChange={e=>update({dividerStyle:e.target.value as PlacedItem['dividerStyle']})}>{Object.entries(DIVIDER_STYLES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label className="block text-xs font-semibold">Divider height above counter (cm)<input className="w-full min-h-11 border rounded-lg p-2 mt-1" type="number" min="1" max="300" value={item.dividerHeight??60} onChange={e=>{if(e.target.value&&Number.isFinite(e.target.valueAsNumber))update({dividerHeight:Math.max(1,Math.min(300,e.target.valueAsNumber))});}}/></label>
      <p className="text-xs text-slate-500">The divider shares the island’s finish and moves with it.</p>
    </>}
    {opening && <label className="flex items-center justify-between gap-2 text-xs font-semibold">Frame color<input aria-label="Frame color" type="color" className="w-14 h-11 rounded border border-slate-200 p-1" value={item.frameColor??(isGlassDoor(item)?'#46534b':'#ffffff')} onChange={e=>update({frameColor:e.target.value})}/></label>}
  </section>;
}
