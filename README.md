# Completed Survey Edit + Discard v9

Replace/add:
- surveys.html
- surveys.js
- household-survey.html
- survey-sync.js
- survey-record-actions.js
- survey-record-actions.css

No new database table is required.

Behavior:
- Local completed surveys are editable.
- Synced completed surveys owned by the signed-in member can be clicked/Edit and loaded into the survey form.
- Admin can edit/manage all synced records.
- Editing a completed survey keeps its status as completed; autosave marks changes pending, then Sync updates the same server record.
- Discard is available for draft and completed surveys.
- Synced deletion requires internet.
- Completed deletion uses a stronger irreversible warning.
- CSV export remains available.
- Respondent/adult-vitals fields remain stored inside response_json.

Photo deletion:
If you already ran the earlier v5 discard-draft policy, no SQL is needed. If not, run optional-photo-delete-policy.sql once so synced reference photos can also be deleted.

Keep your existing live supabase-config.js.
