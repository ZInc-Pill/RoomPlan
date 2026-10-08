/// <reference types="vite/client" />
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from '../../src/App';
import '../../src/index.css';
import {ITEM_CATALOG} from '../../src/catalog';
import type {PlanDocument} from '../../src/utils/documentHistory';
import type {PlacedItem} from '../../src/types';
const make=(typeId:string,x:number,y:number,patch:Partial<PlacedItem>={}):PlacedItem=>{
  const t=ITEM_CATALOG.find(t=>t.id===typeId)!;
  return {id:crypto.randomUUID(),typeId,x,y,rotation:0,width:t.width,depth:t.depth,height:t.height,elevation:t.defaultElevation??0,...patch};
};
function room(kind:string):PlanDocument {
  const doc:PlanDocument={walls:[],floors:[{id:'floor',points:[{x:0,y:0},{x:800,y:0},{x:800,y:550},{x:0,y:550}],color:'#ebe5da'}],comments:[],items:[]};
  if(kind==='Japanese islands')doc.items=['kit_japanese_divider','kit_breakfast_counter','kit_japanese_complete'].map((id,i)=>make(id,150+i*250,270,{...(i===1?{panelMaterial:'woven',panelState:'half'}:{})}));
  else if(kind==='Small stairs')doc.items=['stair_symbol_straight','stair_symbol_l','stair_symbol_u','platform_steps_2','platform_steps_3','platform_steps_4'].map((id,i)=>make(id,150+(i%3)*230,150+Math.floor(i/3)*230,{...(i<3?{stairDirection:i===1?'down':'up'}:{})}));
  else if(kind==='Layering' || kind==='Coverage') {
    doc.floors.push({id:'overlap',points:[{x:180,y:200},{x:650,y:200},{x:650,y:500},{x:180,y:500}],color:'#b6c9d5'});
    doc.items=[make('stairs_straight',250,280,{stairDirection:'down'}),make('stairs_l',480,330,{stairDirection:'down',rotation:.4}),make('stairs_u',650,130)];
    if(kind==='Coverage') { doc.floors[1].points[0].y=280;doc.floors[1].points[1].y=280;doc.floors.push({id:'full-cover',points:[{x:395,y:240},{x:565,y:240},{x:565,y:420},{x:395,y:420}],color:'#c4cbb7'}); }
    doc.walls=[{id:'crossing',start:{x:120,y:310},end:{x:650,y:310},thickness:12,height:150}];
  }
  else if(kind==='Stairs')doc.items=['stairs_straight','stairs_l','stairs_u'].flatMap((id,i)=>[make(id,150+i*250,140),make(id,150+i*250,390,{stairDirection:'down',stairRailings:false})]);
  else if(kind==='Islands')doc.items=[make('kit_island',120,150),make('kit_island_seating',350,150),...(['solid','slats','glass','fluted','folding'] as const).map((dividerStyle,i)=>make('kit_island_divider',120+(i%3)*230,300+Math.floor(i/3)*170,{dividerStyle}))];
  else if(kind==='Furniture')doc.items=ITEM_CATALOG.filter(t=>['chair','tv','coffee_table'].includes(t.shape)).map((t,i)=>make(t.id,100+(i%4)*180,100+Math.floor(i/4)*180,{...(t.shape==='coffee_table'?{tableFinish:i%2?'glass':'stone'}:{})}));
  else if(kind==='Railings')doc.items=(['metal','glass','wood'] as const).flatMap((railingStyle,i)=>[make('bal_railing',140+i*250,150,{width:220,railingStyle}),make('bal_corner_railing',140+i*250,400,{width:200,depth:160,railingStyle})]);
  else if(kind==='Shoji')doc.items=['shoji_short_single','shoji_short_pair','shoji_tall_single','shoji_tall_pair'].map((id,i)=>{
    const x=180+(i%2)*400,y=150+Math.floor(i/2)*270;
    doc.walls.push({id:'sw'+i,start:{x:x-140,y},end:{x:x+140,y},thickness:8,height:150});
    return make(id,x,y,{wallId:'sw'+i,wallOffset:350,depth:20,panelState:i%2?'half':'closed',panelMaterial:i>1?'woven':'paper'});
  });
  else doc.items=['win_std','win_high','win_wall','win_tall','door_glass_single','door_glass_double','door_glass_sliding'].map((id,i)=>{
    const x=120+(i%3)*250,y=100+Math.floor(i/3)*180;
    doc.walls.push({id:'w'+i,start:{x:x-100,y},end:{x:x+100,y},thickness:8,height:150});
    return make(id,x,y,{wallId:'w'+i,wallOffset:250});
  });
  return doc;
}
function Fixture(){
  const [kind,setKind]=useState('Stairs'),[initial,setInitial]=useState(()=>room('Stairs')),[latest,setLatest]=useState(initial);
  return <div style={{height:'100dvh',display:'flex',flexDirection:'column'}}>
    <header style={{display:'flex',flexWrap:'wrap',gap:8,padding:8}}>{['Japanese islands','Small stairs','Coverage','Layering','Stairs','Islands','Openings','Shoji','Furniture','Railings'].map(k=><button key={k} style={{minHeight:44,padding:8}} onClick={()=>{setKind(k);const d=room(k);setInitial(d);setLatest(d);}}>{k}</button>)}<span>Isolated test room</span></header>
    <div style={{flex:1,minHeight:0}}><App key={initial.items[0].id} embedded initial={initial} onDocument={setLatest}/></div>
    <output style={{fontSize:11,height:32,overflow:'auto'}}>{kind}: {latest.items.map(i=>`${i.typeId} (${Math.round(i.x)},${Math.round(i.y)}) ${i.railingStyle??''} ${i.tableFinish??''} ${i.seatMaterial??''} ${i.panelState??''} ${i.stairDirection??''} ${i.dividerStyle??''} elevation=${i.elevation??0}`).join(' · ')}</output>
  </div>;
}
const root=createRoot(document.getElementById('root')!);
root.render(<Fixture/>);
if(import.meta.hot) import.meta.hot.dispose(()=>root.unmount());
