export type Point = { x: number; y: number };

export type Floor = {
  id: string;
  points: Point[];
  color: string;
  material?: string;
};

export type Wall = {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  color?: string;
  height?: number;
  material?: string;
};

export type ItemCategory = 
  | 'window' 
  | 'door' 
  | 'kitchen' 
  | 'bedroom' 
  | 'living' 
  | 'bathroom' 
  | 'balcony'
  | 'architecture';

export type ItemType = {
  id: string;
  name: string;
  category: ItemCategory;
  width: number; // x axis size
  height: number; // y axis (height in 3d)
  depth: number; // z axis (y in 2d)
  color: string;
  shape: 'box' | 'cylinder' | 'sofa' | 'bed' | 'table' | 'counter' | 'door' | 'window' | 'bathtub' | 'toilet' | 'rug' | 'base_cabinet' | 'corner_cabinet' | 'kitchen_island' | 'kitchen_sink' | 'dishwasher' | 'railing' | 'corner_railing' | 'lounge_chair' | 'room_divider' | 'tv_cabinet';
  icon: string;
};

export type PlacedItem = {
  id: string;
  typeId: string;
  x: number;
  y: number; // 2D y position (which translates to z in 3D)
  rotation: number; // Radians
  width?: number;
  depth?: number;
  height?: number;
  elevation?: number;
  color?: string;
  material?: string;
};

export type CommentType = {
  id: string;
  x: number;
  y: number;
  text: string;
};

export type AppMode = 'SELECT' | 'PAN' | 'DRAW_WALL' | 'DRAW_FLOOR' | 'COMMENT' | 'RULER';

export type AppState = {
  walls: Wall[];
  floors: Floor[];
  items: PlacedItem[];
  comments: CommentType[];
  mode: AppMode;
  selectedItemIds: string[];
  selectedWallId: string | null;
  selectedFloorId: string | null;
  selectedCommentId: string | null;
  view3D: boolean;
};
