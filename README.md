# Motor Element Listing Studio

Internal Etsy listing generator for **Motor Element** — automotive custom apparel & merchandise.

Generates SEO-ready titles, tags, descriptions, and media alt texts by comparing your subject keyword against:

- Live Etsy marketplace listings (public API search)
- Your synced shop catalog
- Google Suggest trend seeds
- OpenAI structured output (or mock mode)

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase Postgres (`shop_listings`, `generated_listings`, `etsy_oauth_tokens`)
- Etsy Open API v3 (OAuth, listing sync, marketplace search)
- OpenAI structured outputs (set `USE_MOCK_GENERATION=true` to skip OpenAI)

## Deploy on Vercel

1. Push this repo to GitHub and import it in [Vercel](https://vercel.com/new).
2. Framework preset: **Next.js** (auto-detected). Root directory: repo root.
3. Add environment variables (see table below) in **Project → Settings → Environment Variables** for Production (and Preview if you want).
4. Deploy.
5. After the first deploy, set production URLs:
   - `NEXT_PUBLIC_APP_URL` → `https://etsy-listing-generator-kappa.vercel.app` (or your custom domain)
   - `ETSY_REDIRECT_URI` → `https://etsy-listing-generator-kappa.vercel.app/api/etsy/callback`
6. In the [Etsy Developers](https://www.etsy.com/developers/your-apps) app settings, add **both** callback URLs (Etsy allows a list):
   - `http://localhost:3000/api/etsy/callback` (local)
   - `https://etsy-listing-generator-kappa.vercel.app/api/etsy/callback` (production)
7. Apply all Supabase migrations (below), then open the app → log in → **Shop data** → **Connect Etsy** → **Sync now**.

Local `.env.local` should use `http://localhost:3000` for `NEXT_PUBLIC_APP_URL` / `ETSY_REDIRECT_URI`. Vercel Production env should use the Vercel HTTPS URLs. Connect/Reconnect from whichever host you’re on — OAuth uses that host’s callback.

Redeploy after changing env vars so the new values apply.

### Vercel env checklist

| Variable | Required | Notes |
|---|---|---|
| `APP_PASSWORD` | Yes | Workshop login password |
| `AUTH_SECRET` | Yes | Long random string for session cookies (do not reuse the password) |
| `NEXT_PUBLIC_APP_URL` | Yes | Production site URL, no trailing slash |
| `USE_MOCK_GENERATION` | No | Only `true` enables mocks; unset/false uses OpenAI |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon key (client/public; server uses service role) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only — never expose to the client |
| `OPENAI_API_KEY` | If mock off | Required unless `USE_MOCK_GENERATION=true` |
| `OPENAI_MODEL` | No | Default `gpt-5.6` |
| `ETSY_API_KEY` | Yes | Etsy app keystring |
| `ETSY_SHARED_SECRET` | Yes | Etsy shared secret |
| `ETSY_SHOP_ID` | Yes | Your numeric shop ID |
| `ETSY_REDIRECT_URI` | Yes | Must match Etsy app callback exactly |
| `ETSY_TAXONOMY_ID_T_SHIRT` | No | Optional per-product taxonomy override (`ETSY_TAXONOMY_ID_<PRODUCT>`) |
| `ETSY_REFRESH_TOKEN` | No | Bootstrap only; runtime tokens live in Supabase |

Copy from [`.env.example`](.env.example) when configuring.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — password gate, then Generate / Titles / Shop data / History.

## Mock vs OpenAI

- `USE_MOCK_GENERATION=true` — templated listing JSON, no OpenAI key needed
- `USE_MOCK_GENERATION=false` + `OPENAI_API_KEY` — live generation with marketplace + shop comps

## Etsy

1. Create an Etsy app and register callback URLs for local and production, e.g.:
   - `http://localhost:3000/api/etsy/callback`
   - `https://etsy-listing-generator-kappa.vercel.app/api/etsy/callback`
2. Put keystring, shared secret, and shop ID in env. Point `NEXT_PUBLIC_APP_URL` / `ETSY_REDIRECT_URI` at the environment you’re configuring (localhost in `.env.local`, Vercel URL in Vercel env).
3. Log in → **Shop data** → **Connect Etsy** / **Reconnect Etsy** → **Sync now**. For Duplicate drafts, reconnect and approve `listings_w`.

Marketplace search (used during Generate) only needs the API key. Syncing your own listings and creating drafts needs OAuth (`listings_r listings_w shops_r`).

## App pages

| Route | Purpose |
|---|---|
| `/` | Generate listing (title, tags, description, media alt texts) |
| `/duplicate` | Duplicate an active listing into an Etsy draft (edit media/copy first) |
| `/titles` | Checklist of community + brand listing titles (progress in Supabase) |
| `/shop-data` | Connect Etsy, sync listings, keyword stats |
| `/history` | Past generations |
| `/login` | Password gate |

## Notes

- Generate can take a while (marketplace search + SEO scan + OpenAI). The UI shows a progress bar while waiting.
- Do not commit `.env.local`. Use Vercel env for production secrets.
- `ETSY_REFRESH_TOKEN` is optional bootstrap; after Connect Etsy, tokens rotate in `etsy_oauth_tokens`.
