import React, { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { Box, Layers, Footprints, MousePointer2, RotateCw, Hand, ZoomIn, ZoomOut, Focus, Magnet, Move, Palette, Maximize, Grid3X3 } from 'lucide-react';
const viewIcons: Record<string, LucideIcon> = { General: Box, Isometric: Layers, Walk: Footprints, Select: MousePointer2, 'Rotate view': RotateCw, 'Pan view': Hand, 'Zoom in': ZoomIn, 'Zoom out': ZoomOut, Focus, Snap: Magnet, Free: Move, Finishes: Palette, 'Reset view': Maximize };

export const MobileWorkspaceContext = createContext<{ tools: HTMLElement | null; rail: HTMLElement | null; glide: HTMLElement | null; glideOpen: boolean }>({ tools: null, rail: null, glide: null, glideOpen: false });
export function MobileControlPortal({ children, glide = false, tools = false }: { children: React.ReactNode; glide?: boolean; tools?: boolean }) {
  const workspace = useContext(MobileWorkspaceContext);
  const host = tools ? workspace.tools : glide ? workspace.glide : workspace.rail;
  if (!host || (glide && !workspace.glideOpen)) return null;
  return createPortal(<div data-editor-control onPointerDown={e => e.stopPropagation()} onPointerMove={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>{children}</div>, host);
}
export function RailButton({ label, icon, active, ...props }: { label: string; icon?: LucideIcon; active?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const Icon = icon ?? viewIcons[label] ?? (label.endsWith(' grid') ? Grid3X3 : undefined);
  return <button {...props} aria-label={props['aria-label'] ?? label} aria-pressed={active} className={`rail-button ${active ? 'rail-active' : ''}`}>
    {Icon && <Icon size={19} aria-hidden="true" />}<span>{label}</span>
  </button>;
}
