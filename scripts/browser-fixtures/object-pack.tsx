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
  if(kind==='Stairs')doc.items=['stairs_straight','stairs_l','stairs_u'].flatMap((id,i)=>[make(id,150+i*250,140),make(id,150+i*250,390,{stairDirection:'down',stairRailings:false})]);
  else if(kind==='Islands')doc.items=[make('kit_island',120,150),make('kit_island_seating',350,150),...(['solid','slats','glass','fluted','folding'] as const).map((dividerStyle,i)=>make('kit_island_divider',120+(i%3)*230,300+Math.floor(i/3)*170,{dividerStyle}))];
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
    <header style={{display:'flex',gap:8,padding:8}}>{['Stairs','Islands','Openings'].map(k=><button key={k} style={{minHeight:44,padding:8}} onClick={()=>{setKind(k);const d=room(k);setInitial(d);setLatest(d);}}>{k}</button>)}<span>Isolated test room</span></header>
    <div style={{flex:1,minHeight:0}}><App key={initial.items[0].id} embedded initial={initial} onDocument={setLatest}/></div>
    <output style={{fontSize:11,height:32,overflow:'auto'}}>{kind}: {latest.items.map(i=>`${i.typeId} (${Math.round(i.x)},${Math.round(i.y)}) ${i.stairDirection??''} ${i.dividerStyle??''} elevation=${i.elevation??0}`).join(' · ')}</output>
  </div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
