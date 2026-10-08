import type { PlacedItem } from '../types';
import { shojiLayout } from '../utils/shoji';

export function ShojiPlan({item,w,d}: {item:PlacedItem;w:number;d:number}) {
  const layout=shojiLayout(item,w,d),frame=item.frameColor??'#98704b';
  return <svg aria-label={`Sliding panel: ${item.panelState??'closed'}`} viewBox={`${-w/2} ${-d/2} ${w} ${d}`} className="absolute inset-0 w-full h-full overflow-visible">
    <rect x={-w/2} y={-d/2} width={w} height={d} fill="#fffefa" stroke={frame} strokeWidth="2"/>
    <path d={`M ${layout.trackCenter-layout.trackWidth/2} ${layout.z+3} h ${layout.trackWidth}`} stroke={frame} strokeWidth="2"/>
    {layout.leaves.map((leaf,i)=><rect key={i} x={leaf.x-leaf.width/2} y={layout.z-2} width={leaf.width} height="4" fill={item.panelMaterial==='woven'?'#c1a77e':'#eee5d4'} stroke={frame} strokeWidth="2"/>)}
  </svg>;
}

function Timber({size,at,color}: {size:[number,number,number];at:[number,number,number];color:string}) {
  return <mesh position={at} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.78}/></mesh>;
}

export function Shoji3D({item,w,h,d}: {item:PlacedItem;w:number;h:number;d:number}) {
  const layout=shojiLayout(item,w,d),frame=item.frameColor??'#98704b',woven=item.panelMaterial==='woven';
  const bar=Math.max(.1,Math.min(3,w/20,h/20)),leafDepth=Math.min(4,d*.4);
  return <group>
    {/* The jamb remains fixed: opening state never changes the wall cutout. */}
    {[-1,1].map(side=><Timber key={side} size={[bar,h,d]} at={[side*(w-bar)/2,h/2,0]} color={frame}/>)}
    {[bar/2,h-bar/2].map(y=><Timber key={y} size={[w,bar,d]} at={[0,y,0]} color={frame}/>)}
    <Timber size={[layout.trackWidth,bar,leafDepth+2]} at={[layout.trackCenter,h+bar/2,layout.z]} color={frame}/>
    {layout.leaves.map((leaf,i)=><group key={i} position={[leaf.x,0,layout.z]}>
      <mesh position={[0,h/2,0]} receiveShadow>
        <boxGeometry args={[leaf.width,h,Math.max(.1,leafDepth*.2)]}/>
        <meshStandardMaterial color={item.color??(woven?'#c1a77e':'#f4eddb')} roughness={.95} transparent={!woven} opacity={woven?1:.7} depthWrite={woven}/>
      </mesh>
      {[-1,1].map(side=><Timber key={side} size={[bar,h,leafDepth]} at={[side*(leaf.width-bar)/2,h/2,0]} color={frame}/>)}
      {Array.from({length:5},(_,j)=><Timber key={j} size={[leaf.width,bar,leafDepth]} at={[0,bar/2+(h-bar)*j/4,0]} color={frame}/>)}
      {[-1,0,1].map(column=><Timber key={column} size={[bar*.55,h,leafDepth*.8]} at={[column*leaf.width/4,h/2,0]} color={frame}/>)}
      {woven && Array.from({length:Math.min(50,Math.max(6,Math.round(h/5)))},(_,j)=><Timber key={`weave${j}`} size={[leaf.width,Math.min(.5,h*.005),leafDepth*.25]} at={[0,h*(j+.5)/Math.min(50,Math.max(6,Math.round(h/5))),leafDepth*.2]} color="#a58c68"/>)}
      <Timber size={[bar*.6,Math.min(14,h*.12),bar]} at={[i===0?leaf.width*.35:-leaf.width*.35,h*.48,leafDepth/2]} color="#534434"/>
    </group>)}
  </group>;
}
