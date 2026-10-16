# Alang-Alang Full Questionnaire Analytics v13

## Replace
- `diagnosis.html`
- `diagnosis.js`

## Add
- `diagnosis-analytics.css`

## No SQL needed

This version reads all completed household surveys from the existing
`aa_household_submissions.response_json` and discovers fields dynamically.

### Graph types
- Yes/No: donut chart
- Categorical/dropdown: horizontal bar chart
- Multi-select/checkbox: prevalence bars
- Numeric: histogram + n/mean/median/min/max
- Date: monthly distribution
- Free text: top response frequencies
- Repeaters: every nested field is analyzed separately
- Direct identifiers: completion only; raw values are not shown

### Filters
- Barangay
- Zone
- Interviewer
- Encoder/groupmate
- Interview date range
- Search by question/field

### Additional views
- overall survey KPIs
- GPS coverage
- questionnaire completion by section
- expand/collapse all
- printable analytics
- summary CSV export
- existing triangulation notes retained
- existing priority-problem scoring retained

### Important
Percentages use answered/non-NA responses where applicable.
This is descriptive analytics and should be triangulated with field observations,
secondary data, stakeholder input, and faculty review.
