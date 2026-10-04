# Supabase setup and deployment

## Installed locally

RoomPlan includes verified-email sign-in, a paginated owned/shared project dashboard, cloud saves, owner/editor/viewer permissions, invitations, expiring sharing links, membership management, and committed-object collaboration. Local plans remain available at ?local=1 and can be imported into a cloud project.

Public browser configuration is in netlify.toml. No service-role key or mail-provider secret belongs in frontend environment variables. GitHub main automatically deploys through Netlify to https://roomplan.online.

## Hosted setup

1. Run supabase/migrations/202610040001_roomplan_cloud.sql once. The owner reported this completed successfully. Anonymous REST reads were verified denied, and email sign-in and email confirmation were verified enabled.
2. In Supabase Authentication > URL Configuration, set Site URL to https://roomplan.online. Add https://roomplan.online/** to Redirect URLs to allow the current project/invitation query routes. Keep http://127.0.0.1:3001/** and http://localhost:3001/** for development. If www.roomplan.online is served separately, allow that host or redirect it to the canonical host.
3. Configure production SMTP, authentication rate limits, and monitoring before inviting public users. Test sign-in in the same browser that requested the PKCE email link.
4. Verify with two real accounts: create a project, invite the other email, accept, edit different objects concurrently, edit the same object concurrently, revoke access, verify viewer restrictions and reload after saving. These live account tests are not yet completed.

## Sharing and concurrency

Database mutations use permission-checked security-definer RPCs with fixed search paths. Table writes are denied to clients; SELECT uses RLS. SQL validates document size, catalog types, geometry bounds, IDs, wall attachments and opening overlap. Keep catalog IDs and unit conversion constants aligned when extending the editor.

Commits send entity-level compare-and-set patches in one transaction. Independent object edits merge; overlapping object edits pause sync and preserve the draft. Duplicate entity retries are idempotent. Remote updates and save acknowledgements wait for active gestures. Independent remote changes are rebased into undo history; overlapping history is cleared to avoid undo reverting collaborators.

Realtime distributes committed documents, with a 15-second access/revision refresh. There are no live cursors or per-frame network writes. Benchmark intended project sizes and concurrency before release; larger scale should use authorized private broadcast, operation retention and compaction, and quotas.

Unsaved recovery copies are stored on this device under user/project-specific keys and can be downloaded. Cloud projects do not overwrite local project autosave. Recovery copies remain until explicitly removed; they are not automatically applied.

## Invitation email delivery

Dashboard invitations and copyable links work without an email provider. Outbound invitation emails remain disabled. To enable, deploy supabase/functions/invite-project with Supabase CLI; configure APP_URL=https://roomplan.online, RESEND_API_KEY and a verified INVITE_FROM_EMAIL as function secrets; set VITE_INVITE_EMAIL_ENABLED=true and rebuild. The function validates the caller JWT, invokes the owner-checked invitation RPC and sends plain-text mail through Resend. Delivery failures retain a copyable invitation. SQL limits repeat invitations and pending invitations per project. Configure monitoring and broader abuse controls before public rollout.

The Edge Function has not been deployed or verified against Resend. References: https://supabase.com/docs/guides/functions/auth and https://resend.com/docs/api-reference/emails/send-email.

## Google and billing

Google sign-in stays disabled until a Google OAuth web client and Supabase Google provider are configured. Keep the client secret in provider settings; then enable VITE_GOOGLE_AUTH_ENABLED and rebuild. Subscriptions, AI tokens and payment processing are not included; enforce future spending and entitlements on the server.

## Verification

npm run lint
npm run build
npx tsx scripts/test-cloud-database.ts
npx tsx scripts/test-cloud-sync.ts

The embedded PostgreSQL tests cover migration installation, RLS isolation, direct-write denial, role restrictions, invitation email matching, conflicts, retries and revocation. Sync tests cover independent merges, gesture ownership, delayed acknowledgements, viewer write suppression and collaborative undo. All existing editor regression scripts passed. The sign-in screen was checked at 390x844, and the local workspace remained accessible. Authenticated cloud dashboard/sharing browser flows still require live account testing.
