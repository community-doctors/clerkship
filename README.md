# Alang-Alang Cross-Matched & Audited Analytics v18

Builds on v17.

## Replace
- diagnosis.html
- diagnosis.js
- diagnosis-analytics.css

## No SQL needed

## Why the old counts could differ
The old Age Structure counted every member with a known age, while the Population Pyramid
counted only members whose sex was exactly Male or Female. A child with known age but missing
or nonstandard sex could therefore appear in the age graph but disappear from the pyramid.

## v18 fixes

### One canonical population dataset
All population-level graphs now use the same deduplicated household-member list.

Age source:
1. Birthdate calculated at the interview date, when available.
2. Entered age only as fallback.

### Population Pyramid
- The center of every row now shows the TOTAL for that age band.
- Male and Female remain on the two sides.
- Other/unknown sex is explicitly shown instead of silently excluded.
- Footer shows male, female, other/not stated, and total known-age population.

### Duplicate handling
Conservative duplicate removal is applied within each household when the same person appears
both as household head and as a repeated household member, or when an exact member identity
is repeated.

### Data Audit tab
Automatically cross-checks:
- total population vs sex-category total
- known-age population vs all age-band totals
- Under 5 vs `<1 + 1–4`
- Age <15 vs pediatric age bands
- dependency groups vs known-age population
- household profile-size sum vs population total

Also reports:
- missing age
- missing sex
- birthdate vs entered-age conflicts
- invalid ages
- duplicate profile rows removed

## Important
The audit verifies internal consistency of the app's derived counts. It cannot determine whether
a survey response was factually entered correctly in the field; that still requires checking the
source questionnaire/raw record.

APA/TNR exports and all-category graphs from v17 are retained.
