# Mobile navigation and catalog audit — 2026-10-04

## Problems found

- Eight fixed-width bottom buttons overflowed narrow phones. Horizontal scrolling
  hid primary actions and made their positions unstable.
- The catalog reused a tall bottom-sheet interior inside a panel only 36% of the
  workspace height. Header, search and horizontal category chips crowded out results.
- Category chips hid choices off-screen; single-line item names were truncated.
- Adding scheduled a delayed close without cancelling the timer, leaving time for
  repeated taps or a late close after switching panels.

## Changes

- Five evenly distributed 2D actions: Select, Draw, Objects, Layers, Tools.
  Draw exposes Walls/Floor. Tools exposes Pan/Measure/Note. 3D keeps only its
  supported actions. No horizontal scrolling in the main toolbar.
- Catalog occupies the available workspace while open, with the header and main
  navigation retained. The scene is temporarily hidden, not unmounted or replaced
  in document state. Closing returns to it. Resize handlers ignore zero-size
  hidden scenes.
- Visible native category selector, labelled search, result count, clear/reset
  controls, wrapping item names and a responsive grid with one scrolling results area.
- Adding closes immediately and uses the existing placement, selection and undo
  flow. Removed delayed timers. Catalog/menu switching stays exclusive.
- Larger toolbar labels and at least 44px targets. Compact landscape filters.
- Contextual controls no longer remain visible for an item removed by undo.
- No change to direct-drag coordinates, gesture ownership or release snapping.

## Rationale

Android's navigation guidance recommends a small set of three to five persistent
destinations: https://developer.android.com/develop/ui/compose/components/navigation-bar
This app uses an editing toolbar, so the guidance informed action grouping rather
than treating editing tools as page destinations. Touch targets use W3C's enhanced
44px guidance: https://www.w3.org/WAI/WCAG21/Understanding/target-size

## Verification

- Phone-sized browser checks at 390x844, 320x740 and 740x390.
- At 320px, toolbar clientWidth and scrollWidth both measured 320px; no measured
  toolbar/catalog targets below 44x44; results retained 403px vertical space.
- Category + search returned exactly the expected queen bed; adding closed the
  catalog, selected the new visible object and enabled Undo. One Undo removed it.
- Empty search results displayed Reset filters, which restored all 35 catalog items.
- Checked Draw menu, portrait catalog and landscape grid; screenshots captured.
- Checked Tools -> Pan closes the menu and updates the active toolbar state.
- Added a nightstand through the mobile 3D catalog and returned to the rendered
  scene; Undo removed it and cleared its contextual controls. Test additions were
  undone in both views.
- All scripts/test-*.ts passed, including mobile ownership/drag, Glide lifecycle,
  camera directions, document history, project persistence and geometry tests.
- TypeScript and production build passed; existing large-chunk warning remains.

Browser tests use mouse input and resized viewports. Physical iOS/Android touch,
native keyboard/category-picker presentation, browser chrome and device performance
remain unverified. No dependency, commit, push or deployment was added.
