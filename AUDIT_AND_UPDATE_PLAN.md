# Room Plan: detailed audit and update plan

Audit date: 16 September 2026. Scope: the Google AI Studio export in this workspace. This is an assessment and implementation plan; application source has not been changed for this audit.

## Assessment

Mobile browser viewport fix: the editor shell now follows `window.visualViewport.height` instead of `100vh`, updating as mobile browser chrome expands/collapses and on orientation changes. The flex content can shrink correctly, and the root document is locked against page scrolling/overscroll, keeping the 3D navigation dock inside the visible viewport above browser UI. Safe-area padding remains inside the measured height. Not pushed.

Mobile 3D navigation redesign: replaced stacked floating camera/edit decks with a dedicated bottom navigation area. General, Walk and Isometric remain; Rotate/Pan are explicit modes with zoom buttons, reset and optional directional camera steps. Mobile starts in browsing mode; Edit enables deliberate selection and a compact Properties/Focus/Done strip. Removed Mobile3DControlDeck and consolidated mutations into the existing inspector. Walk joystick sits at the lower left; speed and finishes live in View options. Lower orbit sensitivity, shorter damping and fresh controls on reset/mode changes reduce runaway motion. Camera drags suppress selection clicks; panels block input. Browser checks at 390×844 and 320×568 verified layout, Pan, mode switching, Walk options, selection and Properties isolation. Type checking and production build pass (existing large-chunk warning). Physical multitouch/held-joystick feel remains a device check. Research: NN/G mobile gesture discoverability and W3C WCAG 2.2 target-size/dragging-alternative guidance. Not pushed.

25 September opening drag update: single-window/door 2D drags now keep the saved object stable until release and show a raw ghost, destination ghost, wall highlight and text feedback. Attraction uses 56 screen pixels with a 6px wall-switch margin; overlap previews are rejected visibly. Opening hit areas are at least 44px at every zoom. Pointer capture, pointer identity checks, Escape, blur and cancellation protect the gesture. Guidance: Nielsen Norman Group's Drag-and-Drop article and W3C target-size guidance. Placement/attachment regression checks, type checking and production build passed; physical-device feel and in-browser preview appearance still require validation. Changes are local, not pushed.

Three-mode camera update: General is the default orbit view, Walk uses a separate eye-level (160cm) camera with drag-to-look and held directional buttons/WASD, and Isometric retains the angled cutaway overview. Removed visible top-view, duplicate preset controls, cutaway toggle, grid toggle and redundant camera toolbar actions. Mobile mode selector remains below the editing sheet, and Walk hides object-editing controls. Movement stops on release/cancel, blur, visibility changes and panel blocking. Browser checks verified all three mode selectors, mobile layout and drag-to-look; type checking and production build passed before final click isolation/safe-area adjustments. Walk is free navigation without wall/furniture collision or floor-height following; physical-device held controls still need validation. Not pushed.

Mobile joystick tuning: removed the two-stage snap delay (280ms hold plus accumulation of slow glide deltas). Snap now uses discrete cardinal steps after 180ms, repeating every 140-300ms according to deflection. Quick taps remain one step without a release-time extra nudge after repeats. Free glide remains gradual. Selection/grid/mode changes remount the joystick, cancelling a held loop; blur, hidden page and disabled state also stop it. Mini target increases to 48px. Timing/direction tests and type checking pass; production build passed before the final lifecycle cancellation addition. Real-device held-touch feel remains unverified. Changes are local.

Small update pack: moved doors/windows prioritize nearby fitting walls within 24 world units, align to wall angle and thickness, and can transfer between nearby hosts. Single-opening 2D drags bypass furniture/grid snapping; existing overlap/fit rejection and explicit detach remain. Ordinary furniture keeps its movement behavior. Desktop/mobile material pickers now expose labelled custom colour inputs. Custom wall/floor colours clear patterned materials so the chosen solid colour is visible; sink bowls honor item colour. All fourteen regression scripts passed, with additional automatic attachment/transfer/furniture-isolation assertions; type checking and production build passed. Physical touch feel and browser colour-picker interaction were not revalidated for this pack.

