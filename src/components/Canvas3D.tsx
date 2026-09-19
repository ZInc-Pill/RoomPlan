import { getProceduralTexture } from '../utils/proceduralTextures';
import { KitchenFixtures, KITCHEN_FIXTURE_IDS } from './KitchenFixtures';
import { CaseFurniture, CASE_FURNITURE_IDS } from './CaseFurniture';
import { UpholsteredFurniture } from './UpholsteredFurniture';
import React, { useMemo, useState, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Edges, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Wall, PlacedItem, Floor, CommentType } from '../types';
import { ITEM_CATALOG } from '../catalog';
import { getWallSegments, getWallHoles } from '../utils/wallUtils';
import { cmToPx } from '../utils/coordinates';
import { isInteractiveElement } from '../utils/input';
import { 
  getFloorMaterial, 
  getWallMaterial, 
  getItemFinish, 

  FLOOR_MATERIALS, 
  WALL_MATERIALS, 
  ITEM_FINISHES 
} from '../materials';
import { 
  RotateCw, 
  RotateCcw, 
  Copy, 
  Trash2, 
  Sliders, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Eye, 
  Grid, 
  Maximize2, 
  RefreshCw,
  X,
  Box,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Layers,
  Magnet,
  Move
} from 'lucide-react';
import { BlenderMoveGizmo } from './BlenderMoveGizmo';
import { UniversalJoystick } from './UniversalJoystick';

const MinimalStyleContext = createContext(true);

interface Canvas3DProps {
  interactionBlocked?: boolean;
  walls: Wall[];
  floors: Floor[];
  items: PlacedItem[];
  comments?: CommentType[];
  selectedItemIds: string[];
  selectedWallId: string | null;
  selectedFloorId: string | null;
  onSelect: (itemIds: string[], wallId: string | null, floorId: string | null, commentId: string | null) => void;
  onUpdateItem: (id: string, updates: Partial<PlacedItem>) => void;
  onUpdateWall: (id: string, updates: Partial<Wall>) => void;
  onUpdateFloor: (id: string, updates: Partial<Floor>) => void;
  onDeleteItem: () => void;
  onDeleteWall: () => void;
  onDeleteFloor?: () => void;
  onDuplicate: () => void;
  onRotate: (delta?: number) => void;
  onElevate?: (deltaCm: number) => void;
  onOpenInspector?: () => void;
  cameraPreset?: 'perspective' | 'top' | 'isometric';
  onCameraPresetChange?: (preset: 'perspective' | 'top' | 'isometric') => void;
  focusTarget?: [number, number, number] | null;
  onFocusTargetChange?: (target: [number, number, number] | null) => void;
  isMobile?: boolean;
}

const WALL_COLOR_PRESETS = [
  { name: 'Pure White', color: '#f8fafc' },
  { name: 'Warm Cream', color: '#fef3c7' },
  { name: 'Light Concrete', color: '#e2e8f0' },
  { name: 'Classic Gray', color: '#cbd5e1' },
  { name: 'Navy Accent', color: '#334155' },
  { name: 'Terracotta', color: '#ffedd5' },
];

