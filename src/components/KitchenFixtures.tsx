import React from 'react';

export const KITCHEN_FIXTURE_IDS = ['kit_corner_cabinet', 'kit_sink', 'kit_dishwasher', 'kit_fridge_std', 'kit_fridge_dbl', 'bath_sink'];

export function KitchenFixtures({ typeId, width: w, height: h, depth: d, color, roughness, metalness }: {
  typeId: string; width: number; height: number; depth: number; color: string; roughness: number; metalness: number;
}) {
  // Normalized dimensions keep every detail within the saved item bounds.
  const part = (key: string, size: number[], at: number[], tint = color, metal = false) => <mesh key={key}
    position={[at[0]*w, at[1]*h, at[2]*d]} castShadow receiveShadow>
    <boxGeometry args={[size[0]*w, size[1]*h, size[2]*d]} />
    <meshStandardMaterial color={tint} roughness={metal ? 0.35 : roughness} metalness={metal ? 0.65 : metalness} />
  </mesh>;
  const handle = (key: string, x: number, y: number, vertical = false) => part(key,
    vertical ? [0.025, 0.18, 0.025] : [0.3, 0.022, 0.025], [x, y, 0.477], '#777b7c', true);
  if (typeId === 'kit_corner_cabinet') return <group>
    {part('left', [0.5, 0.84, 1], [-0.25, 0.52, 0])}
    {part('right', [0.5, 0.84, 0.5], [0.25, 0.52, -0.25])}
    {part('top-left', [0.5, 0.06, 1], [-0.25, 0.97, 0], '#e8e3da')}
    {part('top-right', [0.5, 0.06, 0.5], [0.25, 0.97, -0.25], '#e8e3da')}
    {part('base-left', [0.44, 0.1, 0.9], [-0.25, 0.05, -0.02], '#514b44')}
    {part('base-right', [0.46, 0.1, 0.44], [0.23, 0.05, -0.25], '#514b44')}
    {part('front', [0.46, 0.78, 0.02], [-0.25, 0.52, 0.49])}
    {part('return', [0.02, 0.78, 0.46], [0.01, 0.52, 0.25])}
    {handle('pull', -0.25, 0.79)}
    {part('return-pull', [0.025, 0.022, 0.3], [0.035, 0.79, 0.25], '#777b7c', true)}
  </group>;
  if (typeId === 'kit_sink' || typeId === 'bath_sink') {
    const vanity = typeId === 'bath_sink';
    const rim = vanity ? 0.78 : 0.62;
    const bottom = vanity ? 0.62 : 0.12;
    const ceramic = vanity ? '#f1efe9' : '#adb5b7';
    return <group>
      {vanity && <>
        {part('cabinet', [0.96, 0.57, 0.94], [0, 0.335, 0])}
        {part('plinth', [0.85, 0.05, 0.8], [0, 0.025, 0], '#514b44')}
        {[-1, 1].map(x => part('door'+x, [0.465, 0.53, 0.025], [x*0.24, 0.335, 0.482]))}
        {handle('left-pull', -0.24, 0.54)}{handle('right-pull', 0.24, 0.54)}
      </>}
      {part('bowl-bottom', [0.76, 0.035, 0.64], [0, bottom, 0.04], ceramic, !vanity)}
      {[-1, 1].map(x => part('rim-side'+x, [0.12, rim-bottom, 0.96], [x*0.44, (rim+bottom)/2, 0], ceramic, !vanity))}
      {part('rim-back', [0.76, rim-bottom, 0.2], [0, (rim+bottom)/2, -0.38], ceramic, !vanity)}
      {part('rim-front', [0.76, rim-bottom, 0.12], [0, (rim+bottom)/2, 0.42], ceramic, !vanity)}
      {part('drain', [0.1, 0.01, 0.1], [0, bottom+0.025, 0.04], '#53595a', true)}
      {part('tap-stem', [0.045, 1-rim, 0.045], [0, (1+rim)/2, -0.38], '#92999b', true)}
      {part('tap-spout', [0.045, 0.025, 0.22], [0, 0.9875, -0.29], '#92999b', true)}
    </group>;
  }
  const dishwasher = typeId === 'kit_dishwasher';
  const double = typeId === 'kit_fridge_dbl';
  return <group>
    {part('body', [1, 0.94, 0.9], [0, 0.53, -0.05])}
    {part('toe', [0.9, 0.06, 0.84], [0, 0.03, -0.02], '#393c3d')}
    {(double ? [-0.245, 0.245] : [0]).map((x, i) => <group key={i}>
      {part('door'+i, [double ? 0.48 : 0.98, dishwasher ? 0.77 : 0.68, 0.06], [x, dishwasher ? 0.465 : 0.645, 0.43])}
      {handle('handle'+i, double ? x*0.25 : 0, dishwasher ? 0.8 : 0.63, !dishwasher)}
    </group>)}
    {part('lower-or-controls', [0.98, dishwasher ? 0.1 : 0.23, 0.06], [0, dishwasher ? 0.93 : 0.175, 0.43], dishwasher ? '#42484a' : color)}
    {dishwasher ? part('indicator', [0.08, 0.013, 0.006], [0.32, 0.93, 0.463], '#cad5cd') : handle('freezer-pull', 0, 0.24)}
  </group>;
}
