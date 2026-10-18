/** Scroll-driven hero. The scroll position is the playhead of the hero video. */
export const HERO_MOUSE_MODE = 'off' // the mouse parallax is off: the picture stays exactly as exported

export const PARALLAX_X = 24
export const PARALLAX_Y = 16
export const SMOOTHING = 0.075
export const OVERSCAN_SCALE = 1
export const TEXT_SHIFT = 8
export const CENTER_SCALE_BOOST = 0.02
export const SCRIM_SHIFT = 6
export const SCRUB_IDLE_MS = 1500

/* Scroll scrub tuning. The scroll makes a round trip through the clip:
   rest frame -> peak frame (furniture lifted, the last frame of the clip) -> rest frame,
   so the end of the hero looks exactly like the start (and like the poster).
   HOLD / HOLD_END: share of the scroll range kept on the resting frame at the start / at the end.
   LERP: how fast the playhead follows the scroll (0.12 to 0.18 feels smooth).
   MIN_STEP: seconds; currentTime is only set when it moved at least this much.
   MODE: 'scrub' = scroll is the playhead; 'play-once' = poster, then one gentle lift-and-settle when
   the visitor starts to scroll; 'auto' = scrub, except iOS-like browsers use play-once. */
export const SCROLL_HERO = { HOLD: 0.08, HOLD_END: 0.08, LERP: 0.15, MIN_STEP: 0.012, END_PAD: 0.04, MODE: 'auto', PLAY_ONCE_MS: 3600 }

/* Autoplay at the top of the page. While the visitor has not scrolled (scrollY near 0) the hero plays by itself:
   a smooth ping-pong (rest frame -> peak frame -> rest frame) driven by currentTime in requestAnimationFrame, so
   there is no loop jump. Both clips start on the rest frame and end on the peak frame, so they are not a closed loop.
   The scroll takes over from the current frame as soon as the visitor scrolls away (ENTER_PX / LEAVE_PX give a small
   dead zone), and the autoplay continues from the current frame RESUME_MS after the page is back at the top and still.
   DESKTOP_RATE / MOBILE_RATE: clip seconds per real second at the middle of the motion (lower = calmer).
   MIN_STEP: seconds; currentTime is only set when it moved at least this much. ENABLED = false turns it off. */
export const AUTOPLAY_HERO = { ENABLED: true, DESKTOP_RATE: 0.8, MOBILE_RATE: 0.35, ENTER_PX: 4, LEAVE_PX: 8, RESUME_MS: 400, MIN_STEP: 0.008 }

/* Scroll progress (0 to 1) -> where the playhead goes (0 = rest frame, 1 = peak frame). */
export function roundTrip(progress) {
  const { HOLD, HOLD_END } = SCROLL_HERO
  const span = Math.max(0.01, 1 - HOLD - HOLD_END)
  const u = Math.min(1, Math.max(0, (progress - HOLD) / span))
  return u < 0.5 ? u * 2 : (1 - u) * 2
}

/* DESKTOP hero timing (landscape screens). Phones and portrait tablets keep SCROLL_HERO / roundTrip above, unchanged.
   Progress 0 = hero at rest at the top, 1 = hero scrolled out. Every value is a share of that range.
   The desktop clip ends on its PEAK frame (pillows highest, sofa and table still a wide shot, source frame
   START + PEAK_FRAMES in scripts/make-hero-from-mp4.mjs), so the last frame of the file is the peak.
   HOLD:     resting frame kept at the very start.
   PEAK_AT:  progress where the pillows are highest.
   REST_AT:  progress where everything is back at rest (smoothstep up and down).
   SHIFT:    the picture follows the scroll by this share of the scroll distance (translate only, no zoom), so the
             lifted pillows stay on screen while the hero scrolls away. Must stay below 1.
   TEXT_OUT_START / TEXT_OUT_END: headline and paragraph fade out (opacity, with a small upward move) in this range,
             finished before the picture changes much. TEXT_IN_START / TEXT_IN_END: they come back near the end. */
export const DESKTOP_HERO = {
  HOLD: 0.02,
  PEAK_AT: 0.42,
  REST_AT: 0.88,
  SHIFT: 0.6,
  TEXT_OUT_START: 0.02,
  TEXT_OUT_END: 0.22,
  TEXT_IN_START: 0.74,
  TEXT_IN_END: 0.88,
  TEXT_LIFT_PX: 48,
}

const smooth = (t) => t * t * (3 - 2 * t)
const clamp01 = (n) => Math.min(1, Math.max(0, n))

