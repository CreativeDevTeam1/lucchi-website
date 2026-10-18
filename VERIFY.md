# VERIFY: what the visitor sees after the Drive import

Checked on the local dev server (localhost:3000) at 1440x900 and 390x844. Nothing was changed or deployed.

## Result in one line
Homepage, Collections row and menu preview show the new images and look good. `/collections` is mixed: 17 of 39 cards show new images, 22 still show old ones. One real crop problem (Side Table). No console errors.

## Table

| Page | Slot | New or old | Problem |
|---|---|---|---|
| Home | Selected Pieces: Side Table, Pedestal Table, Table Lamp, Fireplace | NEW (4/4) | None. Sharp, whole product visible, no white edges. Same on mobile. |
| Home | Collections row: Living Room, Bedroom, Dining, Kids Bedroom, Accessories | NEW (5/5) | None. 4:5 crops fine on desktop and mobile. |
| Home | Contact section image | NEW (Living Room portrait) | None. |
| Menu | Preview image (Collections hover) | NEW (Living Room) | None. The default preview (Home) is still an old AI render. |
| /about | Image | OLD (`curve-set-soft`) | Not in the import scope. Image is sharp. |
| /collections | All (39 cards) | 17 NEW, 22 OLD | See lists below. |
| /collections | Living Room (14 cards) | 7 NEW, 7 OLD | Turkish Set: sofa edge slightly cut on the left. |
| /collections | Bedroom (7 cards) | 3 NEW, 4 OLD | Lavender: top of the headboard is close to the edge. |
| /collections | Dining (9 cards) | 4 NEW, 5 OLD | Galaxy: table top is cropped a little. |
| /collections | Kids Bedroom (5 cards) | 0 NEW, 5 OLD | No Drive match was clear for these. |
| /collections | Accessories (4 cards) | 3 NEW, 1 OLD (Fireplace) | **Side Table: top of the table is cut off (not whole). Same on desktop and mobile.** Pedestal Table and Table Lamp are fine (whole, padded edges match the background). |
| All pages | Console | n/a | No errors or warnings. Fresh tab: only Vite and React DevTools info lines. No 404s in the image requests. |
| All pages | Mobile overflow | n/a | None. Page width stays 390. |

Notes:
- Real file sizes are correct (for example 1600x2000 for the Selected Pieces, 1600x1200 for the catalogue). The browser reports a smaller `naturalWidth` because of `sizes`, so that number is not a quality problem.
- The Selected Pieces row shows blank cards for about 1 to 2 seconds when you jump to the far end (lazy loading). It fills in by itself.
- The intro loader is slow in the test browser. Not related to the import.

## Still old images (22 cards on /collections)
- Placeholders (`products/*.webp`, 16:9 crops): Living Room Set R1549, R1552, New Panda Set, Chaise Lounge Corner Sofa, Bubbles Bedroom Set, Sila, Mila, Karma, Dining Table D1267.
- Earlier client photography or AI upscale (`full.webp`): Mocha Set, Mechanism Corner Sofa, Curve Set, Bedroom Uqal, Bianco Bedroom Set, Areej Bedroom, Rahaf Dining Table, Shababi Asil, Angels, Bonkio, Golf, Grey, Electric Decorative Fireplace.
- Other: About page image, menu preview default (Home).
- Home Selected Pieces data also still holds old entries for Venus Corner Sofa, Turkish Set and Grey Kids Bedroom (not shown, only four cards are used).

## New but AI render (REF), 8 cards on /collections
Status `ai-placeholder`, so the "final photography in preparation" note applies to them:
- Marble Sofa, Living Room Set R1561 (Living Room)
- Lina, Circle, Haland Dining Tables (Dining)
- Side Table, Pedestal Table, Table Lamp (Accessories)

## New and based on a real showroom photo (AI-enhanced), 9 catalogue cards
Turkish Set, Venus Corner Sofa, R1538, R1560 (A), R1560 (B), Bedroom Set B1387, Lavender, Kayan, Galaxy.

Also real-photo based: 4 Selected Pieces and the 5 Collections row images.

## Please remember
All Drive files are Magnific AI output, even the ones marked "final". Confirm with the client before launch.

---

# Round 2: fixes after the first check (commit "fix verify issues")

Checked on the local dev server at 1440x900 and 390x844. Not deployed, not pushed.

| Item | Result |
|---|---|
| Selected Pieces loading | All 4 images (and the clones) now use `loading="eager"`, `decoding="async"`, the first two `fetchpriority="high"`, plus a `<link rel=preload>` for each. Card image `sizes` is set, so the 640w file is used (small and fast). Drag test, about 10 s per viewport (timer-driven synthetic drags): desktop 618 frames, mobile 340 frames, 0 frames with a missing or unloaded image, at least 4 cards in view on desktop (1 on mobile). Screenshots mid-drag at four moments show no blank card. No hover swap added. |
| Side Table crop | The studio render is square, so the whole square is kept and the plain background is widened to 4:3. The whole table is visible with margin on desktop and mobile (same file). Selected Pieces Side Table was already whole. |
| Turkish Set | Crop centre moved from 0.50 to 0.47 so the sofa sits in the middle. |
| Galaxy and Lavender | Checked against the source photos: the product is already inside the frame with margin. No change needed. |
| About image | Real showroom photo (`room7/magnific_photo-two-modern-gold-cof_...`), 4:5, mild tone. Alt describes it. |
| Menu Home preview | Real showroom photo (Mocha folder, cream armchair), 4:5, mild tone. Alt describes it (the menu preview image now carries its alt text). |
| `ALLOW_AI_RENDERS` | New flag in `src/config/siteMotion.js`, default `true`. Tested `false` on `/collections`: all 9 AI slots fell back to their previous image. On `/` nothing changes (no AI slot is shown there). Tested `true` too. |
| Console | No errors. |
| Layout shift | 0 on `/collections` (mobile). No horizontal overflow. |

## Kids Bedroom: Drive photos per product
| Product | Drive folder | Result |
|---|---|---|
| Bonkio Kids' Bedroom Set | `اطفال بونكيو` | APPLIED: clean landscape photo of two twin beds (#23). |
| Golf Kids' Bedroom Set | `نوم اطفال جولف` | APPLIED: clean landscape photo of two twin beds with wardrobe (#125). |
| Shababi Asil Bedroom | `نوم شبابي اسيل` | Candidate exists, NOT applied: the real photos show other showroom furniture in the frame (not clean). Old image kept. |
| Grey Kids' Bedroom Set | `نوم اطفال جراي` | Candidate photos are portrait only; a 4:3 card would cut the bed. Old image kept. |
| Angels Bedroom Set | `نوم انجليز` ("English bedroom") | No clear match by name. Old image kept. |

So on `/collections` Kids Bedroom: 2 new, 3 old.

## Slots that use AI renders (status `ai-placeholder`)
| Name | Page | File |
|---|---|---|
| Marble Sofa | /collections (Living Room) | `media/catalogue/marble-sofa/full-drive*` |
| Living Room Set R1561 | /collections (Living Room) | `media/catalogue/living-room-set-r1561/full-drive*` |
| Lina Dining Table | /collections (Dining) | `media/catalogue/lina-dining-table/full-drive*` |
| Circle Dining Table | /collections (Dining) | `media/catalogue/circle-dining-table/full-drive*` |
| Haland Dining Table | /collections (Dining) | `media/catalogue/haland-dining-table/full-drive*` |
| Side Table | /collections (Accessories) | `media/catalogue/side-table/full-drive*` |
| Pedestal Table | /collections (Accessories) | `media/catalogue/pedestal-table/full-drive*` |
| Table Lamp | /collections (Accessories) | `media/catalogue/table-lamp/full-drive*` |
| Bedroom Uqal | /collections (Bedroom) | `media/catalogue/bedroom-uqal/full.webp` (older AI upscale) |

Fixed on the way: the three Accessories cards had a fallback path that did not exist; it now points to the earlier image in `media/selected/`. The Dining menu preview entry was still marked AI although it holds the real photo; it is now marked final.

No copy was changed to claim these are real photos. Everything from the Drive is still Magnific output.