Fifteenth through seventeenth local increments (automatic continuation): mobile inspector movement now follows the shared grid and resets partial movement on context changes; inspector actions have 44px targets, a separate title row, correct close/expand labels and overscroll containment. Desktop breakpoint changes clear hidden mobile panels. Desktop inspector now occupies its own column; 3D toolbar wraps within the scene. 2D modal input blocking includes screenshot/shortcuts. 3D and screenshot code load on demand, procedural texture generation is separated from material metadata, and a preview error boundary preserves a route back to 2D. Initial JS decreases from about 2.64 MB / 620 KB gzip to 1.43 MB / 301 KB gzip; large chunks still warrant further profiling. Scene-only 2D screenshot capture excludes buttons and editor controls. Browser checks confirmed lazy 3D loading, mobile 25cm labels, readable action layout, panel switching, desktop inspector spacing and export-dialog opening; saved geometry was not edited. Storage now has an injectable local adapter with revision checks and backup-before-write behavior, covered by conflict/quota/recovery tests. All fourteen regression scripts, type checking and production build pass. Supabase was selected for later cloud implementation and explicitly deferred; CLOUD_ARCHITECTURE.md records the contract. No authentication, cloud sync, billing or AI purchasing is implemented. Physical-device gestures, exported-image inspection and full model visual coverage remain release gaps. No push or deployment performed.

Fourteenth local increment: corner cabinets gain separate L-shaped worktops, fronts, handles and plinths; kitchen sinks and bathroom vanities gain recessed bowls, drains and taps; single/double fridges and dishwashers gain separate doors, handles, lower panels and controls. Geometry scales inside the saved dimensions, including tap height. Existing IDs and file format remain unchanged. Type checking and production build pass with the existing bundle warning. Read-only browser checks at 390 x 844 confirmed the saved scene renders, Layers/inspector replace the mobile control deck, and the existing fridge inspector expands without captured console errors. The saved plan was not edited. Close-up verification of each new model, 2D gesture regression and physical-device testing remain outstanding. No push or deployment performed.

Thirteenth local increment: tables now use rounded tops, tapered legs and aprons. Wardrobes, nightstands, TV cabinets, base cabinets, kitchen counters and islands use separate fronts, handles, recessed plinths and tops. All parts scale proportionally inside the editable bounds; selected finishes drive carcass/front/table materials while kitchen tops and hardware use neutral accents. Existing saved IDs and dimensions are unchanged. Type checking and production build pass (existing bundle warning). Browser preview rendered the updated cabinetry without captured console errors; exhaustive per-model visual checks and physical-device performance remain outstanding. Corner cabinets, sinks and appliances retain their earlier geometry. No push or deployment performed.

Twelfth local increment: sofas now have rounded, separately modelled seat/back cushions, arms and inset feet; beds have an upholstered headboard, mattress, duvet, pillows and matching throw. Proportional parts retain the saved footprint and total height. Added sand, sage and clay upholstery; bed/sofa pickers offer fabric/leather while retaining a previously selected legacy finish. Material controls have 44px touch targets and accessible swatch labels. Mobile item control pills are hidden to avoid overlapping the inspector. Type checking and production build pass, with the existing bundle-size warning. Browser checks confirmed sofa rendering, desktop sage selection and mobile clay selection; no captured console errors. Comprehensive bed visual isolation, physical-device performance and remaining furniture families are outstanding. No push or deployment performed.

Eleventh local increment: the 3D preview defaults to plain material colours, a light neutral background, softer contact shadows and hemisphere lighting. A 44px finish toggle restores procedural wall/floor patterns. The grid starts hidden, pixel ratio is capped at 1.5 and the external city environment dependency is removed. More item surfaces use their selected material roughness/metalness. Type checking and production build pass (the existing large-bundle warning remains). Desktop and 390 x 844 browser checks verified rendering, toggle state and corrected mobile header clearance. Furniture geometry refinement, physical-device performance and comprehensive material coverage remain outstanding. No push or deployment performed.

Tenth local increment: attached openings are checked for overlapping horizontal spans on the same wall. Invalid edits retain the previous document and display a rejection message without adding a history entry. Project import now validates attachment fit, position and overlapping spans before replacement. Stacked openings are intentionally unsupported by the current mesh and are rejected as overlapping spans regardless of elevation. Legacy unattached openings still use the original proximity behavior. Type checking, all thirteen regression scripts (including new overlap/import/error assertions), and production build pass. Browser verification of attachment/error controls and mobile panel placement remains outstanding; these tests validate reducer and geometry behavior. No push or deployment performed.

