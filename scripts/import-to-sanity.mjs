/**
 * Import the site's catalogue and page copy into Sanity (project szy0z3lw, dataset production).
 * Run from the project root:
 *   node scripts/import-to-sanity.mjs            -> DRY RUN (writes nothing, prints a summary)
 *   node scripts/import-to-sanity.mjs --write    -> real import
 *
 * - Token: SANITY_WRITE_TOKEN, read from the git-ignored .env.local (never printed).
 * - Safe to re-run: documents are created only if they do not exist yet, so edits made in
 *   the Studio are never overwritten. Missing images are added to existing documents.
 * - Never imports `price`. Missing or doubtful values are left empty, not invented.
 * - @sanity/client is taken from the sibling Studio folder, so the site package.json stays untouched.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STUDIO = path.resolve(ROOT, '..', 'studio-lucchi')
const PUBLIC = path.join(ROOT, 'public')
const WRITE = process.argv.includes('--write')

const PROJECT_ID = 'szy0z3lw'
const DATASET = 'production'

// Order of the 4 pieces in the homepage Selected Pieces row (same as src/components/BestSellers.jsx).
const SELECTED = ['side-table', 'pedestal-table', 'table-lamp', 'electric-decorative-fireplace']

const CATEGORIES = [
  ['Living Room', 'living-room'],
  ['Bedroom', 'bedroom'],
  ['Dining', 'dining'],
  ['Kids Bedroom', 'kids-bedroom'],
  ['Accessories', 'accessories'],
]

// Copy that lives in components / index.html today (Hero.jsx, BestSellers.jsx, ContactSection.jsx, index.html).
const HOME = {
  heroHeadline: 'Timeless furniture, thoughtfully made.',
  heroParagraph:
    'A private furniture destination for considered interiors. Solid Romanian red beech structures, bookmatched natural veneers, and curated pieces available by enquiry.',
  selectedPiecesTitle: 'Explore Our Selected Pieces',
  contactHeadline: 'Experience Lucchi in person.',
  contactCopy:
    'Lucchi Furniture is made in Cairo from solid Romanian red beech and natural veneers. Visit the showroom to see the pieces up close, or learn more about how we work.',
  contactButtonLabel: 'About Lucchi',
}
const SITE = {
  seoTitle: 'Lucchi Furniture — Timeless furniture, thoughtfully made.',
  seoDescription:
    'Lucchi Furniture — timeless furniture, thoughtfully made. Explore the Lucchi catalogue across living, bedroom, dining, kids bedroom, and accessories.',
  ogImageFile: '/images/products/turkish-set.webp',
}

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const products = readJson('src/data/products.json')
const images = readJson('src/data/images.json')
const { about } = await import(pathToFileURL(path.join(ROOT, 'src/data/about.js')).href)
// contact.js imports React; load it without React by stripping the import and the hook code.
const contactSrc = fs.readFileSync(path.join(ROOT, 'src/data/contact.js'), 'utf8')
const contactBody = contactSrc
  .replace(/^import .*$/m, '')
  .split('export function isPreviewContact')[0]
  .replace(/export const/g, 'const')
const contact = new Function(`${contactBody}; return contact`)()

// ---------- helpers ----------
const exists = (rel) => rel && fs.existsSync(path.join(PUBLIC, rel))

/** Best non-2560 webp (else jpg) file for an image record: biggest srcset webp up to 1920, else src. */
function bestFile(frame) {
  if (!frame) return null
  const pick = (list) => {
    if (!list) return null
    return list
      .split(',')
      .map((s) => s.trim().split(/\s+/))
      .map(([src, w]) => ({ src, w: parseInt(w, 10) }))
      .filter((c) => c.w && c.w < 2560 && c.w <= 1920 && exists(c.src))
      .sort((a, b) => b.w - a.w)[0]?.src
  }
  const candidates = [
    pick(frame.srcset?.webp),
    pick(frame.srcset?.jpeg),
    frame.src && !/2560/.test(frame.src) && exists(frame.src) ? frame.src : null,
  ]
  return candidates.find(Boolean) || null
}

