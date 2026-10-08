import type { PlacedItem } from '../types';
import { ITEM_CATALOG } from '../catalog';
import { isSeat,isTV,isCoffee,isRailing,railingLayout } from '../utils/furniturePack';
type Props={item:PlacedItem;w:number;h:number;d:number};

export function FurniturePackPlan({item,w,h,d}:Props) {
  const frame=item.frameColor??(item.typeId==='chair_wood'?'#94704e':'#454b47'),round=item.typeId==='stool_backless'||['coffee_round','coffee_oval'].includes(item.typeId);
  if(isRailing(item)) {
    const {paths,posts}=railingLayout(item,w,d),color=item.frameColor??item.color??(item.railingStyle==='wood'?'#a7825d':'#505954');
    return <svg viewBox={`${-w/2} ${-d/2} ${w} ${d}`} className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
      {paths.map(([a,b],i)=><line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={item.railingStyle==='glass'?'#8bb7b8':color} strokeWidth={item.railingStyle==='glass'?4:2} vectorEffect="non-scaling-stroke"/>)}
      {posts.map((p,i)=><rect key={i} x={p.x-2} y={p.y-2} width="4" height="4" fill={color}/>)}
    </svg>;
  }
  return <div className="absolute inset-0 pointer-events-none" style={{borderRadius:round?'50%':3,background:isTV(item)?'#171f22':item.color??(item.tableFinish==='glass'?'#b9d4d380':item.tableFinish==='stone'?'#dedbd2':ITEM_CATALOG.find(t=>t.id===item.typeId)!.color),border:`1px solid ${frame}`}}>
    {isSeat(item)&&item.typeId!=='stool_backless'&&<div className="absolute top-0 left-[7%] right-[7%] h-[18%] rounded-sm" style={{background:frame}}/>}
    {isSeat(item)&&<div className="absolute inset-[15%] border border-black/15" style={{borderRadius:round?'50%':3}}/>}
    {isTV(item)&&<div className="absolute left-[4%] right-[4%] top-0 h-[14%] bg-slate-500"/>}
    {isCoffee(item)&&[-1,1].flatMap(x=>[-1,1].map(z=><span key={`${x}${z}`} className="absolute w-[7%] h-[9%] rounded-sm" style={{left:`${47+x*(round?27:36)}%`,top:`${45+z*(round?27:34)}%`,background:item.legColor??'#5d5143',opacity:.55}}/>))}
  </div>;
}
