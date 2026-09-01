# Alang-Alang Fieldwork Hub — Global Loading Fix v3

This replaces the incomplete v2 loading fix.

## Actual root cause
The original `styles.css` had two missing closing braces near the mobile
Household Survey navigation rules. That left an unfinished `@media`/selector block.

Because of that malformed CSS, the previous appended `[hidden]` rule was not
reliably parsed, so loading screens could remain as full-height blocks on:
- Dashboard
- Surveys
- Household Survey
- Map
- Community Diagnosis
- Calendar

## What v3 does
1. Repairs the malformed CSS and verifies balanced `{}` braces.
2. Adds `[hidden] { display:none!important }` at the stylesheet level.
3. Adds the same tiny safety rule inline in EVERY HTML page.
4. `app-common.js` explicitly sets the loading screen to `display:none!important`.
5. `household-survey.js` does the same for the survey loading screen.
6. Bumps the service worker/cache to `aa-fieldwork-v3`.
7. Bumps CSS/common JS query versions so stale offline assets are bypassed.

## Replace
Upload/replace ALL files in this ZIP except `supabase-config.js` if your live
Supabase URL/key are already configured correctly.

If you keep your existing configured `supabase-config.js`, do NOT overwrite it
with the placeholder copy from this patch.

## No SQL

## After upload
Open the app while ONLINE once. The v3 service worker will activate and remove
older `aa-fieldwork-*` caches. Refresh once after that.

Expected behavior:
Opening page → short loading state → loading state disappears completely →
actual page starts at the top. No need to scroll past a fake loading page.
