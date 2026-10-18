/**
 * Apply confirmed client photography from client-assets/Lucchi website
 * into public/media/catalogue and patch src/data/images.json.
 *
 * Usage: node scripts/apply-client-assets.mjs
 */
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const require = createRequire(path.join(root, 'package.json'))
const sharp = require('sharp')

const WEB = path.join(root, 'client-assets', 'Lucchi website')
const OUT = path.join(root, 'public', 'media', 'catalogue')
const QUALITY = { webp: 78, jpeg: 80, avif: 55 }

const SKIP = /self|beard|man-with-a-beard|man-taking|man-in-a-white|CqS4iW6EEy|empty-dark|empty-modern-war/i

const FOLDERS = {
  'bonkio-kids-bedroom-set': path.join(WEB, 'lucchi', 'اطفال بونكيو'),
  'living-room-set-r1561': path.join(WEB, 'lucchi', 'انتريه r1561'),
  'marble-sofa': path.join(WEB, 'lucchi', 'انتريه ماربيل'),
  'mechanism-corner-sofa': path.join(WEB, 'lucchi', 'ركنة ميكانيزم'),
  'rahaf-dining-table': path.join(WEB, 'lucchi', 'سفره رهف'),
  'circle-dining-table': path.join(WEB, 'lucchi', 'سفره سيركل'),
  'lina-dining-table': path.join(WEB, 'lucchi', 'سفره لينا'),
  'haland-dining-table': path.join(WEB, 'lucchi', 'سفره هالاند'),
  'curve-set': path.join(WEB, 'lucchi', 'طقم كيرف'),
  'mocha-set': path.join(WEB, 'lucchi', 'طقم موكا'),
  'areej-bedroom': path.join(WEB, 'lucchi', 'نوم اريج'),
  'grey-kids-bedroom-set': path.join(WEB, 'lucchi', 'نوم اطفال جراي'),
  'golf-kids-bedroom-set': path.join(WEB, 'lucchi', 'نوم اطفال جولف'),
  'angels-bedroom-set': path.join(WEB, 'lucchi', 'نوم انجليز'),
  'bedroom-uqal': path.join(WEB, 'lucchi', 'نوم اوفال'),
  'bianco-bedroom-set': path.join(WEB, 'lucchi', 'نوم بيانكو'),
  'shababi-asil-bedroom': path.join(WEB, 'lucchi', 'نوم شبابي اسيل'),
  'kayan-bedroom': path.join(WEB, 'lucchi', 'نوم كيان'),
  'electric-decorative-fireplace': path.join(WEB, 'table 3'),
}

const PREFER_FULL = /bedroom-with|living-roo|sectional|twin-beds|two-single|two-twin|kingsize|dining-room|creamcolored-curv|creamcolored-sect|beige-sectional|black-electric|white-bed|neatly-made/i
const PREFER_DETAIL = /closeup|nightstand|vanity|wardrobe|armchair|armc|marble|fabric|console|stool|dresser|headboard/i

function listImages(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter((n) => /\.(jpe?g|png|webp)$/i.test(n) && !SKIP.test(n))
    .map((n) => ({ name: n, abs: path.join(dir, n), bytes: fs.statSync(path.join(dir, n)).size }))
}

function pickSlots(files) {
  const photos = files.filter((f) => /magnific_photo-/i.test(f.name)).sort((a, b) => b.bytes - a.bytes)
  const rest = files.filter((f) => !photos.includes(f)).sort((a, b) => b.bytes - a.bytes)
  const pool = photos.length ? photos : rest
  if (!pool.length) return null

  const full = pool.find((f) => PREFER_FULL.test(f.name)) || pool[0]
  const detail = pool.find((f) => f !== full && PREFER_DETAIL.test(f.name))
    || pool.find((f) => f !== full)
    || full
  const context = pool.find((f) => f !== full && f !== detail) || detail || full
  const usedPhotos = photos.length > 0
  return { full, detail, context, status: usedPhotos ? 'final' : 'ai-placeholder' }
}

async function writeVariant(src, destBase, { width, height, aspect }) {
  const pipeline = sharp(src).rotate() // honour EXIF so showroom shots aren't sideways
  const meta = await sharp(src).rotate().metadata()
  const resized = pipeline.resize(width, height, { fit: 'cover', position: 'attention', kernel: 'lanczos3' })
  const webpPath = `${destBase}.webp`
  const jpgPath = `${destBase}.jpg`
  await resized.clone().webp({ quality: QUALITY.webp, effort: 4 }).toFile(webpPath)
  await resized.clone().jpeg({ quality: QUALITY.jpeg, mozjpeg: true }).toFile(jpgPath)
  const lqip = await sharp(src).rotate().resize(20, Math.round(20 / aspect)).blur(1).webp({ quality: 40 }).toBuffer()
  return {
    width: meta.width,
    height: meta.height,
    webp: webpPath,
    jpg: jpgPath,
    webpKb: Math.round(fs.statSync(webpPath).size / 1024),
    jpgKb: Math.round(fs.statSync(jpgPath).size / 1024),
    lqip: `data:image/webp;base64,${lqip.toString('base64')}`,
  }
}

