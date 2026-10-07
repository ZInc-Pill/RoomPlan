# RoomPlan object pack — local implementation

## Included

- Plain island, seating-overhang island and compound divider island. Five divider styles: solid panel, timber slats, clear glass, fluted glass and folding rigid panels. Dimensions and finish use existing controls; divider height/style belong to the island and move/save/undo with it.
- Straight, L and U decorative stairs. Direction selects Up (+1) or Down (−1); width, length, rise/descent and railings are editable. 2D footprints include direction arrows. Down stairs derive a rectangular stairwell from their transformed footprint, subtracting it from both drawn floors and the default ground. Side walls and a lower landing are part of the object. Moving, rotating, resizing, deleting or undoing changes the opening automatically.
- High horizontal (180 cm elevation), long panoramic (90 cm elevation), and tall floor-to-ceiling (0 cm elevation, 270 cm height) windows. Standard windows still start at 90 cm; existing saved elevations are not changed.
- Full-height single, double and sliding glass doors, using the existing opening attachment and wall-cutout logic. Windows and glass doors have editable frame colors.
- New fields pass through project import/export, document history and collaboration patches. Existing desktop/mobile selection and movement systems are reused.

## Verification

Browser checks used an isolated fixture at `/scripts/browser-fixtures/object-pack.html`, not a production cloud project.

- Desktop 1440×1000: inspected 2D stair footprints, 3D stairs and actual below-floor openings, all island/divider variants, and wall-attached window/glass-door variants.
- Mobile 390×844: inspected 2D/3D rendering and property panel layout; selected a glass door from Layers and edited its frame color; changed stair direction, descent and railings; dragged a stair from (150,140) to (211,183), then verified one Undo restored (150,140); changed a divider to folding panels; added a standard window and confirmed elevation=90.
- TypeScript and production build pass. Vite still reports large bundle chunks.
- `test-object-pack.ts`: catalog defaults, property validation, JSON round trips, wall attachment, rotated/overlapping/edge-crossing floor holes, deletion, history and collaboration patches.
- `test-object-pack-database.ts`: all catalog types through local PostgreSQL RPC validation, opening defaults, guest editor save/read, viewer write denial, invalid fields and private validator permissions.
- Existing mobile drag/gesture ownership, document history, project file, guest collaboration, cloud sync and camera movement regressions pass.

## Limits and rollout

Nothing was pushed or deployed. Before cloud use, apply `supabase/migrations/202610070001_object_pack.sql` through the normal deployment process. It extends the document validator while preserving authorization and grants; it was tested with both preceding migrations locally. The live Supabase project was not modified and live multi-device collaboration was not retested.

Mobile browser viewport checks used pointer automation, not a physical phone or native multi-touch. Existing gesture regression tests cover ownership. Stairs are decorative only: there are no editable lower floors, walk-camera stair traversal or structural/building-code guarantees. L/U stairs use rectangular stairwells. Glass and fluting use lightweight geometry/transparency; folding panels are a static decorative form. Island dividers share the island finish. Optional 3D guide grid lines remain a visual overlay above stair openings.
