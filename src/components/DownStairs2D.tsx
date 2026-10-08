import type React from 'react';
import type { PlacedItem } from '../types';
import { downStairPlan, isDownStair } from '../utils/downStairs2D';
import { StairPlan } from './ObjectPack2D';

export function StairFloorMask({items,id}: {items: PlacedItem[];id:string}) {
  return <defs><mask id={id} maskUnits="objectBoundingBox" x="-0.01" y="-0.01" width="1.02" height="1.02" style={{maskType:'luminance'}}>
    <rect x="-1000000" y="-1000000" width="2000000" height="2000000" fill="white"/>
    {/* Black polygons form a union, including when two openings overlap. */}
    {items.filter(isDownStair).map(item => <polygon key={item.id} points={downStairPlan(item).points} fill="black"/>)}
  </mask></defs>;
}
export function DownStairDrawing({items}: {items: PlacedItem[]}) {
  return <g data-layer="underground-stairs" pointerEvents="none">{items.filter(isDownStair).map(item => {
    const p = downStairPlan(item);
    return <g key={item.id} transform={p.transform}>
      <svg x={-p.width/2} y={-p.depth/2} width={p.width} height={p.depth} overflow="hidden">
        <StairPlan item={item} w={p.w} d={p.d} h={p.h}/>
      </svg>
    </g>;
  })}</g>;
}
// Targets follow floors (SVG masks do not remove their hit areas), but precede walls.
// This preserves gesture ownership and stops selection from raising solid geometry.
export function DownStairTargets({items,selected,mobile,enabled,onDown}: {
  items:PlacedItem[];selected:string[];mobile:boolean;enabled:boolean;
  onDown:(event:React.PointerEvent,item:PlacedItem)=>void;
}) {
  return <g data-layer="stair-opening-targets">{items.filter(isDownStair).map(item => {
    const p=downStairPlan(item);
    return <polygon key={item.id} points={p.points} data-scene-entity="object"
      data-stair-opening={item.id} data-mobile-drag-object={mobile&&enabled?'':undefined}
      onPointerDown={e=>onDown(e,item)} fill="transparent"
      stroke={selected.includes(item.id)?'#186454':'none'} strokeWidth={2} vectorEffect="non-scaling-stroke"
      style={{pointerEvents:enabled?'all':'none',touchAction:'none',cursor:'grab'}}/>;
  })}</g>;
}
