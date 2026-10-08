import { useMemo } from 'react';
import * as THREE from 'three';
import type { PlacedItem } from '../types';
import { stairLayout } from '../utils/objectPack';

type Finish = { color:string; roughness:number; metalness:number; map?:THREE.Texture|null };
function Part({size,at,color,roughness=.65,metalness=0,glass=false,rotation=0,map}: {size:[number,number,number];at:[number,number,number];color:string;roughness?:number;metalness?:number;glass?:boolean;rotation?:number;map?:THREE.Texture|null}) {
  return <mesh position={at} rotation={[0,rotation,0]} castShadow={!glass} receiveShadow>
    <boxGeometry args={size.map(n=>Math.max(.01,n)) as [number,number,number]}/><meshStandardMaterial map={glass?null:map} color={color} roughness={glass ? .12 : roughness} metalness={glass ? .08 : metalness} transparent={glass} opacity={glass ? .23 : 1} depthWrite={!glass}/>
  </mesh>;
}
export function Island3D({item,w,h,d,...finish}: {item:PlacedItem;w:number;h:number;d:number}&Finish) {
  const seating=item.typeId==='kit_island_seating',divider=item.typeId==='kit_island_divider';
  const bodyDepth=d*(seating?.64:.9),bodyZ=seating?-d*.14:0;
  const slatCount=Math.max(3,Math.min(32,Math.round(w/10))),fluteCount=Math.min(48,Math.max(8,Math.round(w/4)));
  const dh=item.dividerHeight??60,style=item.dividerStyle??'solid',z=-d*.34;
  return <group>
    <Part size={[w*.88,h*.08,bodyDepth*.9]} at={[0,h*.04,bodyZ]} color="#514b44"/>
    <Part size={[w*.94,h*.86,bodyDepth]} at={[0,h*.51,bodyZ]} {...finish}/>
    <Part size={[w,h*.06,d]} at={[0,h*.97,0]} {...finish} roughness={Math.min(finish.roughness,.5)}/>
    {[0,1,2].map(i=><group key={i}>
      <Part size={[w*.302,h*.78,1]} at={[(i-1)*w*.31,h*.51,bodyZ+bodyDepth/2+.5]} {...finish}/>
      <Part size={[w*.08,1.4,2]} at={[(i-1)*w*.31,h*.8,bodyZ+bodyDepth/2+1.5]} color="#514b44"/>
    </group>)}
    {divider && <group>
      {style==='solid' && <Part size={[w*.94,dh,Math.min(8,d*.12)]} at={[0,h+dh/2,z]} {...finish}/>}
      {style==='slats' && Array.from({length:slatCount},(_,i)=><Part key={i} size={[w*.035,dh,Math.min(5,d*.08)]} at={[(i/(slatCount-1)-.5)*w*.9,h+dh/2,z]} {...finish}/>)}
      {(style==='glass'||style==='fluted') && <>
        <Part size={[w*.94,dh,1.2]} at={[0,h+dh/2,z]} color="#bcd9db" glass/>
        {style==='fluted' && Array.from({length:fluteCount},(_,i)=><Part key={i} size={[1,dh,1.8]} at={[(i/(fluteCount-1)-.5)*w*.92,h+dh/2,z]} color="#aac8cb" glass/>)}
        {[-1,1].map(x=><Part key={x} size={[2,dh,3]} at={[x*w*.47,h+dh/2,z]} {...finish}/>)}
        <Part size={[w*.96,2,3]} at={[0,h+1,z]} {...finish}/>
      </>}
      {style==='folding' && Array.from({length:6},(_,i)=><Part key={i} size={[w*.155,dh,2]} at={[(i-2.5)*w*.15,h+dh/2,z]} rotation={(i%2?1:-1)*Math.min(.35,Math.atan(d*.12/(w*.155)))} {...finish}/>)}
    </group>}
  </group>;
}

