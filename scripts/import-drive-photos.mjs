import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

/* Import chosen photos from the client's Drive download into the site.
   Reads the originals OUTSIDE the project, writes only processed, responsive images into
   public/media (new "-drive" files; old files stay), and updates src/data/images.json.
   Usage: node scripts/import-drive-photos.mjs <metadata.json from the inventory> [--dry]
   The Drive download is split in four parts; files are looked up in all of them. */

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sharp = createRequire(path.join(root, 'package.json'))('sharp')
const META = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const DRY = process.argv.includes('--dry')
const MANIFEST = path.join(root, 'src', 'data', 'images.json')
const DOWNLOADS = 'C:/Users/Dell/Downloads'
const PARTS = fs.readdirSync(DOWNLOADS).filter((n) => n.startsWith('Lucchi -2026')).map((n) => `${DOWNLOADS}/${n}/Lucchi/Lucchi website`)
const resolveDrive = (rel) => PARTS.map((p) => path.join(p, rel)).find((p) => fs.existsSync(p))

/* The same MILD tone already used for the collection photos. */
const TONE = { blackLift: 0.035, highlightPull: 0.1, contrast: 0.94, saturation: 0.94, yellowPull: 0.6 }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const curve = (t) => {
  t = TONE.blackLift + t * (1 - TONE.blackLift)
  if (t > 0.75) { const u = (t - 0.75) / 0.25; t = 0.75 + 0.25 * u * (1 - TONE.highlightPull) }
  t = 0.5 + (t - 0.5) * TONE.contrast
  return Math.min(1, Math.max(0, t))
}
function toneBuffer(data, channels) {
  const out = Buffer.from(data)
  for (let i = 0; i < out.length; i += channels) {
    let r = curve(out[i] / 255); let g = curve(out[i + 1] / 255); let b = curve(out[i + 2] / 255)
    let y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    r = y + (r - y) * TONE.saturation; g = y + (g - y) * TONE.saturation; b = y + (b - y) * TONE.saturation
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const k = Math.max(0, Math.min(r, g) - b) * 0.22 * TONE.yellowPull * smooth(0.55, 0.95, y)
    r -= k; g -= k * 0.85
    out[i] = Math.round(Math.min(1, Math.max(0, r)) * 255)
    out[i + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255)
    out[i + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255)
  }
  return out
}

/* ------------------------------------------------------------------ jobs */
// idx = row in the inventory table; cx/cy = crop centre as a fraction of the source.
const BOTTOM = 0.5833 // keeps a 4:5 crop of a 2:3 portrait aligned to the bottom edge
const SELECTED = [
  { id: 'side-table', name: 'Side Table', idx: 322, cx: 0.5, cy: 0.54 },
  { id: 'pedestal-table', name: 'Pedestal Table', idx: 328, cx: 0.5, cy: BOTTOM },
  { id: 'table-lamp', name: 'Table Lamp', idx: 14, cx: 0.5, cy: 0.52 },
  { id: 'electric-decorative-fireplace', name: 'Electric Decorative Fireplace', idx: 333, cx: 0.5, cy: 0.5 },
]
const COLLECTIONS = [
  { key: 'Living Room', slug: 'living-room', idx: 86, cx: 0.40, cy: 0.5, alt: 'Curve Set living room: curved sofa and onyx-topped coffee table' },
  { key: 'Bedroom', slug: 'bedroom', idx: 179, cx: 0.5, cy: 0.5, alt: 'Bedroom with a walnut bed, olive throw and fluted wardrobe' },
  { key: 'Dining', slug: 'dining', idx: 51, cx: 0.5, cy: 0.5, alt: 'Rahaf dining table with six upholstered chairs and a sideboard' },
  { key: 'Kids Bedroom', slug: 'kids-bedroom', idx: 23, cx: 0.5, cy: 0.5, alt: 'Kids bedroom with two twin beds and soft throws' },
  { key: 'Accessories', slug: 'accessories', idx: 328, cx: 0.5, cy: BOTTOM, alt: 'Gold pedestal side table with a black glass top' },
]
const CATALOGUE = [
  // real showroom photographs (identified by the image itself, or the folder name)
  { id: 'kayan-bedroom', idx: 169, cy: 0.62, ai: false },
  { id: 'venus-corner-sofa', idx: 281, ai: false },
  { id: 'living-room-set-r1560-b', idx: 192, ai: false },
  { id: 'living-room-set-r1560-a', idx: 205, ai: false },
  { id: 'living-room-set-r1538', idx: 303, ai: false },
  { id: 'turkish-set', idx: 215, ai: false },
  { id: 'galaxy-dining-table', idx: 294, ai: false },
  { id: 'bedroom-set-b1387', idx: 179, ai: false },
  { id: 'lavender-bedroom-set', idx: 186, ai: false },
  // clean white-background renders (the folder only has renders, no showroom photo)
  { id: 'marble-sofa', idx: 39, ai: true },
  { id: 'living-room-set-r1561', idx: 33, ai: true },
  { id: 'haland-dining-table', idx: 80, ai: true },
  { id: 'circle-dining-table', idx: 66, ai: true },
  { id: 'lina-dining-table', idx: 75, ai: true },
]

