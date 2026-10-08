# Shoji-inspired sliding panels

Four catalog entries: short single/paired panels in Kitchen and tall single/paired panels in Living. All can be freely placed or attached through the existing opening system. Short panels start at 90 cm elevation with 110 cm height; tall panels start at floor level with 240 cm height.

Properties include Closed, Half-open and Fully open; translucent paper or woven inserts; frame color; and the existing width, height and elevation controls. Width means the fixed wall opening width. Single leaves slide to the right; paired leaves slide apart. A shared local-coordinate layout supplies both the 2D plan and 3D renderer. Sliding leaves, frame and track belong to one item, so movement, rotation, deletion and duplication preserve the assembly. Allow lateral wall space for open leaves; no adjacent-object clearance solver is added.

The 3D frame has timber-colored perimeter rails and latticework. Paper uses lightweight transparency; woven inserts use opaque panels and fine horizontal strips. State changes set discrete positions, without a door-opening animation or physics simulation.

`panelState` and `panelMaterial` are optional validated project fields, defaulting to closed/paper for legacy documents. Import/export, history and collaboration patches retain them. The fixed wall opening never changes as leaves slide. The new Supabase validator migration is `202610070002_shoji_panels.sql`; apply it after prior migrations before using the new objects in cloud projects. No production database changes, push or deployment were performed.

Verification:
- TypeScript and production build pass (existing large-chunk warning).
- `scripts/test-shoji.ts`: four variants × three states × two inserts, opening coverage, paired symmetry, frame options, save/load, attached geometry, fixed wall openings, collaboration patches, undo/redo and invalid-field rejection.
- `scripts/test-object-pack-database.ts`: all four migrations tested locally; every catalog entry accepted; guest editor panel-state/material updates read back by a viewer; invalid states/materials and unauthorized writes rejected.
- Existing object-pack, mobile dragging/gesture ownership and cloud synchronization tests pass.
- Desktop 1440×1000: inspected 2D footprints and 3D closed/half-open panels; selected a paired panel in 3D and changed it to fully open.
- Mobile 390×844: selected a short panel from Layers, changed state and material, inspected frame/dimension controls, verified Undo returns to Half-open and Redo to Fully open, and switched to 3D to inspect the same saved state.

Browser checks use an isolated test room (`/scripts/browser-fixtures/object-pack.html`, Shoji button). Native physical-phone touch and live production multi-device collaboration remain untested. Database and collaboration checks ran locally.
