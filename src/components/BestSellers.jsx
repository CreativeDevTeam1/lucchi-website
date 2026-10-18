import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import ImageMedia from './ImageMedia'
import { imageManifest, products, selectedPieceIds, homeCopy, pieceBadge } from '../data/content'
import Price from './Price'
import { EASE as ease, SECTION_REVEAL } from '../config/siteMotion'
import { piecePath } from '../config/catalogue'

const TOTAL_PIECES = 4

// The heading of the section. Change the text here.
const SECTION_TITLE = homeCopy.selectedPiecesTitle || 'Explore Our Selected Pieces'

/* Tune Selected Pieces here. The row moves exactly like the Collections row
   (same speeds, delay, friction and drag threshold as CategoryShowcase.jsx).
   AUTOPLAY = true: the cards glide on their own, pause on hover or focus, and ease back in after a drag. */
const AUTOPLAY = true
/* DRAG_CURSOR = true: a round "DRAG" label follows the mouse over the row
   (desktop mouse only). Set it to false to use the normal cursor instead. */
const DRAG_CURSOR = true
const DRAG_LERP = 0.18
const DRAG_SIZE = 96
const AUTO_SPEED_DESKTOP = 32 // px per second
const AUTO_SPEED_MOBILE = 22
const FRICTION = 0.94
const RESUME_DELAY = 1500
const HOVER_PAUSE = true
const SPEED_EASE_SECONDS = 0.7
const DRAG_CLICK_THRESHOLD = 6

// Card sizes and gap (read by the CSS as variables). Phones: one card plus a peek of the next.
const CARD_W_DESKTOP = '290px' // 1280px and up
const CARD_W_TABLET = '260px' // 768px to 1279px
const CARD_W_MOBILE = 'min(72vw, 280px)' // below 768px
const GAP_DESKTOP = '24px'
const GAP_MOBILE = '16px'
const SECTION_VARS = {
  '--sp-card-desktop': CARD_W_DESKTOP,
  '--sp-card-tablet': CARD_W_TABLET,
  '--sp-card-mobile': CARD_W_MOBILE,
  '--sp-gap-desktop': GAP_DESKTOP,
  '--sp-gap-mobile': GAP_MOBILE,
}
const ARROW_STEP_MS = 720

const PIECE_IMAGE_RATIO = '4 / 5'
// Card image width: up to 290px on desktop, up to 280px on phones. Used by the img and the preload.
const PIECE_IMAGE_SIZES = '(max-width: 767px) 280px, 290px'

// The pieces in this row and their order come from Sanity (featured + Selected Pieces order); see src/data/content.js.
// Each one is read by slug from the same data as its piece page.
const selectedPiecesConfig = selectedPieceIds.map((id) => ({ id, slotKey: id }))

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const wrap = (value, span) => ((value % span) + span) % span

export default function BestSellers({ onOpenPiece }) {
  const reduceMotion = useReducedMotion()

  const items = useMemo(() => selectedPiecesConfig.map((cfg) => {
    const product = products.find((p) => p.id === cfg.id) || {}
    const group = imageManifest.selectedPieces[cfg.slotKey] || {}
    const views = ['full', 'detail', 'context']
      .map((key) => group[key])
      .filter((slot) => slot?.src && slot.status !== 'pending')
      .filter((slot, index, list) => list.findIndex((other) => other.src.split('?')[0] === slot.src.split('?')[0]) === index)
    return {
      id: cfg.id,
      name: product.name || '',
      category: product.category || group.category || 'Accessories',
      productCode: product.productCode || group.productCode || '',
      dimensions: product.dimensions || '',
      materials: product.materials || '',
      badge: pieceBadge(product),
      price: product.price || 0,
      compareAtPrice: product.compareAtPrice || 0,
      views,
      full: views[0],
    }
  }), [])

  // The row has only four pictures: start loading all of them at once so no card is ever blank.
  useEffect(() => {
    const links = items.map((item) => {
      const set = item.full?.srcset
      if (!item.full?.src || !set) return null
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.type = set.avif ? 'image/avif' : 'image/webp'
      link.setAttribute('imagesrcset', set.avif || set.webp)
      link.setAttribute('imagesizes', PIECE_IMAGE_SIZES)
      document.head.appendChild(link)
      return link
    })
    return () => links.forEach((link) => link?.remove())
  }, [items])

  const saveData = typeof navigator !== 'undefined' && navigator.connection?.saveData === true
  return (reduceMotion || saveData)
    ? <StaticPiecesRow items={items} onOpenPiece={onOpenPiece} />
    : <GlidingPiecesCarousel items={items} onOpenPiece={onOpenPiece} />
}

