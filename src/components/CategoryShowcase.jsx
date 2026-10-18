import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { imageManifest } from '../data/content'
import { CATALOGUE_CATEGORIES, collectionsPath } from '../config/catalogue'

/* Tune the Collections row here. */
const AUTOPLAY = true
const AUTO_SPEED_DESKTOP = 32 // px per second
const AUTO_SPEED_MOBILE = 22
const RESUME_DELAY = 1500 // ms of calm after a drag before the glide eases back in
const FRICTION = 0.94
const SPEED_EASE_SECONDS = 0.7
const ARROW_STEP_MS = 720
const DRAG_CLICK_THRESHOLD = 6
const EDGE_MASK = 5 // % of the row that fades at each edge
/* Card width in px. Computed once (and on debounced resize), never fractional at runtime.
   Capped at sharpMax because the portrait sources are 768px wide once cropped to 4:5. */
const CARD_W = { min: 240, vw: 24, max: 400, tabletVw: 62, mobileVw: 74, sharpMax: 512, heightReserve: 410 }
const GAP = { min: 24, vw: 3, max: 56 }

const N = CATALOGUE_CATEGORIES.length

const slides = CATALOGUE_CATEGORIES.map((name, index) => {
  const slot = (imageManifest.collections[name] || {}).mobile || {}
  const graded = slot.graded || slot
  const focal = slot.focalPoint || { x: 0.5, y: 0.52 }
  return {
    name,
    index: String(index + 1).padStart(2, '0'),
    src: graded.src,
    srcset: graded.srcset || {},
    lqip: graded.lqip,
    alt: slot.alt || `${name} by Lucchi Furniture`,
    pos: `${Math.round(focal.x * 100)}% ${Math.round(focal.y * 100)}%`,
  }
})

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const wrap = (value, span) => ((value % span) + span) % span

function computeLayout() {
  if (typeof window === 'undefined') return { card: 340, gap: 40, vw: 1440 }
  const vw = document.documentElement.clientWidth || window.innerWidth
  const vh = window.innerHeight
  let card
  if (vw >= 1024) {
    card = clamp((vw * CARD_W.vw) / 100, CARD_W.min, CARD_W.max)
    // Keep heading + cards inside about one screen on short laptops.
    card = Math.min(card, Math.max(CARD_W.min, (vh - CARD_W.heightReserve) * 0.8))
  } else if (vw >= 768) {
    card = (vw * CARD_W.tabletVw) / 100
  } else {
    card = (vw * CARD_W.mobileVw) / 100
  }
  card = Math.round(Math.min(card, CARD_W.sharpMax))
  const gap = Math.round(clamp((vw * GAP.vw) / 100, GAP.min, GAP.max))
  return { card, gap, vw }
}

function useLayout() {
  const [layout, setLayout] = useState(computeLayout)
  useEffect(() => {
    let timer
    const onResize = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const next = computeLayout()
        setLayout((prev) => (prev.card === next.card && prev.gap === next.gap && prev.vw === next.vw ? prev : next))
      }, 150)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.clearTimeout(timer)
    }
  }, [])
  return layout
}

function SectionHeading({ headRef }) {
  return (
    <div ref={headRef} className="cat-head page-width">
      <h2 id="collections-heading" className="cat-title">
        <span className="cat-title-line"><span>Explore the</span></span>{' '}
        <span className="cat-title-line"><span>Lucchi Collections</span></span>
      </h2>
      <span className="cat-head-rule" aria-hidden="true" />
    </div>
  )
}

