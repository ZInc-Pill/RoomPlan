# Accounts, cloud projects and future AI planning

## Implemented boundary

The editor owns a validated `PlanDocument` and applies edits through document history. `localProjectStore.ts` owns browser load, backup and revision-checked writes. The autosave hook owns lifecycle, debounce and visible save status. JSON files remain portable and versioned.

This is local storage, not authentication or cloud sync. Its revision check detects stale writes but localStorage cannot guarantee atomic concurrent writes across tabs. Cloud storage must use database transactions or conditional writes.

## Cloud implementation contract

Use an asynchronous repository beside the local adapter. Keep the local working copy available during network failures; do not pretend a pending upload is saved remotely. Server responses return a project ID, revision, updated timestamp and validated document. Save requests include the last acknowledged revision. A mismatch returns a conflict and preserves both the local draft and remote version for explicit resolution.

The server derives the user from a verified session. Project reads, writes, list and delete operations enforce ownership in the database or service layer. Never trust an owner ID sent by the browser. Separate project metadata (owner, title, revision, timestamps) from the versioned editor document. Paginate project lists; retain bounded revisions and backups. Define account export/deletion and retention rules before launch.

Supabase is the intended provider for future authentication and cloud storage, as chosen by the user. Implementation is explicitly deferred for now; the billing provider remains undecided. Deploying the current static site does not create these services. A provider and account setup are required before working cloud login or storage can be delivered.

## Paid AI planning, after product decisions

The browser submits a planning request and shows a reviewable proposal; accepting it creates one undoable document change. Validate generated documents with the same schema and geometry constraints as file imports. No AI credentials or authoritative token balance belongs in client code.

Use durable jobs and an append-only token ledger. Purchase credits only after verifying the payment provider's signed server event; deduplicate events. Reserve tokens and enqueue jobs transactionally with idempotency keys. Finalize a debit on successful generation, or release the reservation on failure according to the agreed policy. Retries must not double-charge. Authorize job/result reads against their project owner, rate-limit submissions, and record costs without logging sensitive room requests unnecessarily.

Still to decide: purchase packs versus subscriptions, token-to-job costs, expiry, refunds, spending caps, supported AI planning inputs, proposal review, provider choice, and retention. No payments or AI jobs are implemented by this document.
