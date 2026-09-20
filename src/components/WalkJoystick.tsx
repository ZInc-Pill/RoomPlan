import React, { useEffect, useRef, useState } from 'react';

export function WalkJoystick({ onChange }: { onChange: (x: number, z: number) => void }) {
  const [knob, setKnob] = useState<[number, number]>([0, 0]);
  const pointer = useRef<number | null>(null);
  const callback = useRef(onChange); callback.current = onChange;
  const reset = () => { pointer.current = null; setKnob([0, 0]); callback.current(0, 0); };
  useEffect(() => {
    window.addEventListener('blur', reset); document.addEventListener('visibilitychange', reset);
    return () => { callback.current(0, 0); window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', reset); };
  }, []);
  const update = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2, z = event.clientY - rect.top - rect.height / 2;
    const length = Math.hypot(x, z), ratio = Math.min(1, 28 / Math.max(1, length));
    setKnob([x * ratio, z * ratio]);
    const strength = Math.max(0, Math.min(1, (length - 5) / 23));
    callback.current(length ? x / length * strength : 0, length ? z / length * strength : 0);
  };
  return <div role="group" aria-label="Walking joystick" className="relative h-24 w-24 shrink-0 touch-none rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center"
    onPointerDown={event => { if (pointer.current !== null || event.button !== 0) return; event.preventDefault(); pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); update(event); }}
    onPointerMove={event => { if (pointer.current === event.pointerId) update(event); }}
    onPointerUp={event => { if (pointer.current === event.pointerId) reset(); }}
    onPointerCancel={reset} onLostPointerCapture={reset}>
    <span className="pointer-events-none absolute top-1 text-xs text-slate-400">▲</span>
    <div className="pointer-events-none h-10 w-10 rounded-full bg-indigo-600 shadow-md" style={{ transform: `translate(${knob[0]}px, ${knob[1]}px)` }} />
  </div>;
}
