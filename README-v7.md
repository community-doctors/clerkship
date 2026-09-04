# Alang-Alang Household Survey — Interview + Adult Vitals v7

## Replace
- household-survey.html
- household-survey.js
- compact-ui.css
- service-worker.js
- app-common.js

No SQL needed. New answers are stored inside the existing `response_json`.

## Added
- respondent/informant name
- relationship to household head
- respondent age and sex
- information source
- repeatable adult vital signs (18+): name, age, BP, PR, RR, temperature, SpO2, remarks

## Converted to dropdown / structured fields
- household head educational attainment
- family member relationship to head
- family member civil status
- family member educational attainment
- primary household language
- family planning method
- prenatal visit count changed to numeric

The rest of the Household Survey was intentionally left unchanged.
