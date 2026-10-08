import type {PlacedItem} from '../types';
export const isStairSymbol=(item:PlacedItem)=>['stair_symbol_straight','stair_symbol_l','stair_symbol_u'].includes(item.typeId);
export const isPlatformSteps=(item:PlacedItem)=>['platform_steps_2','platform_steps_3','platform_steps_4'].includes(item.typeId);
export const platformCount=(item:PlacedItem)=>item.typeId==='platform_steps_2'?2:item.typeId==='platform_steps_3'?3:4;
