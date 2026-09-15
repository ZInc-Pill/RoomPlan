# Room Plan: detailed audit and update plan

Audit date: 16 September 2026. Scope: the Google AI Studio export in this workspace. This is an assessment and implementation plan; application source has not been changed for this audit.

## Assessment

The project has a substantial working foundation: a 2D editor, a 3D preview, an asset catalog, material controls, floor editing, measurements, comments, layers, keyboard shortcuts, mobile components, and JSON export/import. The highest-value update is to make these features reliable and consistent before adding more features or visual effects.

The principal risks are incorrect history, inconsistent physical units, fragile editing gestures, and loss of unsaved work. Visual polish should follow these fixes so it presents trustworthy behavior.

## Coverage and evidence

Reviewed all 33 source files, six verification scripts, project configuration, README, refactoring notes, and auxiliary code snippets. Reviewed the major paths for state/history, import/export, drawing, snapping, selection, 2D/3D rendering, camera controls, materials, and mobile UI.

Executed checks:

| Check | Result |
|---|---|
| `npm run lint` | Passed; this command performs TypeScript checking, not a separate lint ruleset. |
| `npm run build` | Passed. One JavaScript asset is 2,690.96 kB, 632.73 kB gzip; Vite reported its large-chunk warning. |
| All six `scripts/test-stage5*.ts` scripts | Passed. Coverage largely concerns helpers and simulated interactions rather than mounted editor workflows. |
| Desktop browser smoke test | Drew a floor and wall, added furniture, exercised floor duplication and clear/undo/redo, and opened 3D. |
| Floor duplication | Reproduced failure: clicking Duplicate floor left the layer count at one. |
| Clear → Undo → Redo | Reproduced failure: redo left the restored floor and wall present instead of returning to an empty plan. |
| 3D desktop layout | Observed camera controls overlapping the inspector and wrapped labels at 1280 × 720. |
| Browser console in tested flow | Three.js deprecation warnings for Clock and shadow-map mode; no runtime error observed in this limited flow. |

Build and script execution needed permission to spawn the build tooling in this environment. The earlier installation also encountered a React/React Three Fiber peer constraint; the local successful installation used React and React DOM 19.2.8 without saving dependency changes. Reproducible installation still needs attention.

Limitations: this is a full source review plus selected desktop workflows, not exhaustive interaction coverage. Real mobile touch, Safari/Firefox, large-project performance, malformed-file handling, and exported-image quality still need dedicated execution. Findings below distinguish reproduced defects from code findings and proposed enhancements.

## Prioritized findings

P0 means project integrity or measurement correctness; P1 means core editing reliability; P2 means presentation, performance, and workflow improvements.

