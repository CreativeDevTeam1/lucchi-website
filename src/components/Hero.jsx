import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import imageManifest from '../data/images.json'
import { homeCopy } from '../data/content'
import { HERO } from '../config/siteMotion'
import {
  CENTER_SCALE_BOOST,
  HERO_ART,
  HERO_MOUSE_MODE,
  OVERSCAN_SCALE,
  PARALLAX_X,
  PARALLAX_Y,
  SCRIM_SHIFT,
  DESKTOP_HERO,
  HERO_MOBILE_QUERY,
  MOBILE_HERO,
  SCROLL_HERO,
  AUTOPLAY_HERO,
  desktopTextHidden,
  mobileTextHidden,
  roundTrip,
  roundTripDesktop,
  roundTripMobile,
  SCRUB_IDLE_MS,
  SMOOTHING,
  TEXT_SHIFT,
  getHeroVideo,
  isIosLike,
  makeHeroStill,
  shouldPreferStaticHero,
} from '../config/heroMedia'

/* Entrance timeline. Everything is CSS-driven by classes on <html>:
   hero-pre (hidden start state, set by the inline script in index.html before first paint)
   -> hero-play (this effect swaps it in when the loader is about to leave)
   -> hero-done (after the last animation ends). Seconds unless noted. Phones run at mobileScale.
   ENTRANCE.enabled = false shows the final hero instantly. */
const ENTRANCE = {
  enabled: true,
  ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
  mobileScale: 0.8, // phones: 80% of every delay and duration
  overlapMs: 200, // start this long before the loader has fully left (raise it to start at exit begin)
  start: { media: 0, hairline: 0.15, headline: 0.15, header: 0.4, support: 0.65, buttons: 0.85, cue: 1.2 },
  stagger: { word: 0.07, button: 0.11, header: 0.06 },
  duration: { mediaScale: 1.8, mediaFade: 0.9, word: 1.1, hairline: 1, support: 0.8, button: 0.8, header: 0.8, cue: 0.6 },
  mediaStartScale: 1, // no zoom: the loader strips and the hero show exactly the same crop
  wordFrom: '105%', // words rise from behind their mask line
  supportRisePx: 22,
  buttonRisePx: 22,
  headerDropPx: 14,
  reducedFadeMs: 400, // reduced motion / data saver: one simple fade
  failsafeSeconds: 4, // CSS shows everything after this if the sequence never starts
}

/* Fixed line breaks from the design (one word per line); each line is its own mask. */
const FALLBACK_HEADLINE = 'Timeless furniture, thoughtfully made.'
const FALLBACK_PARAGRAPH = 'A private furniture destination for considered interiors. Solid Romanian red beech structures, bookmatched natural veneers, and curated pieces available by enquiry.'
// Copy comes from Sanity (homePage); the two constants above are the fallback.
const HEADLINE = homeCopy.heroHeadline || FALLBACK_HEADLINE
const PARAGRAPH = homeCopy.heroParagraph || FALLBACK_PARAGRAPH
const headlineLines = HEADLINE.split(/\s+/).filter(Boolean).map((word) => [word])
const WORD_COUNT = headlineLines.reduce((sum, words) => sum + words.length, 0)

function entranceVars(scale) {
  const { start, stagger, duration } = ENTRANCE
  const s = (value) => `${+(value * scale).toFixed(3)}s`
  return {
    '--hero-ease': ENTRANCE.ease,
    '--hero-start-scale': ENTRANCE.mediaStartScale,
    '--hero-word-from': ENTRANCE.wordFrom,
    '--hero-support-rise': `${ENTRANCE.supportRisePx}px`,
    '--hero-button-rise': `${ENTRANCE.buttonRisePx}px`,
    '--hero-header-drop': `${ENTRANCE.headerDropPx}px`,
    '--hero-fade-ms': `${ENTRANCE.reducedFadeMs}ms`,
    '--hero-failsafe': `${ENTRANCE.failsafeSeconds}s`,
    '--hero-d-media-scale': s(duration.mediaScale),
    '--hero-d-media-fade': s(duration.mediaFade),
    '--hero-d-word': s(duration.word),
    '--hero-d-hairline': s(duration.hairline),
    '--hero-d-support': s(duration.support),
    '--hero-d-button': s(duration.button),
    '--hero-d-header': s(duration.header),
    '--hero-d-cue': s(duration.cue),
    '--hero-t-media': s(start.media),
    '--hero-t-hairline': s(start.hairline),
    '--hero-t-headline': s(start.headline),
    '--hero-t-header': s(start.header),
    '--hero-t-support': s(start.support),
    '--hero-t-buttons': s(start.buttons),
    '--hero-t-cue': s(start.cue),
    '--hero-s-word': s(stagger.word),
    '--hero-s-button': s(stagger.button),
    '--hero-s-header': s(stagger.header),
  }
}

