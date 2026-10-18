/**
 * The one data layer for the site. Components import from here, never from the raw JSON or Sanity.
 *
 * Source order: Sanity snapshot (src/data/sanity-snapshot.json, built by `npm run sync`) wins; the local files
 * (products.json, images.json, about.js, contact.js and the constants in the components) are the fallback.
 * - When the snapshot has pieces, Sanity is the ONLY source of pieces: a piece that is not in Sanity (deleted or
 *   never created) never comes back from products.json, and a piece without a Sanity picture shows a clean
 *   placeholder, never a local picture. An empty field is "not provided", never a leftover local value.
 * - The local files (products.json, images.json) are the fallback only when the snapshot has no pieces at all
 *   (first install, or a sync that never worked): then nothing goes blank.
 * - A price is read only from a Sanity piece's optional `price` (EGP), and exposed only when `showPrice` is not false.
 *   Local files never carry a price.
 */
import localProducts from './products.json'
import localImages from './images.json'
import { snapshot, text, frameFromSanityImage } from './sanity'

const hasList = (value) => Array.isArray(value) && value.length > 0

/* ---------- categories ---------- */
const LOCAL_CATEGORIES = [
  ['Living Room', 'living-room'],
  ['Bedroom', 'bedroom'],
  ['Dining', 'dining'],
  ['Kids Bedroom', 'kids-bedroom'],
  ['Accessories', 'accessories'],
]

const snapshotCategories = (hasList(snapshot.categories) ? snapshot.categories : [])
  .filter((c) => text(c?.name) && text(c?.slug))
  .map((c) => ({ ...c, name: text(c.name), slug: text(c.slug) }))

/** [{ name, slug }] in display order. Sanity's list when it has one, else the local five. */
export const categories = snapshotCategories.length
  ? snapshotCategories.map(({ name, slug }) => ({ name, slug }))
  : LOCAL_CATEGORIES.map(([name, slug]) => ({ name, slug }))

/* ---------- pieces ---------- */
const imageBySlug = (group, slug) => localImages[group]?.[slug]

const snapshotPieces = (hasList(snapshot.pieces) ? snapshot.pieces : [])
  .filter((p) => text(p?.id) && text(p?.name))

/** 'available' (default) | 'unavailable' | 'new'. Anything else counts as available. */
function pieceStatus(value) {
  const v = text(value)
  return v === 'unavailable' || v === 'new' ? v : 'available'
}

/** True when Sanity has pieces: it is then the only source of pieces and of their pictures. */
const SANITY_PIECES = snapshotPieces.length > 0

/** A piece's public price (a number, EGP) or undefined: needs a price above 0 and showPrice not switched off. */
function publicPrice(piece) {
  const n = piece.price
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return undefined
  return piece.showPrice === false ? undefined : n
}