| Priority | Finding and evidence | Proposed correction |
|---|---|---|
| P0 | Clear/undo/redo fails in the browser. `src/App.tsx` records history separately inside each entity setter, using other arrays from closures. | Commit the complete document atomically through one command/history layer. |
| P0 | Pointer and joystick updates can record many full history snapshots for one gesture. History is unbounded. Code finding. | Preview during a gesture; commit once at its end; cap history by a documented policy. |
| P0 | Coordinates use 40 world units/metre, while wall-height controls use 50. A default 150-unit wall displays as 3 m but corresponds to 3.75 m. Code finding. | Centralize all conversion and formatting; migrate existing documents without silently changing their geometry. |
| P0 | No autosave or crash recovery path in the application state flow. | Persist versioned documents locally with recovery and visible save status. |
| P0 | Import parses JSON without a document schema; missing fields can retain parts of the current document. Multiple setters create a non-atomic replacement. | Validate first, replace once, show errors, and preserve the current plan when validation fails. |
| P1 | Floor duplication is wired to a handler with no floor branch. Browser reproduced. | Implement duplication through the shared document commands with fresh IDs and defined selection behavior. |
| P1 | App and 3D components both register keyboard actions; some keys also change 2D tools while 3D is active. Code finding. | One shortcut registry scoped to view, focus, modal, and editing state. Do not assume duplicate listeners imply a doubled rotation; the tested keypress rotated 45 degrees. |
| P1 | Mobile wall thickness and 3D position/snap labels have unit inconsistencies. Code finding. | Route desktop, mobile, gizmo, ruler, and snap values through the same conversions. |
| P1 | Pointer capture/cancellation is inconsistent. Leaving the canvas can finish an operation; objects stop events used by the multi-pointer tracker. Code finding requiring touch verification. | Explicit pointer lifecycle with capture, cancellation, gesture ownership, and cleanup on blur. |
| P1 | Shift-constrained drawing previews and committed coordinates can differ. Floor dragging can fail to return to its starting position; joystick snapping can alter polygon shape. Code findings. | Use one computed transform for preview and commit; translate entire polygons rigidly. |
| P1 | Selection uses item centres, wall midpoints, and floor centres, with differing multi-selection behavior. | Specify and implement consistent selection, marquee intersection, and mixed-entity commands. |
| P1 | Walls are independent segments; openings are inferred from proximity rather than attached to a wall. | Introduce wall junctions and explicit opening ownership after the document schema is stable. |
| P1 | Door/window holes lack a complete overlap and boundary model. | Validate opening extents, merge compatible cutouts, and generate valid lintel/sill geometry. |
| P1 | 2D Fit resets pan and zoom; 3D bounds primarily use walls. Floor-only or furniture-only documents may frame poorly. | Compute complete document bounds and fit within the unobscured viewport. |
| P1 | Several material controls do not consistently affect rendered objects. Furniture texture properties are computed but not applied to its mesh materials; some wall material IDs fall back to white. | Define renderer support per material and share it across views. |
| P1 | 2D image export captures the editor container; fallback SVG cannot include DOM furniture/comments. 3D canvas export excludes HTML overlays. | Build a deliberate export surface with explicit inclusion options. |
| P2 | Desktop camera controls overlap the inspector. Browser observed. | Reserve space for panels and use a compact responsive camera toolbar. |
| P2 | Large eager-loaded bundle; 3D is statically imported and the catalog uses a namespace icon import. | Lazy-load 3D/export paths, use explicit icon mappings, then measure the resulting chunks. |
| P2 | Accessibility gaps include disabled browser zoom, small labels, unnamed controls, and incomplete dialog/focus semantics. | Restore zoom, label controls, support keyboard focus and proper dialogs, and improve readable sizing. |
| P2 | Camera reset, viewport persistence, and new-item placement need consistent behavior. New assets use a fixed position; view switches remount 2D state. | Preserve viewport preferences; place items in the visible workspace; make reset deterministic. |
| P2 | Mobile components exist, but reliable breakpoint updates and gesture behavior need verification. | Subscribe to responsive layout changes and test phone/tablet workflows on real devices. |
| P2 | Tooling/documentation drift: duplicate Vite declaration, no test command/CI, Windows-incompatible clean command, and generic AI Studio setup instructions. | Choose one package manager and lockfile, clean scripts/dependencies, and document the actual application. |

## Step-by-step implementation sequence

### 1. Establish a reproducible baseline

- Preserve a known-working project snapshot and representative JSON fixtures.
- Choose the package manager, commit its lockfile, and resolve peer versions deliberately.
- Add a single verification command for type checking, existing scripts, and build.
- Add browser regression cases for the two reproduced failures before fixing them.
- Update setup documentation and separate generated snippets from maintained source.

Completion: a clean checkout installs and builds with the documented commands; regression tests demonstrate the current failures.

### 2. Repair document state and history

- Introduce one document state containing walls, floors, items, and comments.
- Separate document content from transient selection, active tool, viewport, and dialog state.
- Implement atomic commands for add, update, delete, duplicate, paste, clear, and import.
- Make drag/resize/rotate operations transactions with a preview and one final history entry.
- Ensure cancelled operations restore their starting state; branching after undo discards redo correctly.

Completion: clear/undo/redo restores exact documents; one drag equals one undo; mixed deletion and import are atomic; history remains bounded.

### 3. Standardize physical measurements

- Keep a documented internal coordinate convention and central conversion helpers.
- Replace local multipliers across properties, mobile panels, gizmos, snapping, rulers, and 3D.
- Add validation for finite positive dimensions and allowed elevations.
- Add schema versioning and a documented legacy import policy; do not reinterpret existing geometry silently.

Completion: a 3 m wall is 3 m everywhere; a 10 cm move measures 10 cm; all grid labels match spacing; 2D and 3D agree after save/reopen.

### 4. Add saving and recovery

- Add versioned JSON validation and atomic import with actionable error messages.
- Add debounced local autosave, recovery on startup, and visible saving/saved/error states.
- Introduce project name and updated timestamp.
- Keep a recoverable prior version when clearing or importing a replacement document.

Completion: refresh recovers the latest saved edit; invalid imports leave the current project intact; exported documents reopen with equivalent geometry and materials.

### 5. Unify editor actions and gestures

