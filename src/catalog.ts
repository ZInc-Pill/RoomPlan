import { ItemType } from './types';

export const ITEM_CATALOG: ItemType[] = [
  // Windows & Doors
  { id: 'win_std', name: 'Window (Standard)', category: 'window', width: 90, depth: 15, height: 120, color: '#bae6fd', shape: 'window', icon: 'AppWindow' },
  { id: 'win_large', name: 'Window (Panoramic)', category: 'window', width: 200, depth: 15, height: 150, color: '#bae6fd', shape: 'window', icon: 'AppWindow' },
  { id: 'door_int', name: 'Door (Interior)', category: 'door', width: 80, depth: 10, height: 210, color: '#8b5a2b', shape: 'door', icon: 'DoorOpen' },
  { id: 'door_ext', name: 'Door (Exterior)', category: 'door', width: 90, depth: 15, height: 210, color: '#334155', shape: 'door', icon: 'DoorClosed' },

  // Kitchen
  { id: 'kit_counter', name: 'Kitchen Counter', category: 'kitchen', width: 180, depth: 60, height: 90, color: '#e5e7eb', shape: 'counter', icon: 'CookingPot' },
  { id: 'kit_base_cabinet', name: 'Base Cabinet', category: 'kitchen', width: 60, depth: 60, height: 90, color: '#e5e7eb', shape: 'base_cabinet', icon: 'Archive' },
  { id: 'kit_corner_cabinet', name: 'Corner Cabinet', category: 'kitchen', width: 90, depth: 90, height: 90, color: '#e5e7eb', shape: 'corner_cabinet', icon: 'ArchiveRestore' },
  { id: 'kit_island', name: 'Kitchen Island', category: 'kitchen', width: 180, depth: 90, height: 90, color: '#f3f4f6', shape: 'kitchen_island', icon: 'Layout' },
  { id: 'kit_sink', name: 'Kitchen Sink', category: 'kitchen', width: 60, depth: 60, height: 20, color: '#9ca3af', shape: 'kitchen_sink', icon: 'Droplet' },
  { id: 'kit_dishwasher', name: 'Dishwasher', category: 'kitchen', width: 60, depth: 60, height: 82, color: '#d1d5db', shape: 'dishwasher', icon: 'WashingMachine' },
  { id: 'kit_fridge_std', name: 'Fridge (Single Door)', category: 'kitchen', width: 60, depth: 65, height: 180, color: '#9ca3af', shape: 'box', icon: 'Refrigerator' },
  { id: 'kit_fridge_dbl', name: 'Fridge (Double Door)', category: 'kitchen', width: 90, depth: 75, height: 180, color: '#9ca3af', shape: 'box', icon: 'Refrigerator' },
  { id: 'kit_table_4', name: 'Table (4-seat)', category: 'kitchen', width: 120, depth: 80, height: 75, color: '#a16207', shape: 'table', icon: 'Utensils' },
  { id: 'kit_table_6', name: 'Table (6-seat)', category: 'kitchen', width: 180, depth: 90, height: 75, color: '#a16207', shape: 'table', icon: 'Utensils' },

  // Bedroom
  { id: 'bed_single', name: 'Bed (Single)', category: 'bedroom', width: 100, depth: 200, height: 55, color: '#e2e8f0', shape: 'bed', icon: 'Bed' },
  { id: 'bed_queen', name: 'Bed (Queen)', category: 'bedroom', width: 160, depth: 200, height: 55, color: '#e2e8f0', shape: 'bed', icon: 'BedDouble' },
  { id: 'bed_king', name: 'Bed (King)', category: 'bedroom', width: 180, depth: 200, height: 55, color: '#e2e8f0', shape: 'bed', icon: 'BedDouble' },
  { id: 'bed_wardrobe', name: 'Wardrobe', category: 'bedroom', width: 180, depth: 60, height: 220, color: '#78350f', shape: 'box', icon: 'Archive' },
  { id: 'bed_nightstand', name: 'Nightstand', category: 'bedroom', width: 50, depth: 40, height: 55, color: '#92400e', shape: 'box', icon: 'Lamp' },

  // Living Room
  { id: 'liv_sofa_2', name: 'Sofa (2-seat)', category: 'living', width: 180, depth: 90, height: 85, color: '#4b5563', shape: 'sofa', icon: 'Sofa' },
  { id: 'liv_sofa_3', name: 'Sofa (3-seat)', category: 'living', width: 220, depth: 95, height: 85, color: '#4b5563', shape: 'sofa', icon: 'Sofa' },
  { id: 'liv_tvstand', name: 'TV Stand', category: 'living', width: 180, depth: 45, height: 55, color: '#1f2937', shape: 'box', icon: 'Tv' },
  { id: 'liv_tv_cabinet', name: 'TV Cabinet / Media Console', category: 'living', width: 180, depth: 45, height: 50, color: '#374151', shape: 'tv_cabinet', icon: 'Monitor' },
  { id: 'liv_rug_m', name: 'Rug (Medium)', category: 'living', width: 160, depth: 230, height: 1, color: '#fcd34d', shape: 'rug', icon: 'Layers' },
  { id: 'liv_rug_l', name: 'Rug (Large)', category: 'living', width: 200, depth: 300, height: 1, color: '#fcd34d', shape: 'rug', icon: 'Layers' },

  // Bathroom
  { id: 'bath_tub', name: 'Bathtub', category: 'bathroom', width: 170, depth: 70, height: 60, color: '#f8fafc', shape: 'bathtub', icon: 'Bath' },
  { id: 'bath_shower', name: 'Shower Cabin', category: 'bathroom', width: 90, depth: 90, height: 220, color: '#e0f2fe', shape: 'box', icon: 'ShowerHead' },
  { id: 'bath_toilet', name: 'Toilet', category: 'bathroom', width: 38, depth: 70, height: 80, color: '#f8fafc', shape: 'toilet', icon: 'CircleUser' },
  { id: 'bath_sink', name: 'Sink Vanity', category: 'bathroom', width: 80, depth: 50, height: 85, color: '#e2e8f0', shape: 'counter', icon: 'Droplet' },

  // Balcony
  { id: 'bal_railing', name: 'Railing', category: 'balcony', width: 100, depth: 5, height: 110, color: '#9ca3af', shape: 'railing', icon: 'Fence' },
  { id: 'bal_corner_railing', name: 'Corner Railing', category: 'balcony', width: 100, depth: 100, height: 110, color: '#9ca3af', shape: 'corner_railing', icon: 'Square' },
  { id: 'bal_plant', name: 'Potted Plant', category: 'balcony', width: 40, depth: 40, height: 100, color: '#22c55e', shape: 'cylinder', icon: 'TreePine' },
  { id: 'bal_chair', name: 'Outdoor Chair', category: 'balcony', width: 70, depth: 75, height: 85, color: '#f59e0b', shape: 'box', icon: 'Armchair' },
  { id: 'bal_lounge_chair', name: 'Lounge Chair', category: 'balcony', width: 75, depth: 85, height: 90, color: '#f59e0b', shape: 'lounge_chair', icon: 'Armchair' },

  // Architecture
  { id: 'arch_divider', name: 'Room Divider', category: 'architecture', width: 120, depth: 5, height: 200, color: '#d1d5db', shape: 'room_divider', icon: 'SplitSquareHorizontal' },
];
