import * as THREE from 'three';
import type { Point } from '../types';

const side = (p:Point,a:Point,b:Point) => (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
function clip(poly:Point[],a:Point,b:Point,inside:boolean) {
  const result:Point[]=[];
  for(let i=0;i<poly.length;i++) {
    const p=poly[i],q=poly[(i+1)%poly.length],sp=side(p,a,b),sq=side(q,a,b);
    const pin=inside?sp>=0:sp<=0,qin=inside?sq>=0:sq<=0;
    if(pin) result.push(p);
    if(pin!==qin) {const t=sp/(sp-sq);result.push({x:p.x+t*(q.x-p.x),y:p.y+t*(q.y-p.y)});}
  }
  return result;
}
// Subtract each convex opening from triangles. Unlike Shape.holes, this also
// handles rotated openings crossing floor edges and overlapping openings.
export function subtractOpening(poly:Point[],hole:Point[]):Point[][] {
  const outside:Point[][]=[];
  let remaining=poly;
  for(let i=0;i<hole.length&&remaining.length>=3;i++) {
    const a=hole[i],b=hole[(i+1)%hole.length];
    const piece=clip(remaining,a,b,false);
    if(piece.length>=3) outside.push(piece);
    remaining=clip(remaining,a,b,true);
  }
  return outside;
}
export function floorWithOpenings(points:Point[],holes:Point[][]) {
  const vertices=points.map(p=>new THREE.Vector2(p.x,p.y));
  let pieces=THREE.ShapeUtils.triangulateShape(vertices,[]).map(t=>t.map(i=>points[i]));
  for(const hole of holes) {
    const hx=hole.map(p=>p.x),hy=hole.map(p=>p.y),minX=Math.min(...hx),maxX=Math.max(...hx),minY=Math.min(...hy),maxY=Math.max(...hy);
    pieces=pieces.flatMap(poly=>poly.every(p=>p.x<minX)||poly.every(p=>p.x>maxX)||poly.every(p=>p.y<minY)||poly.every(p=>p.y>maxY)?[poly]:subtractOpening(poly,hole));
  }
  const positions:number[]=[],uvs:number[]=[];
  for(const poly of pieces) for(let i=1;i<poly.length-1;i++) {
    if(Math.abs(side(poly[i+1],poly[0],poly[i]))<1e-8) continue;
    for(const p of [poly[0],poly[i],poly[i+1]]) {positions.push(p.x,p.y,0);uvs.push(p.x/80,p.y/80);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.computeVertexNormals();
  return geometry;
}