function publicUrl(abs) {
  return '/' + path.relative(path.join(root, 'public'), abs).replaceAll('\\', '/')
}

function patchSlot(existing, next, alt, aspect) {
  const fallback = existing?.src && existing.src !== next.src ? existing.src : existing?.referenceSrc
  return {
    ...existing,
    src: next.src,
    alt,
    aspect,
    status: next.status,
    source: next.status === 'final' ? 'client-photography' : 'ai-upscale',
    clientFile: next.clientFile,
    focalPoint: { x: 0.5, y: 0.5 },
    referenceSrc: fallback || existing?.src,
    srcset: next.srcset,
    lqip: next.lqip,
  }
}

fs.mkdirSync(OUT, { recursive: true })
const report = []
const jsonPath = path.join(root, 'src', 'data', 'images.json')
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

for (const [id, folder] of Object.entries(FOLDERS)) {
  const files = listImages(folder)
  const picks = pickSlots(files)
  if (!picks) {
    report.push({ id, applied: false, reason: 'folder empty or missing' })
    continue
  }

  const destDir = path.join(OUT, id)
  fs.mkdirSync(destDir, { recursive: true })

  const specs = {
    full: { width: 1600, height: 1200, aspect: 4 / 3, label: '4/3' },
    detail: { width: 1080, height: 1080, aspect: 1, label: '1/1' },
    context: { width: 1600, height: 900, aspect: 16 / 9, label: '16/9' },
    wideSet: { width: 1600, height: 900, aspect: 16 / 9, label: '16/9' },
  }
  const sources = { full: picks.full, detail: picks.detail, context: picks.context, wideSet: picks.context }
  const written = {}

  for (const [slot, spec] of Object.entries(specs)) {
    const srcFile = sources[slot]
    const destBase = path.join(destDir, slot)
    const out = await writeVariant(srcFile.abs, destBase, spec)
    written[slot] = {
      src: publicUrl(out.webp),
      srcset: {
        webp: `${publicUrl(out.webp)} ${spec.width}w`,
        jpeg: `${publicUrl(out.jpg)} ${spec.width}w`,
      },
      lqip: out.lqip,
      status: picks.status,
      clientFile: path.relative(WEB, srcFile.abs).replaceAll('\\', '/'),
      webpKb: out.webpKb,
      jpgKb: out.jpgKb,
    }
  }

  const item = json.archiveItems[id]
  if (item) {
    const name = item.productName || id
    item.full = patchSlot(item.full, written.full, `${name} full view`, '4/3')
    item.detail = patchSlot(item.detail, written.detail, `${name} material and joinery detail`, '1/1')
    item.context = patchSlot(item.context, written.context, `${name} showroom context`, '16/9')
    if (item.wideSet) item.wideSet = patchSlot(item.wideSet, written.wideSet, `${name} room ensemble`, '16/9')
  }
  if (json.selectedPieces[id]) {
    const name = json.selectedPieces[id].productName || id
    json.selectedPieces[id].full = patchSlot(json.selectedPieces[id].full, written.full, `${name} full product view`, '4/3')
    json.selectedPieces[id].detail = patchSlot(json.selectedPieces[id].detail, written.detail, `${name} material detail view`, '1/1')
    json.selectedPieces[id].context = patchSlot(json.selectedPieces[id].context, written.context, `${name} styled room context`, '16/9')
  }
  if (json.archivePreview[id]) {
    json.archivePreview[id].src = written.full.src
    json.archivePreview[id].status = written.full.status
    json.archivePreview[id].referenceSrc = json.archivePreview[id].referenceSrc || json.archivePreview[id].src
    json.archivePreview[id].source = written.full.status === 'final' ? 'client-photography' : 'ai-upscale'
    json.archivePreview[id].clientFile = written.full.clientFile
  }

  report.push({
    id,
    applied: true,
    status: picks.status,
    full: written.full.clientFile,
    detail: written.detail.clientFile,
    context: written.context.clientFile,
    sizes: `full ${written.full.webpKb}KB webp / ${written.full.jpgKb}KB jpg`,
  })
  console.log('OK', id, picks.status, written.full.clientFile)
}

