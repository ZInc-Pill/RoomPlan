# Refactoring Log

## Stage 1: Geometry Utilities Extraction

**Objective**: Create a pure geometry utility structure and extract the safest, pure mathematical calculations from `Canvas2D.tsx`.

### Changes Made:
- **Created file**: `src/utils/geometry.ts`
- **Extracted Functions**:
  - `calculatePolygonArea(pts: Point[])`
  - `calculatePolygonPerimeter(pts: Point[])`
  - `getPolygonCentroid(pts: Point[])`
  - `pointToLineSegmentDistance(x, y, x1, y1, x2, y2)`
  - `snapPointToGrid(pt: Point, gridSize: number)`

- **Modified file**: `src/components/Canvas2D.tsx`
  - Removed local mathematical definitions for calculating area, centroid, and line-to-point distance.
  - Replaced implementations of `calculateArea`, `getCentroid`, `pDistance`, and `snapToGrid` with inline calls to the new pure utilities in `geometry.ts`.
  - Removed `calculatePerimeter` from `Canvas2D.tsx` as it was determined to be dead code (no usages were found in the component).

### Behavior Preserved:
- The exact mathematical calculations and return structures remain unchanged. 
- In-component domain logic (like converting raw pixel area into square meters using `PX_PER_METER`) remains isolated in `Canvas2D.tsx` as a wrapper layer around the pure math, ensuring that no domain assumptions leaked into the generic geometry utility.

### Bugs Fixed / Tech Debt Removed:
- Eliminated 40+ lines of raw mathematical operations spanning dot-products and loop-based vertex calculations from the UI rendering component.
- Removed unused/dead code (`calculatePerimeter` in `Canvas2D.tsx`).

### Tests & Checks Performed:
- Full TypeScript compilation and production build (`npm run build`) completed successfully with 0 errors.
- Visual/logic mapping verified across `Canvas2D` to ensure argument mapping to `geometry.ts` matched exactly.

### Remaining Geometry Logic in Canvas2D:
- `getItemBounds`: Currently tightly coupled to `ITEM_CATALOG` and `CM_TO_PX` (Component specific state).
- `snapItemPosition`: Contains complex boundary checking and iterative loop logic for alignment, heavily dependent on the React component state array `items`.
- Custom boundary enforcement blocks inside the `handlePointerMove` function (for dragging bounds).
- Smart measure projection algorithms spanning multiple lines inside the render cycle.

### Risks Discovered:
- The `calculateArea` function relies on a hardcoded conversion wrapper `(PX_PER_METER * PX_PER_METER)` to output square meters. In a future stage (Stage 3), we need to ensure the conversion factor (`PX_PER_METER`) is truly global and standardized.

## Stage 2: Pure Geometry Extraction

**Objective**: Extract remaining pure geometry calculations from `Canvas2D.tsx` into `geometry.ts` while keeping domain/interaction logic intact.

### Changes Made:
- **Modified file**: `src/utils/geometry.ts`
  - Added `getBoundingBox(x, y, width, depth, rotationRads)`: Computes AABB bounding box coordinates with 90-degree rotational flipping support.
  - Added `get1DSnapCoordinate(center, size, gridSize)`: Determines optimal snapping coordinate by evaluating distance between grid lines and object edges (center, left, right).
  - Added `calculateBoxRadiusAlongVector(w, d, nx, ny)`: Box projection math against a normalized vector.
  - Added `pointDistance(pt1, pt2)` and `vectorLength(dx, dy)`.

- **Modified file**: `src/components/Canvas2D.tsx`
  - Refactored `getItemBounds` to pull data from `ITEM_CATALOG`, calculate `CM_TO_PX` sizes, and delegate the bounding box matrix math to `geometry.ts`.
  - Simplified `snapItemPosition`: Replaced 20 lines of repetitive 1D axis threshold snapping with `get1DSnapCoordinate`. Replaced inline bounding box edge testing by passing `boundsObj` directly.
  - Simplified `smartMeasures` raycasting: Replaced the absolute hypotenuse/normal expansion math block with a clean call to `calculateBoxRadiusAlongVector` and `vectorLength`.

### Functions Deliberately Left in Canvas2D:
- The loop in `snapItemPosition` that iterates over `items.forEach(other => ...)`: Left intact because collision checks against a dynamic array of application entities is domain/interaction state, not pure geometry.
- Coordinate bounding tests (e.g. `Math.hypot(pt2 - pt1) < 5` for drag hysteresis): Left intact because this represents pointer interaction heuristics, not complex math.

### Behavior Preserved:
- No visual or UX changes. Bounding boxes, dragging hysteresis, smart measurements, and snap points behave identically.

### Tests & Checks Performed:
- Full TypeScript compilation and production build (`npm run build`) completed successfully with 0 errors.

### Coordinate-System Problems Remaining:
- *Recommendation for Stage 3*: Define explicit coordinate definitions (`worldToScreen`, `screenToWorld`, `metersToPixels`) globally and force `Canvas2D` to use them universally.

### Stage 3: Unified Coordinate System - COMPLETED
- Mapped out the coordinate system into: World Coordinates, Physical Units (cm/meters), Screen Coordinates, and SVG Coordinates.
- Created `src/utils/coordinates.ts` to host all conversion utilities (e.g. `WORLD_SCALE.PX_PER_METER`, `cmToPx`, `pxToMeters`, `pxAreaToSquareMeters`, `screenToWorld`).
- Purged all locally redefined `CM_TO_PX = 0.4` and `PX_PER_METER = 40` hardcodes from `Canvas2D.tsx` and `Canvas3D.tsx`.
- Centralized `GRID_SIZE` by deriving it explicitly from physical units in `coordinates.ts` (`GRID_SCALES.SCALE_50CM`).
- This fixes the issue where object dimensions were updated in physical cm but the snapped bounds didn't match the grid context! Now `w` and `d` in snapping algorithms run through `cmToPx` consistently.

