import { useState } from 'react';

export type PreviewMode = 'perspective' | 'walk' | 'isometric';
export type CameraAction = 'left' | 'right' | 'up' | 'down' | 'in' | 'out';

export function PreviewNavigation({ mode, onMode, mobile, gesture, onGesture, onAction, onReset, editing, onEdit, minimal, onMinimal, speed, onSpeed, blocked }: {
  blocked: boolean;
  mode: PreviewMode; onMode: (mode: PreviewMode) => void; mobile: boolean;
  gesture: 'rotate' | 'pan'; onGesture: (gesture: 'rotate' | 'pan') => void;
  onAction: (action: CameraAction) => void; onReset: () => void;
  editing: boolean; onEdit: () => void; minimal: boolean; onMinimal: () => void;
  speed: number; onSpeed: (speed: number) => void;
}) {
  const [options, setOptions] = useState(false);
  const button = 'min-h-11 min-w-11 rounded-xl px-2 text-xs font-semibold bg-slate-100 text-slate-700 active:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600';
  const active = ' !bg-indigo-600 !text-white';
  return <section style={{ visibility: blocked ? 'hidden' : undefined }} aria-label="Preview navigation" data-editor-control className="shrink-0 border-t border-slate-200 bg-white px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]" onPointerDown={event => event.stopPropagation()}>
    <div className="mx-auto max-w-xl space-y-2">
      {options && <div className="max-h-[25dvh] overflow-y-auto overscroll-contain rounded-xl bg-slate-50 p-2 space-y-2">
        <div className="flex gap-2 items-center"><button className={button + ' flex-1'} aria-pressed={minimal} onClick={onMinimal}>{minimal ? 'Finishes: minimal' : 'Finishes: patterned'}</button><button className={button} onClick={() => setOptions(false)}>Close</button></div>
        {mode === 'walk' ? <label className="flex items-center justify-between text-sm">Walking speed<select className={button} value={speed} onChange={event => onSpeed(Number(event.target.value))}><option value={0.6}>Slow</option><option value={1.2}>Normal</option><option value={2}>Fast</option></select></label> : <div className="grid grid-cols-4 gap-2" aria-label="Camera step controls">{(['left', 'right', 'up', 'down'] as const).map(direction => <button key={direction} className={button} aria-label={`${gesture === 'pan' ? 'Pan' : 'Rotate'} camera ${direction}`} onClick={() => onAction(direction)}>{{ left: '←', right: '→', up: '↑', down: '↓' }[direction]}</button>)}</div>}
      </div>}
      <div className="flex gap-2">
        <div className="grid flex-1 grid-cols-3 gap-1" aria-label="Camera mode">{(['perspective', 'walk', 'isometric'] as const).map(value => <button className={button + (mode === value ? active : '')} aria-pressed={mode === value} key={value} onClick={() => { setOptions(false); onMode(value); }}>{value === 'perspective' ? 'General' : value === 'walk' ? 'Walk' : 'Isometric'}</button>)}</div>
        <button className={button} onClick={onReset} aria-label="Reset camera view">Reset</button>
        <button className={button + (options ? active : '')} aria-expanded={options} aria-label="View options" onClick={() => setOptions(!options)}>•••</button>
      </div>
      {mode !== 'walk' && <div className="flex gap-2">
        <button className={button + ' flex-1' + (gesture === 'rotate' ? active : '')} aria-pressed={gesture === 'rotate'} onClick={() => onGesture('rotate')}>Rotate view</button>
        <button className={button + ' flex-1' + (gesture === 'pan' ? active : '')} aria-pressed={gesture === 'pan'} onClick={() => onGesture('pan')}>Pan view</button>
        <button className={button} aria-label="Zoom out" onClick={() => onAction('out')}>−</button><button className={button} aria-label="Zoom in" onClick={() => onAction('in')}>+</button>
        {mobile && <button className={button + (editing ? active : '')} aria-pressed={editing} onClick={onEdit}>Edit</button>}
      </div>}
      <p className="text-center text-[11px] leading-4 text-slate-500">{mode === 'walk' ? (mobile ? 'Left thumb: walk · Drag the scene: look around' : 'WASD / arrows: walk · Q / E: turn · Click: mouse look · Esc: release') : `${mobile ? 'One finger' : 'Drag'}: ${gesture === 'pan' ? 'pan' : 'rotate'} · ${mobile ? 'Pinch: zoom · Two fingers: pan' : 'Scroll: zoom · Right drag: pan'}${editing && mobile ? ' · Tap to select' : ''}`}</p>
    </div>
  </section>;
}