/* When the last animation ends (seconds, before the phone scale). */
function entranceLength() {
  const { start, stagger, duration } = ENTRANCE
  return Math.max(
    start.media + duration.mediaScale,
    start.headline + (WORD_COUNT - 1) * stagger.word + duration.word,
    start.header + 2 * stagger.header + duration.header,
  )
}

function useMediaKey() {
  const [key, setKey] = useState('desktop')
  useEffect(() => {
    const lists = HERO_ART.filter((a) => a.media).map((a) => ({ key: a.key, mql: window.matchMedia(a.media) }))
    const resolve = () => setKey(lists.find((l) => l.mql.matches)?.key ?? 'desktop')
    resolve()
    lists.forEach((l) => l.mql.addEventListener('change', resolve))
    return () => lists.forEach((l) => l.mql.removeEventListener('change', resolve))
  }, [])
  return key
}

function useMatches(query) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const resolve = () => setMatches(mql.matches)
    resolve()
    mql.addEventListener('change', resolve)
    return () => mql.removeEventListener('change', resolve)
  }, [query])
  return matches
}

export default function Hero({ reduceMotion, introReady = true, loaderLeaveMs = 0 }) {
  const mediaKey = useMediaKey()
  const pointerFine = useMatches('(hover: hover) and (pointer: fine)')
  // Phones and portrait tablets: the copy sits below the photo (not over it), so it stays put.
  const portraitLayout = useMatches('(max-width: 1024px) and (orientation: portrait)')
  const slot = imageManifest.hero[mediaKey] ?? imageManifest.hero.desktop

  // Reduced motion, data saver, weak devices: the poster (frame 0 of the video) and no motion.
  const [staticHero] = useState(() => typeof window !== 'undefined' && shouldPreferStaticHero())
  const allowVideo = !reduceMotion && !staticHero
  const useMouse = allowVideo && pointerFine && HERO_MOUSE_MODE !== 'off'

  const videoRef = useRef(null)
  const videoLayerRef = useRef(null)
  const textLayerRef = useRef(null)
  const scrimRef = useRef(null)
  const sectionRef = useRef(null)
  const wrapperRef = useRef(null)
  const heroInView = useRef(true)
  const tabHidden = useRef(false)
  const pointerActive = useRef(false)
  const entranceDone = useRef(false)
  const rafRef = useRef(0)
  const idleTimer = useRef(0)
  const scrubbing = useRef(false)
  const target = useRef({ x: 0, y: 0, s: OVERSCAN_SCALE, tx: 0, ty: 0, sx: 0 })
  const current = useRef({ x: 0, y: 0, s: OVERSCAN_SCALE, tx: 0, ty: 0, sx: 0 })

  const [videoLive, setVideoLive] = useState(false)

  // The <video> already exists (index.html starts it at page load). Put it in its layer
  // before first paint; with a still hero it is a poster-only <video> (same frame, same crop).
  useLayoutEffect(() => {
    const layer = videoLayerRef.current
    if (!layer) return undefined
    const video = allowVideo ? getHeroVideo() : makeHeroStill()
    if (!video) return undefined
    videoRef.current = video
    layer.appendChild(video)
    return () => {
      if (video.parentNode === layer) layer.removeChild(video)
      video.pause()
      videoRef.current = null
    }
  }, [allowVideo])

  // Text: fades and moves up slightly as the hero scrolls, so the video becomes the star.
  const { scrollYProgress } = useScroll({ target: wrapperRef, offset: ['start start', 'end start'] })
  // Desktop: the text fades out early (see DESKTOP_HERO) so it never sits on the moving picture, and is back at rest.
  // Phones keep the copy below the photo (MOBILE_HERO.FADE_TEXT is false), so only landscape screens fade it.
  const fades = allowVideo && (!portraitLayout || MOBILE_HERO.FADE_TEXT)
  const hiddenText = portraitLayout ? mobileTextHidden : desktopTextHidden
  const textLift = portraitLayout ? MOBILE_HERO.TEXT_LIFT_PX : DESKTOP_HERO.TEXT_LIFT_PX
  const contentY = useTransform(scrollYProgress, (p) => (fades ? -textLift * hiddenText(p) : 0))
  const contentOpacity = useTransform(scrollYProgress, (p) => (fades ? 1 - hiddenText(p) : 1))

  const applyLayers = () => {
    const videoLayer = videoLayerRef.current
    if (videoLayer) {
      videoLayer.style.transform = `translate3d(${current.current.x.toFixed(2)}px, ${current.current.y.toFixed(2)}px, 0) scale(${current.current.s.toFixed(4)})`
    }
    const textLayer = textLayerRef.current
    if (textLayer) {
      textLayer.style.transform = `translate3d(${current.current.tx.toFixed(2)}px, ${current.current.ty.toFixed(2)}px, 0)`
    }
    const scrim = scrimRef.current
    if (scrim) {
      scrim.style.transform = `translate3d(${current.current.sx.toFixed(2)}px, 0, 0)`
    }
  }

  useEffect(() => {
    if (!useMouse || HERO_MOUSE_MODE !== 'parallax' || !videoLive) return undefined

    const tick = () => {
      if (!heroInView.current || tabHidden.current) {
        rafRef.current = 0
        return
      }
      const next = current.current
      const goal = target.current
      next.x += (goal.x - next.x) * SMOOTHING
      next.y += (goal.y - next.y) * SMOOTHING
      next.s += (goal.s - next.s) * SMOOTHING
      next.tx += (goal.tx - next.tx) * SMOOTHING
      next.ty += (goal.ty - next.ty) * SMOOTHING
      next.sx += (goal.sx - next.sx) * SMOOTHING
      applyLayers()
      rafRef.current = window.requestAnimationFrame(tick)
    }

    rafRef.current = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [useMouse, videoLive])

  /* Playback. Two drivers share one <video> (currentTime only, never video.loop):
     1) AUTOPLAY while the page is at the top (scrollY near 0): a smooth ping-pong rest -> peak -> rest (AUTOPLAY_HERO).
        It stops when the hero is off screen or the tab is hidden, and never runs for reduced motion / data saver / 2g
        (those never get here: allowVideo is false and the poster is all there is).
     2) SCROLL: as soon as the visitor scrolls away from the top, the scroll position is the playhead
        (progress 0 = hero at rest at the top, 1 = fully scrolled out), starting from the frame the autoplay was on,
        eased by LERP (no jump). The page is NOT pinned: native scrolling is untouched (passive scroll listener only).
        The scroll makes the round trip rest -> peak -> rest (DESKTOP_HERO / MOBILE_HERO).
        iOS-like browsers: the autoplay is the same, but a scroll lets the current lift settle on the rest frame
        (time driven) instead of scrubbing. Back at the top and still for RESUME_MS, the autoplay continues.
     iOS ignores preload, so the data is made ready with a muted inline play() (then pause); if the browser refuses
     (Low Power Mode, data saver) the poster stays: no error, no play icon, no black. */
  useEffect(() => {
    const video = videoRef.current
    const wrap = wrapperRef.current
    const section = sectionRef.current
    if (!video || !wrap || !section || !allowVideo) return undefined

    const { LERP, MIN_STEP, END_PAD } = SCROLL_HERO
    const AUTO = AUTOPLAY_HERO
    const TAU = Math.PI * 2
    const mode = SCROLL_HERO.MODE === 'auto' ? (isIosLike() ? 'play-once' : 'scrub') : SCROLL_HERO.MODE
    const isPortrait = () => window.matchMedia(HERO_MOBILE_QUERY).matches
    const markLive = () => setVideoLive(true)
    video.addEventListener('loadeddata', markLive)
    if (video.readyState >= 2) markLive()

    let cancelled = false
    let dataOk = false
    let inView = true
    let auto = false
    let finishing = false
    let forward = true
    let theta = 0
    let autoRaf = 0
    let autoLast = 0
    let resumeTimer = 0
    let raf = 0
    let playhead = Number.isFinite(video.currentTime) ? video.currentTime : 0

    const hasFrames = () => Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 2
    // readyState dips while a seek is in flight, so only the length is checked once the frames have loaded.
    const hasLength = () => Number.isFinite(video.duration) && video.duration > 0
    const span = () => Math.max(0, video.duration - END_PAD)
    const cycleSeconds = () => (2 * span()) / (isPortrait() ? AUTO.MOBILE_RATE : AUTO.DESKTOP_RATE)

    // Make sure the frames are there (iOS needs a muted inline play() to load them).
    const dataReady = () => new Promise((resolve) => {
      if (hasFrames()) { resolve(true); return }
      let finished = false
      const finish = (value) => {
        if (finished) return
        finished = true
        window.clearTimeout(limit)
        video.removeEventListener('loadeddata', onData)
        resolve(value)
      }
      const onData = () => finish(hasFrames())
      const limit = window.setTimeout(() => finish(hasFrames()), mode === 'play-once' ? 4000 : 15000)
      video.addEventListener('loadeddata', onData)
      if (mode === 'play-once') {
        try {
          const played = video.play()
          if (played && played.then) played.then(() => video.pause()).catch(() => {})
        } catch { /* poster stays */ }
      }
    })

    /* ----- autoplay ----- */
    const stopAuto = () => {
      auto = false
      finishing = false
      window.cancelAnimationFrame(autoRaf)
      autoRaf = 0
    }
    // iOS only: after a pause that left the clip mid-lift while the page is scrolled, put it back on the rest frame.
    const parkAtRest = () => {
      if (mode === 'play-once' && window.scrollY > AUTO.LEAVE_PX && hasLength() && video.currentTime > 0) video.currentTime = 0
    }
    const autoStep = (now) => {
      autoRaf = 0
      if (!auto) return
      if (!inView || document.hidden || !hasLength()) { auto = false; return }
      const dt = Math.min(0.1, Math.max(0, (now - autoLast) / 1000))
      autoLast = now
      theta += (TAU / cycleSeconds()) * dt
      if (theta >= TAU) {
        if (finishing) {
          auto = false
          finishing = false
          theta = 0
          video.currentTime = 0
          return
        }
        theta -= TAU
      }
      forward = theta < Math.PI
      const t = ((1 - Math.cos(theta)) / 2) * span()
      if (Math.abs(video.currentTime - t) >= AUTO.MIN_STEP) video.currentTime = t
      autoRaf = window.requestAnimationFrame(autoStep)
    }
    const startAuto = () => {
      if (cancelled || auto || !AUTO.ENABLED || !introReady || !dataOk || !inView || document.hidden || !hasLength()) return
      if (window.scrollY > AUTO.ENTER_PX) return
      const d = span()
      if (!(d > 0)) return
      window.cancelAnimationFrame(raf)
      raf = 0
      // Continue from the frame the video is on now (no jump).
      const s = Math.min(1, Math.max(0, video.currentTime / d))
      const a = Math.acos(1 - 2 * s)
      theta = forward ? a : TAU - a
      auto = true
      finishing = false
      autoLast = performance.now()
      video.pause()
      autoRaf = window.requestAnimationFrame(autoStep)
    }
    const scheduleResume = () => {
      window.clearTimeout(resumeTimer)
      resumeTimer = window.setTimeout(startAuto, AUTO.RESUME_MS)
    }

    /* ----- scroll scrub (not iOS) ----- */
    const progress = () => {
      const range = Math.max(1, wrap.offsetHeight)
      return Math.min(1, Math.max(0, -wrap.getBoundingClientRect().top / range))
    }
    const layer = videoLayerRef.current
    const tick = () => {
      raf = 0
      if (auto) return
      const duration = video.duration
      if (!Number.isFinite(duration) || duration <= 0) return
      const p = progress()
      // Portrait (phones, portrait tablets): MOBILE_HERO. Landscape: DESKTOP_HERO.
      const portrait = isPortrait()
      const shift = portrait ? MOBILE_HERO.SHIFT : DESKTOP_HERO.SHIFT
      if (layer) layer.style.transform = `translate3d(0, ${(p * wrap.offsetHeight * shift).toFixed(1)}px, 0)`
      const share = portrait ? roundTripMobile(p) : roundTripDesktop(p)
      const goal = share * Math.max(0, duration - END_PAD)
      playhead += (goal - playhead) * LERP
      if (Math.abs(goal - playhead) < 0.002) playhead = goal
      if (Math.abs(video.currentTime - playhead) >= MIN_STEP || (playhead === 0 && video.currentTime !== 0)) {
        video.currentTime = playhead
      }
      if (playhead !== goal) raf = window.requestAnimationFrame(tick)
    }
    const kick = () => { if (mode !== 'play-once' && !raf && !auto) raf = window.requestAnimationFrame(tick) }

    const onScroll = () => {
      const y = window.scrollY
      if (auto && y > AUTO.LEAVE_PX) {
        if (mode === 'play-once') finishing = true // let the lift settle on the rest frame by itself
        else {
          stopAuto()
          playhead = Number.isFinite(video.currentTime) ? video.currentTime : 0 // the scroll continues from here
        }
      }
      if (y <= AUTO.ENTER_PX) {
        if (finishing) finishing = false // came back before it settled: keep playing
        if (!auto) scheduleResume()
      } else {
        window.clearTimeout(resumeTimer)
      }
      kick()
    }
    const onVisibility = () => {
      if (document.hidden) {
        stopAuto()
        parkAtRest()
      } else {
        parkAtRest()
        scheduleResume()
        kick()
      }
    }
    const onResize = () => kick()
    const onMeta = () => { if (!auto) { playhead = 0; kick() } }

    const observer = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
        inView = entries.some((entry) => entry.isIntersecting)
        if (!inView) { stopAuto(); parkAtRest() } else scheduleResume()
      })
      : null
    observer?.observe(section)

    if (mode !== 'play-once') video.pause()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    video.addEventListener('loadedmetadata', onMeta)
    kick()

    if (introReady && AUTO.ENABLED) {
      dataReady().then((ok) => {
        if (cancelled) return
        dataOk = ok
        if (ok) startAuto()
      })
    }

    return () => {
      cancelled = true
      stopAuto()
      window.clearTimeout(resumeTimer)
      window.cancelAnimationFrame(raf)
      observer?.disconnect()
      if (layer) layer.style.transform = ''
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('loadeddata', markLive)
    }
  }, [allowVideo, introReady])

  /* Entrance: swap hero-pre for hero-play when the loader is about to leave, then mark
     hero-done. Runs once per page load (hero-pre only exists on a fresh load of "/"). */
  useEffect(() => {
    if (!introReady) return undefined
    const root = document.documentElement
    if (!root.classList.contains('hero-pre')) {
      entranceDone.current = true
      return undefined
    }
    if (!ENTRANCE.enabled) {
      root.classList.remove('hero-pre', 'hero-armed', 'hero-media-go')
      entranceDone.current = true
      return undefined
    }
    root.classList.add('hero-armed', 'hero-media-go')
    const reduced = root.classList.contains('hero-reduced') || Boolean(reduceMotion)
    if (reduced) root.classList.add('hero-reduced')
    const scale = window.matchMedia('(max-width: 767px)').matches ? ENTRANCE.mobileScale : 1
    Object.entries(entranceVars(scale)).forEach(([name, value]) => root.style.setProperty(name, String(value)))
    const wait = reduced ? 0 : Math.max(0, loaderLeaveMs - ENTRANCE.overlapMs)
    const runMs = reduced ? ENTRANCE.reducedFadeMs : entranceLength() * scale * 1000
    let finishTimer = 0
    const finish = () => {
      root.classList.remove('hero-pre', 'hero-play', 'hero-armed', 'hero-media-go')
      root.classList.add('hero-done')
      entranceDone.current = true
    }
    const startTimer = window.setTimeout(() => {
      root.classList.remove('hero-pre')
      root.classList.add('hero-play')
      finishTimer = window.setTimeout(finish, runMs + 120)
    }, wait)
    return () => {
      window.clearTimeout(startTimer)
      window.clearTimeout(finishTimer)
      // Leaving early (or a dev re-run): never leave the page half hidden.
      if (!root.classList.contains('hero-done') && root.classList.contains('hero-play')) finish()
    }
  }, [introReady, loaderLeaveMs, reduceMotion])

  // Leaving the homepage before the entrance has played (a quick click while the loader leaves):
  // never leave the header hidden on the next page.
  useEffect(() => () => {
    if (window.location.pathname === '/') return
    const root = document.documentElement
    root.classList.remove('hero-pre', 'hero-play', 'hero-armed', 'hero-media-go')
    root.classList.add('hero-done')
  }, [])

  const setPointerFromEvent = (event) => {
    if (!useMouse || event.pointerType !== 'mouse' || !entranceDone.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    const nx = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2
    const ny = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2
    pointerActive.current = true

    if (HERO_MOUSE_MODE === 'parallax') {
      const center = 1 - Math.min(1, Math.hypot(nx, ny))
      target.current = {
        x: -nx * PARALLAX_X,
        y: -ny * PARALLAX_Y,
        s: OVERSCAN_SCALE + CENTER_SCALE_BOOST * center,
        tx: nx * TEXT_SHIFT,
        ty: ny * TEXT_SHIFT,
        sx: nx * SCRIM_SHIFT,
      }
      if (!rafRef.current && heroInView.current && !tabHidden.current) {
        const tick = () => {
          if (!heroInView.current || tabHidden.current) {
            rafRef.current = 0
            return
          }
          const next = current.current
          const goal = target.current
          next.x += (goal.x - next.x) * SMOOTHING
          next.y += (goal.y - next.y) * SMOOTHING
          next.s += (goal.s - next.s) * SMOOTHING
          next.tx += (goal.tx - next.tx) * SMOOTHING
          next.ty += (goal.ty - next.ty) * SMOOTHING
          next.sx += (goal.sx - next.sx) * SMOOTHING
          applyLayers()
          rafRef.current = window.requestAnimationFrame(tick)
        }
        rafRef.current = window.requestAnimationFrame(tick)
      }
    }

    if (HERO_MOUSE_MODE === 'scrub') {
      const video = videoRef.current
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return
      scrubbing.current = true
      video.pause()
      const goal = Math.min(video.duration - 0.04, Math.max(0, ((nx + 1) / 2) * video.duration))
      video.currentTime += (goal - video.currentTime) * 0.18
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => {
        scrubbing.current = false
        if (heroInView.current && !tabHidden.current) video.play().catch(() => {})
      }, SCRUB_IDLE_MS)
    }
  }

  const resetPointer = () => {
    pointerActive.current = false
    target.current = { x: 0, y: 0, s: OVERSCAN_SCALE, tx: 0, ty: 0, sx: 0 }
  }

  useEffect(() => {
    const section = sectionRef.current
    if (!section || !useMouse) return undefined
    const onMove = (event) => setPointerFromEvent(event)
    const onLeave = () => resetPointer()
    section.addEventListener('pointermove', onMove, { passive: true })
    section.addEventListener('pointerleave', onLeave)
    return () => {
      section.removeEventListener('pointermove', onMove)
      section.removeEventListener('pointerleave', onLeave)
    }
  }, [useMouse, videoLive])

  return (
    <div ref={wrapperRef} className={`hero-scroll${allowVideo ? '' : ' is-static'}`}>
    <section
      ref={sectionRef}
      id="top"
      className={`hero-section section-dark${allowVideo ? '' : ' hero-is-still'}${videoLive ? ' hero-has-video' : ''}`}
      aria-labelledby="hero-heading"
      onPointerMove={setPointerFromEvent}
      onPointerLeave={resetPointer}
      style={{
        '--hero-sweep-seconds': `${HERO.sweepSeconds}s`,
        '--hero-sweep-opacity': HERO.sweepOpacity,
        '--hero-scrim': HERO.scrimStrength,
        '--hero-pos-x': `${(slot.objectPosition?.x ?? 0.5) * 100}%`,
        '--hero-pos-y': `${(slot.objectPosition?.y ?? 0.5) * 100}%`,
      }}
    >
      <div className="hero-media-container">
        <motion.div className="hero-media-pan">
          <div className="hero-media-intro">
            <div className="hero-video-frame">
              {/* The <video> (poster = its own frame 0) is put in here before first paint. */}
              <div
                ref={videoLayerRef}
                className="hero-video-shift"
                style={{ transform: `translate3d(0,0,0) scale(${OVERSCAN_SCALE})` }}
              />
            </div>
          </div>
        </motion.div>

        <span className="hero-light-sweep" aria-hidden="true" />
      </div>
      <div ref={scrimRef} className="hero-scrim" aria-hidden="true" />
      <div className="hero-fine-grain" aria-hidden="true" />

      <motion.div className="hero-content-layer page-width" style={{ y: contentY, opacity: contentOpacity }}>
        <motion.div ref={textLayerRef} className="hero-editorial-column">
          <h1 id="hero-heading" className="hero-display-title" aria-label={HEADLINE}>
            {(() => {
              let wordIndex = -1
              return headlineLines.map((words) => (
                <span className="hero-line-overflow" key={words.join('-')} aria-hidden="true">
                  {words.map((word, wordIdx) => {
                    wordIndex += 1
                    return (
                      <span key={`${word}-${wordIdx}`} className="hero-word" style={{ '--wi': wordIndex }}>
                        {word}
                      </span>
                    )
                  })}
                </span>
              ))
            })()}
          </h1>

          <div className="hero-manifesto-row">
            <p className="hero-manifesto-text hero-enter-rise">
              {PARAGRAPH}
            </p>

          </div>
        </motion.div>
      </motion.div>
    </section>
    </div>
  )
}