## Stage 4: Unified Snapping System - COMPLETED

**Objective**: Create ONE reliable snapping system that operates exclusively in the unified WORLD coordinate system, eliminating fragmentation while preserving existing behaviors and interaction flow.

### 1. Snapping Systems Discovered During Audit
- **Grid Snapping (Canvas2D)**:
  - `snapPointToGrid`: Snapped points to `currentGridSize` (20, 10, or 5 world units corresponding to 50cm, 25cm, 12.5cm).
  - Used in wall drawing, floor drawing (polygon & rectangle modes), ruler placement, wall node dragging, floor node dragging, and floor midpoint vertex insertion.
- **Delta Grid Snapping (Canvas2D)**:
  - Ad-hoc rounding `Math.round(delta / currentGridSize) * currentGridSize` used when translating entire walls or entire floors.
- **Furniture / Item Snapping (`snapItemPosition` in Canvas2D)**:
  - Dual-phase snapping: first 1D grid snapping of item center and edges via `get1DSnapCoordinate`, then testing alignment candidates against all other placed items (edge-to-edge and center-to-center).
- **Floor Glide Joystick Snapping (Canvas2D)**:
  - Floor glide joystick in `snap` mode uses an accumulator threshold of 12 units to commit discrete `currentGridSize` (0.5m) position jumps.
- **Canvas3D Nudge Snapping**:
  - Continuous 3D joystick nudge with a 10cm accumulator (`SNAP_GRID = 10`), plus arrow keys nudging by 10/50 units in snap mode vs 2/10 in free mode.
- **Smart Measures (Canvas2D)**:
  - Audited and verified to be purely visual diagnostic measurement rendering (showing dashed lines when item distance to walls < 50 world units), NOT coordinate modification.

### 2. Consolidated Implementations
- **Created `src/utils/snapping.ts`** as the single source of truth for snapping calculations:
  - `snapPointToGrid`: Pure 2D point grid snapping in world space.
  - `snapCoordinateToGrid`: 1D coordinate grid snapping.
  - `snapDeltaToGrid`: Snaps translation offsets to grid steps (replaced inline calculations in wall and floor dragging).
  - `get1DSnapCoordinate`: Evaluates center, left edge, and right edge alignments against grid lines and selects minimal displacement.
  - `generateItemAlignmentOffsets`: Deconstructs candidate offset generation (left-to-right, right-to-left, left-to-left, right-to-right, center-to-center).
  - `selectBestOffset`: Pure candidate selection picking minimal offset within threshold.
  - `calculateItemSnap`: Pure function orchestrating candidate generation, selection, and fallback grid snapping.
- **Consolidated in `src/components/Canvas2D.tsx`**:
  - Replaced inline delta rounding for dragging walls and floors with `snapDeltaToGrid`.
  - Replaced ad-hoc `snapItemPosition` calculations with `calculateItemSnap`.
  - Replaced manual threshold constants with `SNAP_THRESHOLDS.ITEM_TO_ITEM`.

### 3. Snapping Coordinate Space
- **Strictly World Space**: All snapping logic operates purely in World Coordinates.
- **Data Flow**:
  `Screen Pointer (clientX, clientY)` 
  $\rightarrow$ `screenToWorld(..., pan, zoom, containerRect)` 
  $\rightarrow$ **World Coordinate Input** 
  $\rightarrow$ **Snapping Engine (`calculateItemSnap` / `snapPointToGrid`)** 
  $\rightarrow$ **Snapped World Position** 
  $\rightarrow$ `SVG Transform / Three.js Scene` (visual display).
- **Zoom Independence**: Because snapping operates on World Coordinates, zooming in or out has zero effect on the physical snapping distance or grid intervals.

### 4. Snap Thresholds & Distinctions
- **Physical World Thresholds (in `src/utils/snapping.ts`)**:
  - `SNAP_THRESHOLDS.ITEM_TO_ITEM = 15` (15 world units = 37.5cm physical threshold for edge and center alignments).
- **UI Interaction / Gesture Deadbands (Kept in Canvas2D Interaction Layer)**:
  - `DRAG_START_THRESHOLD = 5`: World distance to disambiguate click from drag.
  - `MIN_WALL_LENGTH = 10`: Minimum distance required to commit a wall segment.
  - `MIN_RECT_FLOOR_SIZE = 20`: Minimum dimension to commit a rectangular floor.
  - `CLOSE_POLYGON_HIT_RADIUS_PX = 28`: Screen pixel threshold (`28 / zoom`) to close polygon floor loops.
  - `FLOOR_GLIDE_THRESHOLD = 12`: Joystick accumulator threshold.

### 5. Snap Priority Hierarchy
1. **Object Alignment (High Priority)**:
   - When moving furniture, checks for flush edge contact (left-to-right, right-to-left, top-to-bottom, bottom-to-top), edge alignment (left-to-left, right-to-right, top-to-top, bottom-to-bottom), and center alignment against all other items.
   - If candidate offset is within `SNAP_THRESHOLDS.ITEM_TO_ITEM` (15 world units), it snaps to the smallest offset.
2. **Grid Alignment (Base Priority)**:
   - If no object alignment is within threshold, the object snaps its center or edges to the active grid line.
3. **Determinism**: Given identical inputs, the snapping engine guarantees identical output.

### 6. Furniture Rotation & Dimension Editing
- Upgraded `getBoundingBox` in `src/utils/geometry.ts` with exact trigonometric projection:
  $w_{AABB} = |W \cos\theta| + |D \sin\theta|$, $d_{AABB} = |W \sin\theta| + |D \cos\theta|$.
