import type {PlacedItem} from '../types';
import {japaneseIslandLayout,islandPanel} from '../utils/japaneseIsland';
import {shojiLayout} from '../utils/shoji';
export function JapaneseIslandPlan({item}:{item:PlacedItem}) {
  const l=japaneseIslandLayout(item),panel=shojiLayout(islandPanel(item),l.panelWidth,5);
  return <svg viewBox={`${-l.w/2} ${-l.d/2} ${l.w} ${l.d}`} className="absolute inset-0 w-full h-full overflow-visible">
    <rect x={-l.w/2} y={-l.d/2} width={l.w} height={l.d} rx="3" fill={item.color??(item.tableFinish==='wood'?l.frame:'#e4ded3')} fillOpacity={item.tableFinish==='glass'?.4:1} stroke={l.frame} strokeWidth="2"/>
    {item.typeId!=='kit_japanese_divider'&&<path d={`M ${-l.w/2} ${l.d*.2} h ${l.w}`} stroke={l.frame} strokeDasharray="6 4" fill="none"/>}
    <path d={`M ${-l.panelWidth} ${l.panelZ} h ${l.panelWidth*2}`} stroke={l.frame} strokeWidth="2"/>
    {item.dividerStyle==='slats'?Array.from({length:l.slatCount},(_,i)=><rect key={i} x={-l.w*.44+i/(l.slatCount-1)*l.w*.88} y={l.panelZ-2} width="3" height="5" fill={l.frame}/>):panel.leaves.map((leaf,i)=><rect key={i} x={leaf.x-leaf.width/2} y={l.panelZ+panel.z-2} width={leaf.width} height="5" fill={item.panelMaterial==='woven'?'#c1a77e':'#f4eddb'} stroke={l.frame} strokeWidth="2"/>)}
    {item.typeId==='kit_japanese_complete'&&l.stools.map((stool,i)=><ellipse key={i} cx={stool.x} cy={stool.z} rx={stool.width/2} ry={stool.width*.46} fill={l.frame} stroke="#534434" strokeWidth="2"/>)}
  </svg>;
}