/* Scroll progress -> playhead share (0 = rest frame, 1 = peak frame), desktop. */
export function roundTripDesktop(progress) {
  const { HOLD, PEAK_AT, REST_AT } = DESKTOP_HERO
  if (progress <= HOLD || progress >= REST_AT) return 0
  if (progress < PEAK_AT) return smooth((progress - HOLD) / (PEAK_AT - HOLD))
  return smooth((REST_AT - progress) / (REST_AT - PEAK_AT))
}

/* Scroll progress -> how hidden the desktop text is (0 = fully visible, 1 = gone). */
export function desktopTextHidden(progress) {
  const { TEXT_OUT_START, TEXT_OUT_END, TEXT_IN_START, TEXT_IN_END } = DESKTOP_HERO
  const out = smooth(clamp01((progress - TEXT_OUT_START) / (TEXT_OUT_END - TEXT_OUT_START)))
  const back = smooth(clamp01((progress - TEXT_IN_START) / (TEXT_IN_END - TEXT_IN_START)))
  return clamp01(out - back)
}

/* MOBILE hero timing (portrait screens: phones and portrait tablets). The mobile clip (hero-mobile-seq, from the
   client's 4:5 GIF) starts on the resting frame and ends on its peak (pillows high, sofa almost level), so the
   scroll maps rest -> peak -> rest. Every value is a share of the hero's scroll-out (0 = at rest, 1 = scrolled out).
   HOLD / PEAK_AT / REST_AT: as for the desktop. SHIFT: the picture follows the scroll by this share of the scroll
   distance (translate only, no zoom), so the lifted pillows stay inside the visible part of the photo.
   FADE_TEXT: on phones the copy sits BELOW the photo, never on top of it, so it is not faded (false). Set it to true
   to fade it between TEXT_OUT_START and TEXT_OUT_END and bring it back between TEXT_IN_START and TEXT_IN_END. */
export const MOBILE_HERO = {
  HOLD: 0.02,
  PEAK_AT: 0.38,
  REST_AT: 0.88,
  SHIFT: 0.5,
  FADE_TEXT: false,
  TEXT_OUT_START: 0.02,
  TEXT_OUT_END: 0.22,
  TEXT_IN_START: 0.74,
  TEXT_IN_END: 0.88,
  TEXT_LIFT_PX: 24,
}

/* Scroll progress -> playhead share (0 = rest frame, 1 = peak frame), mobile. */
export function roundTripMobile(progress) {
  const { HOLD, PEAK_AT, REST_AT } = MOBILE_HERO
  if (progress <= HOLD || progress >= REST_AT) return 0
  if (progress < PEAK_AT) return smooth((progress - HOLD) / (PEAK_AT - HOLD))
  return smooth((REST_AT - progress) / (REST_AT - PEAK_AT))
}

/* Scroll progress -> how hidden the mobile text is (only used when MOBILE_HERO.FADE_TEXT is true). */
export function mobileTextHidden(progress) {
  const { TEXT_OUT_START, TEXT_OUT_END, TEXT_IN_START, TEXT_IN_END } = MOBILE_HERO
  const out = smooth(clamp01((progress - TEXT_OUT_START) / (TEXT_OUT_END - TEXT_OUT_START)))
  const back = smooth(clamp01((progress - TEXT_IN_START) / (TEXT_IN_END - TEXT_IN_START)))
  return clamp01(out - back)
}

export function isIosLike() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/* Files: the 16:9 clip starts on the settled room and the furniture lifts as you scroll.
   The 4:5 clip is the same idea in reverse. Each poster is frame 0 of its clip
   (scripts/make-scroll-hero.mjs), so poster, loader and hero are the same picture.
   Older hero files stay on disk, unused, and are left out of the deploy in .vercelignore. */
export const HERO_VIDEO = {
  desktopWebm: '/media/hero/hero-hq-desktop.webm',
  desktopMp4: '/media/hero/hero-hq-desktop.mp4',
  mobileWebm: '/media/hero/hero-mobile-seq.webm',
  mobileMp4: '/media/hero/hero-mobile-seq.mp4',
  posterDesktop: '/media/hero/hero-hq-desktop-poster.webp',
  posterMobile: '/media/hero/hero-mobile-seq-poster.webp',
  aspectDesktop: 16 / 9,
  aspectMobile: 896 / 1120,
}

/* Any portrait screen gets the 4:5 video and poster, everything else the 16:9 ones. */
export const HERO_MOBILE_QUERY = '(orientation: portrait)'
export const HERO_VIDEO_MAX_WAIT_MS = 3500

