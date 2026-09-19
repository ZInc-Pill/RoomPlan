

export interface MaterialDef {
  id: string;
  name: string;
  category: 'wood' | 'stone' | 'tile' | 'concrete' | 'fabric' | 'leather' | 'metal' | 'plaster';
  color: string;
  roughness: number;
  metalness: number;
  previewUrl?: string;
  description?: string;
}

export const FLOOR_MATERIALS: MaterialDef[] = [
  {
    id: 'oak-planks',
    name: 'Natural Oak Planks',
    category: 'wood',
    color: '#e2b17a',
    roughness: 0.5,
    metalness: 0.0,
    description: 'Warm honey-toned European oak with linear grain'
  },
  {
    id: 'herringbone-oak',
    name: 'Herringbone Parquet',
    category: 'wood',
    color: '#d49b5e',
    roughness: 0.45,
    metalness: 0.0,
    description: 'Classic French chevron herringbone parquet pattern'
  },
  {
    id: 'dark-walnut',
    name: 'Rich American Walnut',
    category: 'wood',
    color: '#5c3a21',
    roughness: 0.5,
    metalness: 0.0,
    description: 'Deep espresso hardwood with luxurious dark wood grain'
  },
  {
    id: 'bleached-oak',
    name: 'Bleached Nordic Oak',
    category: 'wood',
    color: '#f3e8d8',
    roughness: 0.55,
    metalness: 0.0,
    description: 'Light airy Scandinavian bleached timber floor'
  },
  {
    id: 'marble-carrara',
    name: 'Carrara White Marble',
    category: 'stone',
    color: '#f8fafc',
    roughness: 0.2,
    metalness: 0.05,
    description: 'Polished Italian white marble with soft grey veins'
  },
  {
    id: 'marble-nero',
    name: 'Nero Marquina Marble',
    category: 'stone',
    color: '#1e293b',
    roughness: 0.18,
    metalness: 0.08,
    description: 'Dramatic black marble with crisp white crystalline veining'
  },
  {
    id: 'terrazzo-venetian',
    name: 'Venetian Terrazzo',
    category: 'stone',
    color: '#f1ede4',
    roughness: 0.35,
    metalness: 0.0,
    description: 'Creamy composite stone with multi-toned mineral chips'
  },
  {
    id: 'polished-concrete',
    name: 'Polished Concrete',
    category: 'concrete',
    color: '#cbd5e1',
    roughness: 0.4,
    metalness: 0.05,
    description: 'Modern architectural concrete with subtle trowel aggregate'
  },
  {
    id: 'porcelain-tile',
    name: 'Large Porcelain Tile',
    category: 'tile',
    color: '#e2e8f0',
    roughness: 0.3,
    metalness: 0.02,
    description: 'Minimalist 60×60cm matte porcelain architectural tile'
  },
  {
    id: 'terracotta-hex',
    name: 'Tuscan Terracotta',
    category: 'tile',
    color: '#c25e38',
    roughness: 0.75,
    metalness: 0.0,
    description: 'Warm rustic Mediterranean terracotta tile'
  },
  {
    id: 'loop-carpet',
    name: 'Cozy Wool Loop Carpet',
    category: 'fabric',
    color: '#e7e2d7',
    roughness: 0.95,
    metalness: 0.0,
    description: 'Tactile textured wool carpet weave with acoustic softness'
  },
  {
    id: 'checkerboard',
    name: 'Parisian Checkerboard',
    category: 'stone',
    color: '#e2e8f0',
    roughness: 0.28,
    metalness: 0.05,
    description: 'Classic alternating ivory and charcoal checkerboard tiles'
  }
];

export const WALL_MATERIALS: MaterialDef[] = [
  {
    id: 'white-plaster',
    name: 'Smooth White Plaster',
    category: 'plaster',
    color: '#f8fafc',
    roughness: 0.9,
    metalness: 0.0,
    description: 'Crisp, bright architectural matte white finish'
  },
  {
    id: 'warm-limewash',
    name: 'Warm Linen Limewash',
    category: 'plaster',
    color: '#f5efe6',
    roughness: 0.92,
    metalness: 0.0,
    description: 'Organic textural limewash with subtle tone movement'
  },
  {
    id: 'exposed-brick',
    name: 'Exposed Red Brick',
    category: 'tile',
    color: '#993d28',
    roughness: 0.88,
    metalness: 0.0,
    description: 'Loft-style terracotta and red clay running bond masonry'
  },
  {
    id: 'white-brick',
    name: 'Painted White Brick',
    category: 'tile',
    color: '#f1f5f9',
    roughness: 0.82,
    metalness: 0.0,
    description: 'Tactile exposed brick painted in clean Scandinavian white'
  },
  {
    id: 'wood-slats',
    name: 'Acoustic Wood Slats',
    category: 'wood',
    color: '#c8955c',
    roughness: 0.6,
    metalness: 0.0,
    description: 'Contemporary vertical oak acoustic battens on dark felt'
  },
  {
    id: 'concrete-board',
    name: 'Architectural Concrete',
    category: 'concrete',
    color: '#94a3b8',
    roughness: 0.65,
    metalness: 0.05,
    description: 'Smooth cast concrete with subtle formwork panel joints'
  },
  {
    id: 'sage-mineral',
    name: 'Nordic Sage Mineral',
    category: 'plaster',
    color: '#8da399',
    roughness: 0.88,
    metalness: 0.0,
    description: 'Calming botanical muted sage green accent finish'
  },
  {
    id: 'charcoal-slate',
    name: 'Charcoal Feature Slate',
    category: 'stone',
    color: '#334155',
    roughness: 0.75,
    metalness: 0.05,
    description: 'Sophisticated deep charcoal moody accent surface'
  },
  {
    id: 'wainscot-cream',
    name: 'Classic Wainscoting',
    category: 'wood',
    color: '#eef0eb',
    roughness: 0.7,
    metalness: 0.0,
    description: 'Traditional architectural panel moulding and shiplap'
  }
];