- Accurately supports 0°, 90°, 180°, 270°, negative angles, and arbitrary rotations.
- Dimension editing updates physical width and depth via `cmToPx`, instantly reflecting in the recalculated bounding box without hidden scale drifts.

### 7. Canvas3D Differences Documented
- In Canvas3D, interaction is 3D viewport navigation (OrbitControls) rather than 2D planar dragging.
- Snapping in Canvas3D is implemented via discrete keyboard nudges (step sizes 10/50 in snap mode vs 2/10 in free mode) and a 10cm accumulator (`SNAP_GRID = 10`) for joystick navigation. This interaction difference is legitimate and preserved.

### 8. Verification & Tests
- Automated test script verified:
  - Grid scales: Option 1 (50cm) = 20px, Option 2 (25cm) = 10px, Option 3 (12.5cm) = 5px.
  - Basic point grid snapping and delta grid snapping.
  - Rotation bounding boxes across 0°, 90°, 180°, 270°, and -90°.
  - 1D edge vs center grid snapping preference.
  - Object-to-object flush snapping and priority over grid alignment.
  - Determinism across multiple executions.
- `tsc --noEmit` and `npm run build` compiled with 0 errors.

## Stage 5A: Viewport Interaction Refactor - COMPLETED

**Objective**: Extract viewport interaction and state logic from `Canvas2D.tsx` into a dedicated, focused hook `src/hooks/useCanvasViewport.ts` without modifying UI, UX, visuals, gestures, or introducing feature changes.

### 1. Viewport Logic Discovered in Canvas2D
- **Zoom & Pan State**:
  - `zoom` (clamped 0.05x to 10x for wheel/buttons, 0.2x to 6x for pinch).
  - `pan` (`{ x, y }` in screen pixels relative to world origin).
  - `isPanning` boolean.
  - `spacePressed` boolean (spacebar pan trigger).
- **Wheel / Trackpad Zoom**:
  - Non-passive `wheel` event attached directly to the canvas container.
  - `ctrlKey` / `metaKey` detection for trackpad pinch or Ctrl+Wheel.
  - Exponential zoom scaling `zoomFactor = Math.exp(-e.deltaY * zoomSpeed)`.
  - Focal point preservation (world point under cursor remains stationary).
  - Standard wheel event panning: `pan.x - e.deltaX`, `pan.y - e.deltaY`.
- **Keyboard Shortcuts**:
  - Window listener for `keydown` / `keyup` on spacebar (`' '`), ignoring text inputs.
- **Pointer-Based Viewport Panning**:
  - Activated by: `mode === 'PAN'`, middle mouse button (`e.button === 1`), or left-click with spacebar (`e.button === 0 && spacePressed`).
  - Tracks `panStartRef = { x: e.clientX - pan.x, y: e.clientY - pan.y }`.
  - Computes continuous drag translation on `pointermove`.
- **Multi-Touch Pinch-to-Zoom & Two-Finger Pan**:
  - `activePointers` map tracking all concurrent pointer contacts by `pointerId`.
  - When pointers $\ge 2$, activates pinch mode, cancels any active drawing/dragging in Canvas2D, and calculates finger distance ratio & midpoint translation.
  - Clamped between `0.2` and `6.0`.
  - Correct cleanup on pointer removal (`pointerup`, `pointerleave`, `pointercancel`).
- **Coordinate Conversion**:
  - `getPoint(e)` converting pointer client coordinates to World coordinates via `screenToWorld`.

### 2. Extracted Hook: `src/hooks/useCanvasViewport.ts`
- **Created**: `src/hooks/useCanvasViewport.ts`
- **Constants**:
  - `VIEWPORT_LIMITS`: `MIN_ZOOM: 0.05`, `MAX_ZOOM: 10`, `PINCH_MIN_ZOOM: 0.2`, `PINCH_MAX_ZOOM: 6`, `ZOOM_STEP_FACTOR: 1.05`.
- **Authoritative State**:
  - `zoom`, `pan`, `isPanning`, `isPinching`, `spacePressed`.
  - Kept in sync with internal refs (`zoomRef`, `panRef`, `spacePressedRef`) to prevent stale closures in synchronous DOM listeners.
- **Pure Helpers & Conversions**:
  - Integrates `screenToWorld` and `worldToScreen` from `src/utils/coordinates.ts`.
  - Exposes `getPoint(e)`, `screenToWorldCoord`, `worldToScreenCoord`.
- **Gesture Processors**:
  - `handlePointerDown`: Manages `activePointers`, triggers `onPinchStart` when $\ge 2$ fingers touch down, detects pan activation, returns `{ handled, isMultiTouch }`.
  - `handlePointerMove`: Computes pinch scale / midpoint translation or single-finger pan, returns boolean if consumed.
  - `handlePointerUp`: Cleans up pointer registrations and resets pan/pinch states, returns `{ wasPanning }`.
- **Controls**:
  - `handleZoomIn`: Scales zoom by 1.05 (clamped to 10x).
  - `handleZoomOut`: Scales zoom down by 1.05 (clamped to 0.05x).
  - `handleFitScreen`: Resets `zoom: 1`, `pan: { x: 0, y: 0 }`.

### 3. Canvas2D Responsibilities After Refactor
`Canvas2D.tsx` is now relieved of:
- All wheel event listener management.
- Window keyboard listener management for spacebar.
- Active pointer map and pinch geometry tracking.
- Ad-hoc zoom clamping and cursor focal point calculations.
- ~160 lines of procedural viewport event code removed.

It now simply:
1. Composes `useCanvasViewport` passing `containerRef`, `isPanMode`, and `onPinchStart`.
2. Delegates viewport pointer events to `handleViewportPointerDown`, `handleViewportPointerMove`, and `handleViewportPointerUp`.
3. Focuses solely on building domain interactions (walls, floors, items, selection, measurements).

