# Coordinated Japanese kitchen islands

Exactly three new catalog entries: Kitchen island · Japanese divider, Kitchen island · Breakfast counter, Kitchen island · Complete set. Existing islands and Japanese panels are unchanged.

The divider island defaults to a 100 cm upper divider. The breakfast counter uses a seating overhang and a 45 cm divider. The complete set combines the breakfast body with a 100 cm divider and two wooden backless stools. All share adjustable island width/depth/height, divider height, wood/frame color, countertop color and stone/wood/glass finish. Paper (translucent shoji) and woven inserts share the existing paired sliding-panel renderer and Closed/Half-open/Open controls; slats hide those controls. Rails fit the island width.

A complete set is one document item. Ungroup replaces it with the matching breakfast island (retaining the actual divider height and settings) plus two existing stool_backless items. Local-to-world rotation and centimetre conversion preserve positions and elevation. The conversion is a single document update and undo step, using existing collaboration patches. No new persisted fields or general-purpose grouping system.

Verification:
- Desktop 1440×1000: 2D/3D appearance, stool-origin dragging, rotation, panel material/state, divider height, countertop finish, Ungroup and Undo.
- Mobile 390×844: 2D/3D views, properties editing, Ungroup and one-step Undo, complete-set dragging by a stool.
- Unit tests: exactly three entries, three panel states, rotated/resized ungroup geometry, colors/elevations, no stair openings, JSON round trips, atomic history and collaborative patches.
- Local PGlite: new catalog IDs and option edits accepted; guest editor can ungroup and viewer receives the resulting stools; existing permission checks retained.
- Existing shoji, furniture, mobile drag and project-file regressions; TypeScript and production build.

Cloud activation requires supabase/migrations/202610080001_japanese_islands.sql. It updates the catalog validator only and includes the earlier catalog additions. No production database change, push or deployment was performed. Physical-touch hardware and live production collaboration were not tested. Existing bundle-size warning remains.