/* Collections: 4:5 crops from the best confirmed full shots */
const collectionMap = {
  'Living Room': { id: 'curve-set', secondaryId: 'mechanism-corner-sofa' },
  Bedroom: { id: 'areej-bedroom', secondaryId: 'bianco-bedroom-set' },
  Dining: { id: 'lina-dining-table', secondaryId: 'rahaf-dining-table' },
  'Kids Bedroom': { id: 'bonkio-kids-bedroom-set', secondaryId: 'golf-kids-bedroom-set' },
  Accessories: { id: 'electric-decorative-fireplace', secondaryId: null },
}

for (const [cat, map] of Object.entries(collectionMap)) {
  const col = json.collections[cat]
  if (!col) continue
  for (const [key, pid] of [['primary', map.id], ['secondary', map.secondaryId]]) {
    if (!pid || !col[key]) continue
    const src = path.join(OUT, pid, 'full.webp')
    if (!fs.existsSync(src)) continue
    const destBase = path.join(OUT, pid, `collection-${key}`)
    await sharp(src).resize(1080, 1350, { fit: 'cover', position: 'attention' }).webp({ quality: QUALITY.webp }).toFile(destBase + '.webp')
    await sharp(src).resize(1080, 1350, { fit: 'cover', position: 'attention' }).jpeg({ quality: QUALITY.jpeg, mozjpeg: true }).toFile(destBase + '.jpg')
    const prev = col[key].src
    col[key].src = publicUrl(destBase + '.webp')
    col[key].aspect = '4/5'
    col[key].status = json.archiveItems[pid]?.full?.status || 'final'
    col[key].referenceSrc = prev
    col[key].productId = pid
    col[key].productName = json.archiveItems[pid]?.productName || col[key].productName
    col[key].source = 'client-photography'
  }
}

/* Contact: quiet studio/product shot — marble sofa close-up, no showroom clutter */
const marbleFull = path.join(OUT, 'marble-sofa', 'full.webp')
if (fs.existsSync(marbleFull)) {
  const destBase = path.join(OUT, 'contact-hero')
  await sharp(marbleFull).resize(2400, 1350, { fit: 'cover', position: 'attention' }).webp({ quality: QUALITY.webp }).toFile(destBase + '.webp')
  await sharp(marbleFull).resize(2400, 1350, { fit: 'cover', position: 'attention' }).jpeg({ quality: QUALITY.jpeg, mozjpeg: true }).toFile(destBase + '.jpg')
  json.contact.hero.referenceSrc = json.contact.hero.src
  json.contact.hero.src = publicUrl(destBase + '.webp')
  json.contact.hero.status = json.archiveItems['marble-sofa']?.full?.status || 'ai-placeholder'
  json.contact.hero.alt = 'Marble-accent Lucchi sofa, photographed for private showroom enquiry'
  json.contact.hero.source = json.contact.hero.status === 'final' ? 'client-photography' : 'ai-upscale'
}

/* Craft details from confirmed close-ups */
const craftSources = [
  { id: 'detail-wood', pid: 'kayan-bedroom', slot: 'detail', title: 'Romanian Red Beech Wood' },
  { id: 'detail-stone', pid: 'marble-sofa', slot: 'detail', title: 'Italian Calacatta & Marble Accents' },
  { id: 'detail-veneer', pid: 'areej-bedroom', slot: 'detail', title: 'Natural Bookmatched Veneers' },
  { id: 'detail-upholstery', pid: 'mocha-set', slot: 'detail', title: 'Tactile Mohair, Velvet & Linens' },
]
for (const c of craftSources) {
  const item = json.craft.details.find((d) => d.id === c.id)
  const src = path.join(OUT, c.pid, `${c.slot}.webp`)
  if (!item || !fs.existsSync(src)) continue
  item.referenceSrc = item.src
  item.src = publicUrl(src)
  item.status = json.archiveItems[c.pid]?.[c.slot]?.status || 'placeholder'
  item.source = 'client-photography'
}

/* Craft banner from the Curve sofa (clear product, no competing logo) */
const curveFull = path.join(OUT, 'curve-set', 'context.webp')
if (fs.existsSync(curveFull)) {
  const destBase = path.join(OUT, 'craft-banner')
  await sharp(curveFull).resize(2400, 1200, { fit: 'cover', position: 'attention' }).webp({ quality: QUALITY.webp }).toFile(destBase + '.webp')
  json.craft.banner.referenceSrc = json.craft.banner.src
  json.craft.banner.src = publicUrl(destBase + '.webp')
  json.craft.banner.status = 'final'
  json.craft.banner.source = 'client-photography'
  json.craft.banner.alt = 'Lucchi Curve seating in the showroom — wood, fabric and marble in one piece'
}

fs.writeFileSync(jsonPath, `${JSON.stringify(json, null, 2)}\n`)
const reportPath = path.join(root, 'client-assets', '_apply-report.json')
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log('\nPatched src/data/images.json')
console.log(report.filter((r) => r.applied).length, 'products updated,', report.filter((r) => !r.applied).length, 'skipped')