const validCode = (c) => (/^[A-Z]\d{3,5}$/i.test((c || '').trim()) ? c.trim() : '')
const cleanDescription = (d) => {
  const t = (d || '').trim()
  if (!t) return ''
  // Old descriptions are only the code/dimensions/materials glued together, or placeholder text.
  if (/^(Product code:|Dimensions:|Materials:)/i.test(t) || /Name, code/i.test(t)) return ''
  return t
}
const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const strip = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
const key = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40)

// ---------- build plan ----------
const lacks = { image: [], code: [], dimensions: [], materials: [], description: [] }
const uploads = new Map() // file -> bytes
const wantImage = (rel) => {
  if (!rel) return null
  uploads.set(rel, fs.statSync(path.join(PUBLIC, rel)).size)
  return rel
}

const docs = [] // { doc, imageFields: [{ path: 'mainImage', file }] }

CATEGORIES.forEach(([name, slug], i) => {
  const col = images.collections?.[name]
  const frame = col?.primary
  const file = wantImage(bestFile(frame))
  docs.push({
    doc: { _id: `category.${slug}`, _type: 'category', name, slug: { _type: 'slug', current: slug }, order: i + 1 },
    imageFields: file ? [{ field: 'coverImage', file, alt: clean(frame.alt) }] : [],
  })
})

products.forEach((p, i) => {
  const arch = images.archiveItems?.[p.id]
  const sel = images.selectedPieces?.[p.id]
  const frame = SELECTED.includes(p.id) && sel?.full ? sel.full : arch?.full
  const file = wantImage(bestFile(frame))
  const code = validCode(p.productCode)
  const description = cleanDescription(p.description)
  if (!file) lacks.image.push(p.id)
  if (!code) lacks.code.push(`${p.id} (had: "${p.productCode || arch?.productCode || ''}")`)
  if (!clean(p.dimensions)) lacks.dimensions.push(p.id)
  if (!clean(p.materials)) lacks.materials.push(p.id)
  if (!description) lacks.description.push(p.id)
  const selIndex = SELECTED.indexOf(p.id)
  docs.push({
    doc: strip({
      _id: `piece.${p.id}`,
      _type: 'piece',
      name: p.name,
      slug: { _type: 'slug', current: p.id },
      code: code || undefined,
      category: { _type: 'reference', _ref: `category.${p.categorySlug}` },
      dimensions: clean(p.dimensions),
      materials: clean(p.materials),
      description: description || undefined,
      imageStatus: frame?.status,
      order: i + 1,
      featured: selIndex >= 0,
      featuredOrder: selIndex >= 0 ? selIndex + 1 : undefined,
    }),
    imageFields: file ? [{ field: 'mainImage', file, alt: clean(frame.alt) || clean(p.imageAlt) }] : [],
  })
})

docs.push({ doc: { _id: 'homePage', _type: 'homePage', ...HOME }, imageFields: [] })

const aboutImage = about.image && images.about?.image
const aboutFile = wantImage(bestFile(aboutImage))
docs.push({
  doc: strip({
    _id: 'aboutPage',
    _type: 'aboutPage',
    title: about.title,
    documentTitle: about.documentTitle,
    metaDescription: about.metaDescription,
    intro: about.intro,
    sections: about.sections.map((s) => ({ _key: key(s.id), _type: 'aboutSection', heading: s.heading, body: s.body })),
    visitHeading: about.visit?.heading,
    visitBody: about.visit?.body,
    visitButtonLabel: about.visit?.viewingLabel,
  }),
  imageFields: aboutFile ? [{ field: 'image', file: aboutFile, alt: clean(aboutImage.alt) }] : [],
})

const CONTACT_FIELDS = ['phone', 'whatsapp', 'email', 'address', 'mapsUrl', 'hours', 'instagram', 'facebook', 'threads', 'tiktok', 'linkedin', 'pinterest', 'youtube', 'website']
docs.push({
  doc: {
    _id: 'contactSettings',
    _type: 'contactSettings',
    ...Object.fromEntries(
      CONTACT_FIELDS.map((f) => [f, strip({ value: clean(contact[f]?.value), confirmed: contact[f]?.confirmed === true })]),
    ),
  },
  imageFields: [],
})

