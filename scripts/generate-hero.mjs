/**
 * Hero image pipeline.
 *
 * Reads one source photograph and writes every size / crop / format the hero
 * needs into public/media/hero, then patches the hero entries in
 * src/data/images.json so the component never hard-codes a path.
 *
 * Usage:  npm run hero            (uses hero-source.jpg)
 *         npm run hero -- my.jpg  (uses a different file)
 */

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

/* --------------------------------------------------------------------------
   CONFIG — tweak these, re-run `npm run hero`
   -------------------------------------------------------------------------- */

// The part of the photo that must survive every crop (0-1, from top-left).
// 0.62 / 0.56 = the cream bouclé sofa and round wood coffee table.
const FOCAL = { x: 0.62, y: 0.56 }

// Where the headline sits, so crops keep that side calm.
// 'left' keeps the quiet wall on the left of wide crops.
const COPY_SIDE = 'left'

// How each generated file is anchored when the screen crops it further
// (object-position, 0-1). Biased away from the headline so the quiet wall
// survives on wide screens; centred where the crop is already tight.
const ANCHOR = {
  desktop: { x: 0.34, y: 0.58 },
  wide: { x: 0.28, y: 0.5 },
  tablet: { x: 0.08, y: 0.56 },
  mobile: { x: 0.5, y: 0.5 },
}

const QUALITY = { avif: 62, webp: 78, jpeg: 80 }
const MAX_FILE_KB = 400

// Each variant: aspect ratio, the widths to emit for srcset, how much of the
// source width to use, and how far to slide off the focal point towards the
// copy side (0 = flush to the headline side, 1 = focal point dead centre).
const VARIANTS = {
  desktop: { aspect: 16 / 9, widths: [1024, 1280, 1920, 2560], use: 1, bias: 1, label: 'Desktop 16:9' },
  wide: { aspect: 2560 / 1200, widths: [1920, 2560], use: 0.88, bias: 0, label: 'Cinematic 2560x1200' },
  tablet: { aspect: 4 / 3, widths: [1200, 1600, 2000], use: 1, bias: 0.45, label: 'Tablet 4:3' },
  mobile: { aspect: 4 / 5, widths: [720, 1080, 1440], use: 1, bias: 1, label: 'Mobile 4:5' },
}

const ALT = {
  desktop:
    'A cream bouclé curved sectional sofa and round dark-wood coffee table on a jute rug in a sunlit Mediterranean living room, with an arched window framing cypress trees and the sea',
  wide:
    'Wide view of a cream bouclé curved sectional sofa and round dark-wood coffee table beside an arched window overlooking cypress trees and the sea',
  tablet:
    'A cream bouclé curved sectional sofa with a round dark-wood coffee table on a jute rug beside a tall arched window',
  mobile:
    'Close view of a cream bouclé curved sectional sofa and round dark-wood coffee table on a jute rug in a sunlit living room',
}

/* -------------------------------------------------------------------------- */

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const require = createRequire(path.join(root, 'package.json'))

let sharp
try {
  sharp = require('sharp')
} catch {
  console.error('\nsharp is not installed. Run:  npm run hero\n(that installs it for you), or: npm install --no-save sharp\n')
  process.exit(1)
}

const sourceArg = process.argv[2] || 'hero-source.jpg'
const sourcePath = path.resolve(root, sourceArg)
if (!fs.existsSync(sourcePath)) {
  console.error(`\nCould not find "${sourceArg}" in the project folder.\nDrop your photo in as hero-source.jpg and run this again.\n`)
  process.exit(1)
}

const outDir = path.join(root, 'public', 'media', 'hero')
fs.mkdirSync(outDir, { recursive: true })

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)
const kb = (bytes) => Math.round(bytes / 1024)

/** Largest window of the wanted aspect, positioned to keep FOCAL in frame. */
function cropWindow(srcW, srcH, { aspect, use, bias }) {
  const budget = Math.round(srcW * use)
  let w = budget
  let h = Math.round(budget / aspect)
  if (h > srcH) {
    h = srcH
    w = Math.min(budget, Math.round(srcH * aspect))
  }
  // Anchor on the focal point, then slide towards the copy side so the quiet
  // part of the photo survives behind the headline.
  const focalLeft = srcW * FOCAL.x - w / 2
  const left = COPY_SIDE === 'left' ? focalLeft * bias : srcW - w - (srcW - w - focalLeft) * bias
  const top = srcH * FOCAL.y - h / 2
  return {
    left: clamp(Math.round(left), 0, srcW - w),
    top: clamp(Math.round(top), 0, srcH - h),
    width: w,
    height: h,
  }
}

