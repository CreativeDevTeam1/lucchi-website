/**
 * Build-time sync: fetch the content from Sanity and write ONE snapshot file, src/data/sanity-snapshot.json.
 * The site reads only that file (through src/data/content.js). It never calls Sanity from the browser.
 *
 *   npm run sync           (also runs automatically before `npm run build`, as `prebuild`)
 *
 * SAFE: if Sanity cannot be reached, the token is missing, or the data is invalid, this script prints a
 * warning, keeps the last committed snapshot and still exits 0, so the build never fails because of it.
 *
 * Access: pieces and categories have a "." in their document id (piece.<slug>, category.<slug>), which Sanity
 * treats as private even in a public dataset. So a READ-ONLY token is needed:
 *   SANITY_READ_TOKEN   (git-ignored .env.local on this computer, and a Vercel environment variable)
 * The token is used only here, at build time. It is never written to the snapshot or the bundle.
 *
 * Price is never selected, never stored. The result is checked and refused if a "price" key shows up.
 * Optional env: SANITY_PROJECT_ID, SANITY_DATASET (defaults below), used to test the fallback.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'src', 'data', 'sanity-snapshot.json')

function readEnvFile(name) {
  const file = path.join(ROOT, '.env.local')
  if (!fs.existsSync(file)) return ''
  const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${name}=`))
  return line ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '') : ''
}
const env = (name) => process.env[name] || readEnvFile(name)

const PROJECT_ID = env('SANITY_PROJECT_ID') || 'szy0z3lw'
const DATASET = env('SANITY_DATASET') || 'production'
const API_VERSION = '2025-02-19'
const TOKEN = env('SANITY_READ_TOKEN')

const warn = (msg) => console.warn(`\n[sync-sanity] WARNING: ${msg}\n[sync-sanity] Keeping the last snapshot (src/data/sanity-snapshot.json). The build continues.\n`)

const IMAGE = (field) => `${field}{ alt, hotspot{x,y}, crop{top,bottom,left,right}, "asset": asset->{ url, "w": metadata.dimensions.width, "h": metadata.dimensions.height, "lqip": metadata.lqip } }`
const ITEM = (field) => `${field}{ value, confirmed }`

const QUERY = `{
  "pieces": *[_type == "piece"] | order(order asc, name asc){
    "id": slug.current, name, "slug": slug.current, code, dimensions, materials, description,
    "category": category->{ name, "slug": slug.current },
    order, featured, featuredOrder, imageStatus, status, badge, seoTitle, seoDescription, price, compareAtPrice, showPrice,
    ${IMAGE('"image": mainImage')},
    ${IMAGE('"gallery": gallery[]')}
  },
  "categories": *[_type == "category"] | order(order asc, name asc){
    name, "slug": slug.current, order,
    ${IMAGE('"image": coverImage')}
  },
  "home": *[_id == "homePage"][0]{ heroHeadline, heroParagraph, selectedPiecesTitle, contactHeadline, contactCopy, contactButtonLabel },
  "about": *[_id == "aboutPage"][0]{
    title, documentTitle, metaDescription, intro,
    "sections": sections[]{ heading, body },
    visitHeading, visitBody, visitButtonLabel,
    ${IMAGE('"image": image')}
  },
  "contact": *[_id == "contactSettings"][0]{
    ${['phone', 'whatsapp', 'email', 'address', 'mapsUrl', 'hours', 'instagram', 'facebook', 'threads', 'tiktok', 'linkedin', 'pinterest', 'youtube', 'website'].map(ITEM).join(', ')},
    "branches": branches[]{ name, address, mapsUrl, confirmed }
  },
  "site": *[_id == "siteSettings"][0]{ seoTitle, seoDescription, ${IMAGE('"ogImage": ogImage')} }
}`

function hasKey(value, name) {
  if (Array.isArray(value)) return value.some((v) => hasKey(v, name))
  if (value && typeof value === 'object') return Object.entries(value).some(([k, v]) => k.toLowerCase() === name || hasKey(v, name))
  return false
}

/** Returns a list of problems; empty list = valid. */
function validate(data) {
  const problems = []
  if (!data || typeof data !== 'object') return ['no data returned']
  if (!Array.isArray(data.pieces) || data.pieces.length === 0) problems.push('no pieces returned (is the token a read token for this project?)')
  else if (!data.pieces.every((p) => p && p.id && p.name)) problems.push('a piece has no name or slug')
  if (!Array.isArray(data.categories) || data.categories.length === 0) problems.push('no categories returned')
  else if (!data.categories.every((c) => c && c.slug && c.name)) problems.push('a category has no name or slug')
  // The only place a price may appear is a piece's own optional `price` (a number, in EGP). Nowhere else.
  const { pieces, ...others } = data
  if (hasKey(others, 'price') || hasKey(others, 'compareatprice')) problems.push('a "price" field was found outside the pieces (never allowed)')
  const okNumber = (n) => n == null || (typeof n === 'number' && Number.isFinite(n) && n >= 0)
  if (Array.isArray(pieces) && !pieces.every((p) => okNumber(p.price) && okNumber(p.compareAtPrice))) {
    problems.push('a piece has an invalid price or price before discount (it must be a number, 0 or more)')
  }
  return problems
}

async function main() {
  if (!TOKEN) {
    return warn('SANITY_READ_TOKEN is not set (env or .env.local). Pieces and categories are private (their ids contain a ".").')
  }
  const host = `https://${PROJECT_ID}.api.sanity.io`
  const url = `${host}/v${API_VERSION}/data/query/${DATASET}?perspective=published&query=${encodeURIComponent(QUERY)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  let res
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` }, signal: controller.signal })
  } catch (error) {
    return warn(`Sanity could not be reached (${error.name === 'AbortError' ? 'timeout' : error.cause?.code || error.message}).`)
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    let reason = ''
    try { reason = (await res.json()).message || '' } catch { /* ignore */ }
    return warn(`Sanity answered ${res.status}${reason ? ` (${reason})` : ''}. Check SANITY_READ_TOKEN, project id and dataset.`)
  }
  const { result } = await res.json()
  const problems = validate(result)
  if (problems.length) return warn(`The data from Sanity is not valid: ${problems.join('; ')}.`)

  const snapshot = { project: PROJECT_ID, dataset: DATASET, syncedAt: new Date().toISOString(), ...result }
  const text = `${JSON.stringify(snapshot, null, 1)}\n`
  const tmp = `${OUT}.tmp`
  fs.writeFileSync(tmp, text)
  fs.renameSync(tmp, OUT)
  console.log(
    `[sync-sanity] OK: ${result.pieces.length} pieces, ${result.categories.length} categories, ` +
      `${result.about ? 'about' : 'no about'}, ${result.contact ? 'contact' : 'no contact'}, ` +
      `${result.home ? 'home' : 'no home'}, ${result.site ? 'site' : 'no site'} -> src/data/sanity-snapshot.json (${(text.length / 1024).toFixed(0)} KB)`,
  )
}

main().catch((error) => warn(`Unexpected error: ${error.message}`))
