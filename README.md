# Alang-Alang WARA Age Brackets v19

Builds on Cross-Matched & Audited Analytics v18.

## Replace
- diagnosis.html
- diagnosis.js
- diagnosis-analytics.css

## No SQL needed

## Age brackets now used throughout Community Diagnosis
All population-level visuals now use the age grouping shown in the provided reference table:

- 0–11 mos.
- 1–4
- 5–9
- 10–14
- 15–19
- 20–49
- 50–59
- 60 and above

These brackets are applied consistently to:
- Population Pyramid
- Age Structure
- Civil Status × Age Group
- Education × Age Group
- illness age grouping
- Data Audit age-band reconciliation

## Data consistency retained
The v18 reconciliation logic is retained:
- one canonical deduplicated population dataset
- birthdate-derived age preferred when available
- entered age used as fallback
- missing/other sex retained instead of silently excluded
- Data Audit cross-checks age totals and derived counts

## Note
Dependency ratio still follows its own demographic definition in the app:
young <15, working age 15–64, older 65+.
That calculation is separate from the display brackets above.