---

# Round 3: hero banner update (commit "update hero banner")

Local only. Not deployed, not pushed. Checked on the dev server at 1440x900, 390x844 and a 1024 px tablet width.

| Item | Result |
|---|---|
| Source files | Desktop `3 merge.gif` (1920x1080, 10.4 s) and Mobile `Sequence-02_2.gif` (1080x1350, 2.6 s). Other files (Desktop 1, 2, 3 without merge; Mobile `_1`) were not used. The furniture settles into the room, so the clips are not loop-ready on their own. |
| Desktop video | `public/media/hero/hero-banner-desktop.mp4` 1.00 MB and `.webm` 1.04 MB. 1600x900, 24 fps, no audio, bt709, faststart. |
| Mobile video | `hero-banner-mobile.mp4` 0.48 MB and `.webm` 0.38 MB. 720x900, 25 fps, no audio. |
| Loop | The last 0.5 s (mobile 0.4 s) dissolves into frame 0, so the loop has no jump. |
| Posters | `hero-banner-poster-{desktop,mobile}.{webp,avif}` made from frame 0 of the mp4 (`scripts/make-hero-posters.mjs`). Poster vs video frame 0 similarity (SSIM): 0.99 mp4, 0.96-0.98 webm. |
| Code | `src/config/heroMedia.js` and the inline script and preload links in `index.html` point to the new files. Behaviour (loader waits for `canplay`, max 3.5 s; entrance animation; reduced-motion poster path) is unchanged. Hero focal points updated in `images.json` (desktop x 0.62, wide x 0.5, tablet x 0.45; mobile unchanged 0.5). |
| Old files | `hero-loop*`, `hero-poster-desktop/mobile.*` stay in the project, no longer referenced, and are left out of the upload in `.vercelignore`. |
| Browser | Video loads (webm 206, `readyState` 4), poster file is the one set on the `<video>`, no flash of another image. Headline and paragraph readable over the video at all three widths, no scrim change needed. No console errors, no 404, no horizontal overflow. Reload with `cache: reload` works. |
| Not checked by eye | The real `prefers-reduced-motion` mode could not be switched on in the test browser. The still path uses the same poster file (checked in code and by the SSIM above). |
| Upload size | About 75.3 MB (was about 75.6 MB). Under the 100 MB limit. |

Notes:
- The animation starts with tilted, floating furniture (that is frame 0, so it is also the poster and the loader still).
- The clip has two settle phases, so the hero shows a calm room around seconds 2 to 6 on desktop.

---

# Round 4: Contact CTA image (commit "cta image")

Local only. Checked on the dev server at 1440x900 and 390x844.

| Item | Result |
|---|---|
| Slot | Homepage dark green block "Experience Lucchi in person.", framed photo on the right. Data in `src/data/images.json` → `contact.cta`; code in `ContactSection.jsx`. |
| New image | Real showroom photo `room 12/magnific_photo-a-sectional-sofa-wi_EbgYGgPuuO.JPG` (7008x4672). Beige modular sofa with olive, green and cream cushions on brown carpet. Status `final`, source `client-drive`. Alt text describes it. |
| Why | Real photo, whole sofa, calm and clean, no people, text or glass. Warm oat and olive tones fit the dark green block. Landscape, so a 4:3 crop loses very little. Not used in Selected Pieces, Collections row, hero, About or the menu. |
| Runner-up | `room 4/magnific_photo-a-beige-and-brown-s_fHsnSFZCDY.jpg` (cream sofa on dark carpet, very sharp, but darker and plain). A cream sofa from room 8 was rejected: a person is visible in the mirror behind it. |
| Files | `public/media/contact/cta-drive-{640,1080,1600}.{avif,webp}`. Largest: 198 KB avif, 284 KB webp (under 300 KB). Mild tone as on the Collections images. The old Living Room portrait file is still in the project, no longer used here. |
| Frame | Same border and padding, `object-fit: cover`. The image is now 4:3 (it was cropped to about 6:5 before) so the whole sofa shows; the frame is about 40 px shorter on desktop. Width and height set on the `<img>`, so no layout shift. |
| Browser | Image loads sharp (avif 640 on desktop, 1080 on a 2x phone), no 404, no console errors in a fresh tab, no horizontal overflow. |
| Upload | `.vercelignore` hides only the unused 369 KB default `cta-drive.webp`. The files the site uses are uploaded. |

---

# Round 5: footer redesign (commit "footer redesign")

Local only. Checked on the dev server at 1440x900, 1920x1080, 768x1024 and 390x844, on Home, Collections, About and Contact.

| Item | Result |
|---|---|
| One footer | New `src/components/Footer.jsx`, used by Home (inside `ContactSection.jsx`), Collections, About and Contact. The old footers and the old `FooterLegal` are removed. The Contact page had no footer before. |
| Background and contrast | Solid `#2d3730`, nothing behind the text. Off-white `#f4f1ec` on it is 10.96:1, beige `#d4c2b3` is 7.15:1 (WCAG AA needs 4.5:1). |
| Layout | Desktop: 3 columns (brand, Explore links, Visit/contact), divider, copyright, Return to top. At 900 px and below: one column. All links and buttons are 44 px tall or more. |
| Fonts | "Lucchi Furniture" in Playfair Display, everything else Poppins. |
| Contact column | Only items with `confirmed: true`. Today none is confirmed, so it shows "Showroom enquiry" and "Request a viewing" (both go to /contact). With `?previewContact=1` the unconfirmed items show with a small "Preview: not yet confirmed" note. The text "Pending Client Confirmation" is gone from the footer. |
| Animation | Content fades up once with a small stagger when the footer scrolls into view (opacity and transform only, ease `cubic-bezier(0.16, 1, 0.3, 1)`). Sliding underline on links, arrow nudges up 4 px on hover. Visible by default; the hidden start state is only added once the script runs, and a backup check reveals it as soon as it is on screen. `prefers-reduced-motion`: no animation, content simply visible (CSS and JS). |
| Keyboard | Real Tab presses: every footer link gets a 2 px brass outline, in a logical order. |
| Measured | No overlap with the section above, no horizontal overflow, no clipped text, layout shift 0, no console errors (fresh tab) at all four widths and pages. |
| Not seen live | Real reduced-motion mode could not be switched on in the test browser. |

Notes:
- "Pending Client Confirmation" text still shows to visitors in the menu and on the Contact page (`Navigation.jsx`, `ContactPage.jsx`). Not part of this task, not changed.
- At 768 px the footer is one column (tall, 784 px). A two-column tablet layout would be an easy follow-up.

---

# Round 6: scroll-driven hero (commit "scroll hero")

Local only. Not deployed, not pushed. Dev server, fresh page loads (new query string each time, so no cache), widths 1440x900, 1920x1080, 768x1024, 390x844.

