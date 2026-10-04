import React, { useCallback, useEffect, useRef, useState } from 'react';

/** A single mobile movement surface for objects and walking. Callbacks always use current state. */
export function MobileGlide({ label, onMove, onVector, snap = false, grid = 20 }: {
  label: string; onMove?: (x: number, y: number) => void; onVector?: (x: number, y: number) => void; snap?: boolean; grid?: number;
}) {
  const latest = useRef({ onMove, onVector, snap, grid }); latest.current = { onMove, onVector, snap, grid };
  const pointer = useRef<number | null>(null), frame = useRef<number | null>(null);
  const vector = useRef([0, 0]), total = useRef([0, 0]);
  const [knob, setKnob] = useState([0, 0]);
  const stop = useCallback((commit = false) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (commit && pointer.current !== null && latest.current.snap && latest.current.onMove) {
      const [x, y] = total.current, step = latest.current.grid;
      latest.current.onMove(Math.round(x / step) * step - x, Math.round(y / step) * step - y);
    }
    pointer.current = null; vector.current = [0, 0];
    latest.current.onVector?.(0, 0); setKnob([0, 0]);
  }, []);
  useEffect(() => {
    const cancel = () => stop();
    window.addEventListener('blur', cancel); document.addEventListener('visibilitychange', cancel);
    return () => { if (frame.current !== null) cancelAnimationFrame(frame.current); latest.current.onVector?.(0, 0); window.removeEventListener('blur', cancel); document.removeEventListener('visibilitychange', cancel); };
  }, [stop]);
  const update = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2, y = e.clientY - rect.top - rect.height / 2;
    const distance = Math.hypot(x, y), strength = Math.min(1, Math.max(0, (distance - 3) / 29));
    vector.current = distance ? [x / distance * strength, y / distance * strength] : [0, 0];
    setKnob(vector.current.map(v => v * 30)); latest.current.onVector?.(vector.current[0], vector.current[1]);
  };
  return <section aria-label={label} className="mobile-glide">
    <p className="text-xs font-semibold text-center mb-3">{label}</p>
    <div role="group" aria-label={`${label} joystick`} className="relative w-24 h-24 mx-auto rounded-full bg-indigo-50 border border-indigo-200 touch-none flex items-center justify-center"
      onPointerDown={e => {
        if (!e.isPrimary || e.button !== 0 || pointer.current !== null) return;
        e.preventDefault(); e.stopPropagation(); pointer.current = e.pointerId; total.current = [0, 0]; e.currentTarget.setPointerCapture(e.pointerId); update(e);
        let last = performance.now();
        const tick = (now: number) => {
          if (pointer.current === null) return;
          const dt = Math.min((now - last) / 1000, 0.04); last = now;
          const [x, y] = vector.current.map(v => v * 45 * dt);
          if (x || y) { total.current[0] += x; total.current[1] += y; latest.current.onMove?.(x, y); }
          frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
      }}
      onPointerMove={e => { if (pointer.current === e.pointerId) { e.preventDefault(); update(e); } }}
      onPointerUp={e => { if (pointer.current === e.pointerId) { stop(true); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } }}
      onPointerCancel={e => { if (pointer.current === e.pointerId) stop(); }}
      onLostPointerCapture={e => { if (pointer.current === e.pointerId) stop(); }}>
      <span className="absolute top-1 text-indigo-400 text-xs">↑</span>
      <div className="w-11 h-11 rounded-full bg-indigo-600 shadow pointer-events-none" style={{ transform: `translate(${knob[0]}px, ${knob[1]}px)` }} />
    </div>
    <p className="text-[10px] text-slate-500 text-center mt-3">Drag to move · release to stop</p>
  </section>;
}
