# Alang-Alang Compressed Health Tally v22

Builds on Source Trace v21.

## Replace
- diagnosis.html
- diagnosis.js
- diagnosis-analytics.css

## No SQL needed

## Added: Compressed Health Tally
At the top of the Health tab, the dashboard now summarizes exactly:

1. Population 0–23 months
   - 0–11 months
   - 12–23 months
   - total 0–23 months

2. Morbidity
   - ALL reported illness causes
   - frequency and percent of illness records

3. Mortality
   - ALL reported causes of death
   - frequency and percent of death records

4. Interventions used during illness
   - household-level frequency
   - percent among households that answered

5. Frequently availed health services
   - household-level frequency
   - percent among households that answered

6. Preferred health worker
   - household-level frequency
   - percent among households that answered

## Source tracing retained
Click any category/row to see the source household surveys.
For ranking/text fields, the source panel also shows the raw response.

## Free-text ranking cleanup
The original survey used text areas for:
- health_services_rank
- health_worker_rank
- health_interventions_rank

v22 conservatively:
- splits line/comma/semicolon/rank-separated entries
- removes leading rank numbers
- groups obvious aliases, e.g. RHU = Rural Health Unit; BHS = Barangay Health Station
- does NOT modify the original survey data

## CSV
Use “Download CSV” in Compressed Health Tally to export a ready-to-tally table with:
- Indicator
- Category
- Frequency
- Denominator
- Percent
- Basis

Note: multiple-response fields can total above 100%.