| Item | Result |
|---|---|
| Source | Only GIFs were delivered (no MP4/MOV original in the banner folders). Desktop: `3 merge.gif` 1920x1080, 24 fps. Mobile: `Sequence-02_2.gif` 1080x1350, 25 fps. Desktop is used at its real 1920 width (not upscaled). Quality is limited by the GIF palette; a real MP4/MOV from the client would look better. |
| Resting frame | Desktop: the settled room at 5.4 s of the clip (curved cream sofa, olive armchair, round tables, plant, art on the wall; pillows settled, nothing in the air). The scrub range runs from there to the end of the clip (10.3 s), where the pillows and furniture lift off. Mobile: the clip is played in REVERSE: its last frame (settled room) is frame 0, and the furniture lifts as you scroll. |
| Files | `hero-scroll-desktop.mp4` 5.77 MB / `.webm` 5.82 MB (1920x1080, 4.9 s, 24 fps). `hero-scroll-mobile.mp4` 2.10 MB / `.webm` 1.78 MB (896x1120, 2.6 s, 25 fps). Keyframe every 2nd frame, no B-frames, no audio, bt709, faststart. Posters (webp, q92) 0.35 MB and 0.12 MB. All under the 6 MB / 3 MB limits. Built by `scripts/make-scroll-hero.mjs`. |
| Tone | One mild step baked into the files (gamma 1.05, contrast 1.03, light GIF-dither denoise). No runtime CSS filters. |
| Poster, loader, hero | One picture. The poster is frame 0 of the exported clip. The loader strips now draw that poster with the same `object-fit: cover` crop and focal point as the hero (the strip math in `styles.css`), no zoom, no darkening (scrim only on the lowest 38%). The hero entrance no longer zooms the picture (`mediaStartScale` 1). Checked: loader replica, hero and the frames right after the loader exit show the same composition. |
| Scroll mechanics | Wrapper 240vh (220svh on portrait screens); the section inside is `position: sticky`, 100svh. First 8% of the scroll holds frame 0. Progress maps to `currentTime` with a requestAnimationFrame loop (lerp 0.15) that only sets the time when it moved by 0.012 s or more and stops by itself. One passive scroll listener, no wheel/touch handlers. Checked on 1440x900: scroll 0, 5 and 8% stay on frame 0; 30% t=0.32, 50% t=0.61 (still catching up in the throttled test pane), 100% t=3.77 and rising; scrolling back reverses. Mobile: 50% t=0.66, 100% t=2.59. After the range, the pin is released and Selected Pieces follows directly. |
| Text | Desktop and landscape: headline, paragraph and buttons fade and move up 72 px between 4% and 46% of the range (opacity and transform only). Portrait (phones, portrait tablets): the copy sits below the photo, so it stays in place. |
| Look | The dark flat overlays are gone. Scrim: a soft gradient on the left (0.6) and bottom (0.65). Light sweep, grain and veil are off. Contrast was computed on the real poster pixels and scrim at 1440x900 (95th-percentile brightest background): headline 4.6:1 (needs 3), paragraph 4.8:1 and ghost button 4.75:1 (need 4.5), tag 5.3:1. The paragraph text is now fully opaque. |
| Crops | Desktop and landscape tablet: 16:9 video, centre focal point. All portrait screens: the 4:5 video. Phones: photo in the top 56% of the hero, only the last fifth fades into the green, so the sofa and pillows are clear (the coffee table is partly under the fade). 768x1024 uses its own focal point (y 0.8): sofa, pillows and vase are fully inside. |
| Fallbacks | Reduced motion, data saver, slow network or weak device: poster only, normal height, no pin (existing check, same code path). iOS-like browsers: poster, then one gentle play when scrolling starts (`SCROLL_HERO.MODE`). Video error: the poster stays. |
| Browser | No console errors (fresh tab), no 404, no horizontal overflow, video 206 range requests, poster `fetchpriority="high"` preload in `index.html`. |
| Upload | About 88.9 MB (was 75.3 MB), under 100 MB. The old `hero-banner-*` files and the unused AVIF posters are left out in `.vercelignore`. |

Not verified, say so honestly:
- The test browser pane throttles animation when it is not in front, so smoothness (stutter) could not be judged by eye; the playhead mapping and direction were checked by numbers.
- `prefers-reduced-motion` and the iOS play-once path could not be switched on here.
- The loader on phones (strips drawn only in the top 56%) was built to the same math but not seen in a screenshot; the desktop loader was seen.
- The loader uses `100svh`, so on a phone with a visible address bar it can differ by a few pixels from the hero.
- A stray file `kling_20261004_VIDEO_Slow__cine_4846_0.mp4` (1920x1080, 24 fps, 12.8 Mbps, 5 s) is in Downloads. It is not the banner clip and was not used.

---

# Round 7: hero loop + no eyebrows (commit "hero loop + remove eyebrows")

Local only. Dev server, 1440x900 and 390x844.

## Hero round trip
- The scroll now plays the clip rest frame -> peak frame -> rest frame. The peak is the last frame of the clip (pillows highest; checked frames at 3.2 to 4.85 s, the last ones are the highest and sharp). No re-encode was needed.
- Mapping (`roundTrip()` in `heroMedia.js`): 0 to 8% holds the rest frame, 8% to 50% goes up to the peak, 50% to 92% comes back, 92% to 100% holds the rest frame. Same lerp, rAF loop, native scroll.
- Measured on desktop (playhead vs target): p 0 -> 0.00 s, 0.3 -> 2.55 s, 0.5 -> 4.86 s (peak), 0.7 -> 2.56 s, 0.92 -> 0.00 s, 1 -> 0.00 s. Mobile: end of range -> 0.000 s after settling. So the last frame of the range is frame 0 = the poster; screenshots at the start and at the end show the same picture, with the text back.
- Text (desktop): fades and moves up while the furniture lifts (4% to 46%), comes back while it settles (54% to 96%), fully visible at the end. On phones and portrait tablets the copy stays put (it sits below the photo).
- iOS-like fallback: poster, then one lift-and-settle (3.6 s, time driven) when scrolling starts; re-arms at the top. Reduced motion: poster only (unchanged). Not testable here.
- No jump seen. Smoothness could not be judged by eye (the test pane throttles animation); the numbers above are what was checked.

## Eyebrow labels removed (label + leading line)
| File | Text |
|---|---|
| `Hero.jsx` | "00 / Showroom Showcase" |
| `BestSellers.jsx` | "01 / Selected Pieces" |
| `CategoryShowcase.jsx` | "Collections" (small label above "Explore the Lucchi Collections") |
| `ContactSection.jsx` | "03 / Showroom & Enquiries" |
| `ContactSection.jsx` | the three service-card kickers: "Showroom Experience", "Curated Acquisitions", "Architectural Projects" (card titles and text kept) |
| `ContactPage.jsx` | "05 / Showroom Consultations" |
| `ContactPage.jsx` | "Consultation Pathways" (kicker above "A personal conversation around your project.") |

Kept on purpose (could be real labels): footer column labels "Explore" and "Visit"; the "01 / 04" index tags on the Selected Pieces card images; the 01 to 04 numbers on menu items and collection cards; "Enquiring about piece" (shows only when a piece is chosen); the contact block label ("Showroom & channels"); product spec labels (Dimensions, Materials, Commission, Key Materials); the About headings (their class is called "kicker" but they are the real headings). The unused CSS for the removed classes is still in `styles.css`.

Checked: no "0X /" text left on Home, Collections, About, Contact; spacing balanced (headlines sit on the section padding, no gap); no overflow; no console errors (fresh tab); no 404.

---

# Round 8: hero is not pinned any more (commit "restore hero scroll, loop end")

Local only. Dev server, 1440x900 and 390x844.

What the history says (so the choice is clear):
- The site deployed last (commit "scroll hero", `2cc4952`) IS the pinned, scroll-scrubbed hero (240vh wrapper, sticky inside). The deploy before it (`df5e239`) had the old autoplay clip (`hero-loop*`), which has no lifting pillows at all. So there was no earlier "unpinned scroll-linked" version to restore; the unpinned behaviour was built now.

What changed:
- The wrapper height and the sticky pin are gone: `.hero-scroll` is a normal block and `.hero-section` is `position: relative`, 100svh. The page is shorter again (desktop document 4518 px, was about 5800 px) and the hero moves 1:1 with the scroll (hero top = minus scrollY, measured).
- Option used: (a) scroll-linked, round trip. While the hero scrolls out, the scroll position drives the video: rest frame -> peak (about halfway through the scroll-out) -> rest frame (hero fully scrolled out). No new video file; the existing clips and posters are used. Scrolling back up plays it back; at the top the hero is the rest frame (t = 0.000 s, same as the poster).
- Measured (desktop, scrollY / video time): 0 -> 0.00, 90 -> 0.23, 225 -> 1.97, 450 -> 4.86 (peak), 675 -> 1.98, 828 -> 0.00, 900 -> 0.00. Mobile: 0 -> 0.00, 422 -> 2.57 (peak), 844 -> 0.00, back at the top 0.000.
- Kept: the sharp rest frame as poster and loader image, loader `canplay` wait (max 3.5 s), reduced-motion poster only, iOS-like play-once fallback, native scroll with one passive listener, only transform and opacity on the text. The text fades while the hero scrolls out and is fully visible again at rest. Footer, CTA image, eyebrow removal are untouched.
- No console errors, no 404, no horizontal overflow. Upload size: see the commit report (about 88.9 MB).

