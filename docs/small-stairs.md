# Stair symbols and compact platform steps

Six new catalog objects preserve all existing stair IDs:
- Stair symbol · 2D only: straight, L-shaped, U-shaped, UP +1 / DOWN −1 direction. Transparent plan annotations with movement, rotation and footprint resizing. No 3D object or gizmo, no floor cutouts.
- Platform steps · 2D + 3D: fixed 2/3/4-step variants, default 28 cm tread depth and 16 cm rise. Per-step controls derive total depth/height; generic width, color and material controls remain available. Lightweight box geometry, no floor openings.

Uses existing dimensions and stairDirection fields, document history, save/load and collaborative patches. No conversion of legacy stairs. Apply migration 202610070004_small_stairs.sql to the existing Supabase project to accept all new catalog IDs (the validator includes previous shoji/furniture options). Pushing to GitHub does not install database migrations.

Verified desktop 1440×1000 and mobile 390×844 in 2D and 3D. Desktop symbol drag, direction change, rotation and resize; desktop/mobile platform per-step controls; mobile symbol/platform dragging and direction change. Symbols absent from 3D, including the selection gizmo. Automated six-variant round trips, no-opening checks, undo/redo, collaboration patches and local PGlite owner/guest validation passed. Existing object pack, furniture, shoji and mobile gesture regressions and production build passed. Existing bundle-size warning remains. Physical touch hardware and live production multi-user sessions were not tested.
