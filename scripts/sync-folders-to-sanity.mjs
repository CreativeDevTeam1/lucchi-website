/**
 * One-off: sync the piece pictures with the client's folders (phase 2).
 * Reads a plan (plan.json made by the planner, outside the project) and, per piece:
 *   - converts the chosen AI pictures to WebP (quality 85, width 1536),
 *   - uploads them as image assets,
 *   - sets `gallery` (picture 0 = the main picture, picture 1 = the hover picture) and, for the pieces marked
 *     mainChanged, `mainImage`. No other field is touched.
 *   - "unpublishes" the pieces listed in plan.unpublish: copies the published document to drafts.<id>, then deletes
 *     the published one (what Studio's Unpublish does). Nothing is deleted for good.
 *
 *   node scripts/sync-folders-to-sanity.mjs --plan <plan.json> --root <Downloads folder> --out <webp folder>            dry run (also converts the pictures)
 *   node scripts/sync-folders-to-sanity.mjs --plan <plan.json> --root <Downloads folder> --out <webp folder> --write    upload + patch + unpublish
 *
 * Token: SANITY_WRITE_TOKEN from the git-ignored .env.local (never printed).
 * NOTE: every upload / create fires the Sanity webhook (create events), so uploads are paced; see DEPLOY.md.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STUDIO = path.resolve(ROOT, '..', 'studio-lucchi')
const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : '' }
const WRITE = process.argv.includes('--write')
const PLAN = arg('--plan'), SRC_ROOT = arg('--root'), OUT = arg('--out')
if (!PLAN || !SRC_ROOT || !OUT) { console.error('Usage: --plan <plan.json> --root <folder> --out <folder> [--write]'); process.exit(1) }

const require = createRequire(path.join(ROOT, 'package.json'))
const sharp = require('sharp')
const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'))
fs.mkdirSync(OUT, { recursive: true })

function readToken() {
  if (process.env.SANITY_WRITE_TOKEN) return process.env.SANITY_WRITE_TOKEN
  const envFile = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envFile)) return ''
  const line = fs.readFileSync(envFile, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SANITY_WRITE_TOKEN='))
  return line ? line.slice('SANITY_WRITE_TOKEN='.length).trim().replace(/^["']|["']$/g, '') : ''
}

// 1) convert (always; it only writes into --out)
let converted = 0
for (const p of plan.pieces) {
  for (const [i, g] of p.gallery.entries()) {
    if (g.reuseMainAsset) continue
    g.webp = path.join(OUT, `${p.id}-${String(i).padStart(2, '0')}.webp`)
    if (!fs.existsSync(g.webp)) {
      await sharp(path.join(SRC_ROOT, g.file), { limitInputPixels: false })
        .resize({ width: 1536, withoutEnlargement: true })
        .webp({ quality: 85, effort: 5 })
        .toFile(g.webp)
    }
    converted++
  }
}
const uploads = plan.pieces.reduce((n, p) => n + p.gallery.filter((g) => !g.reuseMainAsset).length, 0)
console.log(`${WRITE ? 'WRITE' : 'DRY RUN'}: ${plan.pieces.length} pieces, ${uploads} pictures to upload (${converted} converted), ${plan.unpublish.length} to unpublish`)

const token = readToken()
if (!token) { console.error('SANITY_WRITE_TOKEN not found in .env.local. Nothing written.'); process.exit(1) }
const { createClient } = createRequire(path.join(STUDIO, 'package.json'))('@sanity/client')
const client = createClient({ projectId: 'szy0z3lw', dataset: 'production', apiVersion: '2025-02-19', token, useCdn: false, perspective: 'raw' })

// 2) checks (read only)
const ids = [...plan.pieces.map((p) => p.id), ...plan.unpublish].map((s) => `piece.${s}`)
const docs = await client.fetch('*[_id in $ids]', { ids })
const byId = new Map(docs.map((d) => [d._id, d]))
const problems = []
for (const id of ids) if (!byId.get(id)) problems.push('missing published document ' + id)
for (const s of plan.unpublish) if (await client.getDocument(`drafts.piece.${s}`)) problems.push('a draft already exists for ' + s)
if (problems.length) { console.error('Stopping:\n - ' + problems.join('\n - ')); process.exit(1) }
console.log('checks OK: all documents exist, no draft in the way.')
if (!WRITE) process.exit(0)

// 3) upload (paced) -> asset ids
const assetOf = new Map()
const queue = plan.pieces.flatMap((p) => p.gallery.map((g, i) => ({ p, g, i }))).filter((x) => !x.g.reuseMainAsset)
let done = 0
for (const x of queue) {
  // Sanity de-duplicates assets by content, so an upload that is repeated after a network error is harmless.
  let asset
  for (let attempt = 1; ; attempt++) {
    try {
      asset = await client.assets.upload('image', fs.createReadStream(x.g.webp), { filename: path.basename(x.g.webp) })
      break
    } catch (e) {
      if (attempt >= 5) throw e
      console.warn(`upload retry ${attempt} for ${path.basename(x.g.webp)}: ${e.cause?.code || e.message}`)
      await new Promise((r) => setTimeout(r, 1500 * attempt))
    }
  }
  assetOf.set(`${x.p.id}#${x.i}`, asset._id)
  done++
  if (done % 20 === 0) console.log(`uploaded ${done}/${queue.length}`)
}
console.log(`uploaded ${done}/${queue.length}`)

// 4) one transaction: patches
const tx = client.transaction()
for (const p of plan.pieces) {
  const doc = byId.get(`piece.${p.id}`)
  const gallery = p.gallery.map((g, i) => {
    const ref = g.reuseMainAsset ? doc.mainImage?.asset?._ref : assetOf.get(`${p.id}#${i}`)
    if (!ref) throw new Error(`no asset for ${p.id} #${i}`)
    return { _key: `g${String(i).padStart(2, '0')}-${ref.slice(6, 14)}`, _type: 'image', asset: { _type: 'reference', _ref: ref }, alt: g.alt }
  })
  const set = { gallery }
  if (p.mainChanged) set.mainImage = { _type: 'image', asset: gallery[0].asset, alt: p.gallery[0].alt }
  tx.patch(doc._id, { set })
}
const r1 = await tx.commit()
console.log('patched', r1.results.length, 'documents')

// 5) one transaction: unpublish (copy to draft, then delete the published copy)
const tx2 = client.transaction()
for (const s of plan.unpublish) {
  const { _rev, _updatedAt, _createdAt, ...rest } = byId.get(`piece.${s}`)
  tx2.create({ ...rest, _id: `drafts.piece.${s}` })
  tx2.delete(`piece.${s}`)
}
const r2 = await tx2.commit()
console.log('unpublished', plan.unpublish.length, 'pieces (', r2.results.length, 'operations )')