// Accessories are tall pieces, so they cannot fill a 4:3 card. These three use the clean studio renders;
// pad = the whole square is kept and the (near-white) studio background is extended to 4:3.
const ACCESSORIES = [
  { id: 'side-table', name: 'Side Table', idx: 325, cy: 0.52, pad: false },
  { id: 'pedestal-table', name: 'Pedestal Table', idx: 329, pad: true },
  { id: 'table-lamp', name: 'Table Lamp', idx: 18, pad: true },
]

/* ------------------------------------------------------------ processing */
const FORMATS = [['avif', { quality: 62 }], ['webp', { quality: 80, effort: 4 }], ['jpeg', { quality: 80, mozjpeg: true }]]
const EXT = { avif: 'avif', webp: 'webp', jpeg: 'jpg' }

function cropBox(m, ratio, cx = 0.5, cy = 0.5) {
  let w; let h
  if (m.w / m.h > ratio) { h = m.h; w = Math.round(m.h * ratio) } else { w = m.w; h = Math.round(m.w / ratio) }
  const left = Math.min(m.w - w, Math.max(0, Math.round(cx * m.w - w / 2)))
  const top = Math.min(m.h - h, Math.max(0, Math.round(cy * m.h - h / 2)))
  return { left, top, width: w, height: h }
}

let totalBytes = 0
async function build({ idx, ratio, cx, cy, widths, outDir, stem, pad = false }) {
  const m = META[idx]
  const file = resolveDrive(m.rel)
  if (!file) throw new Error(`missing source for #${idx} ${m.rel}`)
  const box = pad ? { left: 0, top: 0, width: m.w, height: m.h } : cropBox(m, ratio, cx, cy)
  const outWidth = pad ? Math.round(m.h * ratio) : box.width
  const maxW = Math.min(Math.max(...widths), outWidth)
  const used = widths.filter((w) => w <= maxW + 1)
  if (!used.includes(maxW) && maxW > Math.max(...used, 0)) used.push(maxW)
  let base = sharp(file, { limitInputPixels: false }).rotate().extract(box)
  if (pad) {
    const side = Math.round((outWidth - m.w) / 2)
    base = base.extend({ left: side, right: outWidth - m.w - side, top: 0, bottom: 0, extendWith: 'copy' })
  }
  base = base.resize({ width: maxW, withoutEnlargement: true })
  const { data, info } = await base.removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
  const toned = sharp(toneBuffer(data, info.channels), { raw: { width: info.width, height: info.height, channels: info.channels } })
  const h = Math.round(maxW / ratio)
  const result = { srcset: { avif: [], webp: [], jpeg: [] }, width: maxW, height: h, source: `${m.w}x${m.h}`, file: m.rel }
  fs.mkdirSync(outDir, { recursive: true })
  for (const width of used.sort((a, b) => a - b)) {
    const resized = toned.clone().resize({ width, withoutEnlargement: true })
    for (const [fmt, opts] of FORMATS) {
      const target = path.join(outDir, `${stem}-${width}.${EXT[fmt]}`)
      if (!DRY) { await resized.clone()[fmt](opts).toFile(target); totalBytes += fs.statSync(target).size }
      result.srcset[fmt].push({ width, file: target })
    }
  }
  const defaultFile = path.join(outDir, `${stem}.webp`)
  if (!DRY) { await toned.clone().webp({ quality: 80, effort: 4 }).toFile(defaultFile); totalBytes += fs.statSync(defaultFile).size }
  const lqip = await toned.clone().resize({ width: 24 }).blur(12).webp({ quality: 38 }).toBuffer()
  result.lqip = `data:image/webp;base64,${lqip.toString('base64')}`
  result.defaultFile = defaultFile
  return result
}

const web = (file) => file.replace(/\\/g, '/').split('/public')[1]
const srcsetString = (r) => Object.fromEntries(Object.entries(r.srcset).map(([fmt, list]) => [fmt, list.map((s) => `${web(s.file)} ${s.width}w`).join(', ')]))

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
const report = []

/* 1. Selected Pieces: one Full image per piece, 4:5 */
for (const job of SELECTED) {
  const r = await build({ idx: job.idx, ratio: 4 / 5, cx: job.cx, cy: job.cy, widths: [640, 1080, 1600], outDir: path.join(root, 'public/media/selected'), stem: `selected-${job.id}-full-drive` })
  const slot = manifest.selectedPieces[job.id]
  const old = slot.full
  slot.full = {
    src: web(r.defaultFile),
    alt: `${job.name} by Lucchi Furniture, full view`,
    focalPoint: { x: 0.5, y: 0.52 },
    aspect: '4/5',
    status: 'final',
    source: 'client-drive',
    clientFile: r.file,
    referenceSrc: old.src,
    srcset: srcsetString(r),
    lqip: r.lqip,
    original: r.source,
    previous: { src: old.src, status: old.status, source: old.source, clientFile: old.clientFile },
  }
  report.push({ slot: `Selected Pieces: ${job.name}`, file: r.file, source: r.source, out: `${r.width}x${r.height} (4:5)`, status: 'final' })
}

