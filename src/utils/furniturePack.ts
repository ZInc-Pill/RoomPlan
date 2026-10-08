import type { PlacedItem, Point } from '../types';
export const isSeat=(item:PlacedItem)=>item.typeId.startsWith('chair_')||item.typeId.startsWith('stool_');
export const isTV=(item:PlacedItem)=>item.typeId.startsWith('tv_');
export const isCoffee=(item:PlacedItem)=>item.typeId.startsWith('coffee_');
export const isRailing=(item:PlacedItem)=>['bal_railing','bal_corner_railing'].includes(item.typeId);
export const seatLevel=(item:PlacedItem,height:number)=>Math.min(height,Math.max(1,item.seatHeight??(item.typeId.startsWith('stool_')?75:45)));
export const screenInches=(item:PlacedItem,width:number)=>width*Math.sqrt(1+9*9/(16*16))/2.54;
export function resizeScreen(item:PlacedItem,inches:number) {
  const width=inches*2.54/Math.sqrt(1+9*9/(16*16));
  return {width:Math.round(width*10)/10,height:Math.round(width*9/16/(item.typeId==='tv_tabletop'?.88:1)*10)/10};
}
/** Same centerlines as existing endpoint editing, including a single corner joint. */
export function railingLayout(item:PlacedItem,w:number,d:number) {
  const paths:Point[][]=item.typeId==='bal_corner_railing'
    ? [[{x:-w/2,y:-d/2},{x:w/2,y:-d/2}],[{x:-w/2,y:-d/2},{x:-w/2,y:d/2}]]
    : [[{x:-w/2,y:0},{x:w/2,y:0}]];
  const posts:Point[]=[],bays:{a:Point;b:Point;length:number;angle:number}[]=[];
  for(const [start,end] of paths) {
    const length=Math.hypot(end.x-start.x,end.y-start.y),count=Math.min(32,Math.max(1,Math.ceil(length/90)));
    const point=(i:number)=>({x:start.x+(end.x-start.x)*i/count,y:start.y+(end.y-start.y)*i/count});
    for(let i=0;i<=count;i++) {const p=point(i);if(!posts.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<1e-6))posts.push(p);}
    for(let i=0;i<count;i++)bays.push({a:point(i),b:point(i+1),length:length/count,angle:Math.atan2(end.y-start.y,end.x-start.x)});
  }
  return {paths,posts,bays};
}