function CollectionCard({ slide, position, clone, card, onSelect, eager }) {
  const href = collectionsPath(slide.name)
  const sizes = `${Math.round(card * 1.5)}px`
  const handleClick = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onSelect?.(slide.name)
  }
  return (
    <article
      className="cat-card"
      role="group"
      aria-roledescription="slide"
      aria-label={`${position + 1} of ${N}`}
      aria-hidden={clone || undefined}
      style={{ '--i': position }}
    >
      <a
        className="cat-card-link"
        href={href}
        onClick={handleClick}
        aria-label={`Explore ${slide.name} collection`}
        tabIndex={clone ? -1 : undefined}
        draggable={false}
      >
      <div className="cat-card-inner">
        <p className="cat-index">{slide.index}</p>
        <div
          className="cat-media"
          style={{
            '--pos': slide.pos,
            backgroundImage: slide.lqip ? `url("${slide.lqip}")` : undefined,
          }}
        >
          <picture>
            {['avif', 'webp'].map((format) => (
              slide.srcset[format] ? (
                <source key={format} type={`image/${format}`} srcSet={slide.srcset[format]} sizes={sizes} />
              ) : null
            ))}
            <img
              src={slide.src}
              srcSet={slide.srcset.jpeg}
              sizes={sizes}
              alt={clone ? '' : slide.alt}
              loading={eager ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
            />
          </picture>
        </div>
        <h3 className="cat-name">{slide.name}</h3>
      </div>
      </a>
    </article>
  )
}

/* Reveal once when the section first comes into view. Runs on the heading and on an
   inner wrapper of each card, never on the moving track. */
function useRevealOnce(sectionRef, enabled) {
  const [revealed, setRevealed] = useState(!enabled)
  useEffect(() => {
    if (!enabled || revealed) return undefined
    const section = sectionRef.current
    if (!section) return undefined
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.12)) {
        setRevealed(true)
        io.disconnect()
      }
    }, { threshold: [0, 0.12, 0.5] })
    io.observe(section)
    return () => io.disconnect()
  }, [enabled, revealed, sectionRef])
  return revealed
}

/* Reduced motion / data saver: a native, scrollable scroll-snap list with the same cards. */
function ScrollRow({ onSelect }) {
  const layout = useLayout()
  return (
    <section
      id="collections"
      className="cat-showcase is-revealed"
      aria-labelledby="collections-heading"
      style={{ '--cat-w': `${layout.card}px`, '--cat-gap': `${layout.gap}px` }}
    >
      <SectionHeading />
      <div className="cat-scroll" role="region" aria-label="Collections" tabIndex={0}>
        {slides.map((slide, i) => (
          <CollectionCard key={slide.name} slide={slide} position={i} card={layout.card} onSelect={onSelect} eager={i < 3} />
        ))}
      </div>
    </section>
  )
}