function Floor3D({ 
  floor, 
  isSelected, 
  onSelect,
  onDelete,
  onDuplicate
}: { 
  floor: Floor; 
  isSelected: boolean; 
  onSelect: () => void; 
  onDelete?: () => void;
  onDuplicate?: () => void;
}) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (floor.points.length > 0) {
      s.moveTo(floor.points[0].x, floor.points[0].y);
      for (let i = 1; i < floor.points.length; i++) {
        s.lineTo(floor.points[i].x, floor.points[i].y);
      }
      s.closePath();
    }
    return s;
  }, [floor]);

  const centroid = useMemo(() => {
    if (floor.points.length === 0) return { x: 0, z: 0 };
    const cx = floor.points.reduce((sum, p) => sum + p.x, 0) / floor.points.length;
    const cz = floor.points.reduce((sum, p) => sum + p.y, 0) / floor.points.length;
    return { x: cx, z: cz };
  }, [floor.points]);

  const areaM2 = useMemo(() => {
    if (floor.points.length < 3) return 0;
    let a = 0;
    for (let i = 0; i < floor.points.length; i++) {
      const j = (i + 1) % floor.points.length;
      a += floor.points[i].x * floor.points[j].y;
      a -= floor.points[j].x * floor.points[i].y;
    }
    return Math.abs(a / 2) / 1600;
  }, [floor.points]);

  const minimalStyle = useContext(MinimalStyleContext);
  const matDef = useMemo(() => getFloorMaterial(floor.material), [floor.material]);
  const texture = useMemo(() => !minimalStyle && floor.material ? getProceduralTexture(floor.material) : null, [floor.material, minimalStyle]);

  const floorGeometry = useMemo(() => {
    const geom = new THREE.ShapeGeometry(shape);
    const pos = geom.attributes.position;
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      // 80 units = 200cm = 2 meters for true-to-scale tile/plank repeats
      uvs[i * 2] = pos.getX(i) / 80;
      uvs[i * 2 + 1] = pos.getY(i) / 80;
    }
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    return geom;
  }, [shape]);

  return (
    <group>
      <mesh 
        geometry={floorGeometry}
        position={[0, 0.1, 0]} 
        rotation={[Math.PI / 2, 0, 0]} 
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <meshStandardMaterial 
          color={texture ? '#ffffff' : (floor.material ? matDef.color : floor.color || '#e7e5e0')}
          map={texture}
          roughness={matDef.roughness} 
          metalness={matDef.metalness}
          side={THREE.DoubleSide} 
          emissive={isSelected ? '#6366f1' : '#000000'}
          emissiveIntensity={isSelected ? 0.25 : 0}
        />
      </mesh>
      {isSelected && (
        <mesh geometry={floorGeometry} position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color="#4f46e5" wireframe transparent opacity={0.65} />
        </mesh>
      )}

      {/* Direct in-scene 3D Badge for Selected Floor */}
      {isSelected && floor.points.length >= 3 && (
        <Html position={[centroid.x, 6, centroid.z]} center zIndexRange={[100, 0]}>
          <div className="flex flex-col items-center pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900/95 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-2xl border border-slate-700/80 flex items-center gap-2 whitespace-nowrap text-xs">
              <span className="font-bold text-white">Floor</span>
              <span className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                {areaM2.toFixed(1)} m²
              </span>

              <div className="hidden sm:flex items-center gap-1.5">
                {onDuplicate && (
                  <>
                    <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate();
                      }}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white active:scale-90 transition-all cursor-pointer"
                      title="Duplicate Floor"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                {onDelete && (
                  <>
                    <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="p-1 rounded-lg bg-rose-900/40 hover:bg-rose-800/80 text-rose-300 hover:text-white active:scale-90 transition-all cursor-pointer"
                      title="Delete Floor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="w-2 h-2 rotate-45 bg-slate-900 border-r border-b border-slate-700 -mt-1" />
          </div>
        </Html>
      )}
    </group>
  );
}

function Wall3D({ 
  wall, 
  items,
  isSelected,
  isHovered,
  opacity: targetOpacity = 1.0,
  onSelect,
  onHover,
  onDelete,
  onUpdateThickness,
  onUpdateHeight
}: { 
  wall: Wall; 
  items: PlacedItem[];
  isSelected: boolean;
  isHovered: boolean;
  opacity?: number;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  onDelete?: () => void;
  onUpdateThickness?: (deltaCm: number) => void;
  onUpdateHeight?: (deltaH: number) => void;
}) {
  const segments = getWallSegments(wall, items);
  const holes = getWallHoles(wall, items);
  const wallHeight = wall.height || 150;
  const wallThickness = Math.max(4, Number.isFinite(wall.thickness) ? wall.thickness : 8);

  const minimalStyle = useContext(MinimalStyleContext);
  const matDef = useMemo(() => getWallMaterial(wall.material), [wall.material]);
  const wallTexture = useMemo(() => !minimalStyle && wall.material ? getProceduralTexture(wall.material) : null, [wall.material, minimalStyle]);
  const wallColor = wall.color || matDef.color || '#e5e7eb';

  // Smooth Opacity Interpolation
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const currentOpacityRef = useRef(isSelected ? Math.max(targetOpacity, 0.85) : targetOpacity);
  const [isTransparent, setIsTransparent] = useState(currentOpacityRef.current < 0.98);

  const setMatRef = useCallback((m: THREE.MeshStandardMaterial | null) => {
    if (m && !materialsRef.current.includes(m)) materialsRef.current.push(m);
  }, []);

  useFrame((_, delta) => {
    const goal = isSelected ? Math.max(targetOpacity, 0.85) : targetOpacity;
    const diff = goal - currentOpacityRef.current;

    if (Math.abs(diff) > 0.002) {
      currentOpacityRef.current += diff * (delta * 6.0); // smooth damping
      const eff = currentOpacityRef.current;
      const newIsTrans = eff < 0.98;
      const newDepthW = eff > 0.65;

      if (newIsTrans !== isTransparent) {
        setIsTransparent(newIsTrans); // Re-render to update Edge colors at threshold crossing
      }

      materialsRef.current.forEach(mat => {
        if (!mat) return;
        mat.opacity = eff;
        let needsUpdate = false;
        if (mat.transparent !== newIsTrans) { mat.transparent = newIsTrans; needsUpdate = true; }
        if (mat.depthWrite !== newDepthW) { mat.depthWrite = newDepthW; needsUpdate = true; }
        if (needsUpdate) mat.needsUpdate = true;
      });
    }
  });

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Solid vertical segments */}
      {segments.map((seg, i) => {
        const dx = seg.end.x - seg.start.x;
        const dy = seg.end.y - seg.start.y;
        const length = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const centerX = (seg.start.x + seg.end.x) / 2;
        const centerY = (seg.start.y + seg.end.y) / 2;

        return (
          <mesh 
            key={`seg-${i}`}
            position={[centerX, wallHeight / 2, centerY]} 
            rotation={[0, -angle, 0]}
            castShadow={currentOpacityRef.current > 0.45}
            receiveShadow
          >
            <boxGeometry args={[length, wallHeight, wallThickness]} />
            <meshStandardMaterial 
              ref={setMatRef}
              color={wallTexture ? '#ffffff' : wallColor} 
              map={wallTexture}
              roughness={matDef.roughness} 
              metalness={matDef.metalness}
              emissive={isSelected ? '#4f46e5' : isHovered ? '#818cf8' : '#000000'}
              emissiveIntensity={isSelected ? 0.35 : isHovered ? 0.15 : 0}
              transparent={isTransparent}
              opacity={currentOpacityRef.current}
              depthWrite={currentOpacityRef.current > 0.65}
            />
            <Edges 
              scale={1.002} 
              threshold={15} 
              color={isSelected ? '#4f46e5' : isHovered ? '#818cf8' : isTransparent ? '#94a3b8' : '#cbd5e1'} 
            />
          </mesh>
        );
      })}

      {/* Lintels and Sills */}
      {holes.map((hole, i) => {
        const typeInfo = ITEM_CATALOG.find(cat => cat.id === hole.item.typeId);
        if (!typeInfo) return null;

        const hItem = cmToPx(hole.item.height || typeInfo.height);
        const elevItem = cmToPx(hole.item.elevation || 0);

        const wx = wall.end.x - wall.start.x;
        const wy = wall.end.y - wall.start.y;

        const startX = wall.start.x + wx * hole.t1;
        const startY = wall.start.y + wy * hole.t1;
        const endX = wall.start.x + wx * hole.t2;
        const endY = wall.start.y + wy * hole.t2;

        const length = Math.hypot(endX - startX, endY - startY);
        const angle = Math.atan2(wy, wx);
        const centerX = (startX + endX) / 2;
        const centerZ = (startY + endY) / 2;

        return (
          <group key={`hole-${i}`}>
            {elevItem + hItem < wallHeight && (
              <mesh
                position={[centerX, (elevItem + hItem + wallHeight) / 2, centerZ]}
                rotation={[0, -angle, 0]}
                castShadow={currentOpacityRef.current > 0.45}
                receiveShadow
              >
                <boxGeometry args={[length, wallHeight - (elevItem + hItem), wallThickness]} />
                <meshStandardMaterial 
                  ref={setMatRef}
                  color={wallTexture ? '#ffffff' : wallColor} 
                  map={wallTexture}
                  roughness={matDef.roughness} 
                  metalness={matDef.metalness}
                  emissive={isSelected ? '#4f46e5' : '#000000'}
                  emissiveIntensity={isSelected ? 0.25 : 0}
                  transparent={isTransparent}
                  opacity={currentOpacityRef.current}
                  depthWrite={currentOpacityRef.current > 0.65}
                />
                <Edges scale={1.002} threshold={15} color={isSelected ? '#4f46e5' : isTransparent ? '#94a3b8' : '#cbd5e1'} />
              </mesh>
            )}
            {elevItem > 0 && (
              <mesh
                position={[centerX, elevItem / 2, centerZ]}
                rotation={[0, -angle, 0]}
                castShadow={currentOpacityRef.current > 0.45}
                receiveShadow
              >
                <boxGeometry args={[length, elevItem, wallThickness]} />
                <meshStandardMaterial 
                  ref={setMatRef}
                  color={wallTexture ? '#ffffff' : wallColor} 
                  map={wallTexture}
                  roughness={matDef.roughness} 
                  metalness={matDef.metalness}
                  emissive={isSelected ? '#4f46e5' : '#000000'}
                  emissiveIntensity={isSelected ? 0.25 : 0}
                  transparent={isTransparent}
                  opacity={currentOpacityRef.current}
                  depthWrite={currentOpacityRef.current > 0.65}
                />
                <Edges scale={1.002} threshold={15} color={isSelected ? '#4f46e5' : isTransparent ? '#94a3b8' : '#cbd5e1'} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Selected 3D Endpoint Interactive Handles */}
      {isSelected && (
        <group>
          {/* Start Point Pin */}
          <mesh 
            position={[wall.start.x, 8, wall.start.y]}
            castShadow

          >
            <sphereGeometry args={[10, 24, 24]} />
            <meshStandardMaterial color="#4f46e5" roughness={0.3} metalness={0.2} emissive="#6366f1" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[wall.start.x, 0.5, wall.start.y]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[10, 14, 32]} />
            <meshBasicMaterial color="#4f46e5" side={THREE.DoubleSide} />
          </mesh>

          {/* End Point Pin */}
          <mesh 
            position={[wall.end.x, 8, wall.end.y]}
            castShadow

          >
            <sphereGeometry args={[10, 24, 24]} />
            <meshStandardMaterial color="#4f46e5" roughness={0.3} metalness={0.2} emissive="#6366f1" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[wall.end.x, 0.5, wall.end.y]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[10, 14, 32]} />
            <meshBasicMaterial color="#4f46e5" side={THREE.DoubleSide} />
          </mesh>

          {/* Selected 3D Midpoint In-Scene HUD Badge */}
          <Html 
            position={[(wall.start.x + wall.end.x) / 2, wallHeight + 25, (wall.start.y + wall.end.y) / 2]} 
            center 
            zIndexRange={[100, 0]}
          >
            <div className="flex flex-col items-center pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-slate-900/95 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-2xl border border-slate-700/80 flex items-center gap-2 whitespace-nowrap text-xs">
                <span className="font-bold text-white">Wall</span>
                <span className="text-slate-400 font-mono text-[10px]">
                  {(Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) / 40).toFixed(2)}m
                </span>
                <span className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded text-[10px] font-mono">
                  {Math.round(wallThickness * 2.5)}cm thk • {(wallHeight / 50).toFixed(1)}m h
                </span>

                {/* Action buttons hidden on mobile since Mobile3DControlDeck provides them */}
                <div className="hidden sm:flex items-center gap-1.5">
                  {onUpdateThickness && (
                    <>
                      <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateThickness(-5);
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold cursor-pointer active:scale-95"
                        title="Thinner (-5cm)"
                      >
                        -Thk
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateThickness(5);
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold cursor-pointer active:scale-95"
                        title="Thicker (+5cm)"
                      >
                        +Thk
                      </button>
                    </>
                  )}
                  {onUpdateHeight && (
                    <>
                      <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateHeight(-15);
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold cursor-pointer active:scale-95"
                        title="Lower Wall (-30cm)"
                      >
                        -H
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateHeight(15);
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold cursor-pointer active:scale-95"
                        title="Raise Wall (+30cm)"
                      >
                        +H
                      </button>
                    </>
                  )}
                  {onDelete && (
                    <>
                      <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                        }}
                        className="p-1 rounded-lg bg-rose-900/40 hover:bg-rose-800/80 text-rose-300 hover:text-white active:scale-90 transition-all cursor-pointer"
                        title="Delete Wall"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="w-2 h-2 rotate-45 bg-slate-900 border-r border-b border-slate-700 -mt-1" />
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

function Item3D({ 
  item,
  isSelected,
  isHovered,
  showControls = true,
  onSelect,
  onHover,
  onRotate,
  onElevate,
  onDuplicate,
  onDelete
}: { 
  item: PlacedItem;
  isSelected: boolean;
  isHovered: boolean;
  showControls?: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  onRotate?: (delta: number) => void;
  onElevate?: (deltaCm: number) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}) {
  const typeInfo = ITEM_CATALOG.find(i => i.id === item.typeId);
  if (!typeInfo) return null;

  const w = item.width || typeInfo.width;
  const h = item.height || typeInfo.height;
  const d = item.depth || typeInfo.depth;

  const minimalStyle = useContext(MinimalStyleContext);
  const finishDef = useMemo(() => getItemFinish(item.material), [item.material]);
  const itemTexture = useMemo(() => !minimalStyle && item.material ? getProceduralTexture(item.material) : null, [item.material, minimalStyle]);
  const color = item.color || (finishDef ? finishDef.color : typeInfo.color);
  const roughness = finishDef ? finishDef.roughness : (typeInfo.shape === 'rug' ? 0.95 : 0.7);
  const metalness = finishDef ? finishDef.metalness : 0.05;

  const scaleFactor = cmToPx(1);

  return (
    <group 
      position={[item.x, cmToPx(item.elevation || 0), item.y]} 
      rotation={[0, -item.rotation, 0]} 
      scale={[scaleFactor, scaleFactor, scaleFactor]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}

    >
      {/* 3D Visual Selection Ring & Forward Indicator Chevron */}
      {isSelected && (
        <group position={[0, 1, 0]}>
          {/* Ground Footprint Halo */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(w, d) * 0.5 + 8, Math.max(w, d) * 0.5 + 16, 48]} />
            <meshBasicMaterial color="#6366f1" side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[Math.max(w, d) * 0.5 + 8, 48]} />
            <meshBasicMaterial color="#6366f1" transparent opacity={0.16} side={THREE.DoubleSide} />
          </mesh>
          {/* Forward Heading Pointer */}
          <mesh position={[0, 2, d * 0.5 + 24]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[14, 24, 3]} />
            <meshBasicMaterial color="#4f46e5" />
          </mesh>
        </group>
      )}

      {/* Shapes Rendering */}
      {['box', 'tv_cabinet', 'room_divider'].includes(typeInfo.shape) && !CASE_FURNITURE_IDS.includes(item.typeId) && !KITCHEN_FIXTURE_IDS.includes(item.typeId) && (
        <mesh position={[0, h/2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial 
            color={color} 
            roughness={0.7} 
            emissive={isSelected ? '#6366f1' : isHovered ? '#818cf8' : '#000000'}
            emissiveIntensity={isSelected ? 0.35 : isHovered ? 0.15 : 0}
          />
          {isSelected && <Edges scale={1.002} threshold={15} color="#4f46e5" />}
        </mesh>
      )}

      {KITCHEN_FIXTURE_IDS.includes(item.typeId) && (
        <KitchenFixtures typeId={item.typeId} width={w} height={h} depth={d}
          color={color} roughness={roughness} metalness={metalness} />
      )}

      {typeInfo.shape === 'railing' && (
        <group>
          {/* Top rail */}
          <mesh position={[0, h - 2.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 5, d]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          {/* Posts */}
          <mesh position={[-w/2 + 2.5, h/2, 0]} castShadow receiveShadow>
            <boxGeometry args={[5, h, d]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          <mesh position={[w/2 - 2.5, h/2, 0]} castShadow receiveShadow>
            <boxGeometry args={[5, h, d]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
        </group>
      )}

      {typeInfo.shape === 'corner_railing' && (
        <group>
          <mesh position={[0, h - 1, -d / 2]} castShadow receiveShadow>
            <boxGeometry args={[w, 2, 2]} /><meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          <mesh position={[-w / 2, h - 1, 0]} castShadow receiveShadow>
            <boxGeometry args={[2, 2, d]} /><meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          {[[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2]].map(([x, z], index) => (
            <mesh key={index} position={[x, h / 2, z]} castShadow receiveShadow>
              <boxGeometry args={[2, h, 2]} /><meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
            </mesh>
          ))}
        </group>
      )}

      {typeInfo.shape === 'lounge_chair' && (
        <group>
          <mesh position={[0, h * 0.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, h * 0.4, d]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          <mesh position={[0, h * 0.7, -d * 0.35]} castShadow receiveShadow>
            <boxGeometry args={[w, h * 0.6, d * 0.3]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
        </group>
      )}

      {typeInfo.shape === 'cylinder' && (
        <mesh position={[0, h/2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[w/2, w/2, h, 32]} />
          <meshStandardMaterial 
            color={color} 
            roughness={0.7} 
            emissive={isSelected ? '#6366f1' : isHovered ? '#818cf8' : '#000000'}
            emissiveIntensity={isSelected ? 0.35 : isHovered ? 0.15 : 0}
          />
          {isSelected && <Edges scale={1.002} threshold={15} color="#4f46e5" />}
        </mesh>
      )}

      {(typeInfo.shape === 'bed' || typeInfo.shape === 'sofa') && (
        <UpholsteredFurniture shape={typeInfo.shape} width={w} height={h} depth={d}
          seats={item.typeId === 'liv_sofa_3' ? 3 : 2} color={color} roughness={roughness}
          metalness={metalness} selected={isSelected} hovered={isHovered} />
      )}

      {CASE_FURNITURE_IDS.includes(item.typeId) && (
        <CaseFurniture typeId={item.typeId} width={w} height={h} depth={d} color={color}
          roughness={roughness} metalness={metalness} selected={isSelected} hovered={isHovered} />
      )}

      {typeInfo.shape === 'door' && (
        <group>
          <mesh position={[-w/2 + 2.5, h/2, 0]} castShadow receiveShadow>
            <boxGeometry args={[5, h, d]} />
            <meshStandardMaterial color="#475569" roughness={0.8} />
          </mesh>
          <mesh position={[w/2 - 2.5, h/2, 0]} castShadow receiveShadow>
            <boxGeometry args={[5, h, d]} />
            <meshStandardMaterial color="#475569" roughness={0.8} />
          </mesh>
          <mesh position={[0, h - 2.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w - 10, 5, d]} />
            <meshStandardMaterial color="#475569" roughness={0.8} />
          </mesh>
          <mesh position={[0, h/2 - 2.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w - 10, h - 5, 4]} />
            <meshStandardMaterial 
              color={color} 
              roughness={0.7} 
              emissive={isSelected ? '#6366f1' : isHovered ? '#818cf8' : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : isHovered ? 0.15 : 0}
            />
            {isSelected && <Edges scale={1.002} threshold={15} color="#4f46e5" />}
          </mesh>
        </group>
      )}

      {typeInfo.shape === 'window' && (
        <group>
          <mesh position={[0, h/2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
            {isSelected && <Edges scale={1.002} threshold={15} color="#4f46e5" />}
          </mesh>
          <mesh position={[0, h/2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w - 10, h - 10, d + 2]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={0.9} opacity={0.6} transparent />
          </mesh>
        </group>
      )}

      {typeInfo.shape === 'bathtub' && (
        <group>
          <mesh position={[0, h/2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial 
              color={color} 
              roughness={0.2} 
              emissive={isSelected ? '#6366f1' : isHovered ? '#818cf8' : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : isHovered ? 0.15 : 0}
            />
            {isSelected && <Edges scale={1.002} threshold={15} color="#4f46e5" />}
          </mesh>
          <mesh position={[0, h/2 + 2.5, 0]}>
            <boxGeometry args={[w - 15, h - 5, d - 15]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
          </mesh>
        </group>
      )}

      {typeInfo.shape === 'toilet' && (
        <group>
          <mesh position={[0, h * 0.25, d * 0.15]} castShadow receiveShadow>
            <cylinderGeometry args={[w * 0.4, w * 0.3, h * 0.5, 32]} />
            <meshStandardMaterial 
              color={color} 
              roughness={0.2} 
              emissive={isSelected ? '#6366f1' : isHovered ? '#818cf8' : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : isHovered ? 0.15 : 0}
            />
            {isSelected && <Edges scale={1.002} threshold={15} color="#4f46e5" />}
          </mesh>
          <mesh position={[0, h * 0.6, -d/2 + 10]} castShadow receiveShadow>
            <boxGeometry args={[w, h * 0.8, 20]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
        </group>
      )}

      {typeInfo.shape === 'counter' && !CASE_FURNITURE_IDS.includes(item.typeId) && !KITCHEN_FIXTURE_IDS.includes(item.typeId) && (
        <group>
          <mesh position={[0, h/2 - 2.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, h - 5, d]} />
            <meshStandardMaterial 
              color={color} 
              roughness={0.8} 
              emissive={isSelected ? '#6366f1' : isHovered ? '#818cf8' : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : isHovered ? 0.15 : 0}
            />
            {isSelected && <Edges scale={1.002} threshold={15} color="#4f46e5" />}
          </mesh>
          <mesh position={[0, h - 2.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[w + 2, 5, d + 2]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.2} />
          </mesh>
        </group>
      )}

      {typeInfo.shape === 'rug' && (
        <mesh position={[0, 1, 0]} receiveShadow>
          <boxGeometry args={[w, 2, d]} />
          <meshStandardMaterial 
            color={color} 
            roughness={0.9} 
            emissive={isSelected ? '#6366f1' : isHovered ? '#818cf8' : '#000000'}
            emissiveIntensity={isSelected ? 0.3 : isHovered ? 0.15 : 0}
          />
          {isSelected && <Edges scale={1.002} threshold={15} color="#4f46e5" />}
        </mesh>
      )}

      {/* 3D Visual Selection Ring & Forward Indicator Chevron */}
      {isSelected && (
        <group position={[0, 1, 0]}>
          {/* Ground Footprint Halo */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(w, d) * 0.5 + 8, Math.max(w, d) * 0.5 + 16, 48]} />
            <meshBasicMaterial color="#6366f1" side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[Math.max(w, d) * 0.5 + 8, 48]} />
            <meshBasicMaterial color="#6366f1" transparent opacity={0.16} side={THREE.DoubleSide} />
          </mesh>
          {/* Forward Heading Pointer */}
          <mesh position={[0, 2, d * 0.5 + 24]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[14, 24, 3]} />
            <meshBasicMaterial color="#4f46e5" />
          </mesh>

          {/* Direct 3D In-Scene Control Pill */}
          {showControls && <Html position={[0, h + 38, 0]} center zIndexRange={[100, 0]}>
            <div className="flex flex-col items-center pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-slate-900/95 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-2xl border border-slate-700/80 flex items-center gap-2 whitespace-nowrap text-xs">
                <span className="font-bold text-white tracking-tight">{typeInfo.name}</span>
                <span className="text-slate-400 font-mono text-[10px]">{w}×{d}cm</span>
                {(item.elevation || 0) > 0 && (
                  <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                    +{item.elevation}cm
                  </span>
                )}
                <div className="hidden sm:flex items-center gap-1.5">
                  {onRotate && (
                    <>
                      <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRotate(-Math.PI / 4);
                        }}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white active:scale-90 transition-all cursor-pointer"
                        title="Rotate -45°"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRotate(Math.PI / 4);
                        }}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white active:scale-90 transition-all cursor-pointer"
                        title="Rotate +45°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {onElevate && (
                    <>
                      <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onElevate(10);
                        }}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white active:scale-90 transition-all cursor-pointer"
                        title="Elevate +10cm"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onElevate(-10);
                        }}
                        disabled={(item.elevation || 0) <= 0}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white disabled:opacity-30 active:scale-90 transition-all cursor-pointer"
                        title="Lower -10cm"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {onDuplicate && (
                    <>
                      <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate();
                        }}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white active:scale-90 transition-all cursor-pointer"
                        title="Clone Object"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {onDelete && (
                    <>
                      <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                        }}
                        className="p-1 rounded-lg bg-rose-900/40 hover:bg-rose-800/80 text-rose-300 hover:text-white active:scale-90 transition-all cursor-pointer"
                        title="Delete Object"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="w-2 h-2 rotate-45 bg-slate-900 border-r border-b border-slate-700 -mt-1" />
            </div>
          </Html>}
        </group>
      )}
    </group>
  );
}

// Depth-aware cutaway manager for architectural isometric view:
// Dims foreground walls closest to camera, while maintaining solid background walls
function WallsCutawayManager({
  walls,
  items,
  selectedWallId,
  hoveredWallId,
  onSelectWall,
  onHoverWall,
  onDeleteWall,
  onUpdateWall,
  isCutawayActive,
}: {
  walls: Wall[];
  items: PlacedItem[];
  selectedWallId: string | null;
  hoveredWallId: string | null;
  onSelectWall: (id: string) => void;
  onHoverWall: (hover: boolean, id: string) => void;
  onDeleteWall: () => void;
  onUpdateWall: (id: string, updates: Partial<Wall>) => void;
  isCutawayActive: boolean;
}) {
  const { camera } = useThree();
  const [wallOpacities, setWallOpacities] = useState<Record<string, number>>({});
  const lastCamPos = useRef(new THREE.Vector3());
  const lastDir = useRef(new THREE.Vector3());
  const lastTime = useRef(0);

  const calculateOpacities = useCallback(() => {
    if (!isCutawayActive) {
      if (Object.keys(wallOpacities).length > 0) {
        setWallOpacities({});
      }
      return;
    }

    if (walls.length === 0) return;

    // 1. Gather Scene Targets (Interior Points)
    const targets: { x: number, z: number, weight: number }[] = [];

    // Calculate bounding box of walls
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    walls.forEach(w => {
      minX = Math.min(minX, w.start.x, w.end.x);
      maxX = Math.max(maxX, w.start.x, w.end.x);
      minZ = Math.min(minZ, w.start.y, w.end.y);
      maxZ = Math.max(maxZ, w.start.y, w.end.y);
    });
    if (minX === Infinity) {
      minX = -100; maxX = 100; minZ = -100; maxZ = 100;
    }

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const spanX = maxX - minX;
    const spanZ = maxZ - minZ;

    // A. Scene Center (Highest priority)
    targets.push({ x: centerX, z: centerZ, weight: 5.0 });

    // B. Inset Corners (captures the perimeter of the interior)
    const insetX = spanX * 0.15;
    const insetZ = spanZ * 0.15;
    targets.push({ x: minX + insetX, z: minZ + insetZ, weight: 2.0 });
    targets.push({ x: maxX - insetX, z: minZ + insetZ, weight: 2.0 });
    targets.push({ x: minX + insetX, z: maxZ - insetZ, weight: 2.0 });
    targets.push({ x: maxX - insetX, z: maxZ - insetZ, weight: 2.0 });

    // C. Wall Midpoints (ensures we can see the interior side of rear walls)
    walls.forEach(w => {
      targets.push({ x: (w.start.x + w.end.x) / 2, z: (w.start.y + w.end.y) / 2, weight: 1.0 });
    });

    // D. Placed Items (crucial interior content)
    items.forEach(item => {
      targets.push({ x: item.x, z: item.y, weight: 2.0 });
    });

    const totalWeight = targets.reduce((sum, t) => sum + t.weight, 0);
    if (totalWeight === 0) return;

    // Camera parameters
    const cx = camera.position.x;
    const cy = camera.position.y;
    const cz = camera.position.z;
    const cDir = new THREE.Vector3();
    camera.getWorldDirection(cDir);
    const cDirLen = Math.hypot(cDir.x, cDir.z) || 1;
    const cdx = cDir.x / cDirLen;
    const cdz = cDir.z / cDirLen;

    const newOpacities: Record<string, number> = {};

    // Cutaway Tuning Parameters
    const MIN_CUTAWAY_OPACITY = 0.15;
    const MAX_CUTAWAY_OPACITY = 1.00;

    walls.forEach(wall => {
      let obstructionScore = 0;

      const wx1 = wall.start.x;
      const wz1 = wall.start.y;
      const wx2 = wall.end.x;
      const wz2 = wall.end.y;
      const wallHeight = wall.height || 150;

      const s2_x = wx2 - wx1;
      const s2_z = wz2 - wz1;

      targets.forEach(target => {
        // Ray from Camera to Target
        const s1_x = target.x - cx;
        const s1_z = target.z - cz;

        const denom = (-s2_x * s1_z + s1_x * s2_z);
        if (Math.abs(denom) > 0.0001) {
          const s = (-s1_z * (cx - wx1) + s1_x * (cz - wz1)) / denom; // Param along Wall
          const t = (s2_x * (cz - wz1) - s2_z * (cx - wx1)) / denom;  // Param along Ray

          // If intersection is within wall segment (s) and strictly between camera and target (t)
          // We use t > 0.01 and t < 0.99 to avoid self-occlusion when target lies exactly on the wall
          if (s >= 0 && s <= 1 && t > 0.01 && t < 0.99) {
            // Check 3D Height (Target height is assumed 0)
            const intersectY = cy + t * (0 - cy); 
            if (intersectY < wallHeight) {
              obstructionScore += target.weight;
            }
          }
        }
      });

      const obstructionRatio = obstructionScore / totalWeight;

      // Facing Angle Factor
      const wLen = Math.hypot(s2_x, s2_z) || 1;
      const wNx = -s2_z / wLen;
      const wNz = s2_x / wLen;
      const facing = Math.abs(wNx * cdx + wNz * cdz); // 1 = Front, 0 = Side

      // Scale obstruction so that blocking ~30% of the targets is considered full obstruction
      const rawScore = obstructionRatio * 3.5;
      const clampedScore = Math.min(1.0, Math.max(0, rawScore));

      // Side walls remain more opaque. 
      // facingMult ranges from 0.25 (edge-on) to 1.0 (head-on)
      const facingMult = 0.25 + 0.75 * Math.pow(facing, 1.2);

      const finalObstruction = clampedScore * facingMult;

      // Smoothstep easing for a refined fade curve
      const inv = 1.0 - finalObstruction; 
      const ease = inv * inv * (3 - 2 * inv);

      let targetOpacity = MIN_CUTAWAY_OPACITY + ease * (MAX_CUTAWAY_OPACITY - MIN_CUTAWAY_OPACITY);

      // Keep purely opaque if completely unobstructed
      if (obstructionScore === 0) targetOpacity = MAX_CUTAWAY_OPACITY;

      newOpacities[wall.id] = Math.round(targetOpacity * 100) / 100;
    });

    setWallOpacities(prev => {
      // Only update state if values changed meaningfully to reduce React tree thrashing.
      // Wall3D component will smoothly interpolate any changes frame-by-frame.
      let changed = false;
      for (const id of walls.map(w => w.id)) {
        if (Math.abs((prev[id] ?? 1.0) - (newOpacities[id] ?? 1.0)) > 0.05) {
          changed = true;
          break;
        }
      }
      return changed ? newOpacities : prev;
    });

  }, [camera, isCutawayActive, walls, items]);

  useEffect(() => {
    calculateOpacities();
  }, [calculateOpacities]);

  useFrame(() => {
    if (!isCutawayActive) return;

    const now = performance.now();
    if (now - lastTime.current < 45) return; // ~22fps calculation throttle

    const curDir = new THREE.Vector3();
    camera.getWorldDirection(curDir);

    const posChanged = camera.position.distanceToSquared(lastCamPos.current) > 1;
    const dirChanged = curDir.distanceToSquared(lastDir.current) > 0.0001;

    if (posChanged || dirChanged) {
      lastCamPos.current.copy(camera.position);
      lastDir.current.copy(curDir);
      lastTime.current = now;
      calculateOpacities();
    }
  });

  return (
    <group>
      {walls.map(w => {
        const opacity = isCutawayActive ? (wallOpacities[w.id] ?? 1.0) : 1.0;
        return (
          <Wall3D
            key={w.id}
            wall={w}
            items={items}
            opacity={opacity}
            isSelected={selectedWallId === w.id}
            isHovered={hoveredWallId === w.id}
            onSelect={() => onSelectWall(w.id)}
            onHover={(hover) => onHoverWall(hover, w.id)}
            onDelete={onDeleteWall}
            onUpdateThickness={(delta) => onUpdateWall(w.id, { thickness: Math.max(4, Math.min(20, (w.thickness || 8) + delta / 2.5)) })}
            onUpdateHeight={(delta) => onUpdateWall(w.id, { height: Math.max(100, Math.min(250, (w.height || 150) + delta)) })}
          />
        );
      })}
    </group>
  );
}

// Camera Presets and Focus Controller
function CameraController({
  preset,
  focusPos,
  defaultTarget,
  defaultSpan = 600,
  controlsRef,
}: {
  preset: 'perspective' | 'top' | 'isometric' | null;
  focusPos: [number, number, number] | null;
  defaultTarget: [number, number, number];
  defaultSpan?: number;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const prevPreset = useRef(preset);
  const prevFocus = useRef(focusPos);

  // Initial camera setup
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(defaultTarget[0], 0, defaultTarget[2]);
      if (preset === 'isometric') {
        const isoDist = Math.max(650, defaultSpan * 1.15);
        camera.position.set(defaultTarget[0] + isoDist, isoDist * 0.85, defaultTarget[2] + isoDist);
      } else if (preset === 'top') {
        const topDist = Math.max(1000, defaultSpan * 1.6);
        camera.position.set(defaultTarget[0], topDist, defaultTarget[2] + 0.1);
      } else {
        const perspDist = Math.max(600, defaultSpan * 1.0);
        camera.position.set(defaultTarget[0], perspDist * 0.85, defaultTarget[2] + perspDist);
      }
      controlsRef.current.update();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!controlsRef.current) return;

    if (focusPos && (focusPos !== prevFocus.current || preset !== prevPreset.current)) {
      controlsRef.current.target.set(focusPos[0], focusPos[1], focusPos[2]);
      camera.position.set(focusPos[0], focusPos[1] + 280, focusPos[2] + 360);
      controlsRef.current.update();
      prevFocus.current = focusPos;
      prevPreset.current = preset;
      return;
    }

    if (preset && (preset !== prevPreset.current || (prevFocus.current !== null && focusPos === null))) {
      // If preset changed OR we just cleared focus, reset to default target based on preset
      const cx = defaultTarget[0];
      const cz = defaultTarget[2];

      if (preset === 'top') {
        const topDist = Math.max(1000, defaultSpan * 1.6);
        controlsRef.current.target.set(cx, 0, cz);
        camera.position.set(cx, topDist, cz + 0.1);
        controlsRef.current.update();
      } else if (preset === 'isometric') {
        const isoDist = Math.max(650, defaultSpan * 1.15);
        controlsRef.current.target.set(cx, 0, cz);
        camera.position.set(cx + isoDist, isoDist * 0.85, cz + isoDist);
        controlsRef.current.update();
      } else if (preset === 'perspective') {
        const perspDist = Math.max(600, defaultSpan * 1.0);
        controlsRef.current.target.set(cx, 0, cz);
        camera.position.set(cx, perspDist * 0.85, cz + perspDist);
        controlsRef.current.update();
      }
      prevPreset.current = preset;
      prevFocus.current = focusPos;
    }
  }, [preset, focusPos, camera, controlsRef, defaultSpan]);

  return null;
}

export function Canvas3D({ 
  walls, 
  floors, 
  items, 
  comments,
  selectedItemIds,
  selectedWallId,
  selectedFloorId,
  onSelect,
  onUpdateItem,
  onUpdateWall,
  onUpdateFloor,
  onDeleteItem,
  onDeleteWall,
  onDeleteFloor,
  onDuplicate,
  onRotate,
  onElevate,
  onOpenInspector,
  cameraPreset: propCameraPreset,
  onCameraPresetChange,
  focusTarget: propFocusTarget,
  onFocusTargetChange,
  interactionBlocked = false, isMobile = false
}: Canvas3DProps) {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);
  const [gridVisible, setGridVisible] = useState<boolean>(false);
  const [minimalStyle, setMinimalStyle] = useState(true);
  const [localCameraPreset, setLocalCameraPreset] = useState<'perspective' | 'top' | 'isometric'>('perspective');
  const [localFocusTarget, setLocalFocusTarget] = useState<[number, number, number] | null>(null);
  const [cutawayOverride, setCutawayOverride] = useState<boolean | null>(null);

  const cameraPreset = propCameraPreset || localCameraPreset;
  const focusTarget = propFocusTarget !== undefined ? propFocusTarget : localFocusTarget;
  const isCutawayActive = cutawayOverride !== null ? cutawayOverride : (cameraPreset === 'isometric');

  const setCameraPreset = (preset: 'perspective' | 'top' | 'isometric') => {
    setLocalCameraPreset(preset);
    onCameraPresetChange?.(preset);
    if (preset === 'isometric') {
      setCutawayOverride(null); // automatic cutaway in isometric
    }
  };

  const setFocusTarget = (target: [number, number, number] | null) => {
    setLocalFocusTarget(target);
    onFocusTargetChange?.(target);
  };

  const effectiveIsMobile = isMobile || (typeof window !== 'undefined' && window.innerWidth < 768);

  const controlsRef = useRef<any>(null);

  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [snapMode, setSnapMode] = useState(true);
  const nudgeAccumulator = useRef({ x: 0, y: 0 });

  // Center camera on bounding box and compute span
  const { targetX, targetZ, targetSpan } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

    walls.forEach(w => {
      minX = Math.min(minX, w.start.x, w.end.x);
      maxX = Math.max(maxX, w.start.x, w.end.x);
      minZ = Math.min(minZ, w.start.y, w.end.y);
      maxZ = Math.max(maxZ, w.start.y, w.end.y);
    });

    if (minX === Infinity) {
      return { targetX: 400, targetZ: 400, targetSpan: 600 };
    }

    const spanX = maxX - minX;
    const spanZ = maxZ - minZ;
    const maxSpan = Math.max(spanX, spanZ, 400);

    return {
      targetX: (minX + maxX) / 2,
      targetZ: (minZ + maxZ) / 2,
      targetSpan: maxSpan,
    };
  }, [walls]);

  const selectedItem = selectedItemIds.length === 1 ? items.find(i => i.id === selectedItemIds[0]) || null : null;
  const selectedWall = selectedWallId ? walls.find(w => w.id === selectedWallId) || null : null;
  const selectedFloor = selectedFloorId ? floors.find(f => f.id === selectedFloorId) || null : null;
  const selectedItemType = selectedItem ? ITEM_CATALOG.find(c => c.id === selectedItem.typeId) : null;

  const selectedFloorArea = useMemo(() => {
    if (!selectedFloor || selectedFloor.points.length < 3) return 0;
    let a = 0;
    for (let i = 0; i < selectedFloor.points.length; i++) {
      const j = (i + 1) % selectedFloor.points.length;
      a += selectedFloor.points[i].x * selectedFloor.points[j].y;
      a -= selectedFloor.points[j].x * selectedFloor.points[i].y;
    }
    return Math.abs(a / 2) / 1600;
  }, [selectedFloor]);

  // Handle focus on selection
  const handleTriggerFocus = () => {
    let newTarget: [number, number, number] | null = null;
    if (selectedItem) {
      newTarget = [selectedItem.x, (selectedItem.elevation || 0) * 0.4, selectedItem.y];
    } else if (selectedWall) {
      newTarget = [
        (selectedWall.start.x + selectedWall.end.x) / 2,
        50,
        (selectedWall.start.y + selectedWall.end.y) / 2
      ];
    } else if (selectedFloor && selectedFloor.points.length > 0) {
      const cx = selectedFloor.points.reduce((sum, p) => sum + p.x, 0) / selectedFloor.points.length;
      const cz = selectedFloor.points.reduce((sum, p) => sum + p.y, 0) / selectedFloor.points.length;
      newTarget = [cx, 10, cz];
    }
    if (newTarget) {
      setFocusTarget(newTarget);
    }
  };

  // Nudge selected 3D element in the floor plane
  const handleNudge = (dx: number, dy: number, isContinuous: boolean = false) => {
    if (snapMode && isContinuous) {
      nudgeAccumulator.current.x += dx;
      nudgeAccumulator.current.y += dy;

      const SNAP_GRID = 10; // 10cm snap

      let appliedDx = 0;
      let appliedDy = 0;

      if (Math.abs(nudgeAccumulator.current.x) >= SNAP_GRID) {
        appliedDx = Math.sign(nudgeAccumulator.current.x) * SNAP_GRID;
        nudgeAccumulator.current.x -= appliedDx;
      }

      if (Math.abs(nudgeAccumulator.current.y) >= SNAP_GRID) {
        appliedDy = Math.sign(nudgeAccumulator.current.y) * SNAP_GRID;
        nudgeAccumulator.current.y -= appliedDy;
      }

      if (appliedDx === 0 && appliedDy === 0) return;

      dx = appliedDx;
      dy = appliedDy;
    }

    if (selectedItem) {
      onUpdateItem(selectedItem.id, { x: selectedItem.x + dx, y: selectedItem.y + dy });
    } else if (selectedWall) {
      onUpdateWall(selectedWall.id, {
        start: { x: selectedWall.start.x + dx, y: selectedWall.start.y + dy },
        end: { x: selectedWall.end.x + dx, y: selectedWall.end.y + dy }
      });
    } else if (selectedFloor) {
      onUpdateFloor(selectedFloor.id, {
        points: selectedFloor.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
      });
    }
  };

  // Keyboard navigation and shortcuts for desktop 3D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (interactionBlocked || isInteractiveElement(e.target) || e.ctrlKey || e.metaKey) return;

      const step = e.shiftKey 
        ? (snapMode ? 50 : 10) 
        : (snapMode ? 10 : 2);

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleNudge(0, -step);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNudge(0, step);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNudge(-step, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNudge(step, 0);
      } else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) {
        if (selectedItem) {
          e.preventDefault();
          onRotate(Math.PI / 4);
        }
      } else if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey) {
        if (selectedItem && onElevate) {
          e.preventDefault();
          onElevate(10);
        }
      } else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
        if (selectedItem && onElevate) {
          e.preventDefault();
          onElevate(-10);
        }
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
        if (selectedItem || selectedWall || selectedFloor) {
          e.preventDefault();
          handleTriggerFocus();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItem) {
          e.preventDefault();
          onDeleteItem();
        } else if (selectedWall) {
          e.preventDefault();
          onDeleteWall();
        } else if (selectedFloor && onDeleteFloor) {
          e.preventDefault();
          onDeleteFloor();
        }
      } else if (e.key === 'Escape') {
        onSelect([], null, null, null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactionBlocked, selectedItem, selectedWall, selectedFloor, snapMode, onUpdateItem, onUpdateWall, onUpdateFloor, onRotate, onElevate, onDeleteItem, onDeleteWall, onDeleteFloor, onSelect]);


  return (
    <MinimalStyleContext.Provider value={minimalStyle}>
    <div style={{ pointerEvents: interactionBlocked ? 'none' : undefined }} className="w-full h-full bg-[#f3f2ef] select-none touch-none relative overflow-hidden">
      {/* 3D WebGL Canvas */}
      <Canvas 
        gl={{ preserveDrawingBuffer: true }} 
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [targetX, 600, targetZ + 600], fov: 50, near: 1, far: 20000 }}
      >
        <color attach="background" args={['#f3f2ef']} />

        <ambientLight intensity={0.7} />
        <hemisphereLight args={['#ffffff', '#d4cfc6', 1.1]} />
        <directionalLight 
          position={[600, 1200, 600]} 
          intensity={1.5}
          castShadow 
          shadow-mapSize={[1024, 1024]}
          shadow-camera-far={3500}
          shadow-camera-left={-2500}
          shadow-camera-right={2500}
          shadow-camera-top={2500}
          shadow-camera-bottom={-2500}
          shadow-bias={-0.001}
        />

        <group>
          {/* Floors */}
          {floors.map(f => (
            <Floor3D 
              key={f.id} 
              floor={f} 
              isSelected={selectedFloorId === f.id}
              onSelect={() => onSelect([], null, f.id, null)}
              onDelete={onDeleteFloor}
              onDuplicate={onDuplicate}
            />
          ))}

          {/* Walls with Isometric Depth-Aware Cutaway */}
          <WallsCutawayManager
            walls={walls}
            items={items}
            selectedWallId={selectedWallId}
            hoveredWallId={hoveredWallId}
            onSelectWall={(id) => onSelect([], id, null, null)}
            onHoverWall={(hover, id) => setHoveredWallId(hover ? id : null)}
            onDeleteWall={onDeleteWall}
            onUpdateWall={onUpdateWall}
            isCutawayActive={isCutawayActive}
          />

          {/* Placed Items */}
          {items.map(item => (
            <Item3D 
              key={item.id} 
              item={item} 
              isSelected={selectedItemIds.includes(item.id)}
              isHovered={hoveredItemId === item.id}
              showControls={!effectiveIsMobile && !interactionBlocked}
              onSelect={() => onSelect([item.id], null, null, null)}
              onHover={(hover) => setHoveredItemId(hover ? item.id : null)}
              onRotate={onRotate}
              onElevate={onElevate}
              onDuplicate={onDuplicate}
              onDelete={onDeleteItem}
            />
          ))}

          {/* Desktop-Only Blender Move Arrows Gizmo (Red X-Axis, Green Y-Axis, Blue Z-Axis) */}
          {selectedItem && !effectiveIsMobile && (
            <BlenderMoveGizmo
              item={selectedItem}
              onUpdateItem={onUpdateItem}
              snapMode={snapMode}
              controlsRef={controlsRef}
              isMobile={effectiveIsMobile}
            />
          )}

          {/* Subtle Grid Floor Helper */}
          {gridVisible && (
            <gridHelper 
              args={[5000, 50, '#bcb8b0', '#dedbd5']}
              position={[targetX, 0.02, targetZ]} 
            />
          )}

          {/* Global Ground Plane - Handles Click to Deselect */}
          <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[targetX, -1, targetZ]}
            receiveShadow
            onClick={(e) => {
              onSelect([], null, null, null);
            }}
          >
            <planeGeometry args={[15000, 15000]} />
            <meshStandardMaterial color="#e9e7e2" roughness={0.95} />
          </mesh>


        </group>

        <ContactShadows 
          opacity={0.25}
          scale={5000} 
          blur={3.5}
          far={25} 
          resolution={256} 
          color="#000000" 
          position={[targetX, 0, targetZ]} 
        />


        <OrbitControls 
          enabled={!interactionBlocked}
          ref={controlsRef}
          maxPolarAngle={Math.PI / 2 - 0.05} 
          maxDistance={6000} 
        />

        <CameraController
          preset={cameraPreset}
          focusPos={focusTarget}
          defaultTarget={[targetX, 0, targetZ]}
          defaultSpan={targetSpan}
          controlsRef={controlsRef}
        />
      </Canvas>

      {/* Visual Badge when Isometric Cutaway is Active */}
      {isCutawayActive && (
        <div className="hidden sm:flex absolute top-20 right-5 z-10 items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[11px] font-medium text-slate-300 shadow-lg pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Isometric Cutaway Active • Front walls dimmed</span>
        </div>
      )}

      {/* Desktop 3D Camera Controls & View Toolbar (Bottom Center) */}
      <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 z-20 max-w-[calc(100%-2rem)] flex-wrap justify-center items-center gap-1.5 bg-slate-900/85 backdrop-blur-xl border border-slate-700/60 p-1.5 rounded-2xl shadow-xl text-white">
        <button
          onClick={() => {
            setFocusTarget(null);
            setCameraPreset('perspective');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            cameraPreset === 'perspective' && !focusTarget
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Architectural Perspective"
        >
          <Eye className="w-4 h-4" />
          <span>Perspective</span>
        </button>

        <button
          onClick={() => {
            setFocusTarget(null);
            setCameraPreset('top');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            cameraPreset === 'top' && !focusTarget
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Top-Down 3D View"
        >
          <Compass className="w-4 h-4" />
          <span>Top-Down</span>
        </button>

        <button
          onClick={() => {
            setFocusTarget(null);
            setCameraPreset('isometric');
            setCutawayOverride(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            cameraPreset === 'isometric' && !focusTarget
              ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Isometric View: 45° angle with transparent front walls"
        >
          <Box className="w-4 h-4" />
          <span>Isometric</span>
        </button>

        <button
          onClick={() => setCutawayOverride(!isCutawayActive)}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            isCutawayActive
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title={isCutawayActive ? "Cutaway Walls Active: Front walls are dimmed to 20% opacity. Click to make all walls solid." : "Click to enable Cutaway Wall Dimming"}
        >
          <Layers className="w-4 h-4" />
          <span>{isCutawayActive ? 'Cutaway On' : 'Cutaway Off'}</span>
        </button>

        {(selectedItem || selectedWall) && (
          <button
            onClick={handleTriggerFocus}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 active:scale-95 transition-all"
            title="Frame Selected Element"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Focus</span>
          </button>
        )}

        {/* Quick Rotate in Desktop Bottom Toolbar for Selected Items */}
        {selectedItem && (
          <div className="flex items-center bg-slate-800/90 rounded-xl border border-slate-700/60 p-0.5">
            <button
              onClick={() => onRotate(-Math.PI / 4)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition-all"
              title="Rotate -45°"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>-45°</span>
            </button>
            <div className="w-px h-4 bg-slate-700 mx-0.5" />
            <button
              onClick={() => onRotate(Math.PI / 4)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition-all"
              title="Rotate +45° (Keyboard: R)"
            >
              <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>+45°</span>
            </button>
          </div>
        )}

        <div className="w-px h-6 bg-slate-700/60 mx-1" />

        <button
          onClick={() => setGridVisible(!gridVisible)}
          className={`p-2.5 rounded-xl transition-all ${
            gridVisible ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'
          }`}
          title="Toggle 3D Floor Grid"
        >
          <Grid className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setFocusTarget(null);
            setCameraPreset('perspective');
            if (controlsRef.current) {
              controlsRef.current.target.set(targetX, 0, targetZ);
              controlsRef.current.update();
            }
          }}
          className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          title="Reset Camera Target"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <button className="absolute top-16 md:top-4 right-4 z-20 min-h-11 rounded-xl bg-white/95 border border-slate-200 px-3 text-xs font-medium text-slate-700 shadow-sm" aria-pressed={minimalStyle} onClick={() => setMinimalStyle(value => !value)}>{minimalStyle ? 'Minimal finishes' : 'Patterned finishes'}</button>
      {/* Bottom Floating Keyboard & Interaction Hint (Desktop) */}
      <div className="hidden md:flex absolute top-4 left-4 z-10 bg-slate-900/80 text-slate-300 px-3 py-2 rounded-xl text-[11px] font-medium pointer-events-none backdrop-blur-md border border-slate-700/60 shadow-xl items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        <span>Select object • Arrows: Nudge • R: Rotate • E/C: Elevate • F: Focus • Del: Delete</span>
      </div>
    </div>
    </MinimalStyleContext.Provider>
  );
}