/* 2. Collections row: one 4:5 portrait per collection */
for (const job of COLLECTIONS) {
  const r = await build({ idx: job.idx, ratio: 4 / 5, cx: job.cx, cy: job.cy, widths: [640, 1080, 1600], outDir: path.join(root, 'public/media/categories'), stem: `${job.slug}-portrait-drive` })
  const slot = manifest.collections[job.key].mobile
  const before = JSON.parse(JSON.stringify({ graded: slot.graded, alt: slot.alt, status: slot.status, source: slot.source, clientFile: slot.clientFile }))
  slot.graded = { src: web(r.defaultFile), srcset: srcsetString(r), lqip: r.lqip, width: r.width, height: r.height }
  slot.alt = job.alt
  slot.aspect = '4/5'
  slot.status = 'final'
  slot.source = 'client-drive'
  slot.clientFile = r.file
  slot.focalPoint = { x: 0.5, y: 0.5 }
  slot.previous = before
  report.push({ slot: `Collections: ${job.key}`, file: r.file, source: r.source, out: `${r.width}x${r.height} (4:5)`, status: 'final' })
  job.web = web(r.defaultFile)
}
// menu preview images read collections[..].primary / secondary .src
const prev = (slot) => { slot.previousSrc = slot.previousSrc || slot.src }
const living = COLLECTIONS.find((c) => c.key === 'Living Room')
const dining = COLLECTIONS.find((c) => c.key === 'Dining')
const bedroom = COLLECTIONS.find((c) => c.key === 'Bedroom')
prev(manifest.collections['Living Room'].primary); manifest.collections['Living Room'].primary.src = living.web
prev(manifest.collections.Dining.primary); manifest.collections.Dining.primary.src = dining.web
prev(manifest.collections.Bedroom.secondary); manifest.collections.Bedroom.secondary.src = bedroom.web

/* 3. Catalogue: best clean Full photo per product, 4:3 */
for (const job of CATALOGUE) {
  const r = await build({ idx: job.idx, ratio: 4 / 3, cx: 0.5, cy: job.cy ?? 0.5, widths: [640, 1080, 1600], outDir: path.join(root, 'public/media/catalogue', job.id), stem: 'full-drive' })
  const item = manifest.archiveItems[job.id]
  const old = item.full
  const name = item.productName
  const fresh = {
    src: web(r.defaultFile),
    alt: job.ai ? `${name} full view (rendered reference image)` : `${name} full view`,
    focalPoint: { x: 0.5, y: 0.5 },
    aspect: '4/3',
    status: job.ai ? 'ai-placeholder' : 'final',
    source: 'client-drive',
    clientFile: r.file,
    referenceSrc: old.src,
    srcset: srcsetString(r),
    lqip: r.lqip,
    original: r.source,
    previous: { src: old.src, status: old.status, source: old.source, clientFile: old.clientFile },
  }
  item.full = fresh
  // no hover swap to an old, different picture: the hover image becomes the same as Full
  if (!job.ai) item.detail = { ...fresh, alt: `${name} full view` }
  report.push({ slot: `Catalogue: ${name}`, file: r.file, source: r.source, out: `${r.width}x${r.height} (4:3)`, status: fresh.status })
}

/* 4. Accessories in the catalogue (they had no catalogue entry, so the page used the old letterboxed photo) */
for (const job of ACCESSORIES) {
  const r = await build({ idx: job.idx, ratio: 4 / 3, cx: 0.5, cy: job.cy ?? 0.5, widths: [640, 1080, 1600], outDir: path.join(root, 'public/media/catalogue', job.id), stem: 'full-drive', pad: job.pad })
  const fresh = {
    src: web(r.defaultFile),
    alt: `${job.name} full view (rendered reference image)`,
    focalPoint: { x: 0.5, y: 0.5 },
    aspect: '4/3',
    status: 'ai-placeholder',
    source: 'client-drive',
    clientFile: r.file,
    referenceSrc: `/images/products/${job.id}.webp`,
    srcset: srcsetString(r),
    lqip: r.lqip,
    original: r.source,
  }
  manifest.archiveItems[job.id] = { productId: job.id, productName: job.name, category: 'Accessories', productCode: '', full: fresh, detail: { ...fresh, alt: `${job.name} full view` } }
  report.push({ slot: `Catalogue: ${job.name}`, file: r.file, source: r.source, out: `${r.width}x${r.height} (4:3${job.pad ? ', padded' : ''})`, status: 'ai-placeholder' })
}

if (!DRY) fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
fs.writeFileSync(path.join(path.dirname(process.argv[2]), 'import-report.json'), JSON.stringify({ rows: report, totalMB: +(totalBytes / 1048576).toFixed(2) }, null, 1))
console.log(`done: ${report.length} images, ${(totalBytes / 1048576).toFixed(1)} MB written${DRY ? ' (dry run)' : ''}`)
