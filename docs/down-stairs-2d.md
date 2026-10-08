# Downward stairs: 2D layering correction

The previous 2D stairs were HTML items above the complete floor/wall SVG; selecting them raised their solid rendering to z-index 100. Floors had no openings in 2D.

Downward stairs now render in the architectural SVG before floors. Each drawing clips to its rotated footprint. A union mask cuts that same opening from every floor, including overlapping floors. Transparent opening hit targets follow the floors (SVG masks alone do not suppress pointer hits), while walls follow those targets. Selection changes only the target outline; it cannot raise the solid drawing. Downward treads above floor elevation are excluded. The arrow is labelled DOWN −1, oriented along narrow stairs for readability.

Openings derive from rendered items, including the mobile requestAnimationFrame drag preview, so there is no independently saved opening to become stale. Move/resize/rotate/delete and undo all use existing item state. Up stairs and 3D rendering are unchanged; no schema, gesture, persistence or collaboration changes.

Verified:
- Desktop 1440×1000: two overlapping floors, straight and rotated L-shaped downward stairs, crossing wall, unchanged upward U-shaped stairs.
- Opening selection, drag, rotation, width edit; mask and hit-target polygons matched after edits. Wall hit testing returned wall at overlap.
- Deletion removed an opening (2 → 1); undo restored it (1 → 2).
- Mobile 390×844: opening drag moved the stair; Layers selected the L-shaped stair; selected solid drawing remained below crossing wall.
- Browser console: no errors. TypeScript, production build, derived-opening/layer-order tests, mobile drag and document-history regressions passed.

Limitations: browser mobile viewport with mouse-driven gestures, not a physical touchscreen. No live multi-user session was exercised. Existing production bundle-size warning remains. No push or deployment.

## Floor coverage follow-up

Replaced the shared mask with per-floor opening ownership. The first intersecting floor in saved paint order owns a staircase opening; later floors remain solid. Their geometry can partially or fully cover the opening, including when their corners are extended. Hit targets are interleaved with floor layers so covered portions select the covering floor. Selection through Layers does not lift a staircase above its cover. Floor fills are opaque to prevent underground steps bleeding through.

No additional persisted fields: floor order and geometry already survive document history, JSON round trips and cloud document patches. The 3D opening algorithm is unchanged.

Verified partial and full coverage at 1440×1000 and 390×844. Desktop hit tests returned floor for the covered region and object for the exposed opening. Covered L-shaped stairs remained accessible through Layers and mobile Properties. Deleting a cover, undo and redo produced floor counts 2/3/2 and restored coverage. Automated tests cover original opening ownership, partial/full covers, separate rooms, rotation and save/load. TypeScript, production build, history, project-file and mobile-drag regressions passed. Physical touch-device testing was not performed.