### 4. State Ownership
- `useCanvasViewport` is the single, authoritative owner of `zoom`, `pan`, and viewport interaction flags.
- No duplicated or mirrored zoom/pan state exists.
- Public props of `Canvas2D` were not changed (it remains an internal implementation detail).

### 5. Coordinate Flow Integrity
- Centralized `src/utils/coordinates.ts` remains the single source of truth for coordinate conversion.
- Viewport interaction operates on screen coordinates to compute camera translation and scaling.
- Geometry and snapping remain strictly in World coordinates.
- Tested roundtrip coordinate conversion at 0.05x, 0.2x, 0.5x, 1x, 2x, 3x, 6x, and 10x zoom levels.

### 6. Verification & Build
- `npm run lint` (`tsc --noEmit`): 0 errors.
- `compile_applet` (`vite build`): Built cleanly with 0 errors.
- Automated tests verified:
  - Viewport limits and constants.
  - Zoom-to-cursor invariant (world point under cursor remains stationary).
  - Touch pinch midpoint invariant across scale and translation.
  - Clamping across wheel and touch pinch modes.

## Stage 5B: Selection Interaction Refactor - COMPLETED

**Objective**: Separate selection behavior from `Canvas2D.tsx` into a dedicated hook without modifying existing selection UX, priority, or hit testing rules.

### 1. Selection Architecture Discovered
- **State Ownership**: Selection state (`selectedItemIds`, `selectedWallId`, `selectedFloorId`, `selectedCommentId`) is owned by the parent component and passed down as props along with an `onSelect` callback.
- **Hit Testing Philosophy**: Object hit testing (furniture, walls, floors, comments) is delegated entirely to the browser via standard SVG `onPointerDown` events on individual `<g>` and `<path>` elements.
- **Box Selection**: Initiated by clicking the canvas background (`svg`, `containerRef`, `grid-bg`, `transform-layer`). Tracks a bounding box `start` and `current` point. Evaluates intersections in pure World Coordinates during `pointerUp`.
- **Modifiers**: Shift/Meta click toggles individual selections; Shift drag preserves existing selection and adds to it.

### 2. Extracted Hook: `src/hooks/useCanvasSelection.ts`
- **Created**: `src/hooks/useCanvasSelection.ts`.
- **Responsibilities**:
  - Encapsulates `selectionBox` local state.
  - Exposes dedicated pointer event handlers: `handlePointerDown` (for background clicks), `handlePointerMove` (for box dragging), and `handlePointerUp` (for box intersection evaluation).
  - Exposes semantic selection methods: `selectItem`, `selectWall`, `selectFloor`, `selectComment`, and `clearSelection` which wrap the Shift/Meta key logic.
- **No Hit Test Changes**: The hook preserves the exact previous world-coordinate geometric checks (bounding boxes for items, midpoint for walls, centroid for floors).

### 3. Canvas2D Integration
- Replaced the local `selectionBox` state with `useCanvasSelection`.
- Injected `useCanvasSelection` pointer handlers at the top of the main `Canvas2D` pointer event chain.
- SVG objects' `onPointerDown` events now delegate purely to `selectItem`, `selectWall`, `selectFloor`, etc., drastically simplifying the inline handlers.
- Preserved existing multi-selection, deselection, and exclusive selection logic exactly as before.

### 4. Verification & Build
- `npm run lint` (`tsc --noEmit`): 0 errors.
- `compile_applet` (`vite build`): Built cleanly with 0 errors.
- Automated tests verified:
  - Object selection toggle rules (Shift vs No-Shift).
  - Box selection intersection rules for Items, Walls, and Floors.

## Stage 5C: Furniture Manipulation Refactor - COMPLETED

**Objective**: Extract furniture manipulation and interaction logic from `Canvas2D.tsx` into a dedicated interaction hook `src/hooks/useFurnitureInteraction.ts` while preserving current behavior, geometry, snapping, multi-selection movement, undo/redo integration, and visual output exactly.

### 1. Furniture Interaction Architecture Discovered
- **Drag Lifecycle**:
  - `handleItemPointerDown`: Triggered in `mode === 'SELECT'`. Stops event propagation, coordinates selection via `selectItem(e, item.id)`, records pointer offset (`pt.x - item.x`, `pt.y - item.y`), captures drag start anchor (`startX`, `startY`), and initializes `hasMoved: false`.
  - `handlePointerMove`: Applies a 5px deadband hysteresis threshold (`Math.hypot(pt.x - startX, pt.y - startY) > 5`). Once exceeded, marks `hasMoved: true`. Calculates raw unconstrained target position from current world pointer minus drag offset. Passes raw target and current object to the centralized snapping engine (`snapItemPosition`). Calculates delta translation (`dx`, `dy`) and applies it identically to all currently selected items in `selectedItemIds`.
  - `handlePointerUp`: Cleans up active dragging state (`draggingItem = null`).
  - Cancellation: Active drag is cancelled when multi-touch pinch starts or when the interaction mode changes.
- **State Ownership & Undo/Redo**:
  - `items` array is owned by `App.tsx` and passed into `Canvas2D` along with `onUpdateItems`.
  - Updating items commits through `onUpdateItems(newItems)`, which saves state history in `App.tsx` and triggers the undo/redo stack.
  - Active drag gesture state (`draggingItem`) is local interaction state, now isolated within `useFurnitureInteraction`.
- **Coordinate Space & Geometry**:
  - All operations take place strictly in World Coordinates.
  - Rotated bounding boxes (AABBs) for snapping use trigonometric projection via `getBoundingBox` in `src/utils/geometry.ts`.
  - Alignment snapping prioritizes object-to-object edge/center alignment before falling back to grid snapping via `calculateItemSnap` in `src/utils/snapping.ts`.
