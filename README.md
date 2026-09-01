# Alang-Alang Community Fieldwork Hub

A separate lightweight group-only web app for Alang-Alang community fieldwork.

## Included
- UPM-SHS 2023 Household Survey (full digital form)
- Offline local drafts via IndexedDB
- Sync queue to Supabase
- Robust GPS capture (up to ~65 seconds, keeps best fix) + manual coordinates fallback
- Optional reference photo
- Shared household field map
- Group-added community map points
- Community diagnosis indicator summary
- Triangulation notes
- Priority-problem scoring
- Shared group calendar with optional realtime refresh
- Mobile bottom navigation and installable PWA shell

## Deploy
Recommended: create a NEW Supabase project for this group app.
It can also live in the same Supabase project as the Toolkit because all database objects use the `aa_` prefix.

1. Run `setup.sql` in Supabase SQL Editor.
2. In Authentication > Users, create an account for each group member.
3. Use the commented membership SQL at the bottom of `setup.sql` to add those users to `aa_group_members`.
4. Make one account `role='admin'`.
5. Edit `supabase-config.js` and paste the project URL + publishable/anon key.
6. In Authentication > URL Configuration, set the Site URL to your deployment URL.
7. Upload all files to a static host (GitHub Pages works).
8. Each member should sign in and open Surveys + Household Survey once while online before fieldwork.

## Offline behavior
The household survey pages and app shell are cached after first online load. Draft answers, GPS coordinates, and optional photo are stored on the device first. When internet returns, use **Sync pending records** or **Sync Now**.

GPS itself can work without internet on devices with GPS/GNSS hardware, but the first fix may take longer offline. Keep device Location ON and preferably capture outdoors/near a window. The app waits for the best fix for up to ~65 seconds and includes manual coordinate fallback.

The Leaflet/OpenStreetMap base map and shared calendar/database synchronization still need internet. Map/diagnosis/calendar pages can show the most recently cached shared data when offline.

## Privacy
Household survey data may contain identifying and health information. Use individual accounts, protect devices, avoid unnecessary reference photos, and only collect GPS/photos if allowed by your approved field protocol. Household map popups intentionally omit names and detailed health answers.

## Community diagnosis note
Survey patterns are not a diagnosis by themselves. Triangulate them with observation, secondary data, stakeholder input, and faculty/preceptor review.