/* ==========================================================================
   Shared section furniture
   ========================================================================== */
function SectionHeader() {
  const reduceMotion = useReducedMotion()
  const reveal = reduceMotion ? { initial: { opacity: 1 } } : SECTION_REVEAL
  // Same heading block as the Collections row (cat-head + cat-title): one line, one style, one colour.
  return (
    <div className="page-width cat-head">
      <motion.div {...reveal}>
        <h2 id="selected-pieces-heading" className="cat-title">{SECTION_TITLE}</h2>
      </motion.div>
    </div>
  )
}

function PieceCard({ item, isClone, onOpenPiece, cardRef }) {
  const inert = isClone ? -1 : undefined
  // One image per card: the Full view. Detail and Context stay in the data only.
  const slot = item.full

  return (
    <article
      ref={cardRef}
      className="selected-piece-card"
      role="group"
      aria-roledescription="slide"
      aria-label={item.name}
      aria-hidden={isClone || undefined}
    >
      <a
        className="selected-piece-link"
        href={piecePath(item.id)}
        aria-label={`View ${item.name}`}
        tabIndex={inert}
        draggable={false}
        onClick={(event) => {
          if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          onOpenPiece?.(item.id)
        }}
      >
      <div className="selected-piece-inner">
        <div className="selected-piece-media-wrap">
          {item.badge ? <span className="piece-badge">{item.badge}</span> : null}
          <div className="sp-parallax-layer">
            <div className="sp-view-stack">
              <ImageMedia
                slot={slot}
                className="selected-piece-image is-full is-on"
                loading="eager"
                decoding="async"
                fetchPriority={isClone ? 'auto' : 'high'}
                sizes={PIECE_IMAGE_SIZES}
                overlay={false}
                showIllustrativeNote={false}
                draggable={false}
              />
            </div>
          </div>
        </div>

        <div className="selected-piece-body">
          <h3 className="piece-title">{item.name}</h3>
          <Price className="piece-price" price={item.price} compareAt={item.compareAtPrice} />
        </div>
      </div>
      </a>
    </article>
  )
}

/* ==========================================================================
   Reduced-motion variant: plain scroll-snap row, no autoplay, no effects
   ========================================================================== */
