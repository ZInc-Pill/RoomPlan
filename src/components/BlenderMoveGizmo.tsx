import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { PlacedItem } from '../types';
import { cmToPx, pxToCm } from '../utils/coordinates';

interface BlenderMoveGizmoProps {
  item: PlacedItem;
  onUpdateItem: (id: string, updates: Partial<PlacedItem>) => void;
  snapMode?: boolean;
  controlsRef?: React.RefObject<any>;
  isMobile?: boolean;
}

type DragAxis = 'X' | 'Y' | 'Z' | 'XZ' | null;

export function BlenderMoveGizmo({
  item,
  onUpdateItem,
  snapMode = false,
  controlsRef,
  isMobile = false,
}: BlenderMoveGizmoProps) {
  // Blender move gizmo is strictly Desktop only as requested
  if (isMobile) return null;

  const { camera, raycaster, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  
  const [hoveredAxis, setHoveredAxis] = useState<DragAxis>(null);
  const [activeAxis, setActiveAxis] = useState<DragAxis>(null);
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number; z: number } | null>(null);

  const dragStartItem = useRef<{ x: number; y: number; elevation: number }>({
    x: item.x,
    y: item.y,
    elevation: item.elevation || 0,
  });
  const dragStartIntersect = useRef<THREE.Vector3>(new THREE.Vector3());

  // Dynamic distance-adaptive scaling so gizmo remains accessible & easy to click across all zoom levels
  useFrame(() => {
    if (!groupRef.current) return;
    const itemWorldPos = new THREE.Vector3(
      item.x,
      cmToPx(item.elevation || 0) + 4,
      item.y
    );
    const dist = camera.position.distanceTo(itemWorldPos);
    // Scale smoothly with distance (clamped between 0.75 and 2.5)
    const scale = Math.max(0.75, Math.min(2.5, dist * 0.0024));
    groupRef.current.scale.set(scale, scale, scale);
  });

  // Handle pointer down on an axis
  const startDrag = (axis: DragAxis, e: any) => {
    e.stopPropagation();
    if (controlsRef?.current) {
      controlsRef.current.enabled = false;
    }

    setActiveAxis(axis);
    dragStartItem.current = {
      x: item.x,
      y: item.y,
      elevation: item.elevation || 0,
    };

    const itemWorldPos = new THREE.Vector3(
      item.x,
      cmToPx(item.elevation || 0) + 4,
      item.y
    );

    const canvasRect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - canvasRect.left) / canvasRect.width) * 2 - 1,
      -((e.clientY - canvasRect.top) / canvasRect.height) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);

    // Form appropriate projection plane based on drag axis
    let planeNormal = new THREE.Vector3(0, 1, 0);
    const camDir = new THREE.Vector3().subVectors(camera.position, itemWorldPos).normalize();

    if (axis === 'X') {
      const lineDir = new THREE.Vector3(1, 0, 0);
      planeNormal = new THREE.Vector3().crossVectors(lineDir, camDir).cross(lineDir).normalize();
      if (planeNormal.lengthSq() < 0.001) planeNormal = new THREE.Vector3(0, 1, 0);
    } else if (axis === 'Y') {
      // Floor depth axis corresponds to Three.js world Z
      const lineDir = new THREE.Vector3(0, 0, 1);
      planeNormal = new THREE.Vector3().crossVectors(lineDir, camDir).cross(lineDir).normalize();
      if (planeNormal.lengthSq() < 0.001) planeNormal = new THREE.Vector3(0, 1, 0);
    } else if (axis === 'Z') {
      // Elevation axis corresponds to Three.js world Y
      const lineDir = new THREE.Vector3(0, 1, 0);
      planeNormal = new THREE.Vector3().crossVectors(lineDir, camDir).cross(lineDir).normalize();
      if (planeNormal.lengthSq() < 0.001) planeNormal = new THREE.Vector3(0, 0, 1);
    } else if (axis === 'XZ') {
      // Floor plane
      planeNormal = new THREE.Vector3(0, 1, 0);
    }

    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, itemWorldPos);
    const intersect = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersect)) {
      dragStartIntersect.current = intersect.clone();
    } else {
      dragStartIntersect.current = itemWorldPos.clone();
    }

    setDragDelta({ x: 0, y: 0, z: 0 });
  };

  // Window pointer listeners for frictionless dragging
  useEffect(() => {
    if (!activeAxis) return;

    const handlePointerMove = (e: PointerEvent) => {
      const canvasRect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - canvasRect.left) / canvasRect.width) * 2 - 1,
        -((e.clientY - canvasRect.top) / canvasRect.height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);

      const itemWorldPos = new THREE.Vector3(
        dragStartItem.current.x,
        cmToPx(dragStartItem.current.elevation) + 4,
        dragStartItem.current.y
      );
      const camDir = new THREE.Vector3().subVectors(camera.position, itemWorldPos).normalize();
      let planeNormal = new THREE.Vector3(0, 1, 0);

      if (activeAxis === 'X') {
        const lineDir = new THREE.Vector3(1, 0, 0);
        planeNormal = new THREE.Vector3().crossVectors(lineDir, camDir).cross(lineDir).normalize();
        if (planeNormal.lengthSq() < 0.001) planeNormal = new THREE.Vector3(0, 1, 0);
      } else if (activeAxis === 'Y') {
        const lineDir = new THREE.Vector3(0, 0, 1);
        planeNormal = new THREE.Vector3().crossVectors(lineDir, camDir).cross(lineDir).normalize();
        if (planeNormal.lengthSq() < 0.001) planeNormal = new THREE.Vector3(0, 1, 0);
      } else if (activeAxis === 'Z') {
        const lineDir = new THREE.Vector3(0, 1, 0);
        planeNormal = new THREE.Vector3().crossVectors(lineDir, camDir).cross(lineDir).normalize();
        if (planeNormal.lengthSq() < 0.001) planeNormal = new THREE.Vector3(0, 0, 1);
      } else if (activeAxis === 'XZ') {
        planeNormal = new THREE.Vector3(0, 1, 0);
      }

      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, itemWorldPos);
      const intersect = new THREE.Vector3();

      if (raycaster.ray.intersectPlane(plane, intersect)) {
        if (activeAxis === 'X') {
          const deltaX = intersect.x - dragStartIntersect.current.x;
          let newX = dragStartItem.current.x + deltaX;
          if (snapMode) {
            newX = Math.round(newX / 10) * 10;
          }
          const finalX = Math.round(newX);
          onUpdateItem(item.id, { x: finalX });
          setDragDelta({ x: finalX - dragStartItem.current.x, y: 0, z: 0 });
        } else if (activeAxis === 'Y') {
          const deltaY = intersect.z - dragStartIntersect.current.z;
          let newY = dragStartItem.current.y + deltaY;
          if (snapMode) {
            newY = Math.round(newY / 10) * 10;
          }
          const finalY = Math.round(newY);
          onUpdateItem(item.id, { y: finalY });
          setDragDelta({ x: 0, y: finalY - dragStartItem.current.y, z: 0 });
        } else if (activeAxis === 'Z') {
          const deltaElevation = pxToCm(intersect.y - dragStartIntersect.current.y);
          let newElevation = Math.max(0, dragStartItem.current.elevation + deltaElevation);
          if (snapMode) {
            newElevation = Math.round(newElevation / 10) * 10;
          }
          const finalElev = Math.round(newElevation);
          onUpdateItem(item.id, { elevation: finalElev });
          setDragDelta({ x: 0, y: 0, z: finalElev - dragStartItem.current.elevation });
        } else if (activeAxis === 'XZ') {
          const deltaX = intersect.x - dragStartIntersect.current.x;
          const deltaY = intersect.z - dragStartIntersect.current.z;
          let newX = dragStartItem.current.x + deltaX;
          let newY = dragStartItem.current.y + deltaY;
          if (snapMode) {
            newX = Math.round(newX / 10) * 10;
            newY = Math.round(newY / 10) * 10;
          }
          const finalX = Math.round(newX);
          const finalY = Math.round(newY);
          onUpdateItem(item.id, { x: finalX, y: finalY });
          setDragDelta({
            x: finalX - dragStartItem.current.x,
            y: finalY - dragStartItem.current.y,
            z: 0,
          });
        }
      }
    };

    const handlePointerUp = () => {
      setActiveAxis(null);
      setDragDelta(null);
      if (controlsRef?.current) {
        controlsRef.current.enabled = true;
      }
      document.body.style.cursor = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (controlsRef?.current) {
        controlsRef.current.enabled = true;
      }
      document.body.style.cursor = '';
    };
  }, [activeAxis, camera, gl, item.id, onUpdateItem, raycaster, snapMode, controlsRef]);

  // Sync cursor appearance
  useEffect(() => {
    if (activeAxis === 'X') {
      document.body.style.cursor = 'ew-resize';
    } else if (activeAxis === 'Y' || activeAxis === 'Z') {
      document.body.style.cursor = 'ns-resize';
    } else if (activeAxis === 'XZ') {
      document.body.style.cursor = 'move';
    } else if (hoveredAxis) {
      document.body.style.cursor = hoveredAxis === 'X' ? 'ew-resize' : 'ns-resize';
    } else {
      document.body.style.cursor = '';
    }
  }, [activeAxis, hoveredAxis]);

  const posX = item.x;
  const posY = cmToPx(item.elevation || 0) + 4;
  const posZ = item.y;

  return (
    <group position={[posX, posY, posZ]}>
      {/* 1. Blender-Style Extended Constraint Line across room during drag */}
      {activeAxis === 'X' && (
        <group>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([-10000, 0, 0, 10000, 0, 0]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ef4444" linewidth={2} />
          </line>
        </group>
      )}
      {activeAxis === 'Y' && (
        <group>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([0, 0, -10000, 0, 0, 10000]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#22c55e" linewidth={2} />
          </line>
        </group>
      )}
      {activeAxis === 'Z' && (
        <group>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([0, -1000, 0, 0, 5000, 0]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#3b82f6" linewidth={2} />
          </line>
        </group>
      )}

      {/* 2. Real-time Displacement / Value HUD Tooltip */}
      {activeAxis && dragDelta && (
        <Html position={[0, 48, 0]} center zIndexRange={[120, 0]}>
          <div className="bg-slate-900/95 backdrop-blur-md text-white text-[11px] font-mono px-3 py-1.5 rounded-lg border border-slate-700 shadow-2xl flex items-center gap-2 whitespace-nowrap pointer-events-none select-none animate-in fade-in zoom-in-95 duration-100">
            {activeAxis === 'X' && (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                <span className="font-bold text-red-400">Blender X Move:</span>
                <span className="text-white font-bold">{Math.round(item.x)}cm</span>
                <span className="text-slate-400">
                  ({dragDelta.x >= 0 ? `+${dragDelta.x}` : dragDelta.x}cm)
                </span>
              </>
            )}
            {activeAxis === 'Y' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span className="font-bold text-emerald-400">Blender Y Move:</span>
                <span className="text-white font-bold">{Math.round(item.y)}cm</span>
                <span className="text-slate-400">
                  ({dragDelta.y >= 0 ? `+${dragDelta.y}` : dragDelta.y}cm)
                </span>
              </>
            )}
            {activeAxis === 'Z' && (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                <span className="font-bold text-blue-400">Blender Elevate Z:</span>
                <span className="text-white font-bold">+{Math.round(item.elevation || 0)}cm</span>
                <span className="text-slate-400">
                  ({dragDelta.z >= 0 ? `+${dragDelta.z}` : dragDelta.z}cm)
                </span>
              </>
            )}
            {activeAxis === 'XZ' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span className="font-bold text-amber-300">Plane Move:</span>
                <span>X:{Math.round(item.x)}cm</span>
                <span>Y:{Math.round(item.y)}cm</span>
              </>
            )}
            {snapMode && (
              <span className="bg-indigo-500/20 text-indigo-300 text-[9px] px-1 py-0.5 rounded font-bold">
                10cm SNAP
              </span>
            )}
          </div>
        </Html>
      )}

      {/* 3. Scalable Gizmo Body */}
      <group ref={groupRef}>
        {/* Origin Sphere */}
        <mesh>
          <sphereGeometry args={[2.5, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>

        {/* --- BLENDER X AXIS ARROW (RED) --- */}
        <group>
          {/* Arrow Shaft */}
          <mesh position={[18, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[1.2, 1.2, 34, 16]} />
            <meshStandardMaterial
              color={hoveredAxis === 'X' || activeAxis === 'X' ? '#f87171' : '#ef4444'}
              roughness={0.3}
              metalness={0.2}
              emissive={hoveredAxis === 'X' || activeAxis === 'X' ? '#ef4444' : '#000000'}
              emissiveIntensity={hoveredAxis === 'X' || activeAxis === 'X' ? 0.4 : 0}
            />
          </mesh>

          {/* Arrowhead Cone pointing +X */}
          <mesh position={[38, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[3.8, 10, 16]} />
            <meshStandardMaterial
              color={hoveredAxis === 'X' || activeAxis === 'X' ? '#f87171' : '#dc2626'}
              roughness={0.2}
              metalness={0.3}
              emissive={hoveredAxis === 'X' || activeAxis === 'X' ? '#ef4444' : '#000000'}
              emissiveIntensity={hoveredAxis === 'X' || activeAxis === 'X' ? 0.5 : 0}
            />
          </mesh>

          {/* Blender X Label Tag */}
          <Html position={[46, 0, 0]} center>
            <div
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold select-none cursor-pointer transition-transform ${
                hoveredAxis === 'X' || activeAxis === 'X'
                  ? 'bg-red-500 text-white shadow-lg scale-110'
                  : 'bg-red-600/90 text-white'
              }`}
              onPointerDown={(e) => startDrag('X', e)}
              onMouseEnter={() => setHoveredAxis('X')}
              onMouseLeave={() => setHoveredAxis(null)}
              title="Drag Red X Arrow to move along X axis (Blender style)"
            >
              X
            </div>
          </Html>

          {/* Generous invisible hit cylinder for effortless grab */}
          <mesh
            position={[24, 0, 0]}
            rotation={[0, 0, -Math.PI / 2]}
            onPointerDown={(e) => startDrag('X', e)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredAxis('X');
            }}
            onPointerOut={() => setHoveredAxis(null)}
          >
            <cylinderGeometry args={[6, 6, 44, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>

        {/* --- BLENDER Y / DEPTH AXIS ARROW (GREEN - FLOOR PLANE DEPTH / THREE.JS Z) --- */}
        <group>
          {/* Arrow Shaft */}
          <mesh position={[0, 0, 18]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.2, 1.2, 34, 16]} />
            <meshStandardMaterial
              color={hoveredAxis === 'Y' || activeAxis === 'Y' ? '#4ade80' : '#22c55e'}
              roughness={0.3}
              metalness={0.2}
              emissive={hoveredAxis === 'Y' || activeAxis === 'Y' ? '#22c55e' : '#000000'}
              emissiveIntensity={hoveredAxis === 'Y' || activeAxis === 'Y' ? 0.4 : 0}
            />
          </mesh>

          {/* Arrowhead Cone pointing +Z (app's Y) */}
          <mesh position={[0, 0, 38]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[3.8, 10, 16]} />
            <meshStandardMaterial
              color={hoveredAxis === 'Y' || activeAxis === 'Y' ? '#4ade80' : '#16a34a'}
              roughness={0.2}
              metalness={0.3}
              emissive={hoveredAxis === 'Y' || activeAxis === 'Y' ? '#22c55e' : '#000000'}
              emissiveIntensity={hoveredAxis === 'Y' || activeAxis === 'Y' ? 0.5 : 0}
            />
          </mesh>

          {/* Blender Y Label Tag */}
          <Html position={[0, 0, 46]} center>
            <div
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold select-none cursor-pointer transition-transform ${
                hoveredAxis === 'Y' || activeAxis === 'Y'
                  ? 'bg-emerald-500 text-white shadow-lg scale-110'
                  : 'bg-emerald-600/90 text-white'
              }`}
              onPointerDown={(e) => startDrag('Y', e)}
              onMouseEnter={() => setHoveredAxis('Y')}
              onMouseLeave={() => setHoveredAxis(null)}
              title="Drag Green Y Arrow to move along Y/depth axis"
            >
              Y
            </div>
          </Html>

          {/* Generous invisible hit cylinder */}
          <mesh
            position={[0, 0, 24]}
            rotation={[Math.PI / 2, 0, 0]}
            onPointerDown={(e) => startDrag('Y', e)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredAxis('Y');
            }}
            onPointerOut={() => setHoveredAxis(null)}
          >
            <cylinderGeometry args={[6, 6, 44, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>

        {/* --- BLENDER Z / ELEVATION AXIS ARROW (BLUE - VERTICAL UP / THREE.JS Y) --- */}
        <group>
          {/* Arrow Shaft */}
          <mesh position={[0, 18, 0]}>
            <cylinderGeometry args={[1.2, 1.2, 34, 16]} />
            <meshStandardMaterial
              color={hoveredAxis === 'Z' || activeAxis === 'Z' ? '#60a5fa' : '#3b82f6'}
              roughness={0.3}
              metalness={0.2}
              emissive={hoveredAxis === 'Z' || activeAxis === 'Z' ? '#3b82f6' : '#000000'}
              emissiveIntensity={hoveredAxis === 'Z' || activeAxis === 'Z' ? 0.4 : 0}
            />
          </mesh>

          {/* Arrowhead Cone pointing +Y (elevation) */}
          <mesh position={[0, 38, 0]}>
            <coneGeometry args={[3.8, 10, 16]} />
            <meshStandardMaterial
              color={hoveredAxis === 'Z' || activeAxis === 'Z' ? '#60a5fa' : '#2563eb'}
              roughness={0.2}
              metalness={0.3}
              emissive={hoveredAxis === 'Z' || activeAxis === 'Z' ? '#3b82f6' : '#000000'}
              emissiveIntensity={hoveredAxis === 'Z' || activeAxis === 'Z' ? 0.5 : 0}
            />
          </mesh>

          {/* Blender Z Label Tag */}
          <Html position={[0, 46, 0]} center>
            <div
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold select-none cursor-pointer transition-transform ${
                hoveredAxis === 'Z' || activeAxis === 'Z'
                  ? 'bg-blue-500 text-white shadow-lg scale-110'
                  : 'bg-blue-600/90 text-white'
              }`}
              onPointerDown={(e) => startDrag('Z', e)}
              onMouseEnter={() => setHoveredAxis('Z')}
              onMouseLeave={() => setHoveredAxis(null)}
              title="Drag Blue Z Arrow to change height / elevation"
            >
              Z
            </div>
          </Html>

          {/* Generous invisible hit cylinder */}
          <mesh
            position={[0, 24, 0]}
            onPointerDown={(e) => startDrag('Z', e)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredAxis('Z');
            }}
            onPointerOut={() => setHoveredAxis(null)}
          >
            <cylinderGeometry args={[6, 6, 44, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>

        {/* --- DUAL AXIS FLOOR PLANE SQUARE (BLENDER RED-GREEN CORNER) --- */}
        <group position={[9, 0.4, 9]}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerDown={(e) => startDrag('XZ', e)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredAxis('XZ');
            }}
            onPointerOut={() => setHoveredAxis(null)}
          >
            <planeGeometry args={[12, 12]} />
            <meshBasicMaterial
              color={hoveredAxis === 'XZ' || activeAxis === 'XZ' ? '#fbbf24' : '#f59e0b'}
              transparent
              opacity={hoveredAxis === 'XZ' || activeAxis === 'XZ' ? 0.7 : 0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