- **Multi-Item Movement**:
  - When dragging an item that belongs to a multi-selection (`selectedItemIds`), all selected items translate by the identical delta (`dx`, `dy`), preserving their relative spacing, alignment, and orientation perfectly. Unselected items remain unaffected.

### 2. Extracted Hook: `src/hooks/useFurnitureInteraction.ts`
- **Created**: `src/hooks/useFurnitureInteraction.ts`
- **Exported Constants & Helpers**:
  - `FURNITURE_DRAG_THRESHOLD = 5`: World distance threshold to distinguish clicks from drags.
  - `getItemBounds(item: PlacedItem)`: Calculates oriented AABB bounding box using catalog dimensions and physical conversions.
  - `snapItemPosition(rawPt: Point, itemToSnap: PlacedItem, allItems: PlacedItem[], gridSize: number)`: Coordinates candidate snap generation against other items and grid lines.
- **Authoritative Hook State & Handlers**:
  - `draggingItem`: Current dragging item state `{ id, offsetX, offsetY, startX, startY, hasMoved }`.
  - `isDraggingItem(id: string)`: Fast check used to toggle CSS cursor between `'grab'` and `'grabbing'`.
  - `handleItemPointerDown(e, item)`: Item pointer-down event handler encapsulating selection coordination and drag anchor registration.
  - `handlePointerMove(e, pt)`: Pointer move processor handling drag threshold hysteresis, snapped target calculation, delta projection across multi-selected items, and returning `{ handled: boolean }`.
  - `handlePointerUp(e)`: Resets drag state.
  - `cancelDragging()`: Safely cancels any in-progress furniture drag gesture.

### 3. Canvas2D Integration
- Replaced inline `draggingItem` state with `useFurnitureInteraction`.
- Replaced local `getItemBounds` and `snapItemPosition` with the shared, tested implementations.
- Delegated furniture pointer move in `handlePointerMove` to `handleFurniturePointerMove(e, pt)`.
- Delegated `pointerUp` cleanup to `handleFurniturePointerUp(e)`.
- Replaced local item pointer-down handler with `handleItemPointerDown` from the hook.
- Integrated `cancelDragging` into `cancelActiveInteractions` (invoked on pinch-zoom and gesture cancellation).
- Updated item cursor styling in JSX to `isDraggingItem(item.id) ? 'grabbing' : 'grab'`.
- Verified `smartMeasures` continues to calculate dashed wall proximity measurements using the imported `getItemBounds`.

### 4. Verification & Build
- `npm run lint` (`tsc --noEmit`): 0 errors.
- `compile_applet` (`vite build`): Built cleanly with 0 errors.
- Automated tests (`scripts/test-stage5c-furniture.ts`):
  - Bounding box calculation for unrotated, 90° rotated, and 45° rotated items.
  - Snapping behavior: grid snapping fallback and object-to-object flush/center alignment priority.
  - Multi-item movement delta simulation: verifying exact preservation of relative spacing between co-selected items while unselected items remain stationary.
  - 5px drag start threshold hysteresis.
- All previous regression tests (`scripts/test-stage5b-selection.ts`) re-run and passing 100%.

## Stage 5D: Wall Manipulation Refactor - COMPLETED

**Objective**: Extract wall manipulation and drawing behavior from `Canvas2D.tsx` into a dedicated interaction hook (`src/hooks/useWallInteraction.ts`) while preserving existing geometry, grid snapping, endpoint movement, length/angle invariance, minimum wall length threshold, Shift orthogonal drawing, and visual rendering exactly.

### 1. Wall Interaction Architecture Discovered
- **Wall Drawing Lifecycle**:
  - `handlePointerDown` (in `DRAW_WALL` mode): First tap/click snaps the coordinate to the grid via `snapPointToGrid` and records `drawingStart` and `drawingCurrent`.
  - `handlePointerMove` (in `DRAW_WALL` mode): When `drawingStart` exists, updates `drawingCurrent`. Supports the Shift key to constrain the vector orthogonally to pure horizontal or vertical based on whether `|dx| > |dy|`.
  - `handlePointerUp` (in `DRAW_WALL` mode): If the distance between `drawingStart` and `drawingCurrent` is `> 10` world units (`MIN_WALL_LENGTH`), a new wall entity is created and committed via `onUpdateWalls([...walls, newWall])`, resetting the drawing points. If distance is `<= 10`, `drawingStart` is preserved so mobile users can tap once to set the start point and tap a second time to set the end point.
  - Mode switching and cancellation: Exiting `DRAW_WALL` or pressing `Escape` clears `drawingStart` and `drawingCurrent` and reverts mode to `SELECT`.
- **Wall Segment Dragging Lifecycle**:
  - `handleWallPointerDown` (in `SELECT` mode): Stops propagation, selects the wall via `selectWall(e, wall.id)`, records pointer starting point and snapshots `origWall`.
  - `handlePointerMove`: Snaps delta translation to the grid via `snapDeltaToGrid(pt.x - startX, currentGridSize)`. Computes new start and end coordinates `(origWall.start + (dx, dy))` and `(origWall.end + (dx, dy))`. Wall length, orientation, and thickness are invariant. Updates committed via `onUpdateWalls`.
  - `handlePointerUp`: Clears `draggingWall`.
- **Wall Node (Endpoint) Dragging Lifecycle**:
  - Node handle pointer-down: Dedicated `<circle>` handles at `wall.start` and `wall.end` initiate `draggingWallNode` with `{ id, node: 'start' | 'end' }`.
  - `handlePointerMove`: Snaps pointer directly to grid via `snapPointToGrid(pt, currentGridSize)`. Updates only the target node (`start` or `end`), preserving the opposite node and wall thickness. Updates committed via `onUpdateWalls`.
  - `handlePointerUp`: Clears `draggingWallNode`.
