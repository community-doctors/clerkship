# Alang-Alang Source Trace v21

Builds on v20.

## Replace
- `diagnosis.html`
- `diagnosis.js`
- `diagnosis-analytics.css`

## No SQL needed

## New: click-through source tracing
Click supported bars/values in Community Diagnosis to see exactly which source survey records produced the count.

Supported examples include:
- Sex Distribution, including `Unknown / not stated`
- Population age groups and Population Pyramid bands
- 0–23 months, 0–11 months, and 12–23 months
- Reported illnesses and illness sex
- Causes of death
- family income, livelihood, water source/treatment, toilet type, garbage disposal
- detailed categorical, binary, multi-select, text-frequency, and date questionnaire analytics

## Source panel
The drill-down lists:
- household code
- zone
- interview date
- interviewer
- encoder
- matching member or repeater-row detail when available

`View survey` opens the entire individual survey in a read-only panel inside Diagnosis.

If the signed-in user owns the survey (or is an admin), an `Edit survey` button is also shown. It safely materializes the synced record to the device before opening `household-survey.html`.

## Privacy
Direct identifiers are still excluded from aggregate graphs and exported images. They are only visible inside the authenticated source-survey drill-down for internal validation.

## Offline behavior
Read-only source tracing works from the cached analytics dataset. Editing a synced-only survey may require reconnecting first.

Every detailed questionnaire analytics card also has a **Sources** button, including numeric fields that do not have clickable histogram bins.