const meta = await sharp(sourcePath).metadata()
console.log(`\nSource: ${sourceArg} — ${meta.width}x${meta.height} ${meta.format}, ${kb(fs.statSync(sourcePath).size)} KB`)
if (meta.width < 2560) {
  console.log(`NOTE: this is narrower than 2560px, so the biggest sizes are enlarged from the original and will look softer on very large screens.`)
}

const report = []
const manifest = {}

for (const [key, cfg] of Object.entries(VARIANTS)) {
  const win = cropWindow(meta.width, meta.height, cfg)
  const base = sharp(sourcePath).extract(win)
  const entry = { widths: {}, crop: win }

  for (const width of cfg.widths) {
    const height = Math.round(width / cfg.aspect)
    const enlarging = width > win.width
    const resized = base
      .clone()
      .resize(width, height, { fit: 'cover', kernel: 'lanczos3', withoutEnlargement: false })
    // A touch of sharpening only when we had to enlarge the original.
    const prepared = enlarging ? resized.sharpen({ sigma: 0.7, m1: 0.4, m2: 0.5 }) : resized

    for (const [fmt, ext] of [['avif', 'avif'], ['webp', 'webp'], ['jpeg', 'jpg']]) {
      const file = `hero-${key}-${width}.${ext}`
      const dest = path.join(outDir, file)
      const pipeline = prepared.clone()
      if (fmt === 'avif') await pipeline.avif({ quality: QUALITY.avif, effort: 6 }).toFile(dest)
      else if (fmt === 'webp') await pipeline.webp({ quality: QUALITY.webp, effort: 6 }).toFile(dest)
      else await pipeline.jpeg({ quality: QUALITY.jpeg, mozjpeg: true }).toFile(dest)

      const size = fs.statSync(dest).size
      report.push({ variant: cfg.label, file, dims: `${width}x${height}`, kb: kb(size), over: kb(size) > MAX_FILE_KB })
      entry.widths[width] = entry.widths[width] || { width, height }
      entry.widths[width][fmt] = `/media/hero/${file}`
    }
  }

  // Tiny blurred stand-in, inlined, shown until the real photo arrives.
  const lqipBuf = await base
    .clone()
    .resize(20, Math.max(1, Math.round(20 / cfg.aspect)))
    .blur(1.1)
    .webp({ quality: 42 })
    .toBuffer()

  const widthsSorted = cfg.widths.slice().sort((a, b) => a - b)
  const srcset = (fmt) => widthsSorted.map((w) => `${entry.widths[w][fmt]} ${w}w`).join(', ')
  const biggest = widthsSorted[widthsSorted.length - 1]

  // Where the focal point ended up inside this particular crop.
  const focalInCrop = {
    x: +clamp((meta.width * FOCAL.x - win.left) / win.width, 0, 1).toFixed(3),
    y: +clamp((meta.height * FOCAL.y - win.top) / win.height, 0, 1).toFixed(3),
  }

  manifest[key] = {
    src: entry.widths[biggest].jpeg,
    alt: ALT[key],
    focalPoint: focalInCrop,
    objectPosition: ANCHOR[key],
    aspect: key === 'desktop' ? '16/9' : key === 'wide' ? '64/30' : key === 'tablet' ? '4/3' : '4/5',
    recommendedSize: `${biggest}x${Math.round(biggest / cfg.aspect)}`,
    status: 'final',
    srcset: { avif: srcset('avif'), webp: srcset('webp'), jpeg: srcset('jpeg') },
    lqip: `data:image/webp;base64,${lqipBuf.toString('base64')}`,
  }
}

/* --- patch src/data/images.json -------------------------------------------- */

const manifestPath = path.join(root, 'src', 'data', 'images.json')
const json = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const previous = json.hero || {}

// Keep whatever was there before as a fallback, once.
const legacy = previous.legacyFallback || (previous.desktop && previous.desktop.status === 'placeholder'
  ? { desktop: previous.desktop, mobile: previous.mobile }
  : undefined)

json.hero = { ...manifest }
if (legacy) json.hero.legacyFallback = legacy

fs.writeFileSync(manifestPath, `${JSON.stringify(json, null, 2)}\n`)

/* --- report ---------------------------------------------------------------- */

console.log(`\nWrote ${report.length} files to public/media/hero\n`)
const pad = (s, n) => String(s).padEnd(n)
console.log(pad('file', 30), pad('size', 12), 'weight')
for (const r of report) console.log(pad(r.file, 30), pad(r.dims, 12), `${r.kb} KB${r.over ? '  <-- over ' + MAX_FILE_KB + ' KB' : ''}`)
const total = report.reduce((a, r) => a + r.kb, 0)
console.log(`\ntotal ${total} KB · largest ${Math.max(...report.map((r) => r.kb))} KB`)
console.log('Updated src/data/images.json (hero entries).\n')