- **Decoupling Discovered**:
  - The `RULER` tool previously shared the `drawingCurrent` state variable with wall drawing. Ruler now has its own isolated `drawingRulerCurrent` state, completely separating wall interaction state from measurement state.

### 2. Extracted Hook: `src/hooks/useWallInteraction.ts`
- **Created**: `src/hooks/useWallInteraction.ts`
- **Exported Constants & Pure Helpers**:
  - `MIN_WALL_LENGTH = 10`: Minimum world length threshold required to commit a wall.
  - `DEFAULT_WALL_THICKNESS = 8`: Default thickness for newly drawn walls.
  - `createWall(start: Point, end: Point, thickness?: number): Wall`: Pure helper generating a compliant Wall object.
  - `moveWall(wall: Wall, dx: number, dy: number): Wall`: Pure helper translating a wall segment while strictly preserving length, angle, and thickness.
  - `moveWallNode(wall: Wall, node: 'start' | 'end', newPt: Point): Wall`: Pure helper updating one endpoint while preserving the other and maintaining thickness.
  - `calculateOrthogonalPoint(start: Point, current: Point): Point`: Pure helper implementing orthogonal locking when Shift is held.
  - `isMinimumWallLength(start: Point, end: Point, minLength?: number): boolean`: Pure helper for threshold validation.
- **Hook State & Capabilities**:
  - Manages `drawingStart`, `drawingCurrent`, `draggingWall`, and `draggingWallNode`.
  - Provides `isDrawingWall`, `isDraggingWall(id)`, `isDraggingWallNode(id, node)`.
  - Provides `handleWallPointerDown(e, wall)` for clicking placed wall segments.
  - Provides `handleWallNodePointerDown(e, wallId, node)` for clicking wall endpoint handles.
  - Provides `handlePointerDownCanvas(e, pt)` for canvas clicks in `DRAW_WALL` mode (supporting both drag and 2-tap creation).
  - Provides `handlePointerMove(e, pt)` returning `{ handled: boolean }`.
  - Provides `handlePointerUp(e)` for completing wall drawing and committing wall translations.
  - Provides `cancelWallDrawing()` and `cancelWallInteraction()`.

### 3. Canvas2D Integration
- Integrated `useWallInteraction` into `Canvas2D.tsx`.
- Removed redundant local states (`drawingStart`, `drawingCurrent`, `draggingWall`, `draggingWallNode`).
- Injected `handleWallPointerDownCanvas` into `Canvas2D`'s `handlePointerDown`.
- Injected `handleWallPointerMove` into `Canvas2D`'s `handlePointerMove`.
- Injected `handleWallPointerUp` into `Canvas2D`'s `handlePointerUp`.
- Integrated `cancelWallInteraction` into `cancelActiveInteractions` (invoked during pinch-zoom).
- Connected SVG wall node circles to `handleWallNodePointerDown`.
- Connected SVG wall lines to `handleWallPointerDown`.
- Connected mobile banner cancel button to `cancelWallDrawing`.
- Preserved existing SVG render markup and dimension text overlay (`{pxToMeters(...).toFixed(2)}m`).

### 4. Verification & Build
- `npm run lint` (`tsc --noEmit`): 0 errors.
- `compile_applet` (`vite build`): Built cleanly with 0 errors.
- Automated tests created and executed (`scripts/test-stage5d-wall.ts`):
  - Wall creation and minimum length threshold validation (< 10 rejected, == 10 rejected, > 10 accepted).
  - Wall segment translation: length, angle, and thickness mathematical invariance verified.
  - Wall endpoint (node) movement: start node mutation verified with untouched end node; end node mutation verified with untouched start node.
  - Orthogonal Shift key calculation (horizontal vs vertical priority).
  - Grid snapping integration: delta snapping for segments and absolute coordinate snapping for nodes.
- Full regression test suite re-run and passing 100%:
  - Stage 5B Selection: Passed 100%.
  - Stage 5C Furniture Manipulation: Passed 100%.
  - Stage 5D Wall Manipulation: Passed 100%.

## Stage 5E: Floor Manipulation Refactor - COMPLETED

**Objective**: Extract floor-specific manipulation and editing behavior from `Canvas2D.tsx` into a dedicated interaction hook (`src/hooks/useFloorInteraction.ts`) while preserving exact geometry, snapping, selection, measurements, drawing behavior, and visual output.

### 1. Audit & Analysis
Audited all floor-related logic in `Canvas2D.tsx`:
- **Floor drawing modes**: Primary `rectangle` (two-corner click/drag) and secondary `polygon` (vertex sequence with loop closure).
- **Closure & minimum size thresholds**:
  - `MIN_RECT_FLOOR_SIZE = 20` (minimum 20x20 world units to commit rectangle floors).
  - `POLYGON_CLOSING_RADIUS_PX = 28` (`28 / zoom` screen-pixel closing hit radius).
  - `MIN_POLYGON_POINTS = 3` (minimum vertices to commit a floor polygon).
  - `MIN_DRAG_POINT_DISTANCE = 5` (duplicate point rejection).
