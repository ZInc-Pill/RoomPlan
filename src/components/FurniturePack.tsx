import { Edges } from '@react-three/drei';
import { ITEM_CATALOG } from '../catalog';
import type { PlacedItem } from '../types';
import { isSeat,isTV,isCoffee,isRailing,seatLevel,railingLayout } from '../utils/furniturePack';

type Props={item:PlacedItem;w:number;h:number;d:number};
function Box({size,at,color,glass=false,round=false,roughness=.7}:{size:[number,number,number];at:[number,number,number];color:string;glass?:boolean;round?:boolean;roughness?:number}) {
  return <mesh position={at} scale={round?[size[0],size[1],size[2]]:undefined} castShadow={!glass} receiveShadow>
    {round?<cylinderGeometry args={[.5,.5,1,24]}/>:<boxGeometry args={size.map(n=>Math.max(.01,n)) as [number,number,number]}/>}
    <meshStandardMaterial color={color} roughness={glass?.12:roughness} transparent={glass} opacity={glass?.3:1} depthWrite={!glass}/>
    {glass&&<Edges threshold={25} color="#7faaa8"/>}
  </mesh>;
}
export function FurniturePack3D({item,w,h,d}:Props) {
  const frame=item.frameColor??(item.typeId==='chair_wood'?'#94704e':'#454b47');
  if(isSeat(item)) {
    const wood=item.seatMaterial?item.seatMaterial==='wood':['chair_wood','stool_backless','chair_modern'].includes(item.typeId);
    const seat=seatLevel(item,h),thick=Math.min(wood?3:7,seat*.12),back=h-seat,round=item.typeId==='stool_backless';
    const color=item.color??ITEM_CATALOG.find(t=>t.id===item.typeId)!.color,modern=item.typeId==='chair_modern';
    return <group>
      {[-1,1].flatMap(x=>[-1,1].map(z=><Box key={`${x}${z}`} size={[w*.065,seat-thick,d*.065]} at={[x*w*.36,(seat-thick)/2,z*d*.34]} color={frame}/>))}
      <Box size={[w,thick,d*.92]} at={[0,seat-thick/2,0]} color={color} round={round} roughness={item.seatMaterial==='leather'?.45:.8}/>
      {back>1&&item.typeId!=='stool_backless'&&<>
        {[-1,1].map(x=><Box key={x} size={[w*.065,back,d*.065]} at={[x*w*.36,seat+back/2,-d*.4]} color={frame}/>)}
        {item.typeId==='chair_wood'?<>
          <Box size={[w,back*.2,d*.07]} at={[0,h-back*.1,-d*.4]} color={frame}/>
          {[-1,0,1].map(x=><Box key={x} size={[w*.08,back*.8,d*.05]} at={[x*w*.22,seat+back*.4,-d*.4]} color={frame}/>)}
        </>:<Box size={[w*(modern?.92:1),back*.8,d*.12]} at={[0,seat+back*.6,-d*.4]} color={color} roughness={item.seatMaterial==='leather'?.45:.8}/>}
      </>}
      {item.typeId.startsWith('stool_')&&<>
        {[-1,1].map(z=><Box key={z} size={[w*.78,2,2]} at={[0,seat*.36,z*d*.34]} color={frame}/>)}
        {[-1,1].map(x=><Box key={x} size={[2,2,d*.7]} at={[x*w*.36,seat*.36,0]} color={frame}/>)}
      </>}
    </group>;
  }
  if(isTV(item)) {
    const stand=item.typeId==='tv_tabletop',screenH=h*(stand?.88:1),bottom=h-screenH,thin=Math.min(4,d*.22),bezel=Math.min(w,h)*.014,screenZ=stand?0:(d-thin)/2;
    return <group>
      <Box size={[w,screenH,thin]} at={[0,bottom+screenH/2,screenZ]} color="#202523" roughness={.4}/>
      <Box size={[w-bezel*2,screenH-bezel*2,.2]} at={[0,bottom+screenH/2,screenZ+thin/2+.15]} color="#11191c" roughness={.35}/>
      {stand?[-1,1].map(x=><group key={x}>
        <Box size={[w*.035,bottom,d*.15]} at={[x*w*.3,bottom/2,0]} color="#303632"/>
        <Box size={[w*.17,Math.min(2,h*.025),d]} at={[x*w*.3,Math.min(1,h*.0125),0]} color="#303632"/>
      </group>):<Box size={[w*.35,screenH*.3,Math.max(.1,d-thin)]} at={[0,h/2,-thin/2]} color="#303632"/>}
    </group>;
  }
  if(isCoffee(item)) {
    const finish=item.tableFinish??'wood',top=Math.min(5,h*.12),round=item.typeId!=='coffee_rect';
    const color=item.color??(finish==='glass'?'#c5dad8':finish==='stone'?'#dedbd2':'#bd9b73');
    return <group>
      {[-1,1].flatMap(x=>[-1,1].map(z=><Box key={`${x}${z}`} size={[w*.055,h-top,d*.07]} at={[x*w*(round?.27:.38),(h-top)/2,z*d*(round?.27:.36)]} color={item.legColor??'#5d5143'}/>))}
      <Box size={[w,top,d]} at={[0,h-top/2,0]} color={color} round={round} glass={finish==='glass'} roughness={finish==='stone'?.45:.75}/>
    </group>;
  }
  if(isRailing(item)) return <Railing3D {...{item,w,h,d}}/>;
  return null;
}

function Railing3D({item,w,h,d}:Props) {
  const {posts,bays}=railingLayout(item,w,d),style=item.railingStyle??'metal';
  const color=item.frameColor??item.color??(style==='wood'?'#a7825d':'#505954');
  const thickness=Math.min(5,h*.08,item.typeId==='bal_railing'?d:4),post=Math.max(.1,thickness);
  return <group>
    {posts.map((p,i)=><Box key={i} size={[post,h,post]} at={[p.x,h/2,p.y]} color={color}/>)}
    {bays.map((bay,i)=><group key={i} position={[(bay.a.x+bay.b.x)/2,0,(bay.a.y+bay.b.y)/2]} rotation={[0,-bay.angle,0]}>
      <Box size={[bay.length,post,post]} at={[0,h-post/2,0]} color={color}/>
      {style==='glass'?<Box size={[Math.max(.1,bay.length-post-2),h*.78,Math.min(1,post*.5)]} at={[0,h*.49,0]} color="#c6d9d9" glass/>:<>
        <Box size={[bay.length,Math.min(2,post),post*.7]} at={[0,h*.1,0]} color={color}/>
        {Array.from({length:Math.min(20,Math.max(1,Math.ceil(bay.length/(style==='wood'?10:12))-1))},(_,j)=>{
          const count=Math.min(20,Math.max(1,Math.ceil(bay.length/(style==='wood'?10:12))-1));
          return <Box key={j} size={[Math.min(style==='wood'?4:1.2,bay.length/(count+1)*.5),h*.82,post*.5]} at={[-bay.length/2+bay.length*(j+1)/(count+1),h*.51,0]} color={color}/>;
        })}
      </>}
    </group>)}
  </group>;
}
