import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

/* Follow-up fixes after VERIFY.md: Side Table padding, Turkish Set focal point, real photos for About / menu / two Kids Bedroom cards.
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
const media = (sub) => path.join(root, 'public/media', sub)
const W = [640, 1080, 1600]

/* 1. Catalogue cards: keep the whole piece, never cut it */
// Side Table: the studio render is square, so the whole square is kept and the plain background is widened to 4:3.
{
  const item = manifest.archiveItems['side-table']
  const r = await build({ idx: 325, ratio: 4 / 3, widths: W, outDir: media('catalogue/side-table'), stem: 'full-drive', pad: true })
  item.full = { ...item.full, src: web(r.defaultFile), srcset: srcsetString(r), lqip: r.lqip, original: r.source, focalPoint: { x: 0.5, y: 0.5 } }
  item.detail = { ...item.full, alt: 'Side Table full view' }
  report.push('Side Table catalogue: padded 4:3, whole table visible')
}
// Turkish Set: centre the sofa
{
  const item = manifest.archiveItems['turkish-set']
  const r = await build({ idx: 215, ratio: 4 / 3, cx: 0.47, cy: 0.5, widths: W, outDir: media('catalogue/turkish-set'), stem: 'full-drive' })
  item.full = { ...item.full, src: web(r.defaultFile), srcset: srcsetString(r), lqip: r.lqip }
  item.detail = { ...item.full, alt: 'Turkish Set full view' }
  report.push('Turkish Set: crop centre moved to x=0.47')
}
/* 2. Kids Bedroom: only the two clearly matching, clean, landscape photos */
for (const job of [
  { id: 'bonkio-kids-bedroom-set', idx: 23 },
  { id: 'golf-kids-bedroom-set', idx: 125 },
]) {
  const item = manifest.archiveItems[job.id]
  const old = item.full
  const r = await build({ idx: job.idx, ratio: 4 / 3, widths: W, outDir: media(`catalogue/${job.id}`), stem: 'full-drive' })
  const fresh = {
    src: web(r.defaultFile), alt: `${item.productName} full view`, focalPoint: { x: 0.5, y: 0.5 }, aspect: '4/3',
    status: 'final', source: 'client-drive', clientFile: r.file, referenceSrc: old.src,
    srcset: srcsetString(r), lqip: r.lqip, original: r.source,
    previous: { src: old.src, status: old.status, source: old.source, clientFile: old.clientFile },
  }
  item.full = fresh
  item.detail = { ...fresh }
  report.push(`${item.productName}: ${r.file}`)
}
/* 3. About page and menu Home preview: real showroom photos, 4:5, same mild tone */
{
  const r = await build({ idx: 304, ratio: 4 / 5, cx: 0.5, cy: 0.56, widths: W, outDir: media('about'), stem: 'about-drive' })
  manifest.about = {
    image: {
      src: web(r.defaultFile), alt: 'Cream sofa with two gold round side tables on grey carpet in the Lucchi showroom',
      focalPoint: { x: 0.5, y: 0.5 }, aspect: '4/5', status: 'final', source: 'client-drive', clientFile: r.file,
      srcset: srcsetString(r), lqip: r.lqip, original: r.source,
      previous: { src: '/media/about/curve-set-soft.webp', source: 'client-photography' },
    },
  }
  report.push(`About: ${r.file}`)
  const m = await build({ idx: 94, ratio: 4 / 5, cx: 0.5, cy: 0.52, widths: W, outDir: media('menu'), stem: 'menu-home-drive' })
  manifest.menu = {
    home: {
      src: web(m.defaultFile), alt: 'Cream armchair with a taupe wrap-around back on a marble floor in the Lucchi showroom',
      focalPoint: { x: 0.5, y: 0.5 }, aspect: '4/5', status: 'final', source: 'client-drive', clientFile: m.file,
      srcset: srcsetString(m), lqip: m.lqip, original: m.source,
    },
  }
  report.push(`Menu home: ${m.file}`)
}
if (!DRY) fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(report.join('\n'), `\n${(totalBytes / 1048576).toFixed(1)} MB written${DRY ? ' (dry run)' : ''}`)
