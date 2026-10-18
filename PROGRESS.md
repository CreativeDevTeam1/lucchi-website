# Progress

## Done
- CLAUDE.md rules file.
- Local git repo created (no remote), baseline commit. `.gitignore` excludes node_modules, dist, .env.local, .vercel, client-assets, reference photos, grade-report, PDFs/ZIPs, pasted_content*.txt.
- Code backup: `../Lucchi_code_backup_2026-10-04` (code only).
- `src/data/products.json`: 39 products kept on purpose (3 extra Accessories are Selected Pieces: Side Table, Pedestal Table, Table Lamp). Product codes untouched.
- Selected Pieces auto-slide with drag (4 cards, looped).
- Collections slider (`CategoryShowcase.jsx`): one centred card at a time, auto every ~5s (1000ms ease-in-out), drag/swipe snap, pause on hover/drag/focus and resume ~4s later, arrow keys, reduced-motion = native scroll-snap row. No pinning, old `cat-pin` CSS gone.
- Homepage order: Hero, Selected Pieces, Collections, Contact CTA, Footer. Hero CTAs scroll to `selected-pieces` and `collections`.
- `npm run build` passes (only a chunk-size warning).

## Next
- Client review of the Collections slider on real devices (phone swipe).
- `scripts/recover-products.mjs` is empty (0 bytes); not needed now.
- Deploy only when told "deploy now".

- Debug code removed (18 agent-log fetch blocks to 127.0.0.1:7668 plus the empty measure effects they left). No analytics in the project.

- Selected Pieces cards made static (no hover/press/focus size or transform change; button colour feedback only). Per-card 3-dot view switcher (.sp-view-dots) removed. Image zoom-on-hover rule for placeholder images removed. If the client still sees dots on the live link: it is the Vercel Toolbar (dashboard setting, not code).

- Selected Pieces carousel is manual-only: AUTOPLAY = false in BestSellers.jsx (set true to bring the glide back). Infinite loop kept; loop stops when momentum ends. Track is always on its own layer (will-change: transform) so pressing never re-rasterises; images draggable=false.

- Selected Pieces: real zoom cause was the hover swap to the Detail image (close-up crop); now ONE image per card (Full view), Detail/Context kept in data only. Desktop-only round DRAG label (DRAG_CURSOR flag in BestSellers.jsx; false = normal cursor). Note: CLAUDE.md says 'No custom cursor' - this label is an explicit client-requested exception for this row only.

- Collections card refined: smaller 5:4 card sized from screen height (fits 1366x768 to 2560x1440), no mat/shadow/gradient, calm caption (no divider), flat oat section. Mild tone on all five category photos (scripts/tone-collections.mjs, new *-tone-* files; old *-soft-* and originals kept, images.json points at tone). Not browser-tested: reduced-motion scroll-snap fallback.

- Collections is now a heading + side-by-side row of five identical 4:5 portrait cards in an infinite loop (CategoryShowcase.jsx: AUTOPLAY, AUTO_SPEED_*, RESUME_DELAY, FRICTION, CARD_W, GAP at the top). Reduced motion / data saver = native scroll-snap list. KNOWN ISSUE (other section, not touched): in Selected Pieces, the Inquire button on cloned cards does nothing because clones use inert (BestSellers.jsx PieceCard).

- Hero entrance animation (Hero.jsx ENTRANCE config + CSS block 'HERO ENTRANCE'): classes on <html> hero-pre (set by inline script in index.html) -> hero-play (starts overlapMs before the loader has left) -> hero-done. 4s CSS failsafe; reduced motion / data saver = 400ms fade; parallax and hero video wait until the entrance ends.

- Hero is video-only: frame-0 posters (scripts/make-hero-posters.mjs -> hero-poster-desktop/mobile.webp+avif), a <video> built by an inline script in index.html at page load and adopted by Hero (getHeroVideo in heroMedia.js), loader waits for canplay (max 3.5s total), no stills / Ken Burns / lqip in the hero, video pauses off-screen / covered / tab hidden. Old hero-desktop-*, hero-poster.* files stay on disk, unused.