- **Floor translations**: Entire floor translation using `snapDeltaToGrid(delta, currentGridSize)`.
- **Floor vertex manipulation**: Corner vertex drag (`draggingFloorNode`), double-click corner deletion (`deleteFloorNode`, preserving >= 3 points), and midpoint '+' handle edge split (`insertFloorNode`).
- **Floor glide (joystick)**: 2D directional continuous glide with accumulator threshold (`SNAP_THRESHOLD = 12`) in grid snap mode vs smooth direct continuous movement in free mode.
- **Floor measurements**: Real-time area calculation (`calculateFloorArea` -> `pxAreaToSquareMeters(calculatePolygonArea(pts))`), centroid positioning (`getPolygonCentroid(pts)`), and edge dimension pills (`pxToMeters(length).toFixed(2)m`).
- **Keyboard shortcuts**: Escape (cancel drawing/finish), Tab (switch draw mode), Backspace/Delete/Ctrl+Z (undo vertex), Enter (commit polygon >= 3 pts).

### 2. Extracted Hook Implementation
- **Created**: `src/hooks/useFloorInteraction.ts`
- **Pure Helpers & Thresholds**:
  - `createRectanglePoints(p1, p2)`: Constructs 4 normalized corner points invariant to drag direction.
  - `isMinimumRectangleSize(p1, p2, minSize)`: Verifies rectangle dimensions.
  - `isNearPolygonStart(startPt, testPt, zoom, closingRadiusPx)`: Zoom-aware polygon closing hit test.
  - `translateFloorPoints(points, dx, dy)`: Pure translation preserving point ordering, area, and angles.
  - `moveFloorNode(points, index, newPt)`: Updates single vertex with all other vertices invariant.
  - `insertFloorNode(points, index, newPt)`: Inserts new vertex along edge.
  - `deleteFloorNode(points, index)`: Deletes vertex while enforcing `MIN_POLYGON_POINTS >= 3`.
  - `calculateOrthogonalFloorPoint(lastPt, current)`: Constrains polygon edge drawing orthogonally when Shift is held.
  - `calculateFloorArea(pts)` and `getFloorCentroid(pts)`: Pure floor geometry wrappers.
- **Hook State & Capabilities**:
  - Manages `drawingFloorPts`, `rectStart`, `previewPt`, `floorDrawMode`, `draggingFloor`, `draggingFloorNode`, `glideSnapMode`, and `hoveredFloorId`.
  - Provides `switchFloorDrawMode('rectangle' | 'polygon')` with automatic cleanup of intermediate state.
  - Provides `handleFloorPointerDown(e, floor)` for selecting and dragging placed floors.
  - Provides `handleFloorNodePointerDown(e, floorId, index)` and `handleFloorNodeDoubleClick(e, floorId, index)` for corner handles.
  - Provides `handleFloorEdgeSplit(e, floorId, edgeIndex, midX, midY)` for midpoint '+' handles.
  - Provides `handlePointerDownCanvas(e, pt)`, `handlePointerMove(e, pt)`, `handlePointerUp(e)`, and `handleDoubleClickCanvas(e)`.
  - Provides `handleKeyDown(e)` for keyboard shortcut management.
  - Provides `handleFloorGlideMove(dx, dy)` and `handleFloorSingleNudge(dir)` for the Universal Joystick.

### 3. Canvas2D Integration
- Integrated `useFloorInteraction` into `Canvas2D.tsx`.
- Removed 9 redundant local states (`drawingFloorPts`, `previewPt`, `floorDrawMode`, `rectStart`, `draggingFloor`, `draggingFloorNode`, `glideSnapMode`, `floorGlideAccumulator`, `hoveredFloorId`).
- Removed duplicate local helper functions (`calculateArea`, `getCentroid`, `completeFloorPolygon`, `handleCancelDrawingFloor`, `handleUndoFloorPoint`, `handleFloorGlideMove`, `handleFloorSingleNudge`).
- Connected `cancelFloorInteraction` into `cancelActiveInteractions` (invoked during pinch-zoom).
- Connected SVG polygon handles and HUD buttons to hook methods.
- Preserved all SVG render markup, patterns, and styling intact.

### 4. Verification & Build
- `npm run lint` (`tsc --noEmit`): 0 errors.
- `compile_applet` (`vite build`): Built cleanly with 0 errors.
- Automated tests created and executed (`scripts/test-stage5e-floor.ts`):
  - Rectangle creation and minimum size threshold validation.
  - Reversed corner drag invariance.
  - Floor translation area invariance.
  - Corner vertex manipulation (isolated modification).
  - Midpoint '+' handle edge split (index insertion).
  - Corner vertex deletion and minimum 3-vertex floor boundary protection.
  - Area and centroid mathematical accuracy.
  - Orthogonal Shift key constraint.
  - Zoom-dependent polygon closure hit testing.
- Full regression test suite re-run and passing 100%:
  - Stage 5B Selection: Passed 100%.
  - Stage 5C Furniture Manipulation: Passed 100%.
  - Stage 5D Wall Manipulation: Passed 100%.
  - Stage 5E Floor Manipulation: Passed 100%.

## Stage 5F: Drawing & Input Interaction Consolidation - COMPLETED

**Objective**: Audit and consolidate the remaining drawing and input interaction architecture across the 2D canvas, viewport, tools, and keyboard shortcuts without introducing monolithic abstractions, preserving strict domain separation and behavioral parity.

### 1. Comprehensive Input Architecture Audit
- **Global / App Level (`App.tsx`)**:
  - Global shortcuts: Undo (`Ctrl/Cmd+Z`), Redo (`Ctrl/Cmd+Shift+Z`), Save (`Ctrl/Cmd+S`), Copy (`Ctrl/Cmd+C`), Paste (`Ctrl/Cmd+V`), Delete (`Delete`/`Backspace`), Tool Switching (`v`, `w`, `f`, `c`, `m`), Rotate (`r`), Clear/Cancel (`Escape`).
  - Target isolation: Checked inputs to prevent shortcut collision during text editing.
