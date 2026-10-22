# Alang-Alang Cleaned All-Categories Analytics v17

Builds on APA Paper Graphs v16.

## Replace
- `diagnosis.html`
- `diagnosis.js`
- `diagnosis-analytics.css`

## No SQL needed

## New data cleaning
Equivalent responses are automatically grouped before graphing:
- capitalization differences
- extra spaces
- punctuation / hyphen differences
- common singular/plural variants
- conservative close-spelling typo matching
- selected common health abbreviations and synonyms, e.g.:
  - HTN / hypertension / hypertensive / high blood pressure → Hypertension
  - DM / diabetes / diabetes mellitus → Diabetes mellitus
  - UTI → Urinary tract infection
  - URI / URTI → Upper respiratory tract infection
  - PTB / TB / tuberculosis → Tuberculosis
  - diarrhoea / diarrhea → Diarrhea

The original survey records are NOT changed. Cleaning happens only for analytics display/export.

## All categories shown
Categorical, free-text frequency, illness, occupation, problem, environmental, and other frequency graphs now show ALL detected categories instead of only Top 8 / Top 10 / Top 12.

Matrices such as education × age and civil status × age also show all detected columns.

## APA export retained
- Times New Roman
- grayscale/black
- white background
- high-resolution PNG
- SVG fallback
- download per graph/card
- download current Community Profile view
