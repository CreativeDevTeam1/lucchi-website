import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import ImageMedia from './ImageMedia'
import { imageManifest, pieceBadge, isRealSpec } from '../data/content'
import Price from './Price'

const ease = [0.22, 1, 0.36, 1]

function sameSrc(a, b) {
  if (!a?.src || !b?.src) return true
  return a.src.split('?')[0] === b.src.split('?')[0]
}

function useFineHover() {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 768px)')
    const sync = () => setOk(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return ok
}

// Real width of a card image: 1 column on phones, 2 on tablets, 3 on desktop.
const CARD_IMAGE_SIZES = '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw'

export default function ProductRow({ product, index, eager = false, open, onToggle, onShowroomInquiry, reduceMotion }) {
  const [hovered, setHovered] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const shellRef = useRef(null)

  // The picture fades in (opacity only) when it has loaded; the box never moves.
  // Backup: cached images, a missed load event or a failed image still end up visible.
  useEffect(() => {
    const img = shellRef.current?.querySelector('img')
    if (img?.complete) setLoaded(true)
    const timer = window.setTimeout(() => setLoaded(true), 2500)
    return () => window.clearTimeout(timer)
  }, [])
  const canHover = useFineHover()

  const manifestItem = imageManifest.archiveItems[product.id] || {}
  const fullSlot = manifestItem.full || {
    src: product.image,
    alt: product.name,
    status: 'placeholder',
  }
  const detailSlot = manifestItem.detail
  const badge = pieceBadge(product)
  const showHoverImage = canHover && !!detailSlot?.src && !sameSrc(fullSlot, detailSlot)

  return (
    <motion.article
      className={`archive-item-card ${open ? 'is-expanded' : ''} ${hovered ? 'is-hovered' : ''}`}
      data-deferred={eager ? undefined : ''}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Opacity only: the card box is in its final place from the first frame (no layout animation, no slide).
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0.15 : 0.25, delay: reduceMotion ? 0 : Math.min(index, 4) * 0.025, ease }}
    >
      <div className="item-card-media-shell">
        <button
          type="button"
          className="item-media-click-target"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} specifications for ${product.name}`}
        >
          <div ref={shellRef} className={`item-media-aspect-box${loaded ? ' is-loaded' : ''}`} onLoadCapture={() => setLoaded(true)} onErrorCapture={() => setLoaded(true)}>
            <ImageMedia
              slot={fullSlot}
              aspectRatio="4/3"
              className="item-full-image"
              loading={eager ? 'eager' : 'lazy'}
              decoding="async"
              sizes={CARD_IMAGE_SIZES}
            />

            {showHoverImage && (
              <div className="item-hover-detail-overlay" aria-hidden="true">
                <ImageMedia
                  slot={detailSlot}
                  aspectRatio="4/3"
                  className="item-detail-image"
                  overlay={false}
                  sizes={CARD_IMAGE_SIZES}
                />
              </div>
            )}

            <div className="item-media-top-tags">
              <span className="item-category-pill">{product.category}</span>
              <span className="item-code-tag">
                {product.productCode ? `CODE ${product.productCode}` : 'LUCCHI'}
              </span>
            </div>
            {badge ? <span className="piece-badge piece-badge-card">{badge}</span> : null}

          </div>
        </button>
      </div>

      <div className="item-card-text-body">
        <div className="item-headline-row">
          <h3 className="item-name">{product.name}</h3>
        </div>
        <Price className="item-price" price={product.price} compareAt={product.compareAtPrice} />

        {isRealSpec(product.materials, product.name) ? (
          <div className="item-inline-summary">
            <span className="item-summary-label">Key Materials</span>
            <p className="item-summary-value">{product.materials}</p>
          </div>
        ) : null}

        <div className="item-card-actions">
          <button
            type="button"
            className="item-spec-toggle-btn"
            onClick={onToggle}
            aria-expanded={open}
          >
            <span>{open ? 'Close specifications' : 'Specifications'}</span>
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.3, ease }}
              className="toggle-chevron-wrap"
            >
              <ChevronDown size={14} strokeWidth={1.5} />
            </motion.span>
          </button>

          <button
            type="button"
            className="item-inquire-action-btn"
            onClick={() => onShowroomInquiry(product)}
            aria-label={`Enquire about ${product.name}`}
          >
            <span>Inquire</span>
            <ArrowUpRight size={13} strokeWidth={1.4} />
          </button>
        </div>

        {/* Expandable Specifications Drawer */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              className="item-specs-drawer"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.16 : 0.4, ease }}
            >
              <div className="specs-drawer-inner">
                {isRealSpec(product.dimensions, product.name) ? (
                  <div className="spec-item-line">
                    <span className="spec-kicker">Dimensions</span>
                    <p className="spec-text">{product.dimensions}</p>
                  </div>
                ) : null}

                {isRealSpec(product.materials, product.name) ? (
                  <div className="spec-item-line">
                    <span className="spec-kicker">Materials</span>
                    <p className="spec-text">{product.materials}</p>
                  </div>
                ) : null}

                <div className="spec-item-line">
                  <span className="spec-kicker">Commission</span>
                  <p className="spec-text">Custom wood stains, veneers, and fabric swatches available through the Lucchi showroom.</p>
                </div>

                <div className="drawer-inquire-row">
                  <button
                    type="button"
                    className="drawer-primary-inquire-btn"
                    onClick={() => onShowroomInquiry(product)}
                  >
                    <span>Inquire for Showroom Consultation</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  )
}
