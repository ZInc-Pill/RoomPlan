import { snapRepeatInterval, joystickDirection } from '../utils/joystickTiming';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Move, Magnet } from 'lucide-react';

export interface UniversalJoystickProps {
  snapRepeat?: boolean;
  onMove: (dx: number, dy: number) => void;
  onSingleNudge?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  variant?: 'standard' | 'compact' | 'mini';
  theme?: 'dark' | 'light';
  speedMultiplier?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const UniversalJoystick: React.FC<UniversalJoystickProps> = ({
  onMove,
  snapRepeat = false,
  onSingleNudge,
  variant = 'standard',
  theme = 'dark',
  speedMultiplier = 1,
  label,
  className = '',
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [activeDirection, setActiveDirection] = useState<'up' | 'down' | 'left' | 'right' | null>(null);

  const activePointerIdRef = useRef<number | null>(null);
  const currentVectorRef = useRef({ dx: 0, dy: 0, dist: 0, angle: 0 });
  const dragStartTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  // Geometry configurations based on variant - tuned for very slow, ultra-precise gliding
  const config = {
    standard: {
      size: 80, // px
      knobSize: 34,
      maxRadius: 24,
      iconSize: 14,
      maxSpeed: 0.40 * speedMultiplier,
    },
    compact: {
      size: 54,
      knobSize: 26,
      maxRadius: 16,
      iconSize: 12,
      maxSpeed: 0.30 * speedMultiplier,
    },
    mini: {
      size: 48,
      knobSize: 20,
      maxRadius: 11,
      iconSize: 10,
      maxSpeed: 0.20 * speedMultiplier,
    },
  }[variant];

  // Keep latest onMove in ref to prevent stale closures in animation loop
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const hasNudgeRef = useRef(Boolean(onSingleNudge));
  hasNudgeRef.current = Boolean(onSingleNudge);

  const snapRepeatRef = useRef(snapRepeat);
  snapRepeatRef.current = snapRepeat;
  const nudgeRef = useRef(onSingleNudge);
  nudgeRef.current = onSingleNudge;
  const repeatedRef = useRef(false);

  // Continuous movement loop
  const startMovementLoop = useCallback(() => {
    if (animFrameIdRef.current !== null) return;

    let lastTime = performance.now();
    let nextSnapAt = lastTime + 180;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 16.666, 2.5); // Normalize to 60fps
      lastTime = time;

      const { dist, angle } = currentVectorRef.current;
      if (snapRepeatRef.current && nudgeRef.current) {
        if (dist >= 4 && time >= nextSnapAt) {
          nudgeRef.current(joystickDirection(angle));
          repeatedRef.current = true;
          nextSnapAt = time + snapRepeatInterval(dist / config.maxRadius);
        } else if (dist < 4) {
          nextSnapAt = time + 180;
        }
      } else if (dist > 2 && (!hasNudgeRef.current || time - dragStartTimeRef.current >= 280)) {
        const normalized = Math.min(dist / config.maxRadius, 1);
        // Exponential curve: ultra-fine micro nudging at small deflections, very slow and controlled at full deflection
        const speed = Math.pow(normalized, 1.75) * config.maxSpeed * dt;
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed;

        onMoveRef.current(dx, dy);
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
  }, [config.maxRadius, config.maxSpeed]);

  const stopMovementLoop = useCallback(() => {
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopMovementLoop();
    };
  }, [stopMovementLoop]);

  useEffect(() => {
    const cancel = () => {
      stopMovementLoop();
      activePointerIdRef.current = null;
      currentVectorRef.current = { dx: 0, dy: 0, dist: 0, angle: 0 };
      setIsDragging(false); setActiveDirection(null); setKnobPos({ x: 0, y: 0 });
    };
    const hidden = () => { if (document.hidden) cancel(); };
    if (disabled) cancel();
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('blur', cancel); document.removeEventListener('visibilitychange', hidden); };
  }, [disabled, stopMovementLoop]);

  const updateKnobFromPointer = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const dist = Math.hypot(deltaX, deltaY);
    const angle = Math.atan2(deltaY, deltaX);

    const clampedDist = Math.min(dist, config.maxRadius);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    setKnobPos({ x: knobX, y: knobY });
    currentVectorRef.current = { dx: knobX, dy: knobY, dist, angle };

    // Determine primary cardinal direction for subtle visual feedback
    if (dist > 4) {
      const deg = (angle * 180) / Math.PI;
      if (deg >= -45 && deg < 45) setActiveDirection('right');
      else if (deg >= 45 && deg < 135) setActiveDirection('down');
      else if (deg >= -135 && deg < -45) setActiveDirection('up');
      else setActiveDirection('left');
    } else {
      setActiveDirection(null);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0 || !e.isPrimary || activePointerIdRef.current !== null) return;
    e.preventDefault();
    e.stopPropagation();

