# Alang-Alang Fieldwork Hub — Raw CSV Export v8

## Adds
- `Download CSV` on Surveys → Group database
- Exports all synced household records readable by the signed-in group member
- One row per household survey
- Metadata + GPS + timestamps first
- Every key in `response_json` becomes a CSV column
- Repeaters such as family members and adult vital signs are preserved as JSON text in their cell
- Full original `response_json` is also included as the last column
- UTF-8 CSV for Excel/Google Sheets

## Replace
- `surveys.html`
- `surveys.js`
- `service-worker.js`
- `app-common.js`

No SQL needed. Keep your existing `supabase-config.js`.

The CSV contains raw household-level information, including identifiers/health data when entered, so store and share it only within the approved fieldwork workflow.