Ninth local increment: doors/windows expose explicit attach-to-nearest-wall and detach actions. Attachments persist wall ID and centre offset in centimetres, align to the host angle, follow wall translation/rotation, and constrain item movement along the host. Wall/item changes that cannot fit the opening's width/height are rejected atomically; removing a wall detaches its openings. Wall cutouts for attached openings are restricted to their host. Optional attachment fields round-trip through the versioned file format; legacy unbound items retain proximity-based cutouts. Type checking, thirteen regression scripts, and production build pass. Browser attachment workflow verification, overlap prevention between openings, more helpful feedback for rejected edits, and comprehensive import fit validation remain outstanding. No push or deployment performed.

Eighth local increment: corner railings have independent arm handles. Lengths snap to grid increments along each local axis; the corner, right angle, opposite arm, rotation and height remain fixed. The formerly inconsistent 2D/3D corner representations now use a common L-shaped layout with rails and three posts. Existing width/depth fields remain the two arm lengths; saved project format is unchanged. Type checking, corner/straight railing regression tests and production build pass. Browser dragging changed a 1 × 1 m corner railing to 3 × 1 m. Real-phone touch and final 3D visual review remain outstanding. Attached doors/windows are the next architectural increment. Changes remain local.

Seventh local increment: wall property updates, 2D/3D nudge controls, and rotation actions now route through a shared connection-preserving update function. Non-geometric finishes affect only the selected wall; endpoint changes propagate to coincident neighbours and collapse checks remain atomic. Rotation no longer rounds endpoints to whole world units. Type checking, focused wall-command regression tests, and build pass. A browser check with two adjoining walls confirmed that dragging their shared corner keeps them joined. Explicit node identities, openings attachment, and corner railing editing remain separate work. No push or deployment performed.

Sixth local increment: 2D wall endpoint and segment drags preserve connections between coincident endpoints, resolved from the gesture's original geometry. Moving a segment carries its two junctions while adjoining segments stretch; multiple walls at one junction move together. Nearby endpoints are not automatically joined, and moves collapsing any affected segment to 10 world units or less are rejected. Type checking, eleven regression scripts, and production build pass. This is geometric endpoint connectivity for 2D dragging, not persistent junction IDs or interior intersection splitting. Browser gesture verification, corner railing editing, explicit opening attachment, and equivalent connected commands in 3D/numeric controls remain outstanding. Changes remain local.

Fifth local increment: straight railings expose two 2D endpoint handles with screen-sized hit targets. Dragging an endpoint snaps it to the current grid while preserving the opposite endpoint, updates centre/length/rotation, and preserves height/depth/finish. A length label provides feedback; Alt supports unsnapped desktop adjustments. The existing item representation and 3D renderer remain compatible, so no file migration is needed. Type checking, ten regression scripts and build pass; a browser drag extended 1 m to 4 m and one Undo restored 1 m. Corner railings, shared wall nodes and attached openings are still outstanding; this is the straight-railing increment, not completion of all architectural editing. Changes remain local.

Fourth local increment: completed edits autosave on this browser/device with a short debounce and page-hide flush. Startup recovers the saved document; a previous-save backup can restore a cleared plan. Save/recovery errors are visible, and changes from another tab pause writes to avoid silent overwrites. Export uses a versioned envelope; import supports existing unversioned files and validates collection shape, size, IDs, coordinates, dimensions, floor corner counts, and catalog types before atomic replacement. This is structural validation, not polygon self-intersection validation. Type checking, nine regression scripts, and build pass. Browser tests confirmed furniture survives reload and Restore previous save recovers it after Clear. Storage-quota failure and real-device lifecycle behavior still need dedicated testing. Autosave is local, not cloud storage; history and UI selection are not persisted. No push or deployment performed.

Third local increment: mobile 3D now uses separate Move, Rotate, Height, and Camera sections with explicit centimetre movement steps (1/5/10/25/50), room-axis buttons, 15/45-degree rotations, and 10 cm height adjustments. Scene gestures remain camera navigation. Primary drawers hide the control deck and block scene pointer/camera and 3D shortcut interaction. The App no longer also processes view-specific 2D shortcuts in 3D. Mobile gizmos are excluded at the parent render boundary. Phone-width browser checks exercised movement, elevation, undo, and inspector isolation; the control sheet was visually inspected at 390 × 844. Type checking, eight existing regression scripts, and build pass. Real-device orbit/pinch verification, camera fitting improvements, and saving/recovery remain outstanding. No push or deployment performed.