/* Art direction for the focal point (first match wins). */
export const HERO_ART = [
  { key: 'wide', media: '(max-height: 540px) and (orientation: landscape)' },
  { key: 'tabletPortrait', media: '(orientation: portrait) and (min-width: 600px)' },
  { key: 'mobile', media: '(orientation: portrait)' },
  { key: 'tablet', media: '(max-width: 1024px)' },
  { key: 'wide', media: '(min-width: 2000px)' },
  { key: 'desktop', media: null },
]
export function getHeroMediaKey() {
  if (typeof window === 'undefined') return 'desktop'
  return HERO_ART.find((a) => a.media && window.matchMedia(a.media).matches)?.key ?? 'desktop'
}

/* When the hero is a still picture only (poster, no video download):
   - Reduce Motion is on, Data Saver is on (explicit saveData), or the connection really is 2g. Everywhere.
   - A weak landscape computer (4 cores or fewer AND 4 GB or less). NOT phones: the mobile clip is small (about 3 MB),
     so normal phones play it (a low-end Android used to fall into this rule and only ever showed the picture).
   Keep the same rules in the inline script in index.html. */
export function shouldPreferStaticHero() {
  if (typeof window === 'undefined') return true
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
  const connection = navigator.connection
  if (connection?.saveData === true) return true
  if (connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g') return true
  if (window.matchMedia(HERO_MOBILE_QUERY).matches) return false
  const cores = navigator.hardwareConcurrency || 8
  const memory = navigator.deviceMemory || 8
  return cores <= 4 && memory <= 4
}

function makeVideoElement() {
  const video = document.createElement('video')
  video.className = 'hero-video'
  video.muted = true
  video.defaultMuted = true
  video.loop = false
  video.playsInline = true
  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.setAttribute('aria-hidden', 'true')
  video.disablePictureInPicture = true
  video.disableRemotePlayback = true
  return video
}

/* A <video> that only shows its poster (reduced motion, data saver, weak devices):
   same element, same crop, same frame, and no video download at all. */
export function makeHeroStill() {
  const mobile = window.matchMedia(HERO_MOBILE_QUERY).matches
  const video = makeVideoElement()
  video.preload = 'none'
  video.autoplay = false
  video.poster = mobile ? HERO_VIDEO.posterMobile : HERO_VIDEO.posterDesktop
  return video
}

/* The one hero video. index.html creates it from an inline script the moment the page
   starts loading (window.__heroVideo); this adopts it, or builds the same thing. */
export function getHeroVideo() {
  if (typeof window === 'undefined' || shouldPreferStaticHero()) return null
  if (window.__heroVideo) return window.__heroVideo
  const mobile = window.matchMedia(HERO_MOBILE_QUERY).matches
  const video = makeVideoElement()
  video.preload = 'auto'
  video.autoplay = false
  video.poster = mobile ? HERO_VIDEO.posterMobile : HERO_VIDEO.posterDesktop
  const sources = mobile
    ? [[HERO_VIDEO.mobileMp4, 'video/mp4'], [HERO_VIDEO.mobileWebm, 'video/webm']] // mp4 first: iOS Safari
    : [[HERO_VIDEO.desktopWebm, 'video/webm'], [HERO_VIDEO.desktopMp4, 'video/mp4']]
  sources.forEach(([src, type]) => {
    const source = document.createElement('source')
    source.src = src
    source.type = type
    video.appendChild(source)
  })
  window.__heroVideo = video
  return video
}

/* Resolves when the hero video can play (or can never play), never later than maxMs.
   The loader waits on this, so the first thing seen is the video, not a stand-in. */
export function heroVideoReady(maxMs = HERO_VIDEO_MAX_WAIT_MS) {
  return new Promise((resolve) => {
    const video = getHeroVideo()
    if (!video || video.readyState >= 3) {
      resolve()
      return
    }
    // iOS Safari does not load video data until play() (it ignores preload), so "canplay" never comes: the poster
    // is the hero until the first scroll, no need to hold the loader for it.
    if (isIosLike() && window.matchMedia(HERO_MOBILE_QUERY).matches) {
      resolve()
      return
    }
    let timer = 0
    const done = () => {
      window.clearTimeout(timer)
      video.removeEventListener('canplay', done)
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('error', done)
      resolve()
    }
    // Phones: the first frames are enough (the poster is already on screen).
    const onMeta = () => { if (window.matchMedia(HERO_MOBILE_QUERY).matches) done() }
    video.addEventListener('canplay', done)
    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('error', done)
    timer = window.setTimeout(done, maxMs)
  })
}