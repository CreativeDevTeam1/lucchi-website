# Deploying Lucchi Furniture

## How content gets live

```
Sanity Studio (edit + Publish)
      |  webhook (on publish / unpublish / delete, dataset "production")
      v
Vercel Deploy Hook  -- starts a new production build
      |
      v
Vercel build:  npm run build
      |   prebuild  -> node scripts/sync-sanity.mjs   (reads Sanity with SANITY_READ_TOKEN)
      |             -> writes src/data/sanity-snapshot.json
      |   vite build -> dist/
      v
Live site (lucchi-website-beige.vercel.app)
```

- The browser never calls Sanity. The site reads only `src/data/sanity-snapshot.json` (through `src/data/content.js`).
- If the sync cannot run (no token, Sanity unreachable, invalid data) it prints a warning, keeps the snapshot that is in the repo, and the build still passes. So a missing token never breaks a deploy, but the content will be the old snapshot.
- The only prices fetched are a piece's optional `price` and `compareAtPrice` (EGP) and `showPrice` from Sanity; it shows on the site only when set and "Show price on website" is on.

## Variables

| Name | Where | Needed for |
| --- | --- | --- |
| `SANITY_READ_TOKEN` | Vercel project (Production and Preview) and local `.env.local` | The build-time sync. Pieces and categories are private documents, so a read token is required. It is set in the Vercel project; without it a build keeps the snapshot that is in the repo. |
| `SANITY_WRITE_TOKEN` | Local `.env.local` only | The one-off Sanity scripts in `scripts/` (import, patch-contact, add-coffee-corner, sync-folders). Never put it in Vercel, in `src/` or in git. |
| `SANITY_PROJECT_ID`, `SANITY_DATASET` | Optional (defaults `szy0z3lw`, `production`) | Testing the fallback only. |

Create tokens at sanity.io/manage > project "lucchi" > API > Tokens (Viewer for read, Editor for write). `.env*` is git-ignored; `.env.example` lists the variable names. Never paste a token or a deploy hook URL into a file that is committed.

## How deploys happen