const ogFile = exists(SITE.ogImageFile) ? wantImage(SITE.ogImageFile) : null
docs.push({
  doc: { _id: 'siteSettings', _type: 'siteSettings', seoTitle: SITE.seoTitle, seoDescription: SITE.seoDescription },
  imageFields: ogFile ? [{ field: 'ogImage', file: ogFile, alt: undefined }] : [],
})

// ---------- dry-run summary ----------
const counts = docs.reduce((a, d) => ((a[d.doc._type] = (a[d.doc._type] || 0) + 1), a), {})
const totalBytes = [...uploads.values()].reduce((a, b) => a + b, 0)
console.log(`\n${WRITE ? 'IMPORT' : 'DRY RUN'} — project ${PROJECT_ID}, dataset ${DATASET}`)
console.log('Documents:', counts, `(total ${docs.length})`)
console.log(`Images to upload: ${uploads.size} files, ${(totalBytes / 1024 / 1024).toFixed(1)} MB`)
console.log(`Featured (Selected Pieces order): ${SELECTED.join(' > ')}`)
console.log('Pieces without image:', lacks.image.length ? lacks.image.join(', ') : 'none')
console.log(`Pieces without code (${lacks.code.length}):`, lacks.code.join('; ') || 'none')
console.log('Pieces without dimensions:', lacks.dimensions.join(', ') || 'none')
console.log('Pieces without materials:', lacks.materials.join(', ') || 'none')
console.log(`Pieces without a real description (${lacks.description.length}): all left empty`)
const dupCodes = Object.entries(
  products.reduce((a, p) => (validCode(p.productCode) ? ((a[p.productCode] = [...(a[p.productCode] || []), p.id]), a) : a), {}),
).filter(([, ids]) => ids.length > 1)
if (dupCodes.length) console.log('Same code on several pieces (imported as given):', dupCodes.map(([c, ids]) => `${c}: ${ids.join(', ')}`).join('; '))
console.log('Contact: values imported from contact.js, all with confirmed =', contact.phone.confirmed, '(unchanged)')
console.log('Price: never imported.')

if (!WRITE) {
  console.log('\nNothing was written. Run again with --write after approval.')
  process.exit(0)
}

// ---------- real import ----------
function readToken() {
  if (process.env.SANITY_WRITE_TOKEN) return process.env.SANITY_WRITE_TOKEN
  const envFile = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envFile)) return ''
  const line = fs.readFileSync(envFile, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SANITY_WRITE_TOKEN='))
  return line ? line.slice('SANITY_WRITE_TOKEN='.length).trim().replace(/^["']|["']$/g, '') : ''
}
const token = readToken()
if (!token) {
  console.error('\nSANITY_WRITE_TOKEN not found in .env.local. Stopping.')
  process.exit(1)
}
const { createClient } = createRequire(path.join(STUDIO, 'package.json'))('@sanity/client')
const client = createClient({ projectId: PROJECT_ID, dataset: DATASET, apiVersion: '2025-02-19', token, useCdn: false })

const existing = new Map(
  (await client.fetch('*[_id in $ids]', { ids: docs.map((d) => d.doc._id) })).map((d) => [d._id, Object.keys(d)]),
)
const assetCache = new Map()
const upload = async (file) => {
  if (!assetCache.has(file)) {
    const asset = await client.assets.upload('image', fs.createReadStream(path.join(PUBLIC, file)), { filename: path.basename(file) })
    assetCache.set(file, asset._id)
  }
  return assetCache.get(file)
}

let created = 0
let imagesAdded = 0
// Categories first, so piece references resolve.
for (const { doc, imageFields } of docs) {
  const had = existing.get(doc._id)
  const patch = {}
  for (const { field, file, alt } of imageFields) {
    if (had?.includes(field)) continue
    patch[field] = strip({ _type: 'image', asset: { _type: 'reference', _ref: await upload(file) }, alt })
    imagesAdded++
  }
  if (!had) {
    await client.create({ ...doc, ...patch })
    created++
  } else if (Object.keys(patch).length) {
    await client.patch(doc._id).set(patch).commit()
  }
}
console.log(`\nDone. Created ${created} documents, kept ${docs.length - created} that already existed, added ${imagesAdded} images.`)