function StaticPiecesRow({ items, onOpenPiece }) {
  const rowRef = useRef(null)

  const step = (direction) => {
    const el = rowRef.current
    if (!el) return
    const width = el.querySelector('.selected-piece-card')?.offsetWidth || 280
    el.scrollBy({ left: direction * (width + 16), behavior: 'auto' })
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
  }

  return (
    <section id="selected-pieces" className="selected-pieces-section section-light" aria-labelledby="selected-pieces-heading" style={SECTION_VARS}>
      <SectionHeader />

      <div
        ref={rowRef}
        onKeyDown={onKeyDown}
        className="selected-pieces-scroll-row"
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Selected Pieces"
        aria-describedby="sp-carousel-hint"
      >
        <p id="sp-carousel-hint" className="visually-hidden">Use arrow keys to move, space to pause</p>
        <div className="selected-pieces-track page-width">
          {items.map((item, i) => (
            <PieceCard key={item.id} item={item} onOpenPiece={onOpenPiece} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ==========================================================================
   Round "DRAG" label that follows the mouse over the row (desktop mouse only).
   One rAF loop moves it and stops when it reaches the pointer.
   ========================================================================== */
function DragCursor({ targetRef }) {
  const wrapRef = useRef(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!DRAG_CURSOR) return undefined
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setEnabled(fine.matches && !calm.matches)
    sync()
    fine.addEventListener('change', sync)
    calm.addEventListener('change', sync)
    return () => {
      fine.removeEventListener('change', sync)
      calm.removeEventListener('change', sync)
    }
  }, [])

  useEffect(() => {
    const area = targetRef.current
    const label = wrapRef.current
    if (!enabled || !area || !label) return undefined

    area.classList.add('has-drag-cursor')
    const half = DRAG_SIZE / 2
    const pos = { x: 0, y: 0, tx: 0, ty: 0 }
    let raf = 0
    let shown = false

    const paint = () => {
      label.style.transform = `translate3d(${Math.round(pos.x - half)}px, ${Math.round(pos.y - half)}px, 0)`
    }
    const tick = () => {
      raf = 0
      pos.x += (pos.tx - pos.x) * DRAG_LERP
      pos.y += (pos.ty - pos.y) * DRAG_LERP
      if (Math.abs(pos.tx - pos.x) < 0.2 && Math.abs(pos.ty - pos.y) < 0.2) {
        pos.x = pos.tx
        pos.y = pos.ty
      }
      paint()
      if (pos.x !== pos.tx || pos.y !== pos.ty) raf = window.requestAnimationFrame(tick)
    }
    const show = (on) => {
      if (on === shown) return
      shown = on
      label.classList.toggle('is-on', on)
    }
    // The label hides over the button and links so they still look clickable.
    const overControl = (target) => Boolean(target.closest?.('button, input, select, textarea'))

    const onEnter = (e) => {
      if (e.pointerType !== 'mouse') return
      pos.x = e.clientX
      pos.y = e.clientY
      pos.tx = e.clientX
      pos.ty = e.clientY
      paint()
      show(!overControl(e.target))
    }
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return
      pos.tx = e.clientX
      pos.ty = e.clientY
      show(!overControl(e.target))
      if (!raf) raf = window.requestAnimationFrame(tick)
    }
    const onLeave = () => {
      show(false)
      label.classList.remove('is-pressed')
    }
    const onDown = (e) => {
      if (e.pointerType === 'mouse' && e.button === 0) label.classList.add('is-pressed')
    }
    const onUp = () => label.classList.remove('is-pressed')

    area.addEventListener('pointerenter', onEnter)
    area.addEventListener('pointermove', onMove)
    area.addEventListener('pointerleave', onLeave)
    area.addEventListener('pointerdown', onDown)
    area.addEventListener('pointerup', onUp)
    area.addEventListener('pointercancel', onUp)
    return () => {
      window.cancelAnimationFrame(raf)
      area.removeEventListener('pointerenter', onEnter)
      area.removeEventListener('pointermove', onMove)
      area.removeEventListener('pointerleave', onLeave)
      area.removeEventListener('pointerdown', onDown)
      area.removeEventListener('pointerup', onUp)
      area.removeEventListener('pointercancel', onUp)
      area.classList.remove('has-drag-cursor')
    }
  }, [enabled, targetRef])

  if (!DRAG_CURSOR || !enabled) return null
  return createPortal(
    <div ref={wrapRef} className="sp-drag-cursor" aria-hidden="true">
      <span className="sp-drag-cursor-disc">Drag</span>
    </div>,
    document.body,
  )
}

/* ==========================================================================
   Motion variant: seamless infinite glide
   ========================================================================== */
function GlidingPiecesCarousel({ items, onOpenPiece }) {
  const sectionRef = useRef(null)
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const cardRefs = useRef([])

  const [copies, setCopies] = useState(2)
  const [userPaused, setUserPaused] = useState(false)

  // Layout metrics, measured from the DOM so CSS stays the source of truth
  const metrics = useRef({ card: 0, gap: 24, set: 1, viewport: 0 })

  // Motion state, kept out of React so the rAF loop never triggers a re-render
  const offset = useRef(0)
  const speed = useRef(0)
  const momentum = useRef(0)
  const tween = useRef(null)
  const lowPerf = useRef(false)
  const slowFrames = useRef(0)

  // Pause reasons
  const hovering = useRef(false)
  const focused = useRef(false)
  const dragging = useRef(false)
  const onScreen = useRef(true)
  const tabVisible = useRef(true)
  const interactionUntil = useRef(0)
  const pausedRef = useRef(userPaused)
  const restartLoop = useRef(() => {})

  useEffect(() => {
    pausedRef.current = userPaused
    if (!userPaused) restartLoop.current()
  }, [userPaused])

  const measure = useCallback(() => {
    const viewport = viewportRef.current
    const firstCard = cardRefs.current.find(Boolean)
    if (!viewport || !firstCard) return
    const track = trackRef.current
    const gap = Math.round(track ? parseFloat(window.getComputedStyle(track).columnGap) || 24 : 24)
    const viewportWidth = viewport.clientWidth
    // Clear the fixed widths first, so a new CSS card size (resize, rotation) is picked up.
    cardRefs.current.forEach((el) => {
      if (!el) return
      el.style.width = ''
      el.style.flex = ''
    })
    void viewport.offsetWidth
    const rawCard = firstCard.getBoundingClientRect().width
    const card = Math.round(rawCard)
    cardRefs.current.forEach((el) => {
      if (!el) return
      el.style.width = `${card}px`
      el.style.flex = `0 0 ${card}px`
    })
    const set = TOTAL_PIECES * (card + gap)
    metrics.current = { card, gap, set, viewport: viewportWidth }
    setCopies(Math.max(3, Math.ceil(viewportWidth / Math.max(set, 1)) + 2))
  }, [])

  useLayoutEffect(() => {
    measure()
    const viewport = viewportRef.current
    if (!viewport || typeof ResizeObserver === 'undefined') return undefined
    let timer
    const later = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(measure, 120)
    }
    const ro = new ResizeObserver(later)
    ro.observe(viewport)
    window.addEventListener('resize', later)
    window.addEventListener('orientationchange', later)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', later)
      window.removeEventListener('orientationchange', later)
      window.clearTimeout(timer)
    }
  }, [measure, copies])

  const baseSpeed = useCallback(() => {
    if (typeof window === 'undefined') return AUTO_SPEED_DESKTOP
    if (!AUTOPLAY) return 0
    const saveData = navigator.connection?.saveData === true
    const mobile = window.innerWidth < 768
    if (mobile && saveData) return 0
    return mobile ? AUTO_SPEED_MOBILE : AUTO_SPEED_DESKTOP
  }, [])

  const hoverCanPause = useCallback(() => (
    HOVER_PAUSE && typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches
  ), [])

  /* ---------------------------------------------------------------- rAF loop */
  useEffect(() => {
    let frame
    let last = performance.now()
    let running = false

    const applyTrack = (moving) => {
      const track = trackRef.current
      if (!track) return
      const dpr = window.devicePixelRatio || 1
      const x = Math.round(-offset.current * dpr) / dpr
      track.style.transform = `translate3d(${x}px, 0, 0)`
      track.classList.toggle('is-moving', moving)
    }

    const render = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      const { set } = metrics.current

      if (set > 1) {
        if (tween.current) {
          const t = clamp((now - tween.current.start) / tween.current.duration, 0, 1)
          const eased = 1 - Math.pow(1 - t, 3)
          offset.current = tween.current.from + (tween.current.to - tween.current.from) * eased
          speed.current = 0
          momentum.current = 0
          if (t >= 1) {
            tween.current = null
            if (AUTOPLAY) interactionUntil.current = now + RESUME_DELAY
          }
        } else if (dragging.current) {
          speed.current = 0
        } else {
          const blocked = pausedRef.current
            || !onScreen.current
            || !tabVisible.current
            || hovering.current
        || focused.current
            || focused.current
            || now < interactionUntil.current
          const target = blocked ? 0 : baseSpeed()
          const k = 1 - Math.exp(-dt / SPEED_EASE_SECONDS)
          speed.current += (target - speed.current) * k

          if (momentum.current !== 0) {
            offset.current += momentum.current * dt
            momentum.current *= Math.pow(FRICTION, dt * 60)
            if (Math.abs(momentum.current) < 4) momentum.current = 0
          }
          offset.current += speed.current * dt
        }

        offset.current = wrap(offset.current, set)
        if (Math.abs(speed.current) < 0.02 && !tween.current && !dragging.current && !momentum.current) {
          speed.current = 0
        }

        const moving = Boolean(tween.current || dragging.current || Math.abs(speed.current) > 0.3 || Math.abs(momentum.current) > 0.3)
        applyTrack(moving)
      }

      const blocked = pausedRef.current
        || !onScreen.current
        || !tabVisible.current
        || hovering.current
        || now < interactionUntil.current
      const autoplay = !blocked && baseSpeed() > 0
      const moving = Boolean(tween.current || dragging.current || Math.abs(speed.current) > 0.02 || Math.abs(momentum.current) > 0.3)
      const keep = tabVisible.current && onScreen.current && (autoplay || moving)

      if (keep) {
        frame = requestAnimationFrame(render)
      } else {
        running = false
        applyTrack(false)
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
  }, [baseSpeed])

  /* ------------------------------------------------- off-screen / tab pausing */
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen.current = entry.isIntersecting
        if (entry.isIntersecting) restartLoop.current()
      },
      { threshold: 0.08 },
    )
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

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Text inputs keep their native drag-to-select.
    if (e.target.closest('input, select, textarea')) return
    suppressClick.current = false
    drag.current = { id: e.pointerId, startX: e.clientX, lastX: e.clientX, active: false, samples: [[performance.now(), e.clientX]] }
  }

  const onPointerMove = (e) => {
    const d = drag.current
    if (d.id !== e.pointerId) return
    if (!d.active) {
      if (Math.abs(e.clientX - d.startX) < DRAG_CLICK_THRESHOLD) return
      d.active = true
      d.lastX = e.clientX
      dragging.current = true
      tween.current = null
      momentum.current = 0
      // Capture only once it is a real drag, so a plain click still reaches the button.
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* pointer already released */ }
      restartLoop.current()
    }
    const dx = e.clientX - d.lastX
    d.lastX = e.clientX
    offset.current = wrap(offset.current - dx, metrics.current.set)
    d.samples.push([performance.now(), e.clientX])
    if (d.samples.length > 6) d.samples.shift()
  }

  const endDrag = (e) => {
    const d = drag.current
    if (d.id !== e.pointerId) return
    drag.current = { id: null }
    if (!d.active) return
    dragging.current = false
    suppressClick.current = true
    const first = d.samples[0]
    const last = d.samples[d.samples.length - 1]
    const elapsed = last[0] - first[0]
    if (elapsed > 0) momentum.current = clamp((-(last[1] - first[1]) / elapsed) * 1000, -2600, 2600)
    interactionUntil.current = performance.now() + RESUME_DELAY
    restartLoop.current()
  }

  const onClickCapture = (e) => {
    if (!suppressClick.current) return
    e.preventDefault()
    e.stopPropagation()
    suppressClick.current = false
  }

  /* ------------------------------------------------------------- controls */
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

  const togglePaused = () => {
    setUserPaused((prev) => !prev)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepBy(-1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); stepBy(1) }
    if (AUTOPLAY && (e.key === ' ' || e.key === 'Spacebar')) {
      if (e.target.closest('button, a, input, select, textarea')) return
      e.preventDefault()
      togglePaused()
    }
  }

  const rendered = []
  for (let copy = 0; copy < copies; copy += 1) {
    items.forEach((item, i) => {
      const flat = copy * TOTAL_PIECES + i
      rendered.push(
        <PieceCard
          key={`${copy}-${item.id}`}
          item={item}
          isClone={copy > 0}
          onOpenPiece={onOpenPiece}
          cardRef={(el) => { cardRefs.current[flat] = el }}
        />,
      )
    })
  }
  cardRefs.current.length = rendered.length

  return (
    <section
      ref={sectionRef}
      id="selected-pieces"
      className="selected-pieces-section section-light"
      aria-labelledby="selected-pieces-heading"
      style={SECTION_VARS}
    >
      <SectionHeader />

      <motion.div
        className="sp-carousel-shell page-width"
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.8, ease }}
      >
        <div
          ref={viewportRef}
          className="sp-carousel-viewport"
          role="region"
          aria-roledescription="carousel"
          aria-label="Selected Pieces"
          aria-describedby="sp-carousel-hint"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={onClickCapture}
          onDragStart={(e) => e.preventDefault()}
          onFocus={(e) => { focused.current = e.target.matches(':focus-visible') }}
          onBlur={(e) => {
            if (e.currentTarget.contains(e.relatedTarget)) return
            focused.current = false
            restartLoop.current()
          }}
          onMouseEnter={() => { if (hoverCanPause()) hovering.current = true }}
          onMouseLeave={() => {
            hovering.current = false
            restartLoop.current()
          }}
        >
          <p id="sp-carousel-hint" className="visually-hidden" aria-live="polite">
            {!AUTOPLAY
              ? 'Drag or swipe to scroll. Use the left and right arrow keys to move.'
              : userPaused
                ? 'Carousel paused. Press Space to play. Use arrow keys to move.'
                : 'Carousel playing. Drag to scroll. Use arrow keys to move, Space to pause.'}
          </p>
          <div ref={trackRef} className="sp-carousel-track">
            {rendered}
          </div>
        </div>
      </motion.div>
      <DragCursor targetRef={viewportRef} />
    </section>
  )
}
