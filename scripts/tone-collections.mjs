import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

/* Mild, honest tone for the five Collections photos.
   Reads the untouched originals (<slug>-desktop.webp, <slug>-mobile.webp), writes new
   <slug>-<kind>-tone-* files, and points images.json at them. Older files stay on disk.
   Usage: node scripts/tone-collections.mjs [outDirForComparisons] */

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sharp = createRequire(path.join(root, 'package.json'))('sharp')

/* Same mild values on every photo; yellowPull is the only per-photo strength. */
const TONE = {
  blackLift: 0.035,
  highlightPull: 0.1,
  contrast: 0.94,
  saturation: 0.94,
}
const CATS = [
  { key: 'Living Room', slug: 'living-room', yellowPull: 1 },
  { key: 'Bedroom', slug: 'bedroom', yellowPull: 0.6 },
  { key: 'Dining', slug: 'dining', yellowPull: 0.6 },
  { key: 'Kids Bedroom', slug: 'kids-bedroom', yellowPull: 0.8 },
  { key: 'Accessories', slug: 'accessories', yellowPull: 0.6 },
]

const QUALITY = { avif: 80, webp: 80, jpeg: 80 }
const DESKTOP_WIDTHS = [800, 1280, 1920, 2560]
const MOBILE_WIDTHS = [800, 1080, 1440]
const OUT = path.join(root, 'public', 'media', 'categories')
const MANIFEST = path.join(root, 'src', 'data', 'images.json')
const REPORT = process.argv[2] || null

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function curve(t) {
  t = TONE.blackLift + t * (1 - TONE.blackLift)
  if (t > 0.75) {
    const u = (t - 0.75) / 0.25
    t = 0.75 + 0.25 * u * (1 - TONE.highlightPull)
  }
  t = 0.5 + (t - 0.5) * TONE.contrast
  return Math.min(1, Math.max(0, t))
}

async function tone(inputPath, yellowPull) {
  const { data, info } = await sharp(inputPath).rotate().removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.from(data)
  for (let i = 0; i < out.length; i += info.channels) {
    let r = curve(out[i] / 255)
    let g = curve(out[i + 1] / 255)
    let b = curve(out[i + 2] / 255)
    let y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    r = y + (r - y) * TONE.saturation
    g = y + (g - y) * TONE.saturation
    b = y + (b - y) * TONE.saturation
    // Pull back blown yellow: only bright, yellow-leaning pixels lose a little yellow.
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const yellow = Math.max(0, Math.min(r, g) - b)
    const k = yellow * 0.22 * yellowPull * smooth(0.55, 0.95, y)
    r -= k
    g -= k * 0.85
    out[i] = Math.round(Math.min(1, Math.max(0, r)) * 255)
    out[i + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255)
    out[i + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255)
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } })
}

const srcset = (base, widths, ext) => widths.map((w) => `${base}-${w}.${ext} ${w}w`).join(', ')

async function exportTone(graded, stem, nativeW, widths) {
  const used = widths.filter((w) => w <= nativeW + 8)
  for (const width of used) {
    const resized = graded.clone().resize({ width, withoutEnlargement: true })
    await resized.clone().avif({ quality: QUALITY.avif }).toFile(path.join(OUT, `${stem}-${width}.avif`))
    await resized.clone().webp({ quality: QUALITY.webp, effort: 4 }).toFile(path.join(OUT, `${stem}-${width}.webp`))
    await resized.clone().jpeg({ quality: QUALITY.jpeg, mozjpeg: true }).toFile(path.join(OUT, `${stem}-${width}.jpg`))
  }
  await graded.clone().webp({ quality: QUALITY.webp, effort: 4 }).toFile(path.join(OUT, `${stem}.webp`))
  const lqip = await graded.clone().resize({ width: 24 }).blur(12).webp({ quality: 38 }).toBuffer()
  return { used, lqip: `data:image/webp;base64,${lqip.toString('base64')}` }
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
for (const { key, slug, yellowPull } of CATS) {
  for (const kind of ['desktop', 'mobile']) {
    const srcPath = path.join(OUT, `${slug}-${kind}.webp`)
    const meta = await sharp(srcPath).metadata()
    const graded = await tone(srcPath, yellowPull)
    const stem = `${slug}-${kind}-tone`
    const widths = kind === 'desktop' ? DESKTOP_WIDTHS : MOBILE_WIDTHS
    const exported = await exportTone(graded, stem, meta.width || 0, widths)
    manifest.collections[key][kind].graded = {
      src: `/media/categories/${stem}.webp`,
      srcset: {
        avif: srcset(`/media/categories/${stem}`, exported.used, 'avif'),
        webp: srcset(`/media/categories/${stem}`, exported.used, 'webp'),
        jpeg: srcset(`/media/categories/${stem}`, exported.used, 'jpg'),
      },
      lqip: exported.lqip,
      width: meta.width,
      height: meta.height,
    }
    if (REPORT) {
      const h = 480
      const before = await sharp(srcPath).rotate().resize({ height: h }).jpeg({ quality: 85 }).toBuffer()
      const after = await graded.clone().resize({ height: h }).jpeg({ quality: 85 }).toBuffer()
      const bm = await sharp(before).metadata()
      const am = await sharp(after).metadata()
      await sharp({ create: { width: bm.width + am.width + 12, height: h, channels: 3, background: '#f4f1ec' } })
        .composite([{ input: before, left: 0, top: 0 }, { input: after, left: bm.width + 12, top: 0 }])
        .jpeg({ quality: 85 })
        .toFile(path.join(REPORT, `tone-${slug}-${kind}.jpg`))
    }
    console.log(key, kind, `${meta.width}x${meta.height}`, '->', exported.used.join(','))
  }
}
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
console.log('tone values', JSON.stringify(TONE))
