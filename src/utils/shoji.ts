import type { PlacedItem } from '../types';

export const isShoji = (item: Pick<PlacedItem, 'typeId'>) => item.typeId.startsWith('shoji_');

/** Centimetres in object-local coordinates; shared by plan and preview. */
export function shojiLayout(item: PlacedItem, width: number, depth: number) {
  const paired = item.typeId.endsWith('_pair');
  const fraction = item.panelState === 'open' ? 1 : item.panelState === 'half' ? .5 : 0;
  const leafWidth = width / (paired ? 2 : 1);
  const leaves = paired
    ? [{ x: -width / 4 - leafWidth * fraction, width: leafWidth }, { x: width / 4 + leafWidth * fraction, width: leafWidth }]
    : [{ x: width * fraction, width }];
  return { leaves, fraction, trackWidth: width * 2, trackCenter: paired ? 0 : width / 2, z: depth / 2 + 3 };
}
