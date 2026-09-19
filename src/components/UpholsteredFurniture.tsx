import React from 'react';
import { RoundedBox } from '@react-three/drei';

interface Props {
  shape: 'bed' | 'sofa';
  width: number; height: number; depth: number; seats: number;
  color: string; roughness: number; metalness: number;
  selected: boolean; hovered: boolean;
}

// Normalized parts stay inside the item's footprint and total height when resized.
export function UpholsteredFurniture({ shape, width: w, height: h, depth: d, seats, color, roughness, metalness, selected, hovered }: Props) {
  const part = (key: string, size: [number, number, number], position: [number, number, number], tint = color, upholstery = true) => (
    <RoundedBox key={key} args={size} position={position} radius={Math.min(...size) * 0.16} smoothness={2} castShadow receiveShadow>
      <meshStandardMaterial color={tint} roughness={upholstery ? roughness : 0.85} metalness={upholstery ? metalness : 0}
        emissive={selected || hovered ? '#6366f1' : '#000000'} emissiveIntensity={selected ? 0.08 : hovered ? 0.04 : 0} />
    </RoundedBox>
  );
  return <group>
    {[-1, 1].flatMap(x => [-1, 1].map(z => part(`leg-${x}-${z}`, [w * 0.045, h * 0.13, d * 0.055], [x * w * 0.4, h * 0.065, z * d * 0.39], '#66564a', false)))}
    {shape === 'sofa' ? <>
      {part('base', [w * 0.96, h * 0.22, d * 0.92], [0, h * 0.24, 0])}
      {part('back', [w * 0.96, h * 0.65, d * 0.16], [0, h * 0.675, -d * 0.42])}
      {[-1, 1].map(x => part(`arm-${x}`, [w * 0.09, h * 0.46, d * 0.86], [x * w * 0.455, h * 0.43, d * 0.03]))}
      {Array.from({ length: seats }, (_, i) => {
        const x = (i - (seats - 1) / 2) * w * 0.8 / seats;
        return <group key={i}>
          {part(`seat-${i}`, [w * 0.78 / seats, h * 0.16, d * 0.68], [x, h * 0.43, d * 0.08])}
          {part(`cushion-${i}`, [w * 0.77 / seats, h * 0.4, d * 0.14], [x, h * 0.71, -d * 0.27])}
        </group>;
      })}
    </> : <>
      {part('frame', [w, h * 0.22, d * 0.96], [0, h * 0.24, d * 0.02])}
      {part('headboard', [w, h * 0.87, d * 0.055], [0, h * 0.565, -d * 0.4725])}
      {part('mattress', [w * 0.94, h * 0.24, d * 0.9], [0, h * 0.47, d * 0.025], '#f5f2eb', false)}
      {part('duvet', [w * 0.96, h * 0.09, d * 0.62], [0, h * 0.615, d * 0.15], '#e7e2d8', false)}
      {part('throw', [w * 0.965, h * 0.04, d * 0.19], [0, h * 0.68, d * 0.3])}
      {(w > 120 ? [-0.24, 0.24] : [0]).map(x => part(`pillow-${x}`, [w * (w > 120 ? 0.4 : 0.7), h * 0.13, d * 0.17], [x * w, h * 0.655, -d * 0.3], '#faf8f3', false))}
    </>}
  </group>;
}
