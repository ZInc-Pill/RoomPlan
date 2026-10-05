# Guest links and live collaboration

Apply `supabase/migrations/202610050001_guest_collaboration.sql` after the original cloud migration, then deploy the frontend. This migration grants anonymous callers access ONLY through validated capability RPCs; project tables remain private. The hosted migration and deployment require owner authorization and have not been performed as part of local implementation.

Owners create separate viewer/editor links with a duration of 1 hour, 24 hours, 7 days, or unlimited. Each link can be revoked independently. Guests do not register, create anonymous Supabase accounts, or acquire permanent project membership. The token travels in the URL fragment to avoid transmitting it in HTTP referrers. Treat copied links as access credentials. Old account-based links remain legacy membership invitations and are not converted; their previously joined members retain explicit account access.

The server checks permissions, expiry, revocation and archive status on every load, save and collaboration request. Editors use the same geometry validation and atomic compare-and-set patches as members. Viewers cannot write, even by calling an RPC directly. Expired open tabs remove the editor and allow downloading unsaved work. Already downloaded information cannot be recalled.

Cursor positions use world coordinates in 2D, preserving alignment across pan/zoom. In 3D they show screen-relative positions within the preview; different cameras do not imply the cursor points to the same physical object. Indicators do not intercept gestures. Display names omit full email addresses; guests get a short session label. Cursor updates never modify document revisions or undo history.

Members continue receiving authorized PostgreSQL Realtime commits. A batched capability-checked endpoint supports both guests and members: one request in flight, latest cursor only, 200 ms during movement, 500 ms when idle, no requests in hidden tabs. Documents are returned only after a revision change. Unchanged presence writes happen at most once every three seconds. Peer indicators expire after eight seconds of silence; old presence rows are cleaned on the next room heartbeat. These are near-real-time updates rather than a dedicated cursor WebSocket. Benchmark room sizes and RPC usage before a large rollout; the initial presence limit is 100 sessions per project.

View-only viewport gestures no longer open document-history transactions, so they do not delay received comments. Committed changes are still deferred during an editor's active document gesture to protect finger ownership and undo correctness. Comment typing uses the existing 450 ms save debounce.

Local verification:

- `npm run lint` and `npm run build`.
- `npx tsx scripts/test-guest-collaboration.ts`: both permissions, all four durations, expiry/revocation during ongoing access, direct-table denial, cursor privacy, revision-only document delivery, comments and idempotent atomic saves.
- `npx tsx scripts/test-collaboration-loop.ts`: latest-position batching, throttling, no overlapping requests, hidden-tab suspension and disposal.
- Existing cloud database/sync and editor gesture/history regressions.
- Browser fixture at `scripts/browser-fixtures/collaboration.html` verifies viewer comment updates without navigation, cursor pointer transparency and mobile layout at 390×844. This fixture is not part of the production build.

Live phone/desktop testing with multiple real participants requires installing the migration and deploying the frontend. Test creation and revocation from the owner share panel; open a guest link in a signed-out browser; verify viewer and editor behavior, remote comments, and expiry of an already-open tab.