- **Viewport Level (`useCanvasViewport.ts`)**:
  - Spacebar panning detection on window (`keydown`/`keyup`).
  - Container-level non-passive wheel event handling (Ctrl+Wheel / Trackpad pinch zoom vs 2D wheel pan).
  - Pointer down/move/up for pinch gestures (2+ pointers) and single pointer panning (middle-click, spacebar+left-click, or pan mode).
- **Tool Domain Hooks (`useWallInteraction`, `useFloorInteraction`, `useFurnitureInteraction`, `useCanvasSelection`)**:
  - `useWallInteraction`: Manages wall drawing state (`drawingStart`, `drawingCurrent`), segment dragging, node dragging, Shift orthogonal constraint, and Escape tool cancellation.
  - `useFloorInteraction`: Manages floor drawing state (`drawingFloorPts`, `previewPt`, `floorDrawMode`, `rectStart`), polygon completion, vertex dragging, edge splitting, Shift constraint, and drawing keyboard shortcuts (Escape, Tab, Backspace/Delete, Enter, Ctrl+Z).
  - `useFurnitureInteraction`: Manages furniture dragging (`draggingItem`), 5px drag threshold, collision/magnetic snapping, and multi-selection delta tracking.
  - `useCanvasSelection`: Manages marquee box selection (`selectionBox`) on canvas background.
- **Ruler Interaction**:
  - Measurement state (`rulers`, `drawingRulerStart`, `drawingRulerCurrent`) verified and isolated in `Canvas2D`.
  - Fixed a latent display bug where ruler preview previously referenced `drawingCurrent` (wall state) instead of `drawingRulerCurrent`.
  - Added mode cleanup effect and Escape key cancellation for ruler in-progress measurements.
- **Universal Joystick**:
  - Completely isolated pointer capture (`setPointerCapture`/`releasePointerCapture`) preventing any event bleed into canvas pan or selection.

### 2. Input Ownership Matrix
| Interaction State | Primary Owner | Secondary/Consumer | Event Target & Propagation |
| :--- | :--- | :--- | :--- |
| `zoom`, `pan` | `useCanvasViewport` | `Canvas2D` (transform layer) | Window wheel & touch pointer gestures |
| `spacePressed` | `useCanvasViewport` | `useCanvasViewport` | Window keydown/keyup on `' '` |
| `selectionBox` | `useCanvasSelection` | `Canvas2D` (SVG overlay) | PointerDown/Move/Up on canvas background in SELECT mode |
| `draggingItem` | `useFurnitureInteraction` | `Canvas2D` (DOM items) | PointerDown on item (stopPropagation), move/up on canvas |
| `drawingStart`, `drawingCurrent` | `useWallInteraction` | `Canvas2D` (preview SVG) | PointerDown/Move/Up in DRAW_WALL mode, Escape key |
| `draggingWall`, `draggingWallNode` | `useWallInteraction` | `Canvas2D` (SVG wall & nodes) | PointerDown on wall/node (stopPropagation), move/up on canvas |
| `drawingFloorPts`, `previewPt` | `useFloorInteraction` | `Canvas2D` (preview SVG) | PointerDown/Move/Up/DblClick in DRAW_FLOOR mode, Keys |
| `draggingFloor`, `draggingFloorNode` | `useFloorInteraction` | `Canvas2D` (SVG floor & handles) | PointerDown on floor/node (stopPropagation), move/up on canvas |
| `rulers`, `drawingRulerStart` | `Canvas2D` (Ruler state) | `Canvas2D` (SVG overlay) | PointerDown/Move/Up in RULER mode, Escape key |
| `isDragging` (Joystick) | `UniversalJoystick` | `App` / `useFloorInteraction` | Joystick knob (pointer capture, stopPropagation) |

### 3. Shared Low-Level Input Utilities (`src/utils/input.ts`)
- Created `src/utils/input.ts` containing pure, framework-agnostic helper functions:
  - `isInteractiveElement(target)`: Safely detects `<input>`, `<textarea>`, `<select>`, and `isContentEditable` targets with SSR/Node safety checks.
  - `isPrimaryPointer(e)`: Standardizes left-click and primary touch detection.
  - `getModifierState(e)`: Extracts `{ ctrlOrMeta, shift, alt }` from keyboard and pointer events.
- Integrated `isInteractiveElement` into `App.tsx`, `useCanvasViewport.ts`, and `Canvas2D.tsx`, consolidating input guard duplication.

### 4. Wall & Tool Keyboard Consolidation
- Added `handleKeyDown` to `useWallInteraction`, encapsulating `DRAW_WALL` Escape cancellation and mode reset.
- Consolidated `Canvas2D` keyboard listener to sequentially query domain hooks:
  1. `handleFloorKeyDown(e)` (captures Escape, Tab, Backspace/Delete, Enter, Ctrl+Z during floor drawing)
  2. `handleWallKeyDown(e)` (captures Escape during wall drawing)
  3. Ruler Escape handling (cancels in-progress measurement)
  - All captured events invoke `e.preventDefault()` and `e.stopPropagation()` during the capture phase, preventing unintended global actions.

### 5. Verification & Tests
- Automated test script `scripts/test-stage5f-interaction.ts`:
  - Verified `isInteractiveElement` target filtering across interactive vs non-interactive elements.
  - Verified `isPrimaryPointer` differentiation between left, middle, right click, and touch.
  - Verified `getModifierState` extraction for all modifier combinations.
- Regression test suite (100% passing across all stages):
  - `scripts/test-stage5b-selection.ts`
  - `scripts/test-stage5c-furniture.ts`
  - `scripts/test-stage5d-wall.ts`
  - `scripts/test-stage5e-floor.ts`
  - `scripts/test-stage5f-interaction.ts`
- Verification via `lint_applet` (`tsc --noEmit`): 0 errors.
- Verification via `compile_applet` (`vite build`): Built successfully with 0 errors.