export const ITEM_FINISHES: MaterialDef[] = [
  { id: 'linen-sand', name: 'Sand Linen', category: 'fabric', color: '#c9baa4', roughness: 0.93, metalness: 0, description: 'Soft warm neutral upholstery' },
  { id: 'weave-sage', name: 'Sage Weave', category: 'fabric', color: '#8b9b89', roughness: 0.9, metalness: 0, description: 'Muted botanical green upholstery' },
  { id: 'weave-clay', name: 'Clay Weave', category: 'fabric', color: '#b88773', roughness: 0.9, metalness: 0, description: 'Soft earthy rose upholstery' },
  // Woods
  {
    id: 'natural-oak',
    name: 'Natural Oak',
    category: 'wood',
    color: '#d4a373',
    roughness: 0.6,
    metalness: 0.0,
    description: 'Warm honey oak timber with organic grain'
  },
  {
    id: 'rich-walnut',
    name: 'American Walnut',
    category: 'wood',
    color: '#5c3d2e',
    roughness: 0.55,
    metalness: 0.0,
    description: 'Dark luxurious walnut timber'
  },
  {
    id: 'bleached-birch',
    name: 'Bleached Birch',
    category: 'wood',
    color: '#ede4d4',
    roughness: 0.65,
    metalness: 0.0,
    description: 'Nordic pale birch wood'
  },
  {
    id: 'black-ash',
    name: 'Black Stained Ash',
    category: 'wood',
    color: '#222225',
    roughness: 0.6,
    metalness: 0.05,
    description: 'Modern black stained timber with visible wood grain'
  },

  // Fabrics & Textiles
  {
    id: 'boucle-cream',
    name: 'Bouclé Cream',
    category: 'fabric',
    color: '#f6f3eb',
    roughness: 0.92,
    metalness: 0.0,
    description: 'Cozy textured looped bouclé fabric'
  },
  {
    id: 'linen-charcoal',
    name: 'Charcoal Linen',
    category: 'fabric',
    color: '#3f3f46',
    roughness: 0.88,
    metalness: 0.0,
    description: 'Textured woven charcoal linen'
  },
  {
    id: 'scandi-grey',
    name: 'Heather Grey Weave',
    category: 'fabric',
    color: '#94a3b8',
    roughness: 0.85,
    metalness: 0.0,
    description: 'Durable Scandinavian heather grey upholstery'
  },
  {
    id: 'velvet-emerald',
    name: 'Emerald Velvet',
    category: 'fabric',
    color: '#064e3b',
    roughness: 0.68,
    metalness: 0.05,
    description: 'Lush jewel-toned forest emerald velvet'
  },
  {
    id: 'velvet-navy',
    name: 'Midnight Navy Velvet',
    category: 'fabric',
    color: '#1e3a8a',
    roughness: 0.68,
    metalness: 0.05,
    description: 'Deep royal blue velvet with rich luster'
  },
  {
    id: 'warm-terracotta',
    name: 'Terracotta Weave',
    category: 'fabric',
    color: '#c2410c',
    roughness: 0.85,
    metalness: 0.0,
    description: 'Earthy Mediterranean terracotta upholstery'
  },

  // Leathers
  {
    id: 'leather-cognac',
    name: 'Cognac Saddle Leather',
    category: 'leather',
    color: '#9a3412',
    roughness: 0.45,
    metalness: 0.05,
    description: 'Vintage full-grain cognac leather'
  },
  {
    id: 'leather-black',
    name: 'Obsidian Nappa Leather',
    category: 'leather',
    color: '#18181b',
    roughness: 0.4,
    metalness: 0.05,
    description: 'Soft premium black leather with subtle sheen'
  },

  // Metals & Stones
  {
    id: 'brushed-brass',
    name: 'Brushed Brass',
    category: 'metal',
    color: '#d97706',
    roughness: 0.28,
    metalness: 0.85,
    description: 'Warm architectural brushed brass metal'
  },
  {
    id: 'matte-black-steel',
    name: 'Matte Black Steel',
    category: 'metal',
    color: '#1e2022',
    roughness: 0.55,
    metalness: 0.5,
    description: 'Industrial powder-coated matte black steel'
  },
  {
    id: 'polished-chrome',
    name: 'Polished Chrome',
    category: 'metal',
    color: '#e2e8f0',
    roughness: 0.12,
    metalness: 0.95,
    description: 'Mirror-finish polished chrome metal'
  },
  {
    id: 'marble-top',
    name: 'Carrara Stone Top',
    category: 'stone',
    color: '#f8fafc',
    roughness: 0.22,
    metalness: 0.05,
    description: 'Polished white marble tabletop'
  }
];

// Helper Lookups
export function getFloorMaterial(id?: string): MaterialDef {
  if (!id) return FLOOR_MATERIALS[0];
  const found = FLOOR_MATERIALS.find(m => m.id === id);
  return found || FLOOR_MATERIALS[0];
}

export function getWallMaterial(id?: string): MaterialDef {
  if (!id) return WALL_MATERIALS[0];
  const found = WALL_MATERIALS.find(m => m.id === id);
  return found || WALL_MATERIALS[0];
}

export function getItemFinish(id?: string): MaterialDef | null {
  if (!id) return null;
  return ITEM_FINISHES.find(m => m.id === id) || null;
}

// In-memory texture cache to reuse Three.js CanvasTextures efficiently
