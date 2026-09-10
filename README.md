# Alang-Alang Smart Family Autofill v11

## Replace
- household-survey.html
- household-survey.js
- surveys.html
- surveys.js

## Add
- smart-profile.css

## No SQL needed

## What it does
- Surveys overview shows Interviewer + Encoded by
- Adds Birthdate + Pregnancy status to household head and family member profiles
- Birthdate calculates age automatically
- Smart fill reuses household member identity data without overwriting manually entered answers
- Adults 18+ are added to Adult Vitals
- Children 0–24 months are added to Breastfeeding + Supplementary Feeding
- Children 0–59 months are added to Nutrition, including birthdate
- Children 0–12 months are added to Immunization, with calculated age in months when birthdate is known
- Members marked Currently pregnant populate the Prenatal member selector
- If no eligible member exists, the downstream section is left alone
- A Refresh fields button is provided as a manual fallback

## Safety rule
Smart fill only fills blank identity fields. It does not answer clinical/history questions such as
breastfed yes/no, immunization doses, prenatal care, vital signs, etc.

Open the app online once after upload so the new CSS/JS are cached for offline use.
