# Cloud autosave audit — 8 October 2026

## Confirmed findings (local code and reproductions)

- Every failed save was classified as an edit conflict, preventing further autosave attempts. Network errors and expired sessions require recovery, but are not evidence of a collaborator conflict.
- Realtime snapshots queued during a gesture were overwritten in arrival order. Receiving revision 3 followed by revision 2 applied revision 2 after the gesture.
- A failed background reload disabled editing regardless of whether access was actually revoked.
- Presence success could clear a write error, even though no save had succeeded.
- Recovery records held only a draft, not the cloud base required for safe merging, and were never removed after acknowledgement.
- Reload uses Supabase, not local workspace storage. No evidence was found that local workspace data overrides a cloud project on reopening.
- In an isolated PostgreSQL test, the previous validator rejects the new Japanese island catalog IDs. The latest existing migration fixes this. This reproduces a possible cause, not proof that the production migration is missing.

## Changes

ProjectSync serializes saves, keeps edits made during requests pending, retains the highest queued revision, rejects stale responses, and separates actual conflicts from other save failures. Autosave waits 450 ms after idle and defers during gestures. Save now and Retry save use the same compare-before RPC; neither overwrites conflicts. Reconnection reloads and reconciles before retry. Failed saves pause automatic writes until explicit retry or a browser reconnection, avoiding retry storms.

The cloud header shows Unsaved changes, Saving…, Saved to cloud, Offline, or Save failed and the authoritative last-confirmed timestamp. Read/presence success cannot hide a pending write failure. Only actual access errors disable editing. Mobile wrapping keeps the controls and title readable.

Local recovery stores the base and draft under a per-tab key. Completed edits are checkpointed synchronously; active gesture frames are skipped. Other tabs' drafts are preserved. Restore uses compare-before merging and rejects conflicts. Recovery is removed only when no pending difference remains against an acknowledged cloud snapshot. Old draft-only records remain downloadable. Storage failures show an export warning.

## Verification

Passed:
- TypeScript no-emit check and production build (existing bundle-size warning remains).
- test-cloud-sync.ts: collaborative merge/conflict, deferred gesture acknowledgement, viewer denial, collaborative undo.
- test-cloud-autosave.ts: idle debounce, rapid edits, slow save with newer pending edits, failed retry, offline/reconnection, expired session, highest queued revision, manual save deferred during a gesture, recovery after reopening, conflict protection, recovery cleanup, lost save acknowledgement reconciliation, stale response rejection.
- test-cloud-autosave-database.ts: actual local PostgreSQL RPC and table read-back, missing latest migration rejection, save after local migration, new catalog item persistence, two editor sessions merging independent edits, same-object conflict preserved after retry, reopening from stored data.
- test-cloud-database.ts: RLS, roles, atomicity, idempotent retry, revocation.
- test-object-pack-database.ts: all catalog IDs, options, guest writes and viewer restrictions.
- test-guest-collaboration.ts: share durations, expiry, revocation, live comments, cursor privacy, atomic edits.
- Actual CloudEditor UI in isolated SDK fixture at desktop 1280×720 and mobile 390×844: add a new island / standard window, failed save retains the object, Retry save shows Saving then Saved, stored mock document read-back. Fixture never writes to Supabase.

## Remaining production validation

The supplied project URL displayed the sign-in screen in the available browser. No test Supabase instance was supplied. Live Supabase writes/read-back, production migration state, real expired-session refresh and network/Realtime behavior are therefore not verified. PostgreSQL tests use PGlite with the repository migrations and mocked auth claims; they are not live Supabase tests. Browser tests emulate a mobile viewport, not a physical phone.

No migration, permission change, production database write, GitHub push, or deployment was performed. Once approved, check the installed migrations (especially 202610080001_japanese_islands.sql) and run a controlled live save/read-back test with two signed-in editors.

## Production follow-up — approved 8 October 2026

Read-only inspection of the live `roomplan_private.validate_document` confirmed it lacked identifiers for all five newer object packs (Japanese islands, platform steps, shoji, furniture, decorative stairs). The user then explicitly approved applying `202610080001_japanese_islands.sql`. It was executed through the Supabase SQL Editor and returned `Success. No rows returned`. This replaces the validator only; no project rows or access policies were changed. The earlier statement above that no production migration was performed describes the initial audit, before this approval.
Post-migration production SELECT called the validator on ten synthetic documents: standard/high windows, double glass door, L stairs, paired shoji, upholstered chair, platform steps, and all three Japanese islands. All ten returned successfully. No project was created or edited by this verification. Full signed-in save/read-back remains unverified.
Full catalog follow-up: all 70 catalog IDs passed the live production validator with catalog dimensions/elevations/colors, representative optional properties, and wall attachments for every window/door-shaped object. Nine read-only configuration checks passed: realtime project publication and UPDATE publication, RLS enabled, signed-in/guest saves delegate to the shared validator-backed patch handler, authenticated/anon collaboration execute privileges, and revision-based project return. These are live database validation/configuration checks, not a two-device end-to-end delivery test. No additional production changes were made.
