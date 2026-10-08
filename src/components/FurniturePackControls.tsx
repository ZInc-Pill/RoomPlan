import type { PlacedItem } from '../types';
import { ITEM_CATALOG } from '../catalog';
import { isSeat,isTV,isCoffee,isRailing,seatLevel,screenInches,resizeScreen } from '../utils/furniturePack';

export function FurniturePackControls({item,onUpdate}:{item:PlacedItem;onUpdate:(patch:Partial<PlacedItem>)=>void}) {
  const type=ITEM_CATALOG.find(t=>t.id===item.typeId)!,height=item.height??type.height;
  const field='w-full min-h-11 border rounded-lg px-2 mt-1';
  const color=(label:string,key:'frameColor'|'color'|'legColor',fallback:string)=><label className="flex min-h-11 items-center justify-between gap-2 text-xs font-semibold">{label}<input aria-label={label} type="color" className="h-11 w-14 border rounded p-1" value={item[key]??fallback} onChange={e=>onUpdate({[key]:e.target.value})}/></label>;
  return <>
    {isSeat(item)&&<>
      <label className="block text-xs font-semibold">Seat height (cm)<input aria-label="Seat height" className={field} type="number" min="1" max="300" value={seatLevel(item,height)} onChange={e=>{if(e.target.value){const seatHeight=Math.max(1,Math.min(300,Number(e.target.value)));onUpdate({seatHeight,height:height-seatLevel(item,height)+seatHeight});}}}/></label>
      <label className="block text-xs font-semibold">Seat material<select aria-label="Seat material" className={field} value={item.seatMaterial??(['chair_wood','chair_modern','stool_backless'].includes(item.typeId)?'wood':'fabric')} onChange={e=>onUpdate({seatMaterial:e.target.value as PlacedItem['seatMaterial']})}><option value="wood">Wood</option><option value="fabric">Upholstered fabric</option><option value="leather">Leather</option></select></label>
      {color('Seat color','color',type.color)}{color('Frame color','frameColor',item.typeId==='chair_wood'?'#94704e':'#454b47')}
    </>}
    {isTV(item)&&<>
      <label className="block text-xs font-semibold">Screen diagonal (inches)<input aria-label="Screen size in inches" className={field} type="number" min="10" max="150" step="1" value={Math.round(screenInches(item,item.width??type.width))} onChange={e=>{if(e.target.value)onUpdate(resizeScreen(item,Math.max(10,Math.min(150,Number(e.target.value)))));}}/></label>
      <p className="text-xs text-slate-500">Screen size uses 16:9 proportions. Elevation sets the bottom height. {item.typeId==='tv_wall'?'Place against a wall; the mount does not cut an opening.':'Set elevation to the height of your TV console.'}</p>
    </>}
    {isCoffee(item)&&<>
      <label className="block text-xs font-semibold">Tabletop finish<select aria-label="Tabletop finish" className={field} value={item.tableFinish??'wood'} onChange={e=>onUpdate({tableFinish:e.target.value as PlacedItem['tableFinish'],color:undefined})}><option value="wood">Wood</option><option value="glass">Glass</option><option value="stone">Stone</option></select></label>
      {color('Top color','color',item.tableFinish==='glass'?'#c5dad8':item.tableFinish==='stone'?'#dedbd2':type.color)}{color('Leg color','legColor','#5d5143')}
    </>}
    {isRailing(item)&&<>
      <label className="block text-xs font-semibold">Railing infill<select aria-label="Railing style" className={field} value={item.railingStyle??'metal'} onChange={e=>onUpdate({railingStyle:e.target.value as PlacedItem['railingStyle']})}><option value="metal">Vertical metal bars</option><option value="glass">Glass panels</option><option value="wood">Wooden slats</option></select></label>
      {color('Frame color','frameColor',item.color??(item.railingStyle==='wood'?'#a7825d':'#505954'))}
    </>}
  </>;
}
