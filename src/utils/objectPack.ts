import { ITEM_CATALOG } from '../catalog';
import type { PlacedItem, Point } from '../types';
import { cmToPx } from './coordinates';

export const DIVIDER_STYLES = { solid: 'Solid half-height panel', slats: 'Vertical wooden slats', glass: 'Clear glass', fluted: 'Fluted glass', folding: 'Folding rigid panels' } as const;
export const isStair = (item: PlacedItem) => ['stairs_straight', 'stairs_l', 'stairs_u'].includes(item.typeId);
export const isGlassDoor = (item: PlacedItem) => item.typeId.startsWith('door_glass_');
export function packProperties(value: Record<string, unknown>): Partial<PlacedItem> {
  const result: Partial<PlacedItem> = {};
  if (value.dividerStyle !== undefined) {
    if (typeof value.dividerStyle !== 'string' || !Object.hasOwn(DIVIDER_STYLES, value.dividerStyle)) throw new Error('Invalid divider style.');
    result.dividerStyle = value.dividerStyle as PlacedItem['dividerStyle'];
  }
  if (value.dividerHeight !== undefined) {
    if (typeof value.dividerHeight !== 'number' || !Number.isFinite(value.dividerHeight) || value.dividerHeight < 1 || value.dividerHeight > 300) throw new Error('Invalid divider height.');
    result.dividerHeight = value.dividerHeight;
  }
  if (value.stairDirection !== undefined) {
    if (!['up', 'down'].includes(value.stairDirection as string)) throw new Error('Invalid stair direction.');
    result.stairDirection = value.stairDirection as 'up' | 'down';
  }
  if (value.stairRailings !== undefined) {
    if (typeof value.stairRailings !== 'boolean') throw new Error('Invalid stair railings.');
    result.stairRailings = value.stairRailings;
  }
  for (const key of ['frameColor','legColor'] as const) if (value[key] !== undefined) {
    if (typeof value[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(value[key] as string)) throw new Error('Invalid frame color.');
    result[key] = value[key] as string;
  }
  for (const [key,allowed] of [['seatMaterial',['wood','fabric','leather']],['tableFinish',['wood','glass','stone']],['railingStyle',['metal','glass','wood']],['panelState',['closed','half','open']],['panelMaterial',['paper','woven']]] as const) {
    if(value[key] !== undefined) {
      if(typeof value[key] !== 'string' || !(allowed as readonly string[]).includes(value[key] as string)) throw new Error('Invalid sliding panel option.');
      Object.assign(result,{[key]:value[key]});
    }
  }
  if(value.seatHeight !== undefined) {
    if(typeof value.seatHeight !== 'number'||!Number.isFinite(value.seatHeight)||value.seatHeight<1||value.seatHeight>300) throw new Error('Invalid seat height.');
    result.seatHeight=value.seatHeight;
  }
  return result;
}

export function stairOpening(item: PlacedItem): Point[] | null {
  if (!isStair(item) || item.stairDirection !== 'down') return null;
  const type = ITEM_CATALOG.find(t => t.id === item.typeId)!;
  const w = cmToPx(item.width ?? type.width), d = cmToPx(item.depth ?? type.depth);
  const c = Math.cos(item.rotation), s = Math.sin(item.rotation);
  return [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,y])=>({x:item.x+x*c-y*s,y:item.y+x*s+y*c}));
}

// Stair paths and all geometry are local to the owning item, in centimetres.
export function stairLayout(typeId: string, w: number, d: number, rise: number) {
  const flight = typeId === 'stairs_straight' ? w * .84 : Math.min(w * (typeId === 'stairs_u' ? .40 : .34), d * .34);
  const near = -d/2 + flight/2, far = d/2 - flight/2;
  const left = -w/2 + flight/2, right = w/2 - flight/2;
  const path: Point[] = typeId === 'stairs_l' ? [{x:left,y:near},{x:left,y:far},{x:right,y:far}]
    : typeId === 'stairs_u' ? [{x:left,y:near},{x:left,y:far},{x:right,y:far},{x:right,y:near}]
    : [{x:0,y:-d/2},{x:0,y:far}];
  const lengths = path.slice(1).map((p,i)=>Math.hypot(p.x-path[i].x,p.y-path[i].y));
  const total = lengths.reduce((a,b)=>a+b,0);
  const count = Math.max(4,Math.min(32,Math.ceil(rise/18)));
  let travelled=0;
  const treads: {x:number;z:number;y:number;width:number;depth:number;angle:number}[]=[];
  lengths.forEach((length,i)=>{
    const n=Math.max(1,Math.round(count*length/total));
    for(let j=0;j<n;j++) {
      const t=(j+.5)/n, a=path[i], b=path[i+1];
      treads.push({x:a.x+(b.x-a.x)*t,z:a.y+(b.y-a.y)*t,y:rise*(travelled+length*(j+1)/n)/total,width:flight,depth:length/n,angle:Math.atan2(b.x-a.x,b.y-a.y)});
    }
    travelled+=length;
  });
  return {flight,path,treads};
}