/* Motion variant: one requestAnimationFrame loop owns the position of the track. */
function LoopRow({ onSelect }) {
  const sectionRef = useRef(null)
  const headRef = useRef(null)
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const layout = useLayout()
  const revealed = useRevealOnce(sectionRef, true)

  const [userPaused, setUserPaused] = useState(false)

  const set = N * (layout.card + layout.gap)
  const copies = Math.ceil(layout.vw / Math.max(set, 1)) + 2

  // Motion state lives in refs so the loop never triggers a React render.
  const metrics = useRef({ card: layout.card, gap: layout.gap, set })
  const offset = useRef(0)
  const speed = useRef(0)
  const momentum = useRef(0)
  const tween = useRef(null)
  const hovering = useRef(false)
  const dragging = useRef(false)
  const focused = useRef(false)
  const onScreen = useRef(false)
  const tabVisible = useRef(true)
  const interactionUntil = useRef(0)
  const pausedRef = useRef(false)
  const restartLoop = useRef(() => {})
  const placed = useRef(false)

  const applyTrack = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const dpr = window.devicePixelRatio || 1
    const x = Math.round(-offset.current * dpr) / dpr
    track.style.transform = `translate3d(${x}px, 0, 0)`
  }, [])

  // Sizes are measured once per layout change, in whole pixels.
  useLayoutEffect(() => {
    metrics.current = { card: layout.card, gap: layout.gap, set }
    if (!placed.current && headRef.current) {
      // Start with the first card lined up with the heading's left edge.
      placed.current = true
      offset.current = wrap(-Math.round(headRef.current.getBoundingClientRect().left), set)
    } else {
      offset.current = wrap(offset.current, set)
    }
    applyTrack()
  }, [layout.card, layout.gap, set, applyTrack])

  const baseSpeed = useCallback(() => {
    if (!AUTOPLAY) return 0
    return window.innerWidth < 768 ? AUTO_SPEED_MOBILE : AUTO_SPEED_DESKTOP
  }, [])

  useEffect(() => {
    pausedRef.current = userPaused
    if (!userPaused) restartLoop.current()
  }, [userPaused])

  /* ---------------------------------------------------------------- rAF loop */
  useEffect(() => {
    let frame = 0
    let last = performance.now()
    let running = false

    const isBlocked = (now) => (
      pausedRef.current
      || !onScreen.current
      || !tabVisible.current
      || hovering.current
      || focused.current
      || now < interactionUntil.current
    )

    const render = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const { set: span } = metrics.current

      if (span > 1) {
        if (tween.current) {
          const t = clamp((now - tween.current.start) / tween.current.duration, 0, 1)
          const eased = 1 - Math.pow(1 - t, 3)
          offset.current = tween.current.from + (tween.current.to - tween.current.from) * eased
          speed.current = 0
          momentum.current = 0
          if (t >= 1) {
            tween.current = null
            interactionUntil.current = now + RESUME_DELAY
          }
        } else if (dragging.current) {
          speed.current = 0
        } else {
          const target = isBlocked(now) || !AUTOPLAY ? 0 : baseSpeed()
          const k = 1 - Math.exp(-dt / SPEED_EASE_SECONDS)
          speed.current += (target - speed.current) * k
          if (momentum.current !== 0) {
            offset.current += momentum.current * dt
            momentum.current *= Math.pow(FRICTION, dt * 60)
            if (Math.abs(momentum.current) < 4) momentum.current = 0
          }
          offset.current += speed.current * dt
        }
        offset.current = wrap(offset.current, span)
        if (Math.abs(speed.current) < 0.02 && !tween.current && !dragging.current && !momentum.current) {
          speed.current = 0
        }
        applyTrack()
      }

      const gliding = AUTOPLAY && !isBlocked(now)
      const moving = Boolean(tween.current || dragging.current || Math.abs(speed.current) > 0.02 || Math.abs(momentum.current) > 0.3)
      if (tabVisible.current && onScreen.current && (gliding || moving)) {
        frame = requestAnimationFrame(render)
      } else {
        running = false
      }
    }

    const start = () => {
      if (running) return
      running = true
      last = performance.now()
      frame = requestAnimationFrame(render)
    }

    restartLoop.current = start
    start()
    return () => {
      cancelAnimationFrame(frame)
      restartLoop.current = () => {}
    }
  }, [baseSpeed, applyTrack])

  /* ------------------------------------------------- off-screen / tab pausing */
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined
    const io = new IntersectionObserver(([entry]) => {
      onScreen.current = entry.isIntersecting
      if (entry.isIntersecting) restartLoop.current()
    }, { threshold: 0.08 })
    io.observe(section)
    const onVisibility = () => {
      tabVisible.current = !document.hidden
      if (!document.hidden) restartLoop.current()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  /* ------------------------------------------------------- drag + momentum */
  const drag = useRef({ id: null })
  const suppressClick = useRef(false)

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    suppressClick.current = false
    drag.current = {
      id: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      active: false,
      samples: [[performance.now(), event.clientX]],
    }
  }

  const onPointerMove = (event) => {
    const d = drag.current
    if (d.id !== event.pointerId) return
    if (!d.active) {
      if (Math.abs(event.clientX - d.startX) < DRAG_CLICK_THRESHOLD) return
      d.active = true
      d.lastX = event.clientX
      dragging.current = true
      event.currentTarget.classList.add('is-dragging') // no hover zoom while dragging
      tween.current = null
      momentum.current = 0
      // Capture only once it is a real drag, so a plain click still reaches the link.
      try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* pointer already released */ }
      restartLoop.current()
    }
    const dx = event.clientX - d.lastX
    d.lastX = event.clientX
    offset.current = wrap(offset.current - dx, metrics.current.set)
    d.samples.push([performance.now(), event.clientX])
    if (d.samples.length > 6) d.samples.shift()
  }

  const endDrag = (event) => {
    const d = drag.current
    if (d.id !== event.pointerId) return
    drag.current = { id: null }
    event.currentTarget.classList.remove('is-dragging')
    if (!d.active) return
    dragging.current = false
    suppressClick.current = true
    const first = d.samples[0]
    const lastSample = d.samples[d.samples.length - 1]
    const elapsed = lastSample[0] - first[0]
    if (elapsed > 0) momentum.current = clamp((-(lastSample[1] - first[1]) / elapsed) * 1000, -2600, 2600)
    interactionUntil.current = performance.now() + RESUME_DELAY
    restartLoop.current()
  }

  const onClickCapture = (event) => {
    if (!suppressClick.current) return
    event.preventDefault()
    event.stopPropagation()
    suppressClick.current = false
  }

  /* ------------------------------------------------------- keys + pausing */
  const stepBy = (direction) => {
    const { card, gap } = metrics.current
    if (!card) return
    tween.current = {
      from: offset.current,
      to: offset.current + direction * (card + gap),
      start: performance.now(),
      duration: ARROW_STEP_MS,
    }
    restartLoop.current()
  }

  const onKeyDown = (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); stepBy(-1) }
    if (event.key === 'ArrowRight') { event.preventDefault(); stepBy(1) }
    if (event.key === ' ' || event.key === 'Spacebar') {
      if (event.target.closest('a, button, input, select, textarea')) return
      event.preventDefault()
      setUserPaused((prev) => !prev)
    }
  }

  const onFocus = (event) => {
    focused.current = event.target.matches(':focus-visible')
  }
  const onBlur = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return
    focused.current = false
    restartLoop.current()
  }
  const onMouseEnter = () => {
    if (window.matchMedia('(hover: hover)').matches) hovering.current = true
  }
  const onMouseLeave = () => {
    hovering.current = false
    restartLoop.current()
  }

  const cards = []
  for (let copy = 0; copy < copies; copy += 1) {
    slides.forEach((slide, i) => {
      cards.push(
        <CollectionCard
          key={`${copy}-${slide.name}`}
          slide={slide}
          position={i}
          clone={copy > 0}
          card={layout.card}
          onSelect={onSelect}
          eager={copy === 0 && i < 3}
        />,
      )
    })
  }

  return (
    <section
      ref={sectionRef}
      id="collections"
      className={`cat-showcase${revealed ? ' is-revealed' : ''}`}
      aria-labelledby="collections-heading"
      style={{
        '--cat-w': `${layout.card}px`,
        '--cat-gap': `${layout.gap}px`,
        '--cat-mask': `${EDGE_MASK}%`,
      }}
    >
      <SectionHeading headRef={headRef} />
      <div
        ref={viewportRef}
        className="cat-row"
        role="region"
        aria-roledescription="carousel"
        aria-label="Collections"
        aria-describedby="cat-row-hint"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        onDragStart={(event) => event.preventDefault()}
        onFocus={onFocus}
        onBlur={onBlur}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <p id="cat-row-hint" className="visually-hidden" aria-live="polite">
          {userPaused
            ? 'Collections paused. Press Space to play. Use the left and right arrow keys to move.'
            : 'Drag to scroll. Use the left and right arrow keys to move, Space to pause.'}
        </p>
        <div ref={trackRef} className="cat-track">
          {cards}
        </div>
      </div>
    </section>
  )
}

export default function CategoryShowcase({ onSelect }) {
  const reduceMotion = useReducedMotion()
  const saveData = typeof navigator !== 'undefined' && navigator.connection?.saveData === true
  return (reduceMotion || saveData) ? <ScrollRow onSelect={onSelect} /> : <LoopRow onSelect={onSelect} />
}