- **Code:** deploys are automatic. Pushing to `main` (`git push origin main-clean:main`) makes Vercel build and publish the production site (project `lucchi-website`, connected to https://github.com/tasbeehmamdouh/lucchi-website).
- **Content:** the Sanity webhook `vercel-deploy` calls a Vercel deploy hook, so a content change in Sanity rebuilds the site. The build re-runs the sync and picks up the new content.
- **Caveat (seen in practice):** the webhook fires once per changed document, and uploading an image counts as a document too. A bulk write (many uploads or many patches) starts one build per event; Vercel cancels the ones that are superseded, but each still counts toward the daily deployment limit of the Hobby plan (100 per day). For a large change, pause the webhook in the Sanity dashboard first and trigger a single deploy afterwards.
- **Studio:** run `npx sanity deploy --url lucchi` from the `studio-lucchi` folder to update the hosted Studio (https://lucchi.sanity.studio/) after a schema change. The Studio is a separate project, not part of this repository.

## One-time setup of the automatic flow (already done, kept for reference)

1. Vercel: project `lucchi-website` > Settings > Environment Variables: add `SANITY_READ_TOKEN` (Production + Preview).
2. Vercel: Settings > Git > Deploy Hooks: create a hook for branch `main` and copy its URL (keep it secret).
3. Sanity: sanity.io/manage > project > API > Webhooks > Create: URL = the deploy hook, dataset `production`, trigger on Create, Update and Delete, method POST. Check that all three are ticked: a webhook that only listens to Create misses edits and deletes. (Optional filter: `_type in ["piece","category","homePage","aboutPage","contactSettings","siteSettings"]`.)
4. Edit and Publish something in the Studio; a new deployment should appear in Vercel within seconds.

## Final domain

The site is live on https://lucchi-website-beige.vercel.app. The final domain (lucchi.com) is **pending DNS**: the A record `@` on lucchi.com must point to `216.198.79.1`. Once DNS resolves, add the domain in the Vercel project (Settings > Domains) if it is not there yet, and check the live URL again.

## Manual deploy (fallback)

The normal route is a git push (see "How deploys happen"). The Vercel CLI is the fallback, for example to publish a local build without a push. `CLAUDE.md` has the standing rule on when a deploy is allowed.

```bash
npm run sync      # refresh src/data/sanity-snapshot.json (needs SANITY_READ_TOKEN in .env.local)
npm run build     # must pass; also runs the sync first
npx vercel --prod # same project, same URL
```

If the CLI says "Not authorized" or "Internal Server Error", run it again; if it keeps failing run `npx vercel login`.

After a deploy, check the live URL: the hero (desktop and phone), `/collections`, a piece page, `/contact`, and `curl -I` on `/media/hero/hero-mobile-seq.mp4` (200, `video/mp4`).

Notes:
- `.vercelignore` only trims what the CLI uploads (the upload must stay under 100 MB). A Git-connected build uses the repository instead, so unused media that is committed stays in the build output.
- `private-data/` (prices) and `public/media/hero/alt/` are git-ignored and never deployed.
- The Studio is a separate project (`../studio-lucchi`). After changing a schema there, run `npx sanity deploy --url lucchi` from that folder to update the hosted Studio.

---

# Older notes: what the Vercel CLI uploads (kept from the previous DEPLOY.md)

The CLI upload must stay under 100 MB. (This section only concerns `npx vercel` uploads; a Git-connected build uses the repository.)

### What gets uploaded (`.vercelignore`)
- Not uploaded: `node_modules`, `dist`, `.vercel`, env files, root-level briefs and source files (`*.md`, `*.pdf`, `*.zip`, `*.csv`, `*.txt`, images at the project root), `client-assets`, `Lucchi_Product_Reference_Photos`, `grade-report`, `lucchi-backup`, `.cursor`.
- Trimmed on 2026-10-05: 188 files in `public/` (35.9 MB) that no code references (old image variants, unused JPG siblings, old poster files). The block at the bottom of `.vercelignore` lists them. They stay in the project; they are just not uploaded.
- Upload size after trim 1: about 122.5 MB.
- Trim 2 (2026-10-05): the JPEG fallbacks (238 files) and the 2560px AVIF/WebP variants (20 files) are also left out, 46.9 MB in total. Upload size now: about 75.6 MB. Built `dist`: about 79 MB.
- Proof: a copy of the project without the ignored files built fine, and every image on `/`, `/collections` (all filters), `/about` and the menu loaded with no 404, at 1440x900 and 390x844.

### Keep the list fresh
If you add or replace images in `public/`, the generated block in `.vercelignore` can go stale. A file that is newly referenced but still listed there would be missing on the live site. Remove its line before deploying.

### What trim 2 changed in the code
- `scripts/trim-deploy-srcsets.mjs` (already run) removed the JPEG srcset lists and the 2560w candidates from `src/data/images.json` (hero block untouched). Without this, a browser could pick a file that is not uploaded and show a broken image. The old JSON is in git history (commit before "trim deploy size 2").
- `<img>` now falls back to its WebP `src`. Tested: with AVIF sources removed, WebP is used; with AVIF and WebP sources removed, the WebP `src` is used. No broken image either way. A browser with no WebP support at all (very old Safari or IE) would not show these images.

### Kept in the upload on purpose
- All `public/media/hero/*` (the hero still image is referenced directly by `src`, JPG included, and by its srcset incl. 2560).
- `media/about/curve-set-soft-*.jpg` (inline fallback in AboutPage.jsx).
- WebP defaults, favicon, og:image (`/images/products/turkish-set.webp`), video posters, videos.

### Remember
- The og:image / twitter:image in `index.html` is a relative path. Many social crawlers need a full URL (`https://lucchi-website-beige.vercel.app/images/...`). Not changed.
- If you add images to `public/`, check the generated blocks at the bottom of `.vercelignore` do not hide a file that the site now uses.

### Next safest cut (not applied)
Collections `*-desktop*`, `*-desktop-tone*`, `*-desktop-soft*`, `*-mobile-tone` and `*-mobile-soft` images (about 30 MB) are listed in images.json but no page renders them (the row uses `mobile.graded`, the menu uses `primary`/`secondary`).
