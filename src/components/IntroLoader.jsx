import { useEffect, useRef, useState } from 'react'
import { hideBootOverlay } from '../config/siteMotion'
import imageManifest from '../data/images.json'
import { HERO_MOBILE_QUERY, HERO_VIDEO, HERO_VIDEO_MAX_WAIT_MS, getHeroMediaKey, heroVideoReady } from '../config/heroMedia'

const ENABLED = true
const STRIP_COUNT = 6
const DURATION_CAP = HERO_VIDEO_MAX_WAIT_MS // longest the loader waits for the hero video, in total
const REVEAL_START = 200
const REVEAL_END = 1600
const HOLD_END = 2600
const EXIT_END = 3400
const STAGGER_MS = 75
const SKIP_SHOW_MS = 600
const MINIMAL_MS = 800
const DESKTOP_DIR = 'vertical'
const MOBILE_DIR = 'horizontal'
const WIPE_EASE = 'cubic-bezier(0.76, 0, 0.24, 1)'
const TEXT_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
/* The strips show the hero video's own first frame, so the page opens on the same picture. */
const PHONE = typeof window !== 'undefined' && window.matchMedia(HERO_MOBILE_QUERY).matches
const IMAGE_SRC = PHONE ? HERO_VIDEO.posterMobile : HERO_VIDEO.posterDesktop
/* The strips draw the hero poster with the same object-fit: cover crop and focal point as the
   hero itself (see .intro-loader-strip in styles.css), so the wipe reveals the same picture. */
const FOCAL = (typeof window !== 'undefined' && imageManifest.hero[getHeroMediaKey()]?.objectPosition) || { x: 0.5, y: 0.5 }
const IMAGE_AR = PHONE ? HERO_VIDEO.aspectMobile : HERO_VIDEO.aspectDesktop
/* Phones and portrait tablets show the photo in the top 56% of the hero (copy sits below it). */
const PHOTO_ONLY_TOP = typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px) and (orientation: portrait)').matches

function prefersMinimal() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || navigator.connection?.saveData === true
}

function waitForImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve()
      return
    }
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
    if (typeof img.decode === 'function') {
      img.decode().then(resolve).catch(() => resolve())
    }
  })
}

