# Lucchi Furniture website

Marketing and catalogue site for **Lucchi Furniture**: React + Vite, with all content (pieces, categories, home / about / contact copy, prices) managed in **Sanity**.

- Live site: https://lucchi-website-beige.vercel.app (the final domain is pending DNS, see `DEPLOY.md`)
- CMS (Sanity Studio): https://lucchi.sanity.studio/
- Repository: https://github.com/tasbeehmamdouh/lucchi-website

## Run it locally

Requires Node.js (the project was built and tested on Node 24) and npm.

```bash
npm install
cp .env.example .env.local   # then fill in SANITY_READ_TOKEN (see below); optional for a first look
npm run dev                  # dev server on http://localhost:3000
npm run build                # production build into dist/ (runs the Sanity sync first)
npm run preview              # serves the built dist/ on http://localhost:3000
```

Without a token the sync only prints a warning and keeps the content snapshot that is already in the repo, so the site still builds and runs.

## Environment variables

Names only; copy `.env.example` to `.env.local` (git-ignored) and fill in the values. Never commit a token.

| Name | Used by | Notes |
| --- | --- | --- |
| `SANITY_PROJECT_ID`, `SANITY_DATASET` | `scripts/sync-sanity.mjs` | Optional, default to the Lucchi project and `production`. |
| `SANITY_READ_TOKEN` | `scripts/sync-sanity.mjs` (build time) | Viewer token. Pieces and categories are private documents, so the sync needs it. Also set in the Vercel project. |
| `SANITY_WRITE_TOKEN` | the one-off Sanity scripts in `scripts/` | Editor token, local `.env.local` only. Never in Vercel, in `src/` or in git. |
| `HERO_OUT_DIR` | `scripts/generate-hero.mjs` | Optional output folder for the hero generator. |

## How content flows

```
Sanity Studio (edit + Publish)
   -> npm run sync            (scripts/sync-sanity.mjs, uses SANITY_READ_TOKEN)
   -> src/data/sanity-snapshot.json
   -> npm run build           (the browser never calls Sanity; the site reads only the snapshot)
```

- `npm run build` runs the sync first (`prebuild`). If the sync fails (no token, Sanity unreachable, invalid data) it keeps the last snapshot and the build still passes.
- `src/data/content.js` is the one data layer the components import. Sanity is the only source of pieces and their pictures; the local files (`products.json`, `images.json`) are only a fallback when the snapshot has no pieces at all.
- A piece can have an optional price (`price`, in EGP), an optional `compareAtPrice` (the price before a discount, shown struck through) and `showPrice`.

## Project structure

```
src/
  App.jsx              routing and page shell
  components/          Hero, Selected Pieces, Collections, piece page, contact, about...
  config/              motion and hero tuning (heroMedia.js, siteMotion.js, catalogue.js)
  data/                content.js (data layer), sanity-snapshot.json, local fallbacks
  styles.css           all styles
public/                images, hero videos and posters, icons
scripts/               sync-sanity.mjs (the build-time sync) and one-off tools (Sanity import/patch, image and hero builders)
vercel.json            Vercel build, redirects and SPA rewrite
DEPLOY.md              deployment and operations notes
CLAUDE.md              standing project rules
```

The Sanity Studio is a separate project (`studio-lucchi`, outside this repository); the schema (piece, category, home, about, contact, site settings) lives there.

## Deploys

- **Code:** pushing to `main` (`git push origin main-clean:main`) makes Vercel build and publish the production site automatically.
- **Content:** a Sanity webhook (`vercel-deploy`) calls a Vercel deploy hook, so content changes trigger a rebuild; the build re-runs the sync and picks up the new content.
- **Studio:** `npx sanity deploy --url lucchi`, run from the `studio-lucchi` folder, updates the hosted Studio after a schema change.

Details, variables and caveats are in [`DEPLOY.md`](DEPLOY.md).
