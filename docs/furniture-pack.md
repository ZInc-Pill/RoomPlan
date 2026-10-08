# Seating, TV, coffee table and railing update

Implemented locally, extending the pending shoji update. No push, deployment or live database change.

## Objects and controls

- Three dining chairs: wooden slatted back, upholstered, minimalist modern. Three bar stools: backless, low back and full back. Separate frame and seat colors; wood, fabric and leather seat options; dimensions, elevation and seat height. Seat-height changes preserve the backrest's relative height. Upholstery changes seat thickness and surface roughness.
- Tabletop and wall-mounted TVs with slim frames, dark screens, stands or rear mounting brackets. Diagonal size in inches sets approximately 16:9 dimensions, rounded to 0.1 cm. Elevation sets bottom height; wall-mounted TV defaults to 110 cm. Place it against a wall manually: it does not cut a wall opening or use door/window attachment. Tabletop TV can be elevated onto an existing console.
- Low rectangular, round and oval coffee tables, with wood/glass/stone finishes, top tint and independent leg color. Round/oval geometry uses 24 segments; glass edges remain visible without heavy transmission effects.
- Existing railing IDs, coordinates and endpoint editing remain unchanged. Posts, top rails and metal/glass/wood infill now follow the original centerlines. Corner arms share one post; bays subdivide equally when dimensions change. Separate rail segments can meet at their existing endpoints. No automatic joining or structural/code certification is added.

The models use low-detail primitives, capped railing subdivisions and shared 2D/3D layout calculations. Changes continue through the existing selection, movement, undo and persistence paths. New optional fields are validated for import and cloud saving; legacy objects use defaults without rewriting their dimensions.

## Verification

- TypeScript and production build pass; existing Vite large-chunk warning remains.
- `test-furniture-pack.ts`: all 11 new catalog types, finish and seat data round trips, diagonal sizing, legacy railings, rotated/resized railing endpoint alignment, single corner joint, collaboration patches and undo/redo.
- `test-object-pack-database.ts`: all five migrations applied locally; catalog accepted; guest editor changes to seat height/material, tabletop finish/leg color and railing style read back by viewer; malformed options and unauthorized writes rejected.
- Existing mobile gesture/drag, project-file and shoji regressions pass.
- Browser checks at 1440×1000 and 390×844: furniture/railing 2D and 3D rendering, mobile selection, retained endpoint handles, railing-style change, chair seat height from 45 to 50 cm (total height 86 to 91 cm), leather selection, TV size 65 inches and elevation 120 cm. Fixed mobile sliders to represent exact chair sizes and thin railing/TV depth values.

Before cloud use, apply `202610070003_furniture_pack.sql` after preceding migrations, including the pending shoji migration. Live production collaboration and physical-phone touch were not tested. Browser tests use `/scripts/browser-fixtures/object-pack.html` (Furniture and Railings scenes). Finishes are lightweight approximations, not photorealistic material scans.
