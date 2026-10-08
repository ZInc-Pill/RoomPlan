import type { Floor, Point, PlacedItem } from '../types';
import { ITEM_CATALOG } from '../catalog';
import { isStair, stairOpening } from './objectPack';
import { cmToPx } from './coordinates';

export const isDownStair = (item: PlacedItem) => isStair(item) && item.stairDirection === 'down';
// Derived from the same footprint as 3D; never stored as a second document entity.
export function downStairPlan(item: PlacedItem) {
  const type = ITEM_CATALOG.find(t => t.id === item.typeId)!;
  const w = item.width ?? type.width, d = item.depth ?? type.depth;
  return { w, d, h: item.height ?? type.height, width: cmToPx(w), depth: cmToPx(d),
    points: stairOpening(item)!.map(p => `${p.x},${p.y}`).join(' '),
    transform: `translate(${item.x} ${item.y}) rotate(${item.rotation * 180 / Math.PI})` };
}

function contains(poly:Point[],p:Point) {
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const a=poly[i],b=poly[j];
    if((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) inside=!inside;
  }
  return inside;
}
function overlaps(a:Point[],b:Point[]) {
  if(a.some(p=>contains(b,p))||b.some(p=>contains(a,p)))return true;
  const side=(p:Point,q:Point,r:Point)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  return a.some((p,i)=>b.some((r,j)=>{
    const q=a[(i+1)%a.length],s=b[(j+1)%b.length];
    return side(p,q,r)*side(p,q,s)<0 && side(r,s,p)*side(r,s,q)<0;
  }));
}
// Floor array order is the saved paint order. Only the first intersecting surface
// owns an opening; subsequent surfaces are covers, including after corner edits.
export function stairFloorOwners(items:PlacedItem[],floors:Floor[]) {
  return new Map(items.filter(isDownStair).map(item=>[item.id,
    floors.find(f=>overlaps(f.points,stairOpening(item)!))?.id]));
}
