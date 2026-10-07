# RoomPlan visual redesign — 7 October 2026

## Audit and approach

The cloud stylesheet applied form-button padding, borders and backgrounds to every editor button. This overrode Tailwind control states and dimensions. Cloud/editor typography differed, purple and teal competed, desktop furniture names were truncated, and nested pills and heavy shadows weakened hierarchy. Mobile 3D actions extended into a horizontal scroller. Narrow desktop canvases could overlap scale information with zoom controls.

The presentation now uses shared tokens in `src/design-system.css` and Tailwind theme aliases in `src/index.css`: warm page/surface neutrals, dark green-black text, restrained teal, an installed Segoe UI/system font stack, 8px controls, 14–16px panels, light borders and restrained shadows. Existing material colors remain document data. Focus rings and reduced-motion support are shared.

## Changes

- Scoped cloud form-button styling to cloud surfaces, preserving editor utility styles.
- Restyled sign-in/OTP forms, project dashboard/cards/empty states, sharing/permissions, invitations, connection status and collaborator labels.
- Unified RoomPlan.Online branding and browser title/theme color.
- Restyled editor shell, mode switch, library, inspector, material selectors, mobile rail/catalog/panels, export dialog and desktop tool dock.
- Wrapped desktop furniture names and exposed selected modes through `aria-pressed`.
- Mobile camera actions wrap into rows; handlers, gestures and camera state transitions are unchanged.
- Narrow desktop scale/save information is repositioned to avoid the zoom toolbar.
- Sharing has an independently scrolling body and sticky heading/close action.
- No database/schema, authorization, document model, persistence or gesture-handler changes for styling. Earlier uncommitted cursor-recovery changes remain separate work in the checkout.

## Verification

Browser checks: 390×844 mobile, 768×1024 tablet and 1280px desktop. Captured before/after editor screenshots plus catalog, sign-in, 3D, sharing and dashboard screenshots under `docs/screenshots/redesign-*`.

- Mobile catalog search, add Nightstand, drag at mobile viewport, open properties, undo drag and addition. Local save status reached “Saved on this device”. Test additions were undone.
- General/Isometric/Walk modes inspected; mobile 3D controls measured approximately 75×48px with no horizontal overflow. Base mobile editor controls measured at least 44×44px.
- Layers, project options and export dialog opened and inspected.
- Sign-in form inspected without sending an email. OTP verification not performed in this pass.
- Shared-link creation with 7-day viewer permission checked through the existing isolated in-memory collaboration fixture. No real guest access or permissions created. Dialog scroll width equaled client width at 390px.
- Dashboard cards and unmatched-search state checked using the production Dashboard component with an isolated test transport. This fixture is not imported into production. Actual cloud project creation/rename/archive was not exercised.
- Tablet editor header and page measured 768px without horizontal overflow. Desktop page measured 1280px without horizontal overflow.
- Contrast: primary text on surface 13.83:1, secondary text 5.17:1, white on primary teal 7.02:1. These are token checks, not an exhaustive accessibility certification.
- Existing regression suites passed: mobile item drag/ownership, document history, mobile camera movement, project files, cloud sync, cloud auth, collaboration loop, guest collaboration permissions/expiry.
- TypeScript and production build passed. Existing large-bundle warning remains.

Physical iOS/Android touch, browser chrome changes, soft keyboard and assistive technology have not been tested. Browser drag verification used pointer input at the mobile viewport, supplemented by existing gesture unit tests. Native browser prompt/confirm dialogs retain browser styling. End-to-end delivery of email and production cloud writes were not retested. No GitHub push or deployment performed.
