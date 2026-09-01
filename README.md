# Alang-Alang Fieldwork Hub — Discard Draft v5

Run once in Supabase:
- `discard-draft-policy.sql`

Then upload/replace the app files in this ZIP.

Behavior:
- Drafts show `Discard`.
- Completed surveys do not.
- Unsynced drafts can be discarded offline.
- Synced drafts require internet so the Supabase copy is removed too.
- Synced optional photo is removed as well.

Keep your existing live `supabase-config.js` with the real project URL/key.
