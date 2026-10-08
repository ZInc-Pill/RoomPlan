import assert from 'node:assert/strict';
import { ITEM_CATALOG } from '../src/catalog';
import { isSeat,isTV,isCoffee,seatLevel,resizeScreen,screenInches,railingLayout } from '../src/utils/furniturePack';
import { packProperties } from '../src/utils/objectPack';
import { emptyDocument,initialHistory,documentHistory } from '../src/utils/documentHistory';
import { parseProject,serializeProject } from '../src/utils/projectFile';
import { changesBetween,applyChanges } from '../src/cloud/patches';
import { railingEndpoints,cornerRailingPoints,resizeRailing,resizeCornerRailing } from '../src/utils/linearElement';
import type { PlacedItem } from '../src/types';

const items:PlacedItem[]=ITEM_CATALOG.filter(t=>isSeat({typeId:t.id} as PlacedItem)||isTV({typeId:t.id} as PlacedItem)||isCoffee({typeId:t.id} as PlacedItem)).map((t,i)=>({id:t.id,typeId:t.id,x:i*150,y:100,rotation:0,width:t.width,height:t.height,depth:t.depth,elevation:t.defaultElevation??0}));
assert.equal(items.length,11);
for(const item of items) {
  const customized={...item,...(isSeat(item)?{seatHeight:50,seatMaterial:'leather' as const,frameColor:'#123456'}:{}),...(isCoffee(item)?{tableFinish:'glass' as const,legColor:'#654321'}:{})};
  const doc={...emptyDocument(),items:[customized]};assert.deepEqual(parseProject(serializeProject(doc)),doc);
  const next={...doc,items:[{...customized,x:420}]};assert.deepEqual(applyChanges(doc,changesBetween(doc,next)),next);
  let history:ReturnType<typeof initialHistory>={...initialHistory(),present:doc};
  history=documentHistory(history,{type:'update',update:()=>next});history=documentHistory(history,{type:'undo'});assert.deepEqual(history.present,doc);history=documentHistory(history,{type:'redo'});assert.deepEqual(history.present,next);
  if(isTV(item))for(const inches of [32,55,85]) {const dimensions=resizeScreen(item,inches);assert.ok(Math.abs(screenInches(item,dimensions.width)-inches)<.05);assert.ok(dimensions.height>0);}
}
assert.equal(seatLevel(items.find(i=>i.typeId==='stool_backless')!,75),75);
assert.equal(seatLevel({...items[0],seatHeight:150},80),80);
const world=(item:PlacedItem,p:{x:number;y:number})=>({x:item.x+.4*(p.x*Math.cos(item.rotation)-p.y*Math.sin(item.rotation)),y:item.y+.4*(p.x*Math.sin(item.rotation)+p.y*Math.cos(item.rotation))});
for(const typeId of ['bal_railing','bal_corner_railing'])for(const rotation of [0,.7,Math.PI/2]) {
  let rail:PlacedItem={id:'rail',typeId,x:200,y:150,rotation,width:230,depth:typeId==='bal_railing'?5:170};
  rail=typeId==='bal_railing'?resizeRailing(rail,1,{x:500,y:400},20,true):resizeCornerRailing(rail,0,{x:500,y:400},20,true);
  const geometry=railingLayout(rail,rail.width!,rail.depth!);
  const ends=typeId==='bal_railing'?railingEndpoints(rail):cornerRailingPoints(rail);
  for(const end of ends)assert.ok(geometry.posts.some(p=>Math.hypot(world(rail,p).x-end.x,world(rail,p).y-end.y)<1e-6),'3D/2D posts align with edited endpoints');
  assert.equal(new Set(geometry.posts.map(p=>`${p.x},${p.y}`)).size,geometry.posts.length,'No duplicate corner post');
  assert.ok(geometry.bays.every(b=>b.length<=90.000001));
  for(const railingStyle of ['metal','glass','wood'] as const) {const doc={...emptyDocument(),items:[{...rail,railingStyle}]};assert.deepEqual(parseProject(serializeProject(doc)),doc);}
  const legacy={...emptyDocument(),items:[rail]};assert.deepEqual(parseProject(serializeProject(legacy)),legacy,'Legacy railing coordinates and dimensions preserved');
}
for(const invalid of [{seatHeight:0},{seatHeight:Infinity},{seatMaterial:'glass'},{tableFinish:'cloth'},{railingStyle:'rope'},{legColor:'red'}])assert.throws(()=>packProperties(invalid));
console.log('Furniture pack: 11 types, finishes, seat heights, TV sizing, legacy railings, resized/rotated endpoints, corner joints, save/load, collaboration and undo/redo passed');
