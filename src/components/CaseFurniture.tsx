import React from 'react';
import { RoundedBox } from '@react-three/drei';

export const CASE_FURNITURE_IDS = ['bed_wardrobe', 'bed_nightstand', 'liv_tvstand', 'liv_tv_cabinet', 'kit_base_cabinet', 'kit_counter', 'kit_island', 'kit_table_4', 'kit_table_6'];

export function CaseFurniture({ typeId, width: w, height: h, depth: d, color, roughness, metalness, selected, hovered }: {
  typeId: string; width: number; height: number; depth: number;
  color: string; roughness: number; metalness: number; selected: boolean; hovered: boolean;
}) {
  const table = typeId.startsWith('kit_table');
  const wardrobe = typeId === 'bed_wardrobe';
  const drawers = typeId === 'bed_nightstand';
  const kitchen = typeId.startsWith('kit_') && !table;
  const island = typeId === 'kit_island';
  const columns = wardrobe ? 3 : drawers || typeId === 'kit_base_cabinet' ? 1 : 3;
  // All normalized parts, including handles, remain inside the editable bounds.
  const part = (key: string, size: [number, number, number], position: [number, number, number], tint = color, accent = false) => {
    const dimensions: [number, number, number] = [size[0] * w, size[1] * h, size[2] * d];
    return <RoundedBox key={key} args={dimensions} position={[position[0] * w, position[1] * h, position[2] * d]}
      radius={Math.min(...dimensions) * 0.12} smoothness={1} castShadow receiveShadow>
      <meshStandardMaterial color={tint} roughness={accent ? 0.7 : roughness} metalness={accent ? 0 : metalness}
        emissive={selected || hovered ? '#6366f1' : '#000000'} emissiveIntensity={selected ? 0.08 : hovered ? 0.04 : 0} />
    </RoundedBox>;
  };
  if (table) return <group>
    {part('top', [1, 0.065, 1], [0, 0.9675, 0])}
    {[-1, 1].flatMap(x => [-1, 1].map(z => (
      <mesh key={`${x}-${z}`} position={[x * w * 0.4, h * 0.4675, z * d * 0.38]} castShadow receiveShadow>
        <cylinderGeometry args={[Math.min(w, d) * 0.036, Math.min(w, d) * 0.023, h * 0.935, 8]} />
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
      </mesh>
    )))}
    {[-1, 1].map(z => part(`apron-${z}`, [0.8, 0.12, 0.04], [0, 0.875, z * 0.38]))}
  </group>;
  return <group>
    {part('plinth', [0.88, 0.1, 0.78], [0, 0.05, -0.03], '#514b44', true)}
    {part('carcass', [island ? 0.92 : 1, 0.84, 0.88], [0, 0.52, -0.04])}
    {part('top', [1, 0.06, 1], [0, 0.97, 0], kitchen ? '#e8e3da' : color, kitchen)}
    {Array.from({ length: columns }, (_, i) => {
      const span = (island ? 0.91 : 0.98) / columns;
      const x = (i - (columns - 1) / 2) * span;
      return <group key={i}>
        {(drawers ? [0, 1] : [0]).map(row => {
          const panelHeight = drawers ? 0.39 : 0.8;
          const y = drawers ? 0.31 + row * 0.41 : 0.52;
          return <group key={row}>
            {part(`panel-${i}-${row}`, [span * 0.965, panelHeight, 0.04], [x, y, 0.42])}
            {part(`handle-${i}-${row}`, wardrobe ? [0.012, 0.13, 0.035] : [span * 0.3, 0.018, 0.035],
              [wardrobe ? x + span * 0.32 : x, wardrobe ? 0.52 : y + panelHeight * 0.3, 0.4775], '#514b44', true)}
          </group>;
        })}
      </group>;
    })}
  </group>;
}