- Finish floor duplication and make action availability consistent across toolbar, inspector, menu, and shortcuts.
- Scope shortcuts by view and focused control; align the help dialog with implemented behavior.
- Consolidate pointer capture, cancellation, drag thresholds, and touch ownership.
- Fix constrained drawing, return-to-origin dragging, rigid floor translation, and additive selection.
- Ensure clicking a floating control cannot begin a drawing gesture behind it.

Completion: mouse, keyboard, and touch versions of the same action produce the same document; Escape cancels; pointer cancellation never commits a surprise edit.

### 6. Improve precision and room geometry

- Add exact numeric wall length, position, rotation, and dimensions where missing.
- Make snapping settings and distances consistent; support angled walls deliberately.
- Add connected junctions so moving a shared corner preserves the room boundary.
- Attach doors/windows to walls with defined offsets, widths, heights, and sill heights.
- Validate degenerate and self-intersecting floors and invalid opening combinations.

Completion: shared corners stay connected; openings follow their wall; snapping does not distort shapes; invalid geometry produces helpful feedback.

This is the largest structural feature phase. Split junctions and opening attachment into separate reviewable changes with document migrations.

### 7. Make 2D and 3D agree

- Apply supported colors, textures, and material properties consistently.
- Fit cameras to floors, walls, and items, accounting for open panels.
- Fix reset/focus behavior and preserve useful viewport state across view switches.
- Remove duplicate selection decoration, address Three.js deprecations, and add rendering failure feedback.
- Make the product decision explicit for perspective versus true orthographic/isometric views.

Completion: representative projects have matching geometry and finishes across views; floor-only projects frame correctly; repeated camera reset always works.

### 8. Polish desktop and mobile layouts

- Establish consistent spacing, type sizes, button sizes, selected states, and color tokens.
- Separate primary drawing actions from secondary settings; improve asset search and readable catalog labels.
- Reserve layout space for inspectors and camera controls instead of overlapping them.
- Add clear empty-state instructions, operation feedback, and concise contextual hints.
- Rework mobile drawers and the 3D control deck around reachable controls and safe areas.
- Add accessible names, focus management, keyboard navigation, and browser zoom support.

Completion: no overlapping essential controls at 390, 768, 1280, and 1440 px widths; keyboard-only core editing is usable; orientation changes preserve the project and selection.

### 9. Deliver dependable exports

- Render a clean plan image independently of the editor chrome.
- Let users choose dimensions, background, measurements, furniture, and comments.
- Define equivalent 3D screenshot options and verify actual downloaded files.
- Add print/PDF output only after the image export is correct, if it is part of the desired product scope.

Completion: exports contain the selected content, no inspector/toolbars, readable measurements, and correct bounds at the requested resolution.

### 10. Optimize and validate the release

- Lazy-load 3D and screenshot dependencies; inspect actual bundle composition before further optimization.
- Measure realistic scenes; reduce repeated geometry/material work where profiling demonstrates a cost.
- Tune shadow quality and pixel ratio for device capability; provide a usable fallback for 3D failure.
- Run end-to-end editing, import/export, recovery, and responsive regression checks.
- Test real touch devices and at least the intended supported browsers.

Completion: documented load and interaction measurements meet agreed budgets on named reference devices; all release workflows below pass. Avoid claiming performance targets without a measured baseline.

## Release acceptance matrix

| Workflow | Required result |
|---|---|
| Draw → resize → move → undo → redo | Exact geometry restored, one history entry per gesture. |
| Duplicate every selectable entity | Fresh IDs, deliberate offset, correct new selection. |
| Clear → undo → redo | Original document → empty → original → empty. |
| Edit → refresh → recover | Latest persisted document restored with clear status. |
| Save → reopen | Equivalent geometry, units, materials, and comments. |
| Import invalid/legacy document | Useful validation or migration; no partial mutation. |
| 2D → 3D → 2D | Consistent dimensions and preserved useful view settings. |
| Touch drag → pinch → cancel | Correct gesture ownership; no accidental drawing or movement. |
| Move shared wall corner/opening | Valid connected room and attached opening placement. |
| Screenshot/export | Requested content only, complete bounds, readable labels. |
| Large representative plan | Measured acceptable loading and interaction on reference hardware. |
| Keyboard and small-screen use | Reachable controls, visible focus, no obstructed essential actions. |

## Recommended delivery order

Deliver steps 1–5 as the reliability release. Deliver steps 6–7 as the precision and rendering release. Deliver steps 8–10 as the presentation and release-quality pass. Each step should be a small set of reviewable changes with its own acceptance evidence.

The best use of a stronger coding model here is to trace behavior across state, geometry, rendering, and input, then implement and verify these changes end to end. Model choice alone does not make an untested editor reliable, and these improvements should not be described as exclusive to one model.
