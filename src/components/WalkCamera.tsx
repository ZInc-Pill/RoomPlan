import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { MutableRefObject } from 'react';

export function WalkCamera({ start, movement, blocked, speed }: {
  start: [number, number]; movement: MutableRefObject<[number, number]>; blocked: boolean; speed: number;
}) {
  const { camera, gl } = useThree();
  const angles = useRef({ yaw: 0, pitch: 0 });
  const keys = useRef(new Set<string>());
  useEffect(() => {
    camera.position.set(start[0], 64, start[1]); // 160 cm eye height; 40 world units/metre.
    camera.rotation.order = 'YXZ';
    camera.rotation.set(0, 0, 0);
    return () => { keys.current.clear(); movement.current = [0, 0]; camera.rotation.order = 'XYZ'; };
  }, [camera]);
  useEffect(() => {
    const canvas = gl.domElement;
    let pointer: { id: number; x: number; y: number } | null = null;
    const down = (event: PointerEvent) => {
      if (blocked || pointer || event.button !== 0) return;
      event.stopPropagation();
      if (event.pointerType === 'mouse') { try { const request = canvas.requestPointerLock(); request?.catch(() => {}); } catch {} }
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      const locked = document.pointerLockElement === canvas;
      if (!locked && (!pointer || pointer.id !== event.pointerId)) return;
      event.stopPropagation();
      angles.current.yaw -= (locked ? event.movementX : event.clientX - pointer!.x) * 0.004;
      angles.current.pitch = Math.max(-1.15, Math.min(1.15, angles.current.pitch - (locked ? event.movementY : event.clientY - pointer!.y) * 0.004));
      if (pointer) { pointer.x = event.clientX; pointer.y = event.clientY; }
    };
    const up = (event: PointerEvent) => {
      event.stopPropagation();
      if (pointer?.id === event.pointerId) { pointer = null; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); }
    };
    const suppressClick = (event: MouseEvent) => event.stopPropagation();
    const stop = () => { if (document.pointerLockElement === canvas) document.exitPointerLock(); pointer = null; keys.current.clear(); movement.current = [0, 0]; };
    const keyDown = (event: KeyboardEvent) => {
      if (blocked || (event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable=true]')) return;
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e'].includes(event.key.toLowerCase())) { event.preventDefault(); keys.current.add(event.key.toLowerCase()); }
    };
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    canvas.addEventListener('click', suppressClick, true);
    canvas.addEventListener('pointerdown', down, true); canvas.addEventListener('pointermove', move, true);
    canvas.addEventListener('pointerup', up, true); canvas.addEventListener('pointercancel', up, true);
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', stop); document.addEventListener('visibilitychange', stop);
    return () => {
      stop(); canvas.removeEventListener('click', suppressClick, true); canvas.removeEventListener('pointerdown', down, true); canvas.removeEventListener('pointermove', move, true);
      canvas.removeEventListener('pointerup', up, true); canvas.removeEventListener('pointercancel', up, true);
      window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', stop);
    };
  }, [gl, blocked, movement]);
  useFrame((_, delta) => {
    if (blocked) return;
    angles.current.yaw += (Number(keys.current.has('q')) - Number(keys.current.has('e'))) * Math.min(delta, 0.05) * 1.5;
    const { yaw, pitch } = angles.current;
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    const x = movement.current[0] + Number(keys.current.has('d') || keys.current.has('arrowright')) - Number(keys.current.has('a') || keys.current.has('arrowleft'));
    const z = movement.current[1] + Number(keys.current.has('s') || keys.current.has('arrowdown')) - Number(keys.current.has('w') || keys.current.has('arrowup'));
    const scale = speed * 40 * Math.min(delta, 0.05) / Math.max(1, Math.hypot(x, z));
    camera.position.x += (x * Math.cos(yaw) + z * Math.sin(yaw)) * scale;
    camera.position.z += (-x * Math.sin(yaw) + z * Math.cos(yaw)) * scale;
    camera.position.y = 64;
  });
  return null;
}