function Rail({from,to}: {from:THREE.Vector3;to:THREE.Vector3}) {
  const direction=new THREE.Vector3().subVectors(to,from),mid=from.clone().add(to).multiplyScalar(.5);
  const quaternion=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());
  return <mesh position={mid} quaternion={quaternion} castShadow><cylinderGeometry args={[2,2,direction.length(),8]}/><meshStandardMaterial color="#46534b" roughness={.5}/></mesh>;
}
export function Stairs3D({item,w,h,d,...finish}: {item:PlacedItem;w:number;h:number;d:number}&Finish) {
  const {flight,path,treads}=useMemo(()=>stairLayout(item.typeId,w,d,h),[item.typeId,w,d,h]);
  const down=item.stairDirection==='down',sign=down?-1:1;
  const landing=path[path.length-1];
  return <group>
    {treads.map((t,i)=>{
      const top=sign*t.y,bottom=down?-h-8:0,thickness=Math.max(2,top-bottom);
      return <group key={i} position={[t.x,0,t.z]} rotation={[0,t.angle,0]}>
        <Part size={[t.width,thickness,t.depth+.2]} at={[0,top-thickness/2,0]} {...finish}/>
        <Part size={[t.width,2,Math.min(3,t.depth)]} at={[0,top+1,-t.depth/2+1]} color="#e3dccf"/>
        {(item.stairRailings??true) && [-1,1].map(side=><Part key={side} size={[2,90,2]} at={[side*t.width*.47,top+45,0]} color="#46534b"/>)}
      </group>;
    })}
    <Part size={[flight,8,flight]} at={[landing.x,sign*h-4,landing.y]} {...finish}/>
    {(item.stairRailings??true) && treads.slice(1).flatMap((t,i)=>[-1,1].map(side=>{
      const a=treads[i],point=(v:typeof t)=>new THREE.Vector3(v.x+side*Math.cos(v.angle)*flight*.47,sign*v.y+90,v.z-side*Math.sin(v.angle)*flight*.47);
      return <Rail key={`${i}-${side}`} from={point(a)} to={point(t)}/>;
    }))}
    {down && <>
      {[-1,1].map(x=><Part key={x} size={[4,h,d]} at={[x*(w/2-2),-h/2,0]} color="#d9d8cf"/>)}
      {[-1,1].map(z=><Part key={z} size={[w-8,h,4]} at={[0,-h/2,z*(d/2-2)]} color="#d9d8cf"/>)}
      <Part size={[w,6,d]} at={[0,-h-5,0]} color="#a9a59b"/>
    </>}
  </group>;
}

export function GlazedOpening3D({item,w,h,d}: {item:PlacedItem;w:number;h:number;d:number}) {
  const door=item.typeId.startsWith('door_glass_'),double=item.typeId==='door_glass_double',sliding=item.typeId==='door_glass_sliding';
  const count=double||sliding?2:!door&&w>240?3:1;
  const frame=item.frameColor??'#46534b',bar=Math.max(.2,Math.min(4,w*.05,h*.05));
  const pane=w/count;
  return <group>
    {Array.from({length:count},(_,i)=>{
      const x=-w/2+pane*(i+.5),z=sliding?(i-.5)*d*.5:0;
      return <group key={i}>
        <Part size={[Math.max(.1,pane-bar*2),Math.max(.1,h-bar*2),Math.min(1,d*.2)]} at={[x,h/2,z]} color={item.color??'#c4e0e3'} glass/>
        {[-1,1].map(side=><Part key={side} size={[bar,h,Math.max(1,d*.65)]} at={[x+side*(pane/2-bar/2),h/2,z]} color={frame}/>)}
        {[bar/2,h-bar/2].map(y=><Part key={y} size={[pane,bar,d*.65]} at={[x,y,z]} color={frame}/>)}
        {door && <Part size={[bar*.6,Math.min(35,h*.2),2]} at={[x+pane*.35,h*.46,z+d*.4]} color={frame}/>}
      </group>;
    })}
    {sliding && <Part size={[w,bar,d]} at={[0,bar/2,0]} color={frame}/>}
  </group>;
}

export function PlatformSteps3D({count,w,h,d,...finish}:{count:number;w:number;h:number;d:number}&Finish) {
  return <group>{Array.from({length:count},(_,i)=>{
    const height=h*(i+1)/count;
    return <Part key={i} size={[w,height,d/count]} at={[0,height/2,-d/2+(i+.5)*d/count]} {...finish}/>;
  })}</group>;
}
