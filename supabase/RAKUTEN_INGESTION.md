# Rakuten ingestion operations

Rakuten data is imported as private `pending` snack rows. It is not visible to the
mobile app until an administrator verifies its origin and supplies the existing
app catalogue fields.

## Recommended: local importer

Prefer Rakuten application type **API/Backend Service** with your machine’s
public IP allowlisted. In that mode the importer must **not** send Origin/Referer
(leave `RAKUTEN_ORIGIN` blank). Sending `https://localhost` causes
`Authentication service error`.

Web Application mode still works if you register a real Allowed Website and set
`RAKUTEN_ORIGIN` to match; the importer uses `undici` so Origin/Referer can be
sent when configured.

### Configure the Rakuten application first

1. Open your Rakuten Web Service application settings.
2. Set application type to **API/Backend Service**.
3. Under **Allowed IP addresses**, add your public IPv4 (one per line). On
   PowerShell: `(Invoke-RestMethod https://api.ipify.org?format=json).ip`
4. Save, then wait a minute for the change to apply.

Create the ignored local environment file:

```powershell
Copy-Item supabase/.env.local.example supabase/.env.local
```

Open `supabase/.env.local` and set:

- `RAKUTEN_APPLICATION_ID`
- `RAKUTEN_ACCESS_KEY`
- Leave `RAKUTEN_ORIGIN` blank (Backend/IP mode)
- For real imports: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

Never use the publishable/anonymous key for importing, and never commit or share
this file. The official browser API Test Form can succeed even when local calls
fail, because that form is not the same request path as a direct API call.

Test genre discovery without writing:

```powershell
npx -y deno run --config=supabase/deno.json --env-file=supabase/.env.local --allow-env --allow-net `
  supabase/scripts/rakuten-import.ts genres --genre-id 0 --depth 2 --max-genres 250 --dry-run
```

Only after the result says `"status": "succeeded"`, store those genres:

```powershell
npx -y deno run --config=supabase/deno.json --env-file=supabase/.env.local --allow-env --allow-net `
  supabase/scripts/rakuten-import.ts genres --genre-id 0 --depth 2 --max-genres 250
```

Test a small product batch:

```powershell
npx -y deno run --config=supabase/deno.json --env-file=supabase/.env.local --allow-env --allow-net `
  supabase/scripts/rakuten-import.ts products `
  --keyword "ポテトチップス" --keyword "グミ" --keyword "抹茶 お菓子" `
  --max-pages 1 --dry-run
```

When the mapped samples look correct, remove `--dry-run` to save the products as
private `pending` rows:

```powershell
npx -y deno run --config=supabase/deno.json --env-file=supabase/.env.local --allow-env --allow-net `
  supabase/scripts/rakuten-import.ts products `
  --keyword "ポテトチップス" --keyword "グミ" --keyword "抹茶 お菓子" `
  --max-pages 1
```

The commands are idempotent. Increase `--max-pages` gradually after reviewing
quality and API behavior.

## Configure and deploy

Apply the migrations, then configure server-side secrets:

```sh
supabase db push
supabase secrets set RAKUTEN_APPLICATION_ID=... RAKUTEN_ACCESS_KEY=... INGESTION_ADMIN_SECRET=...
supabase secrets set RAKUTEN_AFFILIATE_ID=... # optional
supabase functions deploy rakuten-sync-genres
supabase functions deploy rakuten-sync-products
supabase functions deploy rakuten-reparse-tags
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied to hosted Edge
Functions by Supabase. Never add Rakuten credentials, the ingestion secret, or
the service-role key to the Expo `.env` file.

All function requests must include `x-ingestion-secret`. Start with dry runs:

```sh
curl -X POST "$SUPABASE_URL/functions/v1/rakuten-sync-genres" \
  -H "content-type: application/json" \
  -H "x-ingestion-secret: $INGESTION_ADMIN_SECRET" \
  -d '{"genreIds":["0"],"recursiveDepth":2,"maxGenres":250,"dryRun":true}'

curl -X POST "$SUPABASE_URL/functions/v1/rakuten-sync-products" \
  -H "content-type: application/json" \
  -H "x-ingestion-secret: $INGESTION_ADMIN_SECRET" \
  -d '{"keywords":["ポテトチップス","グミ","抹茶 お菓子"],"maxPagesPerSeed":2,"dryRun":true}'
```

After inspecting the samples, repeat with `"dryRun": false`. Keep genre and page
limits small until API behavior and result quality are understood.

## Review and approval workflow

After importing products, approve pending candidates and rebuild the browse table:

```powershell
npx -y deno run --config=supabase/deno.json --env-file=supabase/.env.local --allow-env --allow-net `
  supabase/scripts/rakuten-curate-pending.ts
```

This approves pending Rakuten snacks into the app catalogue and upserts
`public.rakuten_snack_cards` (name, brand, image, genre) for easy Table Editor
browsing. Only rows with an image and a food/snack Rakuten genre are approved.
Use `--known-only` to also require a known snack maker.

To remove junk already approved (non-snacks or missing images):

```powershell
npx -y deno run --config=supabase/deno.json --env-file=supabase/.env.local --allow-env --allow-net `
  supabase/scripts/rakuten-prune-approved.ts
```

1. Inspect `public.rakuten_snack_cards`, `public.rakuten_pending_review`,
   `public.rakuten_ingestion_conflicts`, and the private
   `public.rakuten_product_payloads.raw_product` row in the Supabase Table Editor
   or SQL Editor.
2. Verify that the product is Japanese. A Rakuten listing or JAN prefix alone is
   not sufficient evidence.
3. Inspect the stored genre tree and map approved product genres:

```sql
insert into public.rakuten_genre_subcategory_map (genre_id, subcategory_id, notes)
values ('<rakuten-genre-id>', '<existing-subcategory-uuid>', 'Reviewed path')
on conflict (genre_id) do update
set subcategory_id = excluded.subcategory_id,
    notes = excluded.notes,
    approved_at = now();
```

4. Review inferred tags and mark only accepted evidence as verified:

```sql
update public.snack_tags
set is_admin_verified = true
where snack_id = '<snack-uuid>'
  and id in ('<accepted-tag-uuid>');
```

5. Approve with explicit app-facing values. This function is revoked from
   `anon` and `authenticated`; run it only in the SQL Editor as an administrator:

```sql
select public.approve_rakuten_snack(
  '<snack-uuid>',
  '<display brand>',
  '<display product name>',
  '<display flavour>',
  '<subcategory-uuid>',
  2,
  'confirmed_japanese'
);
```

Taste categories can then be attached through `snack_categories`. Rejected
imports should be changed to `status = 'rejected'`; ingestion refreshes preserve
that status and all other administrator-controlled display fields.

## Reparse tags

After releasing a new taxonomy/parser version, deploy it and invoke
`rakuten-reparse-tags`. Verified tags are retained; only unverified tags for the
active parser version are rebuilt.

## Verification

```sh
deno test supabase/functions/_shared/ingestion.test.ts
npm run typecheck
npm run lint
npm test
```

With a local Supabase stack, reset the database and run the SQL assertions:

```sh
supabase db reset
psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rakuten_ingestion.sql
```

Before making imported data public, review the governing Japanese Rakuten terms,
storage/display permissions, required links, and branding. The app displays the
required `Supported by Rakuten Developers` credit for approved Rakuten records,
but legal/terms approval remains a release gate.
