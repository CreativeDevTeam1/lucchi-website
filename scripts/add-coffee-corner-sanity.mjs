/**
 * One-off: add the "Coffee Corner" category and its two pieces to Sanity (project szy0z3lw, dataset production).
 * It only CREATES three new documents (it fails if one already exists) and never touches existing documents.
 *   node scripts/add-coffee-corner-sanity.mjs --images <folder>            -> dry run (prints the plan)
 *   node scripts/add-coffee-corner-sanity.mjs --images <folder> --write    -> upload the 3 pictures and create the documents
 * <folder> holds: coffee-corner-cover.webp, coffee-corner-main.webp, coffee-corner-ii-main.webp
 * Token: SANITY_WRITE_TOKEN from the git-ignored .env.local (never printed). No price, no invented code.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STUDIO = path.resolve(ROOT, '..', 'studio-lucchi')
const WRITE = process.argv.includes('--write')
const imgFlag = process.argv.indexOf('--images')
const IMAGES = imgFlag > -1 ? process.argv[imgFlag + 1] : ''
if (!IMAGES || !fs.existsSync(IMAGES)) {
  console.error('Pass --images <folder> with the three .webp files.')
  process.exit(1)
}

const CATEGORY = {
  id: 'category.coffee-corner',
  name: 'Coffee Corner',
  slug: 'coffee-corner',
  file: 'coffee-corner-cover.webp',
  alt: 'Black marble cup-shaped coffee corner cabinet with an arched wooden shelf unit, in a bright hall',
}
const PIECES = [
  {
    id: 'piece.coffee-corner',
    name: 'Coffee Corner',
    slug: 'coffee-corner',
    file: 'coffee-corner-main.webp',
    alt: 'Black marble cup-shaped coffee corner cabinet with an arched wooden shelf unit and a Coffee emblem',
  },
  {
    id: 'piece.coffee-corner-ii',
    name: 'Coffee Corner II',
    slug: 'coffee-corner-ii',
    file: 'coffee-corner-ii-main.webp',
    alt: 'Cream coffee corner cabinet with glass-panel doors, two drawers and a wooden back panel with Coffee Corner lettering',
  },
]

function readToken() {
  if (process.env.SANITY_WRITE_TOKEN) return process.env.SANITY_WRITE_TOKEN
  const envFile = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envFile)) return ''
  const line = fs.readFileSync(envFile, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SANITY_WRITE_TOKEN='))
  return line ? line.slice('SANITY_WRITE_TOKEN='.length).trim().replace(/^["']|["']$/g, '') : ''
}

for (const f of [CATEGORY.file, ...PIECES.map((p) => p.file)]) {
  if (!fs.existsSync(path.join(IMAGES, f))) {
    console.error('Missing picture:', f)
    process.exit(1)
  }
}

const token = readToken()
if (!token) {
  console.error('SANITY_WRITE_TOKEN not found in .env.local. Nothing written.')
  process.exit(1)
}
const { createClient } = createRequire(path.join(STUDIO, 'package.json'))('@sanity/client')
const client = createClient({ projectId: 'szy0z3lw', dataset: 'production', apiVersion: '2025-02-19', token, useCdn: false })

// Current state (read only)
const categories = await client.fetch('*[_type == "category"] | order(order asc){ _id, name, "slug": slug.current, order }')
const maxPieceOrder = await client.fetch('math::max(*[_type == "piece"].order)')
const categoryOrder = Math.max(0, ...categories.map((c) => c.order || 0)) + 1
console.log('Current categories:', categories.map((c) => `${c.order}:${c.slug}`).join(', '))
console.log('Highest piece order:', maxPieceOrder)
console.log('Plan:')
console.log(`  category ${CATEGORY.id}  name="${CATEGORY.name}" slug=${CATEGORY.slug} order=${categoryOrder} cover=${CATEGORY.file}`)
PIECES.forEach((p, i) => console.log(`  piece    ${p.id}  name="${p.name}" slug=${p.slug} order=${maxPieceOrder + 1 + i} image=${p.file} code=(empty) featured=false status=available`))

const taken = await client.fetch('*[_id in $ids || (_type in ["piece","category"] && slug.current in $slugs)]{ _id }', {
  ids: [CATEGORY.id, ...PIECES.map((p) => p.id)],
  slugs: [CATEGORY.slug, ...PIECES.map((p) => p.slug)],
})
if (taken.length) {
  console.error('Already exists, stopping:', taken.map((d) => d._id).join(', '))
  process.exit(1)
}
if (!WRITE) {
  console.log('DRY RUN: nothing written.')
  process.exit(0)
}

const uploaded = {}
for (const f of [CATEGORY.file, ...PIECES.map((p) => p.file)]) {
  const asset = await client.assets.upload('image', fs.createReadStream(path.join(IMAGES, f)), { filename: f })
  uploaded[f] = asset._id
  console.log('uploaded', f, '->', asset._id)
}
const image = (file, alt) => ({ _type: 'image', asset: { _type: 'reference', _ref: uploaded[file] }, alt })

const tx = client.transaction()
tx.create({
  _id: CATEGORY.id,
  _type: 'category',
  name: CATEGORY.name,
  slug: { _type: 'slug', current: CATEGORY.slug },
  order: categoryOrder,
  coverImage: image(CATEGORY.file, CATEGORY.alt),
})
PIECES.forEach((p, i) => {
  tx.create({
    _id: p.id,
    _type: 'piece',
    name: p.name,
    slug: { _type: 'slug', current: p.slug },
    category: { _type: 'reference', _ref: CATEGORY.id },
    mainImage: image(p.file, p.alt),
    imageStatus: 'final',
    order: maxPieceOrder + 1 + i,
    featured: false,
    status: 'available',
  })
})
const result = await tx.commit()
console.log('created:', result.results.map((r) => `${r.operation} ${r.id}`).join(' | '))
