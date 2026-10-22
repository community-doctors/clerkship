# Alang-Alang Community Profile Dashboard v14

This patch builds on Full Questionnaire Analytics v13 and adds collated, population-level visuals for community diagnosis.

## Replace
- `diagnosis.html`
- `diagnosis.js`
- `diagnosis-analytics.css`

## No SQL needed

## New Community Profile tabs

### Overview
- total profiled population
- average household size
- under-5 population
- older adults
- currently pregnant members
- derived dependency ratio
- population pyramid
- age structure
- household-size distribution
- family-income profile
- top reported illnesses

### Population
- population pyramid (age × sex)
- age-group distribution
- sex distribution
- civil status × age group matrix
- educational attainment × age group matrix
- common occupations
- young / working-age / older population counts
- derived dependency ratio

### Health
- adults, under-5s, under-2s and pregnant-member counts
- breastfeeding
- supplementary feeding
- child weight and height status
- immunization status
- PhilHealth member types
- top illnesses
- illness age-patterns
- illness by sex
- reported causes of death
- adult-vital histograms and summary statistics

### Environment & Community
- family income
- livelihood
- education
- drinking-water source
- water treatment
- toilet coverage/type
- garbage disposal
- animals in households
- organization involvement
- community projects
- top community problems
- zone comparison for toilet, water treatment and organization involvement

The complete field-by-field questionnaire analytics from v13 remain below the Community Profile.

## Notes
- Population estimates use the household head + family members actually entered in the survey.
- Missing members are not imputed.
- Percentages use answered responses.
- Vital-sign graphs are descriptive only and do not automatically diagnose disease.
- Open the page online once after upload so the browser/service worker can cache the updated files.
