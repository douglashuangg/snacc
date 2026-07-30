# Snacc

An Expo Go community app for discovering, rating, reviewing, contributing, and comparing specific snack flavours.

## What is included

- Discover, search, multi-taste filtering, subcategories, price levels, minimum score, and sorting
- Snack details with category tags, factor averages, review count, and written reviews
- Five-factor ratings with the weighted score: 40% taste, 20% texture, 20% value, 10% packaging, and 10% buy-again
- Email/password accounts, Google signup, one editable rating per user and snack, and rating deletion
- Separate create-account flow with password confirmation
- New snack submissions, duplicate detection, image URL or photo upload, and content reports
- Two-product comparison and a profile activity view
- Supabase schema, constraints, indexes, seed catalogue, Storage bucket, triggers, and row-level security
- A local demo catalogue when Supabase credentials are not configured

## Requirements

- Node.js 20 or newer
- npm
- Expo Go on a device, or an Android/iOS simulator
- A Supabase project for accounts and live community data

## Run the app

```sh
npm install
cp .env.example .env
npm start
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

The app starts with a read-only demo catalogue if `.env` is absent. Scan the Expo QR code to open it in Expo Go. Accounts, contributions, ratings, reports, and uploads require a configured backend.

## Configure Supabase

1. Create a Supabase project.
2. Apply `supabase/migrations/202607170001_initial_schema.sql` using the Supabase SQL editor, or link the Supabase CLI and run `supabase db push`.
3. Apply `supabase/seed.sql` in the SQL editor. For a local Supabase stack, `supabase db reset` applies migrations and seed data.
4. In Authentication settings, enable Email and choose whether email confirmation is required.
5. To support Google signup:
   - Enable **Google** under Authentication → Providers (Client ID + Secret from Google Cloud).
   - In Google Cloud, set the authorized redirect URI to
     `https://<project-ref>.supabase.co/auth/v1/callback` (not the app deep link).
   - Under Authentication → URL Configuration → Redirect URLs, add:
     - `snacc://**`
     - `exp://**` (required when testing in Expo Go)
   - Tapping “Continue with Google” in `__DEV__` logs the exact `redirectTo` in Metro if you need to allowlist it.
6. Copy the project URL and public anon key into `.env`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Never place the service-role key in the Expo app. The client is intentionally designed for the public anon key plus row-level security.

## Project structure

- `app/` — Expo Router screens and navigation
- `components/` — reusable cards, controls, states, and rating UI
- `constants/` — design tokens
- `lib/` — Supabase client, query hooks, validation, scoring, demo data, and compare state
- `providers/` — authentication session provider
- `types/` — domain and database contracts
- `supabase/migrations/` — database schema, functions, Storage, and RLS
- `supabase/functions/` — server-only Rakuten genre/product ingestion and tag parsing
- `supabase/seed.sql` — taxonomy and 15 sample snack products

## Rakuten snack ingestion

Rakuten products are fetched only by Supabase Edge Functions and enter the
catalogue as private drafts. The Expo bundle never receives Rakuten credentials
or the Supabase service-role key. See
[`supabase/RAKUTEN_INGESTION.md`](supabase/RAKUTEN_INGESTION.md) for secrets,
the local importer, dry-run requests, the SQL review/approval workflow, and
verification commands.

## Quality checks

```sh
npm run typecheck
npm run lint
npm test
npx expo install --check
```

The score calculation has unit coverage. Database authorization should also be verified against a linked Supabase project with separate anonymous and authenticated sessions before production release.
