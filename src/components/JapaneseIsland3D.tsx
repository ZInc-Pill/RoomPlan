import type {PlacedItem} from '../types';
import {japaneseIslandLayout,islandPanel} from '../utils/japaneseIsland';
import {Shoji3D} from './ShojiPanels';
import {FurniturePack3D} from './FurniturePack';
function Box({size,at,color,glass=false}:{size:[number,number,number];at:[number,number,number];color:string;glass?:boolean}) {
  return <mesh position={at} castShadow={!glass} receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={glass?.12:.7} transparent={glass} opacity={glass?.35:1} depthWrite={!glass}/></mesh>;
}
export function JapaneseIsland3D({item}:{item:PlacedItem}) {
  const l=japaneseIslandLayout(item),seating=item.typeId!=='kit_japanese_divider',bodyDepth=l.d*(seating?.65:.92),bodyZ=seating?-l.d*.15:0;
  return <group>
    <Box size={[l.w*.92,l.h*.94,bodyDepth]} at={[0,l.h*.47,bodyZ]} color={l.frame}/>
    <Box size={[l.w,l.h*.06,l.d]} at={[0,l.h*.97,0]} color={item.color??(item.tableFinish==='wood'?l.frame:'#e4ded3')} glass={item.tableFinish==='glass'}/>
    <group position={[0,l.h,l.panelZ]}>
      {item.dividerStyle==='slats'?Array.from({length:l.slatCount},(_,i)=><Box key={i} size={[3,l.dividerHeight,5]} at={[-l.w*.44+i/(l.slatCount-1)*l.w*.88,l.dividerHeight/2,0]} color={l.frame}/>):<Shoji3D item={islandPanel(item)} w={l.panelWidth} h={l.dividerHeight} d={5}/>}
    </group>
    {item.typeId==='kit_japanese_complete'&&l.stools.map((stool,i)=><group key={i} position={[stool.x,0,stool.z]}><FurniturePack3D item={{...item,typeId:'stool_backless',seatHeight:stool.height,seatMaterial:'wood',frameColor:l.frame,color:l.frame}} w={stool.width} d={stool.width} h={stool.height}/></group>)}
  </group>;
}