Note: because the hero now scrolls away in one screen, the whole lift-and-settle happens in about one screen of scrolling. If the client wants it slower, the option is a longer hero area (not pinned), or an autoplay loop (boomerang clip) instead; both are quick to switch.

---

# Round 9: header links and no card icons (commit "header nav, remove card icons")

Local only. Dev server at 1440x900, 1024x768 and 390x844.

## Header
- From 1024 px the header shows the logo on the left and Home, Collections, About, Contact and an Enquire button on the right. Poppins 12 px, letter-spaced, a thin underline slides in on hover and focus, the current page keeps its underline and has `aria-current="page"`. Plain links (no pills, glows or icons); Enquire is a small square-cornered button in the existing beige/green tokens, without the arrow.
- Over the hero: the existing soft top gradient. After scrolling: the solid deep-green bar with a thin bottom line. The hide-on-scroll-down and the drop-in entrance are unchanged (links are inside the same animated group).
- Below 1024 px: the Menu button and the overlay with the big Playfair words are unchanged. The overlay closes by itself if the window grows to 1024 or more. The hover image preview is only in the overlay.
- "Instagram — Pending Client Confirmation" is gone from the menu footer (nothing is shown when no channel is confirmed; with `?previewContact=1` the channels show).
- Focus ring on header links and buttons: 2 px brass.
- Measured: at 1024 the logo ends at x 128, the links run from 536 to 878 and Enquire ends at 1004 (no overlap, no overflow); the header (72 px) does not touch the hero headline (top at 264 px); links 44 px tall; links navigate in the app and the active state follows the page (Collections, About, Contact checked). No console errors (fresh tab).

## Icons removed
| File | Icon |
|---|---|
| `ContactSection.jsx` | the three circular icons on the service cards (Compass, Sparkles, FileText) and their CSS; cards are now title + paragraph, same size (414 x 146 at 1440), padding 28 x 24 |
| `ContactPage.jsx` | Compass and MessageSquare next to the two consultation items |
| `ProductRow.jsx` | Compass inside the "Inquire for Showroom Consultation" button |

Kept (functional): the arrows on buttons, the Back arrow on the Contact page, the check mark in the form success message, the chevron on the Specifications toggle, the arrow on Return to top, the menu open/close lines.

---

# Round 10: hero buttons, Selected Pieces motion, clickable Collections (commit "hero buttons, selected pieces motion, clickable collections")

Local only. Dev server at 1440x900, 1024x768 and 390x844. CLAUDE.md updated (Selected Pieces now glides like Collections; hero has no buttons; Collections cards are links; no counters on the cards).

## Hero
- Both buttons and the "Scroll to explore" cue (it was a button too) are gone, with their wrappers, CSS, entrance rules and the unused props. Headline and paragraph stay. No hero button in the DOM at 1440, 1024 and 390; text sits at y 298 to 562 at 1024x768 and 509 to 760 under the photo at 390x844; no overflow.

## Selected Pieces
- Counters removed: the "01 / 04" tag on every card image (code and CSS) and the "N of 4" aria label (cards are now labelled with the piece name). No "0X / 0Y" text left in the section.
- Motion now uses the same numbers and the same behaviour as the Collections row: `AUTOPLAY = true`, 32 px/s desktop and 22 mobile, `RESUME_DELAY` 1500, `FRICTION` 0.94, speed ease 0.7 s, drag threshold 6 px, arrow step 720 ms; infinite loop, drag with momentum, pause on hover and on keyboard focus, resume after the delay, arrow keys, Space toggles, reduced motion / data saver keeps the native scroll-snap row. The drag now captures the pointer only after 6 px (like Collections) and the horizontal-wheel handler is gone. The DRAG label is unchanged.
- The two rows are not one shared hook: Selected Pieces already had its own copy of this loop, so I aligned its numbers and drag handling with CategoryShowcase instead of rewriting both (less risk). A shared hook is possible later.
- Inquire works on clones: the clones were `inert`; now they are only `aria-hidden` with `tabIndex -1`. Tested with synthetic pointer events on a clone's Inquire button: a 120 px drag moved the row (-321 px) and did not navigate; a plain click went to `/contact?piece=pedestal-table&type=product`.
- Measured glide: the track moved steadily (-5.6, -65.6, -162.4 px across sampled frames). The test pane throttles animation when it is not in front, so exact px/s and smoothness were not measured. Images stay eager (all 12 `loading="eager"`), cards have no hover or zoom effect.

## Collections cards are links
- The whole card (image included) is one `<a href="/collections?category=<slug>">` with `aria-label="Explore <name> collection"`, `cursor: pointer`, brass focus ring. Clones are links too (`tabIndex -1`, `aria-hidden`). The small "Explore <name>" line stays as a visual cue (a span, no longer a nested link). The existing click handler keeps the in-app navigation; the existing 6 px drag threshold and click suppression stop a drag from opening a card (a drag that started on a card moved the row and did not navigate).
- `/collections` already read `?category=`; all five checked by clicking: Living Room (card), Bedroom (clone), Dining (card), Kids Bedroom (clone), Accessories (card): the URL had the right slug and the matching filter tab was selected (Dining 9 cards, Kids Bedroom 5, Accessories 4). A tap on mobile (390) on the Kids Bedroom card opened the same page. `/collections` and "All" work as before. Browser back returns to the homepage.

## Checks
No console errors (fresh tab), no 404, no horizontal overflow at 1440, 1024 and 390.

---

# Round 11: centred header links and logo fit (commit "center nav, fix logo")

Local only. Dev server at 1440x900, 1024x768, 1920x1080 and 390x844, on /, /collections, /about, /contact.

- Grid: from 1024 px the header is `1fr auto 1fr`: logo in the left column, the four links in the middle column, Enquire in the right column. The links are now a direct child of the grid (they used to sit inside the right-hand group), so they are centred on the page.
- Measured (centre of the links block minus the page centre): 1440: -0.11 px, 1920: -0.11 px, 1024: -0.10 px (limit 2 px), on all four pages. Gaps between links: 40 px at 1440 and 1920, 29 px at 1024. Side padding: 49 px at 1440, 56 px at 1920, 35 px at 1024, the same on both sides.
- Logo: the header was 72 px high and the logo (108 px wide, 72 px tall) filled it, so the bottom of "Furniture" was cut. Now the bar is 88 px high on desktop and 68 px on phones; the logo has `max-height` 56 px (44 px on phones), `width: auto`, `object-fit: contain`. Measured: 83 x 56 px at the correct ratio (1.491 = the file), 16 px above and 16 px below on desktop; 66 x 44 px with 12 px above and below on phones. Checked over the hero and on the solid bar after scrolling.
- The logo files are fine: `public/brand/lucchi-logo-beige.png` and `lucchi-logo-green.png` are 577 x 387 with 16 to 19 px of empty margin all round; nothing is cropped in the asset. The cut was only the header height.
- No overlap: at 1024 the logo ends at 118, the links run 330 to 678 and Enquire starts at 872. At 1920 the hero text starts at y 360 (header 88). Page top padding variable `--nav-h` updated to 88 px (68 px on phones).
- Phones (below 1024): the Menu button, the overlay with the four big words and Enquire are unchanged and work (opened the menu, went to About); the links row is hidden there.
- Found and fixed on the way: if a visitor left the homepage by a quick click while the hero entrance had not played yet, the header pieces stayed invisible (`hero-pre` stuck). The hero now clears those classes when it unmounts for another page.
- No overflow, no console errors (fresh tab).

---

# Round 12: Selected Pieces heading (commit "selected pieces heading")

Local only. Dev server at 1440x900, 1024x768 and 390x844.

