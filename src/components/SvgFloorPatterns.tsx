import React from 'react';

export function SvgFloorPatterns() {
  return (
    <>
      {/* Natural Oak Planks */}
      <pattern id="pattern-oak-planks" width="60" height="20" patternUnits="userSpaceOnUse">
        <rect width="60" height="20" fill="#e2b17a" />
        <line x1="0" y1="20" x2="60" y2="20" stroke="#c29158" strokeWidth="1" />
        <line x1="30" y1="0" x2="30" y2="20" stroke="#c29158" strokeWidth="0.8" opacity="0.8" />
        <line x1="0" y1="7" x2="60" y2="7" stroke="#d5a36b" strokeWidth="0.5" strokeDasharray="12 4 8 6" opacity="0.6" />
      </pattern>

      {/* Herringbone Parquet */}
      <pattern id="pattern-herringbone-oak" width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="32" height="32" fill="#d49b5e" />
        <path d="M 0 0 L 16 16 L 0 32 M 16 0 L 32 16 L 16 32" fill="none" stroke="#b0773d" strokeWidth="1" />
        <line x1="0" y1="16" x2="32" y2="16" stroke="#b0773d" strokeWidth="0.75" />
      </pattern>

      {/* Dark Walnut */}
      <pattern id="pattern-dark-walnut" width="60" height="20" patternUnits="userSpaceOnUse">
        <rect width="60" height="20" fill="#5c3a21" />
        <line x1="0" y1="20" x2="60" y2="20" stroke="#3b2313" strokeWidth="1" />
        <line x1="45" y1="0" x2="45" y2="20" stroke="#3b2313" strokeWidth="0.8" opacity="0.8" />
        <line x1="0" y1="6" x2="60" y2="6" stroke="#482d18" strokeWidth="0.6" strokeDasharray="16 6" />
      </pattern>

      {/* Bleached Nordic Oak */}
      <pattern id="pattern-bleached-oak" width="60" height="20" patternUnits="userSpaceOnUse">
        <rect width="60" height="20" fill="#f3e8d8" />
        <line x1="0" y1="20" x2="60" y2="20" stroke="#dfceb7" strokeWidth="1" />
        <line x1="30" y1="0" x2="30" y2="20" stroke="#dfceb7" strokeWidth="0.8" opacity="0.8" />
        <line x1="0" y1="10" x2="60" y2="10" stroke="#e8dcce" strokeWidth="0.5" strokeDasharray="14 8" />
      </pattern>

      {/* Carrara White Marble */}
      <pattern id="pattern-marble-carrara" width="64" height="64" patternUnits="userSpaceOnUse">
        <rect width="64" height="64" fill="#f8fafc" />
        <path d="M 10 0 Q 25 20 20 40 T 45 64" fill="none" stroke="#cbd5e1" strokeWidth="1" opacity="0.6" />
        <path d="M 40 0 Q 30 25 50 45 T 60 64" fill="none" stroke="#e2e8f0" strokeWidth="1.5" opacity="0.8" />
      </pattern>

      {/* Nero Marquina Black Marble */}
      <pattern id="pattern-marble-nero" width="64" height="64" patternUnits="userSpaceOnUse">
        <rect width="64" height="64" fill="#1e293b" />
        <path d="M 5 0 Q 20 25 35 40 T 55 64" fill="none" stroke="#f1f5f9" strokeWidth="1" opacity="0.5" />
        <path d="M 40 5 Q 48 30 30 50" fill="none" stroke="#94a3b8" strokeWidth="0.8" opacity="0.4" />
      </pattern>

      {/* Venetian Terrazzo */}
      <pattern id="pattern-terrazzo-venetian" width="40" height="40" patternUnits="userSpaceOnUse">
        <rect width="40" height="40" fill="#f1ede4" />
        <circle cx="8" cy="12" r="2.5" fill="#d97706" opacity="0.8" />
        <rect x="22" y="8" width="3" height="3" fill="#993d28" opacity="0.8" transform="rotate(20 23 9)" />
        <circle cx="30" cy="28" r="2" fill="#334155" opacity="0.7" />
        <circle cx="14" cy="32" r="3" fill="#78716c" opacity="0.6" />
        <rect x="2" y="24" width="2.5" height="2.5" fill="#d97706" opacity="0.7" />
      </pattern>

      {/* Polished Concrete */}
      <pattern id="pattern-polished-concrete" width="40" height="40" patternUnits="userSpaceOnUse">
        <rect width="40" height="40" fill="#cbd5e1" />
        <circle cx="10" cy="8" r="0.8" fill="#64748b" opacity="0.4" />
        <circle cx="28" cy="15" r="0.8" fill="#475569" opacity="0.3" />
        <circle cx="18" cy="30" r="1.2" fill="#f1f5f9" opacity="0.6" />
        <circle cx="34" cy="34" r="0.9" fill="#94a3b8" opacity="0.5" />
      </pattern>

      {/* Porcelain Tile */}
      <pattern id="pattern-porcelain-tile" width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="#e2e8f0" />
        <rect x="1" y="1" width="30" height="30" fill="#f1f5f9" />
        <line x1="0" y1="32" x2="32" y2="32" stroke="#94a3b8" strokeWidth="1" />
        <line x1="32" y1="0" x2="32" y2="32" stroke="#94a3b8" strokeWidth="1" />
      </pattern>

      {/* Tuscan Terracotta */}
      <pattern id="pattern-terracotta-hex" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect width="24" height="24" fill="#c25e38" />
        <rect x="1" y="1" width="22" height="22" fill="#d06840" />
        <line x1="0" y1="24" x2="24" y2="24" stroke="#8c3b1e" strokeWidth="1" />
        <line x1="24" y1="0" x2="24" y2="24" stroke="#8c3b1e" strokeWidth="1" />
      </pattern>

      {/* Wool Loop Carpet */}
      <pattern id="pattern-loop-carpet" width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="12" fill="#e7e2d7" />
        <circle cx="3" cy="3" r="1.5" fill="#d1cbc0" />
        <circle cx="9" cy="9" r="1.5" fill="#d1cbc0" />
        <circle cx="3" cy="9" r="1" fill="#f5f0e6" />
        <circle cx="9" cy="3" r="1" fill="#f5f0e6" />
      </pattern>

      {/* Parisian Checkerboard */}
      <pattern id="pattern-checkerboard" width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="#f8fafc" />
        <rect x="16" y="0" width="16" height="16" fill="#334155" />
        <rect x="0" y="16" width="16" height="16" fill="#334155" />
        <rect x="16" y="16" width="16" height="16" fill="#f8fafc" />
      </pattern>
    </>
  );
}
