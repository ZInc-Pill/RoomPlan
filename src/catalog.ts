import { ItemType } from './types';

export const ITEM_CATALOG: ItemType[] = [
  // Windows & Doors
  { id: 'win_std', defaultElevation: 90, name: 'Window (Standard)', category: 'window', width: 90, depth: 15, height: 120, color: '#bae6fd', shape: 'window', icon: 'AppWindow' },
  { id: 'win_large', name: 'Window (Panoramic)', category: 'window', width: 200, depth: 15, height: 150, color: '#bae6fd', shape: 'window', icon: 'AppWindow' },
  { id: 'door_int', name: 'Door (Interior)', category: 'door', width: 80, depth: 10, height: 210, color: '#8b5a2b', shape: 'door', icon: 'DoorOpen' },
  { id: 'door_ext', name: 'Door (Exterior)', category: 'door', width: 90, depth: 15, height: 210, color: '#334155', shape: 'door', icon: 'DoorClosed' },

  { id: 'win_high', name: 'Window (High horizontal)', category: 'window', width: 180, depth: 15, height: 50, defaultElevation: 180, color: '#bae6fd', shape: 'window', icon: 'AppWindow' },
  { id: 'win_wall', name: 'Window (Long panoramic)', category: 'window', width: 360, depth: 15, height: 150, defaultElevation: 90, color: '#bae6fd', shape: 'window', icon: 'PanelsTopLeft' },
  { id: 'win_tall', name: 'Window (Floor to ceiling)', category: 'window', width: 120, depth: 15, height: 270, color: '#bae6fd', shape: 'window', icon: 'PanelTop' },
  { id: 'door_glass_single', name: 'Glass Door (Single)', category: 'door', width: 90, depth: 12, height: 270, color: '#d9e9eb', shape: 'door', icon: 'DoorOpen' },
  { id: 'door_glass_double', name: 'Glass Door (Double)', category: 'door', width: 180, depth: 12, height: 270, color: '#d9e9eb', shape: 'door', icon: 'PanelsTopLeft' },
  { id: 'door_glass_sliding', name: 'Glass Door (Sliding)', category: 'door', width: 240, depth: 16, height: 270, color: '#d9e9eb', shape: 'door', icon: 'PanelLeftRightDashed' },

  // Shoji panels use the same wall opening and placement rules as windows/doors.
  { id: 'shoji_short_single', name: 'Shoji (Short single)', category: 'kitchen', width: 100, depth: 12, height: 110, defaultElevation: 90, color: '#eee5d4', shape: 'window', icon: 'AppWindow' },
  { id: 'shoji_short_pair', name: 'Shoji (Short paired)', category: 'kitchen', width: 180, depth: 12, height: 110, defaultElevation: 90, color: '#eee5d4', shape: 'window', icon: 'PanelsTopLeft' },
  { id: 'shoji_tall_single', name: 'Shoji (Tall single)', category: 'living', width: 100, depth: 12, height: 240, color: '#eee5d4', shape: 'door', icon: 'DoorOpen' },
  { id: 'shoji_tall_pair', name: 'Shoji (Tall paired)', category: 'living', width: 180, depth: 12, height: 240, color: '#eee5d4', shape: 'door', icon: 'PanelsTopLeft' },

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

  { id: 'kit_island_seating', name: 'Island (Seating overhang)', category: 'kitchen', width: 200, depth: 110, height: 90, color: '#d6c5ac', shape: 'kitchen_island', icon: 'Layout' },
  { id: 'kit_island_divider', name: 'Island (With divider)', category: 'kitchen', width: 200, depth: 100, height: 90, color: '#d6c5ac', shape: 'kitchen_island', icon: 'Columns3' },

  { id: 'chair_wood', name: 'Dining Chair (Wooden)', category: 'kitchen', width: 46, depth: 50, height: 82, color: '#c3a17b', shape: 'chair', icon: 'Armchair' },
  { id: 'chair_upholstered', name: 'Dining Chair (Upholstered)', category: 'kitchen', width: 52, depth: 56, height: 86, color: '#d6caba', shape: 'chair', icon: 'Armchair' },
  { id: 'chair_modern', name: 'Dining Chair (Modern)', category: 'kitchen', width: 48, depth: 50, height: 80, color: '#d4d9d3', shape: 'chair', icon: 'Armchair' },
  { id: 'stool_backless', name: 'Bar Stool (Backless)', category: 'kitchen', width: 40, depth: 40, height: 75, color: '#c3a17b', shape: 'chair', icon: 'Armchair' },
  { id: 'stool_low', name: 'Bar Stool (Low back)', category: 'kitchen', width: 44, depth: 46, height: 94, color: '#bca991', shape: 'chair', icon: 'Armchair' },
  { id: 'stool_full', name: 'Bar Stool (Full back)', category: 'kitchen', width: 46, depth: 50, height: 112, color: '#d6caba', shape: 'chair', icon: 'Armchair' },
  { id: 'tv_tabletop', name: 'TV (Tabletop stand)', category: 'living', width: 122, depth: 25, height: 78, color: '#202523', shape: 'tv', icon: 'Tv' },
  { id: 'tv_wall', name: 'TV (Wall mounted)', category: 'living', width: 122, depth: 6, height: 68.625, defaultElevation: 110, color: '#202523', shape: 'tv', icon: 'Tv' },
  { id: 'coffee_rect', name: 'Coffee Table (Rectangular)', category: 'living', width: 110, depth: 60, height: 40, color: '#bd9b73', shape: 'coffee_table', icon: 'Table' },
  { id: 'coffee_round', name: 'Coffee Table (Round)', category: 'living', width: 75, depth: 75, height: 40, color: '#bd9b73', shape: 'coffee_table', icon: 'Circle' },
  { id: 'coffee_oval', name: 'Coffee Table (Oval)', category: 'living', width: 120, depth: 65, height: 40, color: '#bd9b73', shape: 'coffee_table', icon: 'Table' },

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

  { id: 'stair_symbol_straight', name: 'Stair symbol · 2D only (Straight)', category: 'architecture', width: 110, depth: 320, height: 1, color: '#334155', shape: 'stair_symbol', icon: 'ChartNoAxesColumnIncreasing' },
  { id: 'stair_symbol_l', name: 'Stair symbol · 2D only (L-shaped)', category: 'architecture', width: 240, depth: 320, height: 1, color: '#334155', shape: 'stair_symbol', icon: 'ChartNoAxesColumnIncreasing' },
  { id: 'stair_symbol_u', name: 'Stair symbol · 2D only (U-shaped)', category: 'architecture', width: 240, depth: 320, height: 1, color: '#334155', shape: 'stair_symbol', icon: 'ChartNoAxesColumnIncreasing' },
  { id: 'platform_steps_2', name: 'Platform steps · 2D + 3D (2-step)', category: 'architecture', width: 120, depth: 56, height: 32, color: '#c7b69e', shape: 'platform_steps', icon: 'ChartNoAxesColumnIncreasing' },
  { id: 'platform_steps_3', name: 'Platform steps · 2D + 3D (3-step)', category: 'architecture', width: 120, depth: 84, height: 48, color: '#c7b69e', shape: 'platform_steps', icon: 'ChartNoAxesColumnIncreasing' },
  { id: 'platform_steps_4', name: 'Platform steps · 2D + 3D (4-step)', category: 'architecture', width: 120, depth: 112, height: 64, color: '#c7b69e', shape: 'platform_steps', icon: 'ChartNoAxesColumnIncreasing' },
  { id: 'kit_japanese_divider', name: 'Kitchen island · Japanese divider', category: 'kitchen', width: 200, depth: 90, height: 90, color: '#e4ded3', shape: 'kitchen_island', icon: 'Columns3' },
  { id: 'kit_breakfast_counter', name: 'Kitchen island · Breakfast counter', category: 'kitchen', width: 200, depth: 100, height: 90, color: '#e4ded3', shape: 'kitchen_island', icon: 'Columns3' },
  { id: 'kit_japanese_complete', name: 'Kitchen island · Complete set', category: 'kitchen', width: 200, depth: 100, height: 90, color: '#e4ded3', shape: 'kitchen_island', icon: 'Columns3' },
  // Decorative stairs: height is the positive rise/descent magnitude.
  { id: 'stairs_straight', name: 'Stairs (Straight)', category: 'architecture', width: 110, depth: 360, height: 280, color: '#c7b69e', shape: 'stairs', icon: 'ChartNoAxesColumnIncreasing' },
  { id: 'stairs_l', name: 'Stairs (L-shaped)', category: 'architecture', width: 280, depth: 320, height: 280, color: '#c7b69e', shape: 'stairs', icon: 'CornerDownRight' },
  { id: 'stairs_u', name: 'Stairs (U-shaped)', category: 'architecture', width: 240, depth: 320, height: 280, color: '#c7b69e', shape: 'stairs', icon: 'CornerRightUp' },

  // Architecture
  { id: 'arch_divider', name: 'Room Divider', category: 'architecture', width: 120, depth: 5, height: 200, color: '#d1d5db', shape: 'room_divider', icon: 'SplitSquareHorizontal' },
];
