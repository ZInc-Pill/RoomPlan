import type {PlacedItem} from '../types';
import {ITEM_CATALOG} from '../catalog';
import {isStairSymbol,platformCount} from '../utils/smallStairs';
import {stairLayout} from '../utils/objectPack';
export function SmallStairsPlan({item}:{item:PlacedItem}) {
  const type=ITEM_CATALOG.find(t=>t.id===item.typeId)!;
  const w=item.width??type.width,d=item.depth??type.depth,color=item.color??type.color;
  const symbol=isStairSymbol(item),count=platformCount(item);
  const {path,treads}=stairLayout(item.typeId.replace('stair_symbol_','stairs_'),w,d,180);
  const end=path[path.length-1],prev=path[path.length-2];
  return <svg aria-hidden="true" viewBox={`${-w/2} ${-d/2} ${w} ${d}`} className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
    {symbol?<g fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke">
      {treads.map((t,i)=><rect key={i} x={-t.width/2} y={-t.depth/2} width={t.width} height={t.depth} transform={`translate(${t.x} ${t.z}) rotate(${-t.angle*180/Math.PI})`}/>)}
      <polyline points={path.map(p=>`${p.x},${p.y}`).join(' ')}/>
      <path d="M -14 -10 L 0 0 L -14 10" transform={`translate(${end.x} ${end.y}) rotate(${Math.atan2(end.y-prev.y,end.x-prev.x)*180/Math.PI})`}/>
      <text x="0" y="0" transform={w<d/2?'rotate(90)':undefined} textAnchor="middle" dominantBaseline="central" fill={color} stroke="#fffefa" strokeWidth="5" paintOrder="stroke" fontSize={Math.min(Math.max(w,d)*.10,Math.min(w,d)*.3)} fontWeight="600">{item.stairDirection==='down'?'DOWN −1':'UP +1'}</text>
    </g>:<g fill={color} stroke="#475569" strokeWidth="1.5" vectorEffect="non-scaling-stroke">
      {Array.from({length:count},(_,i)=><rect key={i} x={-w/2} y={-d/2+i*d/count} width={w} height={d/count}/>)}
    </g>}
  </svg>;
}