Second local increment: furniture snapping now filters targets by perpendicular proximity, limits attraction at low zoom, reduces target stickiness, and reports grid guides on actual grid lines. Drag initiation uses screen distance. The 2D grid setting is shared with the mobile movement pad and survives view switches; the pad displays 50/25/12.5 cm steps and resets accumulated movement when its context changes. Short taps and held movement no longer run together, and pointer cancellation does not trigger a tap nudge. Type checking, all eight regression scripts, and production build pass. Phone-width browser checks confirmed pad labels track changes from 25 to 12.5 cm. Physical-device gesture feel and the next 3D controls phase remain to be verified/implemented. Changes remain local.

Implementation progress: the first local foundation increment replaces per-collection history with a document reducer, groups pointer edits into transactions, caps undo history at 100 entries, makes clear/delete/import atomic, and restores floor duplication. Mobile primary panels now share one active-panel state. The mobile movement pad opens on demand above the action bar, and the 2D background handler ignores interactive controls. Type checking, seven regression scripts, and the production build pass; desktop floor duplication and clear/undo/redo and phone-width inspector/catalog switching were exercised in the browser. Full touch cancellation, 3D input isolation, snapping redesign, unit corrections, schema validation, and autosave remain outstanding. This increment is local and has not been pushed or deployed.

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

## Revised delivery order: mobile-first product direction

This sequence supersedes the original implementation order above. The numbered audit steps remain technical work packages, but mobile controls and panel coordination must be addressed early, not deferred to a final visual pass. GitHub baseline commit `8703d27` has been pushed; Netlify configuration is present, but a live deployment has not been verified.

### A. Define mobile interaction and panel behavior

Before changing gestures, document the action map for 2D and 3D and build a small reviewable mobile control prototype. Cover selecting, moving, rotating, resizing, drawing, panning/orbiting, zooming, numeric entry, undo, and cancellation. Use shared terms and consistent action placement between views while keeping camera gestures specific to each view.

- Separate camera navigation from object manipulation with a visible editing state and clear handles. Avoid assigning the same gesture to two simultaneous actions.
- Specify which panels can coexist. On phones, use one primary drawer/sheet at a time; opening the catalog, layers, or inspector should deliberately replace or collapse the previous primary panel.
- Keep selection and unfinished property values stable when switching panels. Explicitly commit or cancel an active gesture before changing its context.
- Prevent panel taps, scrolling, sliders, and text entry from reaching the canvas or activating editor shortcuts. Scrolling a panel must never zoom or move the scene.
- Size the usable canvas around panels and the on-screen keyboard. Position selection controls and camera tools within unobscured space, respecting device safe areas.
- Define consistent close/back behavior. Closing a panel should not unexpectedly delete, deselect, move an object, or change the active tool.
- Use visible labels or contextual explanations for unfamiliar controls and reachable touch targets. Avoid relying on hover or keyboard shortcuts for essential actions.

Acceptance: a phone-sized walkthrough can complete basic 2D and 3D actions without overlapping controls, accidental canvas edits, or ambiguous gesture ownership. Include panel switching, keyboard appearance, rotation, and cancellation scenarios. Validate proposed touch behavior on real devices during implementation.

### B. Build the state, units, and command foundation

Implement original steps 1–3 with the interaction contract from A: atomic document updates, one undo per gesture, consistent units, and a separate UI state model for selection, view, gesture, and active panel. Add regressions for the known failures. Define boundaries between the editor document, persistence adapter, and future server services; do not introduce billing infrastructure into gesture code.

Acceptance: panels and canvas share an explicit interaction state, cancelled edits restore their start, and undo restores the entire document consistently.

### C. Deliver reliable mobile 2D editing and snapping

Implement the 2D control layout from A and relevant fixes from original step 5. Make grid, wall, and object alignment understandable, with visible snap feedback and a clear way to adjust snapping. Tune acquisition/release behavior at different zoom levels and prevent distant objects from attracting a drag unexpectedly. Preserve rigid group and floor transforms. Complete duplication and numeric adjustments.

Acceptance: draw, select, move, resize, rotate, duplicate, and undo on a phone; panel actions never modify the canvas behind them; the scene does not jump when snap targets change.

### D. Deliver reliable mobile 3D editing

