import { categories } from '../data/content'

export const MENU_CATALOGUE_LABEL = 'Collections'

// Category names, slugs and order come from Sanity (through the snapshot); the local five are the fallback.
export const CATALOGUE_CATEGORIES = categories.map((category) => category.name)

const SLUG_BY_NAME = Object.fromEntries(categories.map(({ name, slug }) => [name, slug]))

const NAME_BY_SLUG = Object.fromEntries(categories.map(({ name, slug }) => [slug, name]))

export function categorySlug(name) {
  return SLUG_BY_NAME[name] || ''
}

export function parseCategoryParam(value) {
  if (!value) return 'All'
  const raw = String(value).trim()
  if (!raw || raw.toLowerCase() === 'all') return 'All'
  if (CATALOGUE_CATEGORIES.includes(raw)) return raw
  const fromSlug = NAME_BY_SLUG[raw.toLowerCase()]
  if (fromSlug) return fromSlug
  const folded = raw.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
  const match = CATALOGUE_CATEGORIES.find((name) => name.toLowerCase() === folded.toLowerCase())
  return match || 'All'
}

export function collectionsPath(category = 'All') {
  if (!category || category === 'All') return '/collections'
  const slug = categorySlug(category)
  return slug ? `/collections?category=${slug}` : '/collections'
}

export function archiveSearchToCollections(search = '') {
  const category = parseCategoryParam(new URLSearchParams(search).get('category'))
  return collectionsPath(category)
}

export function isArchivePath(pathname) {
  return pathname === '/archive' || pathname.startsWith('/archive/')
}

export function isCollectionsPath(pathname) {
  return pathname === '/collections' || pathname.startsWith('/collections/')
}

export function isContactPath(pathname) {
  return pathname === '/contact' || pathname.startsWith('/contact/')
}

export function isAboutPath(pathname) {
  return pathname === '/about' || pathname.startsWith('/about/')
}

export function isPiecePath(pathname) {
  return pathname.startsWith('/pieces/') && pathname.length > '/pieces/'.length
}

export function piecePath(slug) {
  return `/pieces/${slug}`
}

export function pieceSlugFromPath(pathname) {
  return decodeURIComponent(pathname.replace(/^\/pieces\//, '').split('/')[0] || '')
}
