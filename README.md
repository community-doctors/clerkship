# Alang-Alang 0–23 Months Population v20

Builds on v19 WARA Age Brackets.

## Replace
- diagnosis.html
- diagnosis.js
- diagnosis-analytics.css

## No SQL needed

## Added
The Health tab now automatically computes:
- Total children 0–23 months
- 0–11 months
- 12–23 months
- number derived from exact birthdate + interview date
- number derived from recorded age fallback

Birthdate is preferred. If birthdate is unavailable:
- recorded age 0 years is classified as 0–11 months
- recorded age 1 year is classified as 12–23 months
- age 2 years and above is not included

The same canonical deduplicated population dataset used by the demographic dashboard is used here.

The Data Audit tab also checks:
0–23 months = 0–11 months + 12–23 months.
