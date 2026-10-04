# Mobile contextual controls

## Audit and correction

The previous uncommitted UI combined main navigation, view navigation and
selection actions in a single rail. That went beyond the intended replacement
of selection popups. This update preserves that work's gesture fixes and shared
Glide implementation while separating the three control responsibilities.

| Area | Controls |
| --- | --- |
| Header | 2D/3D, undo/redo, project options |
| Main bottom toolbar | 2D Select, Walls, Floor, Objects, Layers, Pan, Measure, Note; 3D Select, Objects, Layers (no drawing tools) |
| View strip | Grid/zoom in 2D; camera modes/navigation/zoom/speed in 3D |
| Contextual side rail | Move, Rotate, Properties, Duplicate, Delete, Deselect, as supported by selection |
| Explicit expansions | Shared Glide, rotation controls, or Properties |

No selection means no contextual rail, except Walk's camera movement controls.
Collapse keeps the selection and leaves a Controls button; Deselect clears it.
Properties replaces the compact rail to leave a usable scene width on a 320px
phone. Closing Properties returns to the compact rail. Move and Rotate expand
beside the compact rail. Only one expanded panel is active. Catalog and Layers
open deliberately from the main toolbar and close movement/rotation expansions.
All these surfaces reserve space instead of overlaying the scene.

The existing local RAF object-drag system, wall-release snapping, history gate
and camera-relative Glide coordinate helper are unchanged by this update.
The only viewport adjustment is layout-related: 2D resizing preserves screen
position where possible and clamps a selection into view when it would be
clipped, without resetting zoom. Very large selections cannot fit completely
without zooming. UI portals remain siblings of scene event handlers.

## Verification

- Browser layouts: 390x844, 320x740 and 740x390. Captured main navigation without
  selection, compact selection controls, expanded Glide, Properties, narrow
  Glide, landscape Properties and equivalent 3D selection controls.
- Verified selection is retained when Properties closes; main tools remain
  accessible; Move is explicit; Properties replaces Move; switching to Walk
  closes object Glide; 3D exposes Select/Objects/Layers without 2D drawing tools.
- Measured narrow-phone Properties width 176px, leaving a 144px scene. The
  selected bed remained within the scene. Checked rendered toolbar, rail and
  panel buttons for targets smaller than 44x44: none in the measured state.
- Browser mouse-driven Glide movement enabled Undo; one Undo restored the
  gesture and disabled Undo. This is not a physical multitouch test.
- All scripts/test-*.ts passed: mobile drag ownership, secondary-pointer
  isolation, free movement and direction changes, opening detachment, release
  zones, cancellation, history exclusion, one-step undo, project serialization,
  local persistence, geometry and existing desktop interaction regressions.
- Shared Glide lifecycle tests passed for release, cancel, lost capture, blur,
  visibility, unmount and secondary-pointer isolation. Camera-basis tests passed
  for 15 yaw/pitch combinations including near-top-down. Camera angles were
  verified mathematically, not through physical joystick gestures at each angle.
- TypeScript and production build passed. Existing large-bundle warning remains.
- Desktop browser check at 1280x900 confirmed the original 2D toolbar and 3D
  navigation, without the mobile main toolbar or contextual rail.

Physical iOS/Android multitouch, browser chrome transitions and device frame
rate remain unverified. No new dependencies, commit, push or deployment.
