import { isStairSymbol,isPlatformSteps,platformCount } from '../utils/smallStairs';
import { FurniturePackControls } from './FurniturePackControls';
import { isSeat,isTV,isCoffee,isRailing } from '../utils/furniturePack';
import { isShoji } from '../utils/shoji';
import type { PlacedItem } from '../types';
import { DIVIDER_STYLES, isStair, isGlassDoor } from '../utils/objectPack';
import { ITEM_CATALOG } from '../catalog';

export function ObjectPackControls({item,onUpdate}: {item:PlacedItem;onUpdate:(id:string,updates:Partial<PlacedItem>)=>void}) {
  const update=(patch:Partial<PlacedItem>)=>onUpdate(item.id,patch);
  const stairs=isStair(item),divider=item.typeId==='kit_island_divider';
  const shoji=isShoji(item);
  const opening=shoji||ITEM_CATALOG.find(t=>t.id===item.typeId)?.shape==='window'||isGlassDoor(item);
  const furniture=isSeat(item)||isTV(item)||isCoffee(item)||isRailing(item);
  if(!isStairSymbol(item)&&!isPlatformSteps(item)&&!furniture&&!stairs&&!divider&&!opening) return null;
  return <section className="space-y-3 border-t border-slate-200 pt-3" aria-label="Object options">
    {furniture && <FurniturePackControls item={item} onUpdate={update}/>}
    {shoji && <>
      <label className="block text-xs font-semibold">Opening state<select aria-label="Panel opening state" className="w-full min-h-11 border rounded-lg px-2 mt-1" value={item.panelState??'closed'} onChange={e=>update({panelState:e.target.value as PlacedItem['panelState']})}><option value="closed">Closed</option><option value="half">Half-open</option><option value="open">Fully open</option></select></label>
      <label className="block text-xs font-semibold">Panel insert<select aria-label="Panel material" className="w-full min-h-11 border rounded-lg px-2 mt-1" value={item.panelMaterial??'paper'} onChange={e=>update({panelMaterial:e.target.value as PlacedItem['panelMaterial']})}><option value="paper">Translucent paper</option><option value="woven">Woven insert</option></select></label>
      <p className="text-xs text-slate-500">Width sets the opening. Allow space beside it for the sliding leaves. Attach to a wall to cut an opening, or place freely.</p>
    </>}
    {(stairs||isStairSymbol(item)) && <>
      <label className="block text-xs font-semibold">Direction<select aria-label="Stair direction" className="w-full min-h-11 border border-slate-200 rounded-lg px-2 mt-1" value={item.stairDirection??'up'} onChange={e=>update({stairDirection:e.target.value as 'up'|'down'})}><option value="up">Up (+1)</option><option value="down">Down (−1)</option></select></label>
      {stairs && <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={item.stairRailings??true} onChange={e=>update({stairRailings:e.target.checked})}/>Railings</label>}
      <p className="text-xs text-slate-500">{isStairSymbol(item)?"Plan annotation only. No 3D geometry or floor opening.":"Decorative stairs. Rise or descent sets the vertical distance. A down stair’s floor opening follows its footprint."}</p>
    </>}
    {isPlatformSteps(item) && <>
      {(['depth','height'] as const).map(key=>{const type=ITEM_CATALOG.find(t=>t.id===item.typeId)!;const count=platformCount(item);return <label key={key} className="block text-xs font-semibold">Step {key} (cm)<input aria-label={`Step ${key} in centimeters`} type="number" min="1" max="300" step="1" className="w-full min-h-11 border rounded-lg p-2 mt-1" value={Number(((item[key]??type[key])/count).toFixed(2))} onChange={e=>{const value=e.target.valueAsNumber;if(Number.isFinite(value)&&value>=1)update({[key]:Math.min(300,value)*count});}}/></label>;})}
      <p className="text-xs text-slate-500">{platformCount(item)} steps above the floor. No floor opening.</p>
    </>}
    {divider && <>
      <label className="block text-xs font-semibold">Divider<select aria-label="Divider style" className="w-full min-h-11 border border-slate-200 rounded-lg px-2 mt-1" value={item.dividerStyle??'solid'} onChange={e=>update({dividerStyle:e.target.value as PlacedItem['dividerStyle']})}>{Object.entries(DIVIDER_STYLES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label className="block text-xs font-semibold">Divider height above counter (cm)<input className="w-full min-h-11 border rounded-lg p-2 mt-1" type="number" min="1" max="300" value={item.dividerHeight??60} onChange={e=>{if(e.target.value&&Number.isFinite(e.target.valueAsNumber))update({dividerHeight:Math.max(1,Math.min(300,e.target.valueAsNumber))});}}/></label>
      <p className="text-xs text-slate-500">The divider shares the island’s finish and moves with it.</p>
    </>}
    {opening && <label className="flex items-center justify-between gap-2 text-xs font-semibold">Frame color<input aria-label="Frame color" type="color" className="w-14 h-11 rounded border border-slate-200 p-1" value={item.frameColor??(shoji?'#98704b':isGlassDoor(item)?'#46534b':'#ffffff')} onChange={e=>update({frameColor:e.target.value})}/></label>}
  </section>;
}