export default function IntroLoader({ onComplete, onExitStart }) {
  const [phase, setPhase] = useState('boot')
  const [percent, setPercent] = useState(0)
  const [showSkip, setShowSkip] = useState(false)
  const [minimal] = useState(() => prefersMinimal())
  const [mobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false))
  const finishRef = useRef(false)
  const exitStarted = useRef(false)
  const startedAt = useRef(0)

  const direction = mobile ? MOBILE_DIR : DESKTOP_DIR

  const leave = (skipped) => {
    if (finishRef.current) return
    finishRef.current = true
    document.documentElement.classList.remove('is-intro')
    document.documentElement.classList.add('intro-done')
    document.body.style.overflow = ''
    window.scrollTo(0, 0)
    const start = document.getElementById('top') || document.querySelector('main') || document.body
    if (start && start !== document.body) start.setAttribute('tabindex', '-1')
    start?.focus?.({ preventScroll: true })
    onComplete?.()
  }

  const beginExit = (skipped = false) => {
    if (exitStarted.current) return
    exitStarted.current = true
    setPhase('exit')
    document.documentElement.classList.add('intro-ready')
    // Tell the page how long the loader still needs to leave, so the hero can overlap it.
    const leaveMs = skipped || minimal ? 280 : EXIT_END - HOLD_END
    onExitStart?.(leaveMs)
    window.setTimeout(() => leave(skipped), leaveMs)
  }

  useEffect(() => {
    if (!ENABLED) {
      hideBootOverlay()
      onExitStart?.(0)
      leave(true)
      return undefined
    }

    hideBootOverlay()
    document.documentElement.classList.add('is-intro')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    startedAt.current = performance.now()

    let readyAt = 0
    let frame = 0
    const skipTimer = window.setTimeout(() => setShowSkip(true), SKIP_SHOW_MS)

    // Leave only when the poster is decoded and the hero video can play (or after DURATION_CAP).
    const ready = Promise.race([
      Promise.all([waitForImage(IMAGE_SRC), heroVideoReady(DURATION_CAP)]),
      new Promise((resolve) => window.setTimeout(resolve, DURATION_CAP)),
    ]).then(() => {
      readyAt = performance.now()
    })

    const tick = (now) => {
      if (finishRef.current) return
      const elapsed = Math.max(0, now - startedAt.current)

      if (minimal) {
        setPercent(Math.min(100, Math.round((elapsed / MINIMAL_MS) * 100)))
        if (elapsed < 180) setPhase('boot')
        else if (elapsed < MINIMAL_MS - 280) setPhase('hold')
        else if (!exitStarted.current) beginExit(false)
        if (elapsed >= MINIMAL_MS) {
          leave(false)
          return
        }
        frame = window.requestAnimationFrame(tick)
        return
      }

      const revealSpan = Math.max(1, REVEAL_END - REVEAL_START)
      let shown = 0
      if (elapsed <= REVEAL_START) shown = 0
      else if (elapsed < REVEAL_END) {
        const t = (elapsed - REVEAL_START) / revealSpan
        const eased = 1 - (1 - t) * (1 - t)
        shown = Math.min(99, Math.round(eased * 100))
      } else {
        shown = 100
      }
      setPercent(shown)

      if (!exitStarted.current) {
        if (elapsed < REVEAL_START) setPhase('boot')
        else if (elapsed < REVEAL_END) setPhase('reveal')
        else setPhase('hold')
      }

      const canExit = elapsed >= HOLD_END && (readyAt || elapsed >= DURATION_CAP - (EXIT_END - HOLD_END))
      if ((canExit || elapsed >= DURATION_CAP) && !exitStarted.current) {
        beginExit(false)
        return
      }
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    void ready

    const onKey = (event) => {
      if (event.key === 'Escape') beginExit(true)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(skipTimer)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      document.documentElement.classList.remove('is-intro')
    }
  }, [])

  if (!ENABLED) return null

  return (
    <div
      className={`intro-loader is-${phase}${minimal ? ' is-minimal' : ''}${percent >= 60 ? ' is-word' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Loading"
      aria-hidden={phase === 'exit' || undefined}
      style={{ '--wipe-ease': WIPE_EASE, '--text-ease': TEXT_EASE }}
    >
      <p className="visually-hidden" aria-live="polite">Loading</p>

      {!minimal ? (
        <div className={`intro-loader-strips is-${direction}${PHOTO_ONLY_TOP ? ' has-box' : ''}`}
          style={{ '--img-ar': IMAGE_AR, '--fx': FOCAL.x, '--fy': FOCAL.y, '--box-h': PHOTO_ONLY_TOP ? '56svh' : '100svh' }}
          aria-hidden="true"
        >
          {Array.from({ length: STRIP_COUNT }, (_, index) => (
            <div
              key={index}
              className="intro-loader-strip"
              style={{
                '--i': index,
                '--n': STRIP_COUNT,
                '--img': `url("${IMAGE_SRC}")`,
                transitionDelay: `${index * STAGGER_MS}ms`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="intro-loader-scrim" aria-hidden="true" />

      <p className="intro-loader-word" aria-hidden="true">Lucchi</p>

      <div className="intro-loader-meter" aria-hidden="true">
        <span className="intro-loader-count">
          {String(percent).padStart(percent >= 100 ? 3 : 2, '0')}
          <span>%</span>
        </span>
        <span className="intro-loader-bar">
          <i style={{ transform: `scaleX(${percent / 100})` }} />
        </span>
      </div>

      {showSkip ? (
        <button type="button" className="intro-loader-skip" onClick={() => beginExit(true)}>
          Skip
        </button>
      ) : null}
    </div>
  )
}

export { ENABLED as LOADER_ENABLED, STRIP_COUNT, DURATION_CAP, IMAGE_SRC }