Reuse the command and panel behavior from B/C. Provide clear selection, ground-plane movement, separate elevation adjustment, rotation, and precise numeric input. Keep orbit/pinch navigation from fighting object handles. Correct focus, reset, and camera fitting using the space left by open panels. Preserve useful selection and view state across 2D/3D switches.

Acceptance: select, move, rotate, raise/lower, and undo an object while opening and closing the inspector; the camera remains stable during object editing, and navigation never moves an object accidentally.

### E. Protect saved projects

Implement original step 4: versioned documents, validation, atomic imports, local autosave, recovery, and save feedback. Establish migrations before introducing new architectural entity types. Keep persistence behind an interface so cloud storage can be added later.

Acceptance: mobile refresh/recovery and export/import preserve geometry and finishes; malformed documents cannot partially replace a project.

### F. Add architectural elements and connected geometry

Introduce railings as linear architectural elements with two endpoint handles in 2D, grid snapping, exact length, and editable height/thickness. Reuse appropriate wall interaction behavior without assuming railings are solid walls. Render changes consistently in 3D. Then add connected wall junctions and explicitly attached doors/windows in separate changes with migrations.

Acceptance: extending either railing endpoint preserves the other endpoint, produces the expected length, and is one undoable action in both views.

### G. Improve the minimalist 3D material system

Replace visually noisy defaults with restrained colors, subtle finishes, and soft lighting. Define supported material properties centrally and make every exposed option affect the renderer. Establish mobile rendering budgets before increasing model detail. Retain a small consistent set of wood, fabric, metal, glass, and painted finishes.

Acceptance: the same finish behaves consistently across applicable objects; material previews match the rendered scene; lighting keeps shapes readable on a phone.

### H. Improve furniture shapes and appropriate variants

Improve furniture category by category, beginning with frequently used pieces. Add better proportions, rounded edges, legs, cushions, and other silhouette details within the mobile performance budget. Give each category suitable color/material choices rather than an unrestricted generic texture list. Keep the catalog definition, dimensions, controls, and renderer synchronized.

Acceptance: each revised asset has correct dimensions, predictable selection bounds, appropriate finish options, and acceptable mobile interaction performance.

### I. Finish export, accessibility, performance, and release checks

Complete original steps 9–10 and remaining visual/accessibility work from step 8. Performance, accessibility, and mobile checks also apply to each earlier phase; this phase integrates the complete product. Verify real-device touch and exported artifacts, not only automated helper tests.

### J. Add accounts and cloud projects, then define paid AI planning

Extend the persistence boundary established in B/E with authenticated, user-isolated cloud projects. Enforce ownership and authorization on the server. Agree on the paid AI workflow before implementing purchases or subscriptions: token pricing, failed-job refunds, usage limits, and how an AI proposal becomes an editable project remain product decisions for a later discussion.

When implemented, token balances, purchase verification, usage accounting, and AI credentials belong on the server. Use durable jobs and idempotent accounting to prevent duplicate charges or duplicate plans. Validate AI output against the document schema and apply an accepted proposal through the same undoable document commands. Do not commit to a database, billing provider, or subscription design until requirements are settled.

## Additional mobile acceptance checks

| Scenario | Required result |
|---|---|
| Open catalog while inspector is open | Deliberate panel replacement/collapse; no blocked controls or lost selection. |
| Scroll layers or change a property slider | Only the panel responds; no canvas movement, drawing, or zoom. |
| Open numeric field and phone keyboard | Active field and essential confirm/cancel controls remain reachable. |
| Orbit in 3D while an object is selected | Camera moves; object stays fixed unless explicit manipulation is active. |
| Drag a 3D object handle | Object moves on the intended plane/axis; camera does not orbit. |
| Switch 2D/3D or panels during an operation | Defined commit/cancel behavior; no stuck drag or unexpected history entry. |
| Rotate device with a drawer open | Layout adapts without losing the project, values, or essential controls. |
| Extend a railing endpoint | Grid-aware exact length; stable opposite endpoint; one undo step. |

Start with A and B, then ship C as the first usable editing improvement. Follow with D before investing in visual richness. Each phase should remain a small set of reviewable changes with its own acceptance evidence.

The best use of a stronger coding model here is to trace behavior across state, geometry, rendering, and input, then implement and verify these changes end to end. Model choice alone does not make an untested editor reliable, and these improvements should not be described as exclusive to one model.