    activePointerIdRef.current = e.pointerId;
    dragStartTimeRef.current = performance.now();
    repeatedRef.current = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore fallback
    }

    setIsDragging(true);
    updateKnobFromPointer(e.clientX, e.clientY);
    startMovementLoop();

    // Subtle tactile feedback on touch devices
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {
        // Safe ignore
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    updateKnobFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();

    const elapsed = performance.now() - dragStartTimeRef.current;
    const { dist, angle } = currentVectorRef.current;

    // Discrete tap detection for micro-nudging
    if (!cancelled && !repeatedRef.current && elapsed < (snapRepeat ? 180 : 280) && dist >= 4 && onSingleNudge) {
      const deg = (angle * 180) / Math.PI;
      if (deg >= -45 && deg < 45) onSingleNudge('right');
      else if (deg >= 45 && deg < 135) onSingleNudge('down');
      else if (deg >= -135 && deg < -45) onSingleNudge('up');
      else onSingleNudge('left');
    }

    activePointerIdRef.current = null;
    setIsDragging(false);
    setActiveDirection(null);
    setKnobPos({ x: 0, y: 0 });
    currentVectorRef.current = { dx: 0, dy: 0, dist: 0, angle: 0 };
    stopMovementLoop();

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    handlePointerUp(e, true);
  };

  const isDark = theme === 'dark';

  return (
    <div className={`inline-flex flex-col items-center select-none touch-none ${className}`}>
      {label && (
        <span
          className={`text-[9px] font-bold tracking-wider uppercase mb-1 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {label}
        </span>
      )}

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerUp(e)}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
        style={{
          width: `${config.size}px`,
          height: `${config.size}px`,
        }}
        className={`relative rounded-full cursor-grab active:cursor-grabbing transition-shadow duration-200 border flex items-center justify-center ${
          disabled ? 'opacity-40 pointer-events-none' : ''
        } ${
          isDark
            ? isDragging
              ? 'bg-slate-900 border-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,0.35)]'
              : 'bg-slate-900/90 border-slate-700/80 shadow-md hover:border-slate-600'
            : isDragging
              ? 'bg-slate-100 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
              : 'bg-slate-100/90 border-slate-200/90 shadow-inner hover:border-slate-300'
        }`}
        role="group" aria-label="Movement joystick"
        title={snapRepeat ? "Tap for one grid step; hold for repeated steps" : "Drag to glide freely"}
      >
        {/* Cardinal Direction Ticks / Crosshair */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* North */}
          <div
            className={`absolute top-1 w-1 h-1 rounded-full transition-colors ${
              activeDirection === 'up'
                ? 'bg-indigo-400 scale-125'
                : isDark
                  ? 'bg-slate-700'
                  : 'bg-slate-300'
            }`}
          />
          {/* South */}
          <div
            className={`absolute bottom-1 w-1 h-1 rounded-full transition-colors ${
              activeDirection === 'down'
                ? 'bg-indigo-400 scale-125'
                : isDark
                  ? 'bg-slate-700'
                  : 'bg-slate-300'
            }`}
          />
          {/* West */}
          <div
            className={`absolute left-1 w-1 h-1 rounded-full transition-colors ${
              activeDirection === 'left'
                ? 'bg-indigo-400 scale-125'
                : isDark
                  ? 'bg-slate-700'
                  : 'bg-slate-300'
            }`}
          />
          {/* East */}
          <div
            className={`absolute right-1 w-1 h-1 rounded-full transition-colors ${
              activeDirection === 'right'
                ? 'bg-indigo-400 scale-125'
                : isDark
                  ? 'bg-slate-700'
                  : 'bg-slate-300'
            }`}
          />

          {/* Inner boundary guideline */}
          <div
            className={`rounded-full border border-dashed pointer-events-none ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
            style={{
              width: `${config.maxRadius * 2}px`,
              height: `${config.maxRadius * 2}px`,
            }}
          />
        </div>

        {/* Vector Tether Line when dragging */}
        {isDragging && (knobPos.x !== 0 || knobPos.y !== 0) && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <line
              x1={config.size / 2}
              y1={config.size / 2}
              x2={config.size / 2 + knobPos.x}
              y2={config.size / 2 + knobPos.y}
              stroke={isDark ? '#818cf8' : '#6366f1'}
              strokeWidth="2"
              strokeDasharray="2 2"
              opacity="0.8"
            />
          </svg>
        )}

        {/* Thumb Knob */}
        <div
          style={{
            width: `${config.knobSize}px`,
            height: `${config.knobSize}px`,
            transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
            transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
          }}
          className={`rounded-full flex items-center justify-center shadow-lg pointer-events-none ${
            isDark
              ? isDragging
                ? 'bg-gradient-to-b from-indigo-500 to-indigo-700 text-white shadow-indigo-500/40'
                : 'bg-gradient-to-b from-slate-700 to-slate-800 text-slate-300 border border-slate-600/80 shadow-black/40'
              : isDragging
                ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-indigo-500/30'
                : 'bg-gradient-to-b from-white to-slate-100 text-slate-700 border border-slate-200 shadow-slate-300/50'
          }`}
        >
          <Move
            style={{ width: `${config.iconSize}px`, height: `${config.iconSize}px` }}
            className={`transition-transform ${isDragging ? 'scale-110' : ''}`}
          />
        </div>
      </div>
    </div>
  );
};
