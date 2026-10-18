import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Navigation from './Navigation'
import Footer from './Footer'
import ImageMedia from './ImageMedia'
import { imageManifest, products, pieceBadge, isRealSpec } from '../data/content'
import Price from './Price'
import { EASE } from '../config/siteMotion'

/* One piece page for any product in products.json (slug = product id).
   Only real, filled-in fields are shown: name, category, description, code, dimensions, materials.
   Empty values and the "need client confirmation" placeholder text in the data are never shown.
   A price only when the piece has one in Sanity and "Show price" is on. Image: images.json selectedPieces[slug].full when it exists, else the product's own image. */
const PAGE_INQUIRE_LABEL = 'Inquire about this piece'
const BACK_LABEL = 'Back to Home'
const BACK_HREF = '/#selected-pieces'
const IMAGE_SIZES = '(max-width: 900px) 92vw, 560px'

const clean = (value) => (typeof value === 'string' ? value.trim() : '')

function realDescription(product) {
  const text = clean(product.description)
  if (!text) return ''
  if (/need client confirmation/i.test(text)) return ''
  if (/^product code:/i.test(text)) return '' // a copy of the spec fields below
  return text
}

export function findPiece(slug) {
  return products.find((product) => product.id === slug) || null
}

// Spec rows are shown only for real values (isRealSpec in content.js: not empty, not "-", not a repeat of the name).
const isRealValue = (value, name) => isRealSpec(value, name)

export function pieceFields(product) {
  const name = clean(product.name)
  const specs = [
    ['Code', clean(product.productCode)],
    ['Dimensions', clean(product.dimensions)],
    ['Materials', clean(product.materials)],
  ].filter(([, value]) => isRealValue(value, name))
  return {
    name: clean(product.name),
    category: clean(product.category),
    description: realDescription(product),
    badge: pieceBadge(product),
    price: product.price || 0,
    compareAtPrice: product.compareAtPrice || 0,
    seoTitle: clean(product.seoTitle),
    seoDescription: clean(product.seoDescription),
    specs,
  }
}

function pieceImage(product) {
  const slot = imageManifest.selectedPieces?.[product.id]?.full
  if (slot?.src) return slot
  if (!product.image) return null
  return { src: product.image, alt: product.imageAlt || product.name, aspect: '4/5', status: 'final', focalPoint: { x: 0.5, y: 0.5 } }
}

/* The main picture, plus a row of thumbnails when the piece has a gallery (more than one picture). */
function PieceGallery({ images, name, badge, reduceMotion }) {
  const [index, setIndex] = useState(0)
  const current = images[Math.min(index, images.length - 1)]
  return (
    <>
      <div className={`piece-page-picture${reduceMotion ? '' : ' has-fade'}`}>
        <ImageMedia
          key={current?.src}
          slot={current}
          className="piece-page-image"
          aspectRatio="4 / 5"
          loading="eager"
          fetchPriority="high"
          sizes={IMAGE_SIZES}
          overlay={false}
          showIllustrativeNote={false}
        />
        {badge ? <span className="piece-badge">{badge}</span> : null}
      </div>
      {images.length > 1 ? (
        <ul className="piece-page-thumbs" aria-label={`${name} pictures`}>
          {images.map((image, i) => (
            <li key={image.src}>
              <button
                type="button"
                className={`piece-page-thumb${i === index ? ' is-current' : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Show picture ${i + 1} of ${images.length}`}
                aria-current={i === index ? 'true' : undefined}
              >
                <ImageMedia slot={image} aspectRatio="1 / 1" loading="lazy" sizes="72px" overlay={false} showIllustrativeNote={false} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}

function setMetaDescription(value) {
  let node = document.querySelector('meta[name="description"]')
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute('name', 'description')
    document.head.appendChild(node)
  }
  const previous = node.getAttribute('content')
  node.setAttribute('content', value)
  return () => { if (previous != null) node.setAttribute('content', previous) }
}

export default function PiecePage({ slug, onNavigate, menuOpen, setMenuOpen, onInquire, onGoHome }) {
  const reduceMotion = useReducedMotion()
  const product = findPiece(slug)
  const fields = product ? pieceFields(product) : null

  useEffect(() => {
    const previousTitle = document.title
    window.scrollTo({ top: 0, behavior: 'auto' })
    if (!product) {
      document.title = 'Piece not found — Lucchi Furniture'
      return () => { document.title = previousTitle }
    }
    document.title = fields.seoTitle || `${fields.name} — Lucchi Furniture`
    const parts = [fields.name, fields.category && `${fields.category} piece by Lucchi Furniture.`, fields.description].filter(Boolean)
    const restore = setMetaDescription(fields.seoDescription || parts.join(' '))
    return () => { document.title = previousTitle; restore() }
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const enter = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, ease: EASE } }

  const go = (event, action) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return
    event.preventDefault()
    action()
  }

  const gallery = product && Array.isArray(product.gallery) ? product.gallery.filter((g) => g?.src) : []
  const mainImage = product ? pieceImage(product) : null
  const images = gallery.length > 1 ? gallery : [mainImage]

  return (
    <div className="site-shell piece-page-shell">
      <Navigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} onNavigate={onNavigate} revealed />
      <main className="piece-page">
        {product ? (
          <motion.div className="page-width piece-page-grid" {...enter}>
            <div className="piece-page-media">
              <PieceGallery
                key={product.id}
                images={images}
                name={fields.name}
                badge={fields.badge}
                reduceMotion={reduceMotion}
              />
            </div>

            <div className="piece-page-info">
              <h1 className="piece-page-title">{fields.name}</h1>
              {fields.category ? <p className="piece-page-category">{fields.category}</p> : null}
              <Price className="piece-page-price" price={fields.price} compareAt={fields.compareAtPrice} />
              {fields.description ? <p className="piece-page-description">{fields.description}</p> : null}

              {fields.specs.length ? (
                <section className="piece-page-specs" aria-labelledby="piece-specs-heading">
                  <h2 id="piece-specs-heading" className="piece-page-specs-title">Specifications</h2>
                  <dl className="piece-page-specs-list">
                    {fields.specs.map(([label, value]) => (
                      <div key={label} className="piece-page-spec-row">
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              <a
                className="contact-primary-enquire-btn piece-page-inquire"
                href={`/contact?type=product&product=${encodeURIComponent(product.id)}`}
                onClick={(event) => go(event, () => onInquire?.(product, 'product'))}
              >
                <span>{PAGE_INQUIRE_LABEL}</span>
              </a>
              <a
                className="piece-page-back"
                href={BACK_HREF}
                onClick={(event) => go(event, () => onGoHome?.())}
              >
                {BACK_LABEL}
              </a>
            </div>
          </motion.div>
        ) : (
          <div className="page-width piece-page-missing">
            <h1 className="piece-page-title">Piece not found</h1>
            <p className="piece-page-description">We could not find this piece.</p>
            <a
              className="piece-page-back"
              href={BACK_HREF}
              onClick={(event) => go(event, () => onGoHome?.())}
            >
              {BACK_LABEL}
            </a>
          </div>
        )}
      </main>
      <Footer onNavigate={onNavigate} onEnquire={() => onInquire?.()} />
    </div>
  )
}