const specWords = (text) => String(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

/** A spec value (dimensions, materials, code) worth showing: not empty, not just "-", and not only a repeat of the
 *  piece's own name (for example Code "Fireplace" on "Electric Decorative Fireplace"). */
export function isRealSpec(value, name = '') {
  const v = typeof value === 'string' ? value.trim() : ''
  if (!v) return false
  const nameWords = new Set(specWords(name))
  const valueWords = specWords(v)
  return valueWords.length > 0 && !valueWords.every((word) => nameWords.has(word))
}

/** "7,000" (thousands separator; up to 2 decimals only when the price has them). */
export function formatAmount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ''
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

/** "7,000 EGP" */
export function formatPrice(value) {
  const amount = formatAmount(value)
  return amount ? `${amount} EGP` : ''
}

/** The struck-through old price: only when the piece shows a price and the old one is higher. */
function publicCompareAt(piece, price) {
  const n = piece.compareAtPrice
  if (price === undefined || typeof n !== 'number' || !Number.isFinite(n)) return undefined
  return n > price ? n : undefined
}

function fromSanity(piece) {
  const slug = text(piece.id)
  const categoryName = text(piece.category?.name) || ''
  const categorySlug = text(piece.category?.slug) || ''
  return {
    id: slug,
    name: text(piece.name),
    category: categoryName,
    categorySlug,
    productCode: text(piece.code) || '',
    dimensions: text(piece.dimensions) || '',
    materials: text(piece.materials) || '',
    description: text(piece.description) || '',
    price: publicPrice(piece),
    compareAtPrice: publicCompareAt(piece, publicPrice(piece)),
    status: pieceStatus(piece.status),
    badge: text(piece.badge) || '',
    seoTitle: text(piece.seoTitle) || '',
    seoDescription: text(piece.seoDescription) || '',
    // Frames of the gallery (filled in below, after the images are built). Empty = the main image only.
    gallery: [],
    // No local picture for a Sanity piece: its picture comes from Sanity (see the images block below).
    image: undefined,
    imageAlt: undefined,
    width: undefined,
    height: undefined,
    _imageStatus: text(piece.imageStatus),
  }
}

function localOnly(p) {
  // Same shape, with no price (local files never carry one).
  const { id, name, category, categorySlug, productCode, dimensions, materials, description, image, imageAlt, width, height } = p
  return { id, name, category, categorySlug, productCode, dimensions, materials, description, image, imageAlt, width, height }
}

const sanityIds = new Set(snapshotPieces.map((p) => text(p.id)))
const merged = SANITY_PIECES ? snapshotPieces.map(fromSanity) : localProducts.map(localOnly)

/** The small label on a picture: "Currently unavailable", the custom badge text, or "New". Empty = no badge. */
export function pieceBadge(piece) {
  if (!piece) return ''
  if (piece.status === 'unavailable') return 'Currently unavailable'
  return text(piece.badge) || (piece.status === 'new' ? 'New' : '')
}

/** All pieces, in site order (Sanity order; the local list only when Sanity has no pieces). */
export const products = merged.map(({ _imageStatus, ...p }) => p)

/* ---------- images (same shape as images.json) ---------- */
const imageManifest = JSON.parse(JSON.stringify(localImages))
imageManifest.selectedPieces ||= {}
imageManifest.archiveItems ||= {}
imageManifest.collections ||= {}
imageManifest.about ||= {}

for (const piece of snapshotPieces) {
  const slug = text(piece.id)
  const status = text(piece.imageStatus)
  // Only the display hints of the old local slot (crop ratio, focal point, alt): never its picture or its
  // reference picture, so a local photo can never stand in for a Sanity piece (not even when a load fails).
  const { src: _s, srcset: _ss, lqip: _l, referenceSrc: _r, previous: _p, original: _o, source: _so, clientFile: _c, ...local } =
    imageBySlug('selectedPieces', slug)?.full || imageBySlug('archiveItems', slug)?.full || {}
  const baseFrame = frameFromSanityImage(piece.image, { ...local, ...(status ? { status } : {}) })
  // Gallery: when it has pictures, the first is the main picture and the second is the hover picture.
  // Pictures without a Sanity asset are skipped. An empty gallery changes nothing (the main image is used).
  const galleryFrames = (hasList(piece.gallery) ? piece.gallery : [])
    .map((image, index) => frameFromSanityImage(image, index === 0
      ? { ...local, ...(status ? { status } : {}) }
      : { aspect: local.aspect, focalPoint: local.focalPoint, alt: text(piece.name), ...(status ? { status } : {}) }))
    .filter(Boolean)
  const frame = galleryFrames[0] || baseFrame
  if (!frame) {
    // A Sanity piece without a picture shows a clean placeholder: never its old local picture.
    delete imageManifest.selectedPieces[slug]
    delete imageManifest.archiveItems[slug]
    continue
  }
  imageManifest.selectedPieces[slug] = { ...(imageManifest.selectedPieces[slug] || {}), productId: slug, full: frame, detail: frame, context: undefined }
  const archive = imageManifest.archiveItems[slug] || {}
  const hover = galleryFrames[1] ? { ...galleryFrames[1], aspect: '4/3' } : undefined
  imageManifest.archiveItems[slug] = { ...archive, productId: slug, full: { ...frame, aspect: '4/3' }, detail: hover }
  if (galleryFrames.length > 1) {
    const product = products.find((p) => p.id === slug)
    if (product) product.gallery = galleryFrames
  }
}

if (SANITY_PIECES) {
  // Pieces that are not in Sanity leave no picture entry behind.
  for (const group of ['selectedPieces', 'archiveItems']) {
    for (const key of Object.keys(imageManifest[group])) if (!sanityIds.has(key)) delete imageManifest[group][key]
  }
}

for (const category of snapshotCategories) {
  const localName = LOCAL_CATEGORIES.find(([, slug]) => slug === category.slug)?.[0]
  const key = localName || category.name
  const local = imageManifest.collections[key] || {}
  const base = local.mobile?.graded || local.mobile || local.primary || {}
  const frame = frameFromSanityImage(category.image, { ...base, aspect: '4/5' })
  if (!frame) continue
  imageManifest.collections[key] = { ...local, primary: frame, mobile: frame }
  if (key !== category.name) imageManifest.collections[category.name] = imageManifest.collections[key]
}

const aboutFrame = frameFromSanityImage(snapshot.about?.image, { ...(localImages.about?.image || {}), aspect: '4/5' })
if (aboutFrame) imageManifest.about = { ...imageManifest.about, image: aboutFrame }

export { imageManifest }

/* ---------- Selected Pieces row ---------- */
const FALLBACK_SELECTED = ['side-table', 'pedestal-table', 'table-lamp', 'electric-decorative-fireplace']
const featured = snapshotPieces
  .filter((p) => p.featured === true)
  .sort((a, b) => (a.featuredOrder ?? 1e6) - (b.featuredOrder ?? 1e6))
  .map((p) => text(p.id))
/** Slugs of the pieces in the homepage Selected Pieces row, in order. */
const knownIds = new Set(products.map((p) => p.id))
export const selectedPieceIds = featured.length ? featured : FALLBACK_SELECTED.filter((id) => knownIds.has(id))

/* ---------- homepage copy (constants in the components are the fallback) ---------- */
const home = snapshot.home || {}
export const homeCopy = {
  heroHeadline: text(home.heroHeadline),
  heroParagraph: text(home.heroParagraph),
  selectedPiecesTitle: text(home.selectedPiecesTitle),
  contactHeadline: text(home.contactHeadline),
  contactCopy: text(home.contactCopy),
  contactButtonLabel: text(home.contactButtonLabel),
}

/* ---------- site settings (default SEO) ---------- */
const site = snapshot.site || {}
const ogFrame = site.ogImage?.asset?.url ? `${site.ogImage.asset.url}?w=1200&fm=jpg&q=80` : undefined
export const siteSettings = {
  seoTitle: text(site.seoTitle),
  seoDescription: text(site.seoDescription),
  ogImage: ogFrame,
}

export const DEFAULT_TITLE = siteSettings.seoTitle || 'Lucchi Furniture — Timeless furniture, thoughtfully made.'
