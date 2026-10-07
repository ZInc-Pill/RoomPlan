import type { PlacedItem } from '../types';
import { stairLayout } from '../utils/objectPack';
export function StairPlan({item,w,d,h}: {item:PlacedItem;w:number;d:number;h:number}) {
  const {path,treads}=stairLayout(item.typeId,w,d,h),down=item.stairDirection==='down';
  const end=path[path.length-1],before=path[path.length-2],angle=Math.atan2(end.y-before.y,end.x-before.x)*180/Math.PI;
  const ink=down?'#fffefa':'#273c32',tip=Math.min(w,d)*.06;
  return <svg aria-hidden="true" viewBox={`${-w/2} ${-d/2} ${w} ${d}`} className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
    <rect x={-w/2} y={-d/2} width={w} height={d} fill={down?'#53635a':item.color??'#d9d0bf'}/>
    {treads.map((t,i)=><rect key={i} x={-t.width/2} y={-t.depth/2} width={t.width} height={t.depth} fill="none" stroke={ink} strokeWidth="1.5" vectorEffect="non-scaling-stroke" transform={`translate(${t.x} ${t.z}) rotate(${-t.angle*180/Math.PI})`}/>)}
    <polyline points={path.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke={ink} strokeWidth="2" vectorEffect="non-scaling-stroke"/>
    <path d={`M ${-tip} ${-tip} L 0 0 L ${-tip} ${tip}`} transform={`translate(${end.x} ${end.y}) rotate(${angle})`} fill="none" stroke={ink} strokeWidth="2" vectorEffect="non-scaling-stroke"/>
    <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fontSize={Math.min(w,d)*.23} fontWeight="600" fill={ink} stroke={down?'#53635a':'#d9d0bf'} strokeWidth="4" paintOrder="stroke">{down?'−1':'＋1'}</text>
  </svg>;
}
export function IslandPlan({item}: {item:PlacedItem}) {
  return <div className="absolute inset-0 pointer-events-none">
    <div className="absolute border border-black/20 rounded-sm" style={{left:'4%',right:'4%',top:'6%',bottom:item.typeId==='kit_island_seating'?'32%':'6%'}}/>
    {item.typeId==='kit_island_divider' && <div className="absolute left-[4%] right-[4%] top-[16%] border-t-4 border-slate-600" style={{borderStyle:item.dividerStyle==='slats'?'dashed':'solid',opacity:['glass','fluted'].includes(item.dividerStyle??'')?.5:1}}/>}
  </div>;
}
