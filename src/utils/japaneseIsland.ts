import {ITEM_CATALOG} from '../catalog';
import type {PlacedItem} from '../types';
export const isJapaneseIsland=(item:Pick<PlacedItem,'typeId'>)=>['kit_japanese_divider','kit_breakfast_counter','kit_japanese_complete'].includes(item.typeId);
export function japaneseIslandLayout(item:PlacedItem) {
  const type=ITEM_CATALOG.find(t=>t.id===item.typeId)!;
  const w=item.width??type.width,d=item.depth??type.depth,h=item.height??type.height;
  const dividerHeight=item.dividerHeight??(item.typeId==='kit_breakfast_counter'?45:100);
  const frame=item.frameColor??'#98704b';
  const stoolWidth=Math.min(40,w*.25),stoolHeight=Math.max(1,h-25);
  return {w,d,h,dividerHeight,frame,slatCount:Math.min(24,Math.max(3,Math.round(w/12))),panelWidth:w*.46,panelZ:-d*.30,
    stools:[-.27,.27].map(x=>({x:x*w,z:d/2+stoolWidth*.35,width:stoolWidth,height:stoolHeight}))};
}
export function islandPanel(item:PlacedItem):PlacedItem {
  return {...item,typeId:'shoji_tall_pair',color:undefined};
}
export function ungroupJapaneseIsland(item:PlacedItem,ids:[string,string]):PlacedItem[] {
  if(item.typeId!=='kit_japanese_complete')return [item];
  const layout=japaneseIslandLayout(item),c=Math.cos(item.rotation),s=Math.sin(item.rotation);
  return [{...item,typeId:'kit_breakfast_counter',dividerHeight:layout.dividerHeight},...layout.stools.map((stool,i):PlacedItem=>({
    id:ids[i],typeId:'stool_backless',x:item.x+.4*(stool.x*c-stool.z*s),y:item.y+.4*(stool.x*s+stool.z*c),
    rotation:item.rotation,width:stool.width,depth:stool.width,height:stool.height,seatHeight:stool.height,
    elevation:item.elevation??0,frameColor:layout.frame,color:layout.frame,seatMaterial:'wood',
  }))];
}
