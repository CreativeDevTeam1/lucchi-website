import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import ImageMedia from './ImageMedia'
import { imageManifest, pieceBadge, isRealSpec } from '../data/content'
import { piecePath } from '../config/catalogue'
import Price from './Price'
import WhatsAppButton from './WhatsAppButton'

const ease = [0.22, 1, 0.36, 1]

// Real width of a card image: 1 column on phones, 2 on tablets, 3 on desktop.
const CARD_IMAGE_SIZES = '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw'

export default function ProductRow({ product, index, eager = false, onOpenPiece, reduceMotion }) {
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

  const manifestItem = imageManifest.archiveItems[product.id] || {}
  const fullSlot = manifestItem.full || {
    src: product.image,
    alt: product.name,
    status: 'placeholder',
  }
  const badge = pieceBadge(product)
  const href = piecePath(product.id)
  // A plain click opens the piece page without a reload; new tab / modifier clicks keep working as normal links.
  const openPiece = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onOpenPiece?.(product.id)
  }

  return (
    <motion.article
      className="archive-item-card"
      data-deferred={eager ? undefined : ''}
      // Opacity only: the card box is in its final place from the first frame (no layout animation, no slide).
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0.15 : 0.25, delay: reduceMotion ? 0 : Math.min(index, 4) * 0.025, ease }}
    >
      <div className="item-card-media-shell">
        <a
          className="item-media-click-target"
          href={href}
          onClick={openPiece}
          aria-label={`View ${product.name}`}
          draggable={false}
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

            <div className="item-media-top-tags">
              <span className="item-category-pill">{product.category}</span>
              <span className="item-code-tag">
                {product.productCode ? `CODE ${product.productCode}` : 'LUCCHI'}
              </span>
            </div>
            {badge ? <span className="piece-badge piece-badge-card">{badge}</span> : null}

          </div>
        </a>
      </div>

      <div className="item-card-text-body">
        <div className="item-headline-row">
          <h3 className="item-name">
            <a className="item-name-link" href={href} onClick={openPiece}>{product.name}</a>
          </h3>
        </div>
        <Price className="item-price" price={product.price} compareAt={product.compareAtPrice} />

        {isRealSpec(product.materials, product.name) ? (
          <div className="item-inline-summary">
            <span className="item-summary-label">Key Materials</span>
            <p className="item-summary-value">{product.materials}</p>
          </div>
        ) : null}

        <div className="item-card-actions">
          <a className="item-view-link" href={href} onClick={openPiece}>
            <span>View piece</span>
          </a>

          <WhatsAppButton product={product} className="item-inquire-action-btn" label="WhatsApp" iconSize={14} />
        </div>
      </div>
    </motion.article>
  )
}