- The right-hand paragraph ("While our complete residential suites...") is gone with its wrapper, the heading-row grid and the thin divider line under it. The old two-sentence heading is replaced by one h2, "Selected Pieces", set in one place: `SECTION_TITLE` at the top of `BestSellers.jsx`.
- It uses the same heading block as the Collections row (`cat-head` + `cat-title`): measured the same font (Playfair Display), size (66.24 px at 1440, 47.1 px at 1024, 35.2 px at 390), weight 400, normal style and colour (#2d3730), same left edge (72 px at 1440) and the same section top padding (129.6 px). The Collections row also has a thin rule under its heading; the Selected Pieces heading has none, as asked.
- Space between heading and cards: 66 px at 1440, 49 px at 1024, 32 px at 390. No empty gap, no overflow, no console errors, no 404. The sage background, cards and row behaviour are unchanged. The section keeps `aria-labelledby` on the h2 (reads "Selected Pieces") and the row keeps `aria-label="Selected Pieces"`.
- Leftover copy: searched `src/` and `index.html`; the old heading and paragraph text exist nowhere else. Removed the now unused CSS for the header split and the intro column.

## Round 13 – CTA section refine (local only)
- Copy lives in constants at the top of `ContactSection.jsx` (heading, paragraph, button label, href).
- One button "About Lucchi" -> `/about` (SPA link). Old enquiry button, "Arrange a Viewing" link, wrappers and styles removed. Old paragraph removed from `src`.
- Paragraph: Poppins 400, 17-20px, line-height 1.7, max 54ch, #f4f1ec at full opacity (10.96:1 on the green, AAA).
- Button: 14px, 48px high, visible focus ring. Gaps: heading-paragraph 36px, paragraph-button 44px (desktop). Text block centred against the framed image.
- Checked 1440x900, 1024x768, 390x844: no overflow, button goes to /about, no new console errors. `npm run build` passes.

## Round 14 – Selected Pieces: smaller cards, heading (local only)
- Heading: "Explore Our Selected Pieces" uses the same `cat-head` / `cat-title` block as Collections (same font, size, line-height, colour, left edge). No rule, no paragraph.
- Card width/gap constants at the top of `BestSellers.jsx` (`CARD_W_DESKTOP` 290, `CARD_W_TABLET` 260, `CARD_W_MOBILE` min(72vw,280px), `GAP_DESKTOP` 24, `GAP_MOBILE` 16), passed to the CSS as variables.
- Card image stays 4:5. Name 17px, Inquire 14px / 44px tall, small labels 10px. Section padding 96px desktop, 56px mobile.
- Loop is re-measured on every resize/rotation (fixed widths are cleared first). Loop pitch = 4 x (card + gap) at 1440, 1024, 768, 390, 360. Track has `touch-action: pan-y`.
- 390: one card + 54px peek. 360: one card + 45px peek. No horizontal overflow, 0 blank images, `npm run build` passes.

## Round 15 – Selected Pieces card polish (local only)
- Removed the category label and the type tag on the image (JSX + their CSS use). Names and image alt text unchanged.
- Button: "Inquire" + small arrow, 13px, 44px high, same dark green fill; works on clones.
- Title no longer reserves two lines. Gap name to button 10px. Card height 463px (was taller) on desktop, 451px at 390. Card widths, heading, glide and drag unchanged.
- Checked 1440, 1024, 390: no overflow, no category/tag elements left. `npm run build` passes.

## Round 16 – Hero motion clarity (local only)
Diagnosis (before): motion started at 8% of the hero scroll, peaked at 50% (half the hero already off screen, pillows near the top edge), and the clip's last frame was an extreme tilt (sofa leaves the frame). Clip was 118 frames, keyframe every 2nd frame. Scrim: 0.6 on the left plus 0.65 along the bottom, so it also darkened the sofa.
Fix:
- Clip trimmed to the lift only (desktop 67 frames, mobile 39), every frame a keyframe, 24/25 fps, no audio, +faststart. Desktop 1920x1080 mp4 5.96 MB (webm 3.8 MB), mobile 896x1120 mp4 1.6 MB (webm 1.8 MB).
- Timing (`SCROLL_HERO`): hold 2%, peak at 38%, back at rest by 68%. Phones/portrait (`SCROLL_HERO_PORTRAIT`): peak 22%, rest 46%. Picture follows the scroll (SHIFT 0.4 desktop, 0.8 portrait, transform only) so the pillows stay on screen longer. Lerp 0.15.
- Text fades out over the first 22% of the scroll and moves up (desktop).
- Scrim: one soft wash behind the text column only (modelled paragraph contrast 5.45:1 on the poster, AA); the bottom darkening is gone.
- Poster, loader image, reduced-motion and data-saver fallback unchanged. End state = start (playhead 0 from 68%).
Checked at 1440x900 and 390x844 (scroll 0/15/30/45/60/80%): lift clearly visible, end matches start, no console errors. Upload size after the .vercelignore trim: 88 MB.
Source limit: the clips were re-cut from the existing hero-scroll mp4 files (the source GIFs were not opened). The source GIF resolution and bitrate were not checked, and a GIF is limited to 256 colours; an original MP4/MOV from the client would give a sharper, cleaner clip.

## Round 17 – Hamburger menu (local only)
- Below 1024px the header shows the logo (left) and a hamburger button (right): three thin lines, no label, 44x44px, `aria-label` "Open menu" / "Close menu", `aria-expanded`, `aria-controls="site-menu"`. The text links and the Enquire button are hidden there. Icon turns into an X with transform/opacity only.
- Overlay (existing top-drop panel): Home, Collections, About, Contact stacked, 43px+ Playfair words, 63px tap rows; "Enquire" link at the bottom. Esc, a link, or a tap on empty panel space closes it; body scroll is locked while open; focus is trapped and returns to the button on close.
- 1024px and up unchanged: links centred (page centre 712.5 at 1440 with scrollbar), Enquire on the right.
- Checked 390, 360, 768 (hamburger, open/close, no overflow), 1024 and 1440 (links shown, no hamburger). The header centring from before was already applied.

## Round 18 – Hero scroll tuning (local only)
- Before: desktop hold 2% / peak 38% / rest 68% / shift 0.4; portrait hold 1% / peak 22% / rest 46% / shift 0.8.
- Now (named constants in `heroMedia.js`): desktop hold 1% / peak 45% / rest 88% / shift 0.55; portrait hold 1% / peak 30% / rest 60% / shift 0.9. Smoothstep and lerp 0.15 kept. Text fade (first 22%) unchanged. Same video files.
- Shift stays below 1, so the picture never moves faster than the page and no blank band can open in the visible part of the hero.
- Playhead (seconds) at scroll 0/15/30/45/60/75/90%: desktop 0 / 0.68 / 2.03 / 2.76 (peak) / 1.99 / 0.62 / 0.01; mobile (at 15/30/45/60%) 0.73 / 1.53 (peak) / 0.77 / 0.01. End = start (0 at the top again).
- 48 fps minterpolate was not made: the clips give one frame per ~6 px of scroll and the lerp smooths the rest; interpolation risks warping the pillows and doubles file size.
- Limit on phones: the photo is only the top 56% of the hero, so while the pillows settle (45-60%) only a thin strip of the photo is still on screen.

## Round 19 – Hero back to the full video, one cycle that ends calm
- The scroll-scrub is off (`HERO_PLAYBACK.MODE = 'autoplay'` in `heroMedia.js`; 'scrub' still available). The video plays by itself once, right after the loader, and stops on the calm resting frame (= the poster). It replays when the visitor returns to the top after scrolling away. Pauses while off screen.
- Desktop clip (`hero-cycle-desktop.*`): the original banner loop (1600x900, 247 frames, 10.3 s) cut so it starts and ends on the calm room: calm, lift and float, then settle back. Playback measured: ends at 10.29 s, `ended: true`, sofa in place.
- Mobile clip (`hero-cycle-mobile.*`): the original 4:5 clip played backwards (calm to floating) then forwards (floating to calm), 4.56 s.
- Quality: no denoise, no tone change, no scaling, no intra-only encode. Desktop mp4 5.5 MB, webm 5.9 MB; mobile mp4 1.6 MB, webm 1.4 MB. The posters are frame 0 of these clips.
- Limit: the only complete copy of the clip in the project is the 1600x900 banner video; a sharper result needs the original GIF/MP4.
- Old hero-scroll-* files stay on disk, left out of the upload in .vercelignore.

## Round 20 – About CTA cleanup (local only)
- /about closing block: "Start a Project Enquiry" removed (button, wrapper, label and type in `about.js`, the unused `.about-visit-actions` and about-page `.contact-secondary-link` styles). One button left: "Arrange a Viewing" (same beige style, arrow, same action).
- Paragraph (in `about.js`): "See the collections in person. Arrange a viewing with our team in Cairo." 17-19px Poppins 400, #f4f1ec at full opacity (10.96:1 on the green), max 54ch. Heading, paragraph and button share the same left edge (400px at 1440, 192px at 1024, 20px at 390). Button 48px high; full width on phones.
- Checked 1440, 1024, 390: one button, no overflow. "Project enquiry" no longer exists anywhere in `src`. Contact page and header Enquire untouched.
- Low-contrast scan (text under 4.5:1 on dark flat backgrounds) on /, /about, /collections, /contact: nothing found. Text over images/gradients is not covered by the scan.

## Round 21 – Card buttons removed, hover on the picture (local only)
Removed:
- `CategoryShowcase.jsx`: the "Explore {name}" + arrow line inside every collection card (all 5 cards and their loop clones; `.cat-link` styles).
- `BestSellers.jsx`: "By Showroom Enquiry" on Selected Pieces cards (`.piece-availability-label` styles).
- `ProductRow.jsx` (/collections cards): the "View specifications" / "Hide details" label that appeared on the picture on hover (`.item-media-hover-cue` styles).
Kept (real actions): Selected Pieces "Inquire"; on /collections cards the "Specifications" toggle and "Inquire" buttons; header nav and Enquire; footer; filters; forms; "About Lucchi"; "Arrange a Viewing". The "Specifications" toggle opens the same panel as clicking the picture, so it is partly a duplicate; left for the client to decide.
Collection cards: still one `<a>` over the whole card, `aria-label` "Explore {name} collection", 6px drag threshold, clones not focusable, focus ring unchanged.
Hover (pointer: fine only) and keyboard focus: picture zooms to 1.04 in 650 ms (cubic-bezier(0.16, 1, 0.3, 1)) inside its fixed frame, 12% dark wash (opacity), thin line slides under the name. Off while dragging (`is-dragging`). Reduced motion: no zoom, no sliding line, only the wash. Selected Pieces untouched.
Checked: all 5 cards + a clone open the right filter, a simulated drag does not navigate, no removed text on / or any /collections filter, no overflow at 1440 / 1024 / 390, card heights equal (523 / 385 px).

## Round 22 – Hero reverted to the last good version (local only)
- Restored from commit `f81fd3d` (the hero that was live before "hero motion clarity" / "hero tuning" / "hero full video cycle"): `Hero.jsx`, `heroMedia.js`, `index.html` (hero preload and inline video script), the four original `hero-scroll-*.mp4/.webm` files, `scripts/make-scroll-hero.mjs`, and the hero scrim block in `styles.css` (plus the tablet scrim rule). Posters were never changed. Nothing else was touched.
- Left out: the re-encoded 67/39-frame clips, the autoplay "cycle" mode and clips, the SHIFT parallax, the radial wash, the retimed constants. The `hero-cycle-*` files stay in the project, unreferenced and listed in `.vercelignore` (not uploaded). The `hero-scroll-*` files are not ignored (upload includes them at their original sizes).
- Behaviour (scroll-linked, not pinned, round trip rest to peak to rest): desktop playhead 0 at the top, 4.86 s at 50% of the viewport height, 0.23 s at 90%, 0 back at the top; mobile loads `hero-scroll-mobile.webm` (2.64 s). Poster = frame 0 = loader image.
- Upload size 91 MB.

## Round 23 – Selected Pieces open piece pages (local only)
- Cards: the "Inquire" button is gone (4 cards + clones, CSS removed). Each whole card is one `<a href="/pieces/<id>">` with `aria-label` "View {name}"; the app routes it without a reload; clones have tabindex -1; the existing 6px drag threshold stops a drag from opening it. The picture is static (transform none, transition 0s); the cue is a thin line under the name (opacity only). DRAG label unchanged on desktop (it acts as the cursor over the cards, so the native pointer is hidden there). Card height 388 / 350 px at 1440 / 1024.
- Piece page (`PiecePage.jsx`, route `/pieces/:slug`, slug = product id, works for any product in products.json): two columns on desktop (framed 4:5 image, then name, category, description if real, Specifications list if any real field, one "Inquire about this piece" button 48px, "Back to Collections" link); one column on phones with a full-width button. Unknown slug shows "Piece not found" with a link back. Title and meta description come from the piece. Scroll to top on open.
- Real fields only (the data's "need client confirmation" description text is never shown; prices never shown): side-table, pedestal-table, table-lamp = name, category, image only (no code, dimensions or materials in the data, so no Specifications block). electric-decorative-fireplace = name, category, image, Code "Fireplace", Dimensions "120x80cm", Materials "Metal frame" (its description is a copy of those fields, so it is not shown separately).
- Inquire goes to `/contact?type=product&product=<slug>`; the contact page reads `product` (and the old `piece`), selects "Product enquiry", shows the piece card and prefills the message. Form behaviour and success text unchanged.
- vercel.json already rewrites everything to index.html. Checked with `vite preview`: direct link and refresh on /pieces/side-table both load (200). Checked at 1440 / 1024 / 390: no overflow.

## Round 24 – Piece page polish (local only)
- Layout: image column is at most 70svh high including its frame (4:5, static, whole piece visible) and at most 42% of the content width; text column max 520px, both centred against each other, gap 64-96px, top padding 112-140px. Image column is sticky only when the text is taller than the screen. Phones/tablets (900px and below): one column, image at most 55svh high, button full width.
- Measured (4 pieces): 1440x900 picture 185-796 px, button bottom 549-664 (all inside 900); 1280x720 picture 150-653, button bottom 457-569 (inside 720); 1024x768 picture 185-662; the two columns are centred on each other (diff 0-1 px); no overflow at 1440 / 1280 / 1024 / 768 / 390.
- Type: title Playfair 36-52px, one colour; category 16px ink; spec labels and values 16px in full ink with thin dividers.
- Back link: one link, "Back to Home" (/#selected-pieces), no reload; lands with the Selected Pieces section just under the header (section top 88px). The browser Back button from a piece page lands on the same section. Header logo still goes home.
- Hidden spec values (data quality): side-table, pedestal-table, table-lamp: Code, Dimensions, Materials are all empty in products.json, so no Specifications block. electric-decorative-fireplace: Code "Fireplace" hidden (only repeats a word of its name); Dimensions "120x80cm" and Materials "Metal frame" shown. The data's description text for the first three ("need client confirmation") stays hidden. Real codes, dimensions and materials are needed from the client.
- Note for testers: in the browser pane the loader keeps `html.is-intro` (page locked) until the pane is woken; scroll tests only mean something after the loader is gone.

## Round 25 – Collections page load fix (local only)
Diagnosis (the browser pane cannot throttle the network or CPU and does not animate while hidden, so there is no measured "before" CLS; causes come from the code):
- (c) Present: every card had `layout` (framer layout animation) inside a `layout` grid with `AnimatePresence mode="popLayout"`, plus a 24px slide-in with stagger. Layout animations move/stack cards while others mount or unmount, which is the overlap-then-jump. Also the picture swapped in with no calm placeholder.
- (b) Present: card pictures used the default `sizes="100vw"` (oversized files for a third-width card); lazy loading started after 4 cards only per group.
- (e) Present on phones: the 1-column grid used `1fr`, so a card was 506px wide inside a 350px page (clipped, width depended on content). Fixed with `minmax(0, 1fr)` and `min-width: 0`.
- (a) Not present: the 4:3 aspect box already reserved the space. (d) Partly: the All view and a filter are different trees, so they remount (now fade only). (f) Not present (no JS measuring). (g) Not present: size-adjusted Playfair/Poppins fallbacks already exist and fontsource uses `font-display: swap`.
Fix:
- No layout animation, no slide, no popLayout. Cards fade in with opacity only (250 ms, at most 100 ms stagger).
- Pictures: calm sage placeholder behind the fixed 4:3 box, fade in on load (opacity only, with a 2.5 s backup so nothing stays hidden), correct `sizes` (92vw / 46vw / 31vw) also on the hover picture, first 6 cards of the page eager + async decoding, the rest lazy; cards after the first screens use `content-visibility: auto` with `contain-intrinsic-size`.
- Filter change: the old page height is kept for 700 ms so the page does not collapse; stable keys per product.
Checked in the page (1440, 1024, 768, 390): no overlapping cards at any sample while mounting (All and filters), no card moved after its first frame, 5 quick filter switches in a row: no overlap and the filter ended on the last one, no horizontal overflow, lazy pictures load when scrolled into view.
Not measured: CLS before/after under Fast 3G + 4x CPU (no throttling tool here).

## Sanity phase 2 (snapshot)
- `npm run sync` prints "OK: 39 pieces, 5 categories ..." with a valid `SANITY_READ_TOKEN`; without it, it prints a warning and keeps the old snapshot (build still passes).
- Fallback test: `SANITY_READ_TOKEN=x SANITY_PROJECT_ID=wrong npm run build` must build fine and leave `src/data/sanity-snapshot.json` unchanged.
- After `npm run build`: search `dist/` for `SANITY_`, the token, and `price` (must find nothing).
- Check at 1440x900 and 390x844: `/`, `/collections` (All + 5 filters, 39 cards), 4 piece pages, `/about`, `/contact`, menu. No console errors, no 404, no broken image, no horizontal scroll.
- Sanity images come from `cdn.sanity.io` (webp, q=80, srcset). Compare crops and sharpness with the local images.

## Round 26 – Contact details and hero from the mp4 sources (local only)
Part A (contact):
- Client-confirmed data (2026-10-09): phone 01094830060 (valid Egyptian mobile: 11 digits, 010 prefix; shown 0109 483 0060, link tel:+201094830060), Branch 1 Spot Mall (AUC Gate 4, Fifth Settlement, New Cairo, Ground Floor), Branch 2 8 Hesham Labib St (off Makram Ebeid), Nasr City.
- Old phone: +20 12 03988877, from the Facebook page "Lucchi furniture" (checked 2026-10-04, confidence Medium, never confirmed). Two directory numbers conflicted with it (+20 12 7399 9911 Google Maps, +20 10 0087 1111 Improuse). Replaced in `src/data/contact.js`; the same old value is still in Sanity (unconfirmed) and in the snapshot until the Sanity patch is done.
- Local fallback `src/data/contact.js`: phone and the two branches `confirmed: true`; new `branches` list (name, address, optional map link, confirmed), `formatPhone`, `visibleBranches`, tel link, JSON-LD (telephone + one PostalAddress per confirmed branch). ContactChannels renders each branch as a labelled block (selectable text, 44px links); Footer, Contact page and the closing block read it; nothing unconfirmed shows (`?previewContact=1` shows all). The unused `SocialOrPending` ("Instagram — Pending Client Confirmation") was removed and the Contact page no longer prints any "pending" text when nothing is confirmed (it prints nothing).
- Sanity: NOT changed yet. Waiting for the schema decision (optional `branches` array on contactSettings). Until the Sanity phone is patched, Sanity's old unconfirmed phone wins, so the phone is hidden; both branches already show from the local fallback.
Part B (hero):
- Sources: `3 merge.mp4` is the live shot (same room, same timing: the current clip matches its frames 130-247). 1.mp4 (terracotta armchair, green-grey room) and 2.mp4 (green armchair, daylit sage room) are different shots. `3 without merge.mp4` is the first half of the live shot (tilted, settling into the calm room). All 2560x1440, 24 fps; the last frame of 3 merge, 1 and 2 is black, so it is never used. The `mobile` folder only has GIFs (Sequence-02_1/2.gif), no mp4; the mobile hero is a 4:5 crop of the desktop shot (x from 850 px: sofa and, at rest, all three pillows).
- Live hero: `hero-hq-*` built from `3 merge.mp4` frames 122-247 (desktop, 126 frames, 5.25 s) and 122-200 (mobile, 79 frames, 3.29 s): 1920x1080 and 896x1120, every frame a keyframe, no denoise or sharpen, same mild tone step as before. Desktop mp4 5.72 MiB (CRF 28) and webm 5.19 MiB; mobile mp4 2.63 MiB (CRF 24) and webm 2.28 MiB. Posters are frame 0 of the encoded clip.
- Behaviour unchanged (scroll-linked round trip, not pinned, same constants). Measured at 1440: playhead 0.86 s at 15%, 3.34 s at 35%, 5.18 s at the 50% peak, 2.12 s at 75%, 0.01 s back at the top. 390: 0.54 s / 1.69 s / back to 0. 1920x1080 loads 1920x1080. Rest frame starts 8 frames earlier than before (calmer), so the first moments of the scroll are slightly stiller.
- Alternates (`public/media/hero/alt/`, reversed so frame 0 is the calm room; sizes above the live limits, re-encode with `scripts/make-hero-from-mp4.mjs` before using): alt-1 (1.mp4), alt-2 (2.mp4), alt-3 (3 without merge).
- Old `hero-scroll-*` stays in the project, not referenced and not uploaded. Upload size 91 MB.
- `npm run sync` then `npm run build` pass; dist contains no "price", "discount" or "SANITY_".

## Round 26b – Contact written to Sanity (done)
- Studio schema (`../studio-lucchi/schemaTypes/contactSettings.ts`): new optional `branches` array (name, address, optional map link, confirmed per branch); `address` kept as fallback. Sync query (`scripts/sync-sanity.mjs`) now reads `branches`.
- `scripts/patch-contact-sanity.mjs --write` patched the existing `contactSettings` document (no duplicate, no draft existed): phone 01094830060 confirmed (old value was +20 12 03988877, unconfirmed), address = branch 1 confirmed, two branches confirmed. Token never printed.
- `npm run sync` and `npm run build` pass; dist has no "price", "discount" or "SANITY_".
- Rendered (dev server, 1440 and 390): Contact page and footer show 0109 483 0060 (tel:+201094830060, 44px) and both labelled branches; JSON-LD has telephone +201094830060 and two PostalAddress entries; no email, hours, old phone or "pending" text. Mobile: branches stacked, no overflow (fixed a grid min-content blow-out on the contact page).
- Note: the hosted Studio needs `sanity deploy` (not run) to show the new Branches field in its editor; the data is already in the dataset.

## Round 27 – Desktop hero: peak frame, timing, text (local only; mobile untouched)
Evidence: the bug recording (found as Videos\Screen Recordings\Screen Recording 2026-10-09 230551.mp4, 1912x920; the Desktop path in the request does not exist) shows the push-in and text on the close-up.
Cause (clip + timing, not CSS): the old desktop clip used source frames 122-247 and its LAST frame was the peak. After about source frame 190 the camera tilts and pushes in: the table top grows from about 47% of the frame width at rest to about 1.2x at frame 82 (still a wide shot, pillows highest) and to about 2x or more by the last frame, where the sofa fills the whole frame. Nothing else adds zoom: no CSS scale, no Ken Burns, no SHIFT (the restored hero had none), `object-position` unchanged, the 1920 encode is the full 2560x1440 frame scaled down (no crop). The swap to the mp4 did not change this (the earlier GIF clip also ended on the same close-up frame). Text faded out only by 46% of the range, so it sat on the zoomed picture.
Before (clip frame 125 = peak; HOLD 8%, peak at 50%, back at rest by 92%, text gone at 46%): playhead 0 / 0.25 / 0.87 / 1.49 / 2.74 / 3.99 / 5.23 / 3.99 / 2.12 / 0.25 s and text opacity 1 / 0.98 / 0.86 / 0.74 / 0.62 / 0.38 / 0.14 / 0 / 0.14 / 0.5 / 0.86 at 0 / 5 / 10 / 15 / 20 / 30 / 40 / 50 / 60 / 75 / 90% (computed from the old curve, not measured).
Fix (all in `DESKTOP_HERO` in `src/config/heroMedia.js`): the clip now ENDS on its peak (source frame 204, `PEAK_FRAMES = 82` in `scripts/make-hero-from-mp4.mjs`): 83 frames, 3.46 s; HOLD 2%, peak at 42%, back at rest at 88% (smoothstep both ways, lerp 0.15 unchanged); SHIFT 0.6 (the picture follows the scroll, translate only, so the pillows stay on screen); text fades out between 2% and 22% (with a 48 px lift) and returns between 74% and 88%. Hero height unchanged (100svh; not needed).
After (measured at 1440x900, same at 1920x1080 and 1280x720): playhead 0 / 0.04 / 0.35 / 0.80 / 1.44 / 2.67 / 3.41 (42% peak) / 3.15 (50%) / 2.31 (60%) / 0.67 (75%) / 0.04 (90%) / 0 (top) s; text opacity 1 / 0.94 / 0.64 / 0.28 / 0.03 / 0 / 0 ...; the hero is 58% visible at the peak, with sofa, pillows and most of the table in view.
Encodes: desktop mp4 4.92 MB (CRF 26), webm 4.84 MB; the shorter clip also lets the encoder spend more bits per frame. Poster = frame 0 (same frame as before).
Mobile: UNCHANGED. The mobile files match their previous checksums (md5 identical); `SCROLL_HERO`, `roundTrip` and the mobile text behaviour are not edited; the new code only runs when the screen is landscape (portrait keeps the old path).
Upload 90 MB. dist has no "price", "discount" or "SANITY_".

## Round 28 – New mobile hero clip (desktop untouched)
- Source: `Sequence-02_1.gif` (the file named `Sequence-02_1_1.gif` does not exist; same clip, 1080x1350, 25 fps, 57 frames; there is no mp4/mov of it, so the GIF is the source). It was found in Downloads\...\MP4\mobile and Downloads\Mobile-...\Mobile, and a copy is now in Desktop\lucchi-banner-mp4\mobile.
- Frames: the GIF starts tilted about 45 degrees (frames 0-20) and settles at the end. REST = frame 56 (the last one: sofa level, pillows settled; still a tiny residual motion, step 2.5 vs about 0.2 for a fully still frame). PEAK = frame 31 (pillows high in the air, sofa almost level, shot still wide). Frames 0-30 are unused (too tilted). Clip = frames 56 down to 31, reversed: 26 frames, 1.04 s, 896x1120.
- Colour grade: greener olive than the desktop clip (the desktop is warm beige/grey). The same mild tone step (gamma 1.05, contrast 1.03) was applied, but the two clips do not match exactly. The sofa's right end is cut by the frame edge in the source from frame ~40 on, so "the whole sofa" cannot be shown; the table and pillows are inside.
- Files: `hero-mobile-seq.mp4` 2.84 MiB (CRF 14, the best quality that fits 3 MB), `hero-mobile-seq.webm` 2.80 MiB (CRF 28), `hero-mobile-seq-poster.webp` 0.11 MiB = frame 0 of the encoded clip (resting frame), also the loader image. At 1080 wide the same clip fits at CRF 20 (mp4 2.34 MiB, webm 2.96 MiB), so 1080 is possible if wanted; not wired. The source is a dithered, soft GIF: the video is clean (no visible banding) but not sharper than the source.
- Wiring: `heroMedia.js` (mobile sources + poster) and `index.html` (mobile preload, inline script). The old `hero-hq-mobile-*` files stay in the project and are listed in `.vercelignore`. New `MOBILE_HERO` constants (HOLD 2%, peak 38%, back at rest 88%, SHIFT 0.5, smoothstep, lerp 0.15) and `roundTripMobile`. Text: on phones the copy sits below the photo, so it is not faded (`MOBILE_HERO.FADE_TEXT = false`; switch it on to fade it by 22%).
- Measured at 390x844 (playhead in s, peak is 1.04 s): 0% 0, 10% 0.11, 20% 0.49, 30% 0.86, 39% 0.99 (peak), 60% 0.55, 75% 0.18, 90% 0, back at the top 0. 412x915 and 360x740: peak 0.99 at 38%, back to 0 at the top. No horizontal overflow, no console errors. iOS branch (simulated user agent): one play on first scroll, 0.57 s then 0.84 s, back to 0 after about 3.6 s. Reduced-motion/data-saver code path untouched (poster only); not re-run.
- Desktop: unchanged. The three desktop media files have identical checksums; the `DESKTOP_HERO` block hash is identical; no desktop source line in `heroMedia.js` changed.
- Upload 91 MB. `npm run sync` and `npm run build` pass; dist has no "price", "discount" or "SANITY_".

## Round 29 – Mobile hero not showing on real phones (local only; desktop untouched)
Conditions that made the mobile hero a still picture or hid the video (before):
1. Reduce Motion on (`prefers-reduced-motion`): picture only. Kept (real request).
2. `navigator.connection.saveData` truthy: picture only. Kept, now only when it is exactly `true`.
3. `effectiveType` 2g / slow-2g: picture only. Kept (3g still plays: the mobile clip is 3 MB).
4. Weak device: `hardwareConcurrency <= 4 AND deviceMemory <= 4`: picture only. This hit low-end Android phones (4 cores, 4 GB or less). iOS Safari does not report deviceMemory (read as 8) so iPhones were not hit by it. Now removed for portrait screens; still applies to weak landscape computers (desktop behaviour unchanged). Same rule in `index.html` and `heroMedia.js`.
5. iOS (user agent iPhone/iPad/iPod or touch Mac): not static, but "play once" mode. Bug found: iOS ignores `preload`, so the metadata is often not loaded; `run()` saw `duration = NaN`, returned, and the one-time play never happened (and did not retry until the visitor scrolled back to the top). Fixed: it now makes sure the data is there (a muted inline `play()` loads it, then pause), waits up to 4 s, and stays on the poster if the browser refuses (Low Power Mode): no error, no play icon, no black.
6. canplay timeout: the loader waited up to 3.5 s for a "canplay" that iOS never sends. Now iPhones do not wait for it; other phones continue as soon as the metadata is there (desktop still waits for canplay).
7. WebM before MP4 in the mobile `<source>` list: iOS Safari 17.4+ would pick the WebM first. Mobile order is now MP4 first, WebM second (desktop order unchanged).
Also added: `webkit-playsinline`, and a poster underlay on the video frame for portrait screens (`.hero-video-frame` background), so the hero is never black or empty while the video loads or if it is refused. The loader image is the poster = frame 0.
Files: `hero-mobile-seq.mp4/.webm/-poster.webp` are in `dist/media/hero` and on the live site: all 200, Content-Type video/mp4, video/webm, image/webp, `Accept-Ranges: bytes`, a range request returns 206; `.vercelignore` does not list them (only the older hero-hq-mobile-* and hero-scroll-*). mp4: H.264 High level 3.2, yuv420p, 896x1120, no audio, faststart.
Tested with Playwright (installed outside the project): Chromium Pixel 7 at 412x915, 390x844 and 360x740 with Fast 3G (CDP): the mp4 is chosen, the hero scrubs (playhead 0.98 s at 38% scroll, 0 back at the top), brightness of the hero area about 83 at rest (not black), no console errors; with Reduce Motion on: poster only, no sources, no video download. WebKit iPhone 12 at 390x844 and 360x740 (videos delayed 2.5 s): loader leaves, no errors, Reduce Motion gives the poster only; NOTE the Windows WebKit build jumps any muted inline video to its last frame without play(), so its motion cannot be judged (a plain test page behaves the same). The iOS branch was exercised in Chromium with an iPhone user agent: one play on first scroll, playhead 0 to 1.0 s and back to 0 in 3.6 s. Worst case (video requests blocked AND play() rejected): the poster stays, brightness 83-84, no errors, no controls, background poster present.
Not tested: a real iPhone or Android device. Upload 91 MB; dist has no "price", "discount" or "SANITY_". Desktop files and `DESKTOP_HERO` unchanged (same checksums).
