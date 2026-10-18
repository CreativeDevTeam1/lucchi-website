import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sharp = createRequire(path.join(root, 'package.json'))('sharp')

/* Tune the shared grade here. Same values on all five categories. */
export const GRADE = {
  blackLift: 0.06,
  highlightPull: 0.12,
  contrast: 0.93,
  saturation: 0.93,
  exposureStops: 0.2,
  warmShift: 0.006,
}

const QUALITY = { avif: 80, webp: 80, jpeg: 80 }
const DESKTOP_WIDTHS = [800, 1280, 1920, 2560]
const MOBILE_WIDTHS = [800, 1080, 1440]
const CATS = [
  { key: 'Living Room', slug: 'living-room' },
  { key: 'Bedroom', slug: 'bedroom' },
  { key: 'Dining', slug: 'dining' },
  { key: 'Kids Bedroom', slug: 'kids-bedroom' },
  { key: 'Accessories', slug: 'accessories' },
]

const OUT = path.join(root, 'public', 'media', 'categories')
const REPORT = path.join(root, 'grade-report')
const MANIFEST = path.join(root, 'src', 'data', 'images.json')

function curve(t) {
  const exp = 2 ** GRADE.exposureStops
  t = Math.min(1, Math.max(0, t * exp))
  t = GRADE.blackLift + t * (1 - GRADE.blackLift)
  if (t > 0.72) {
    const u = (t - 0.72) / 0.28
    t = 0.72 + 0.28 * u * (1 - GRADE.highlightPull)
  }
  t = 0.5 + (t - 0.5) * GRADE.contrast
  return Math.min(1, Math.max(0, t))
}

async function gradeRaw(inputPath) {
  const { data, info } = await sharp(inputPath)
    .rotate()
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true })

  const out = Buffer.from(data)
  const sat = GRADE.saturation
  const warm = GRADE.warmShift
  for (let i = 0; i < out.length; i += info.channels) {
    let r = out[i] / 255
    let g = out[i + 1] / 255
    let b = out[i + 2] / 255
    r = curve(r)
    g = curve(g)
    b = curve(b)
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    r = y + (r - y) * sat + warm
    g = y + (g - y) * sat + warm * 0.25
    b = y + (b - y) * sat - warm * 0.55
    out[i] = Math.round(Math.min(1, Math.max(0, r)) * 255)
    out[i + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255)
    out[i + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255)
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } })
}

function srcset(base, widths, ext) {
  return widths.map((width) => `${base}-${width}.${ext} ${width}w`).join(', ')
}

async function exportGraded(graded, stem, nativeW, widths) {
  const used = widths.filter((width) => width <= nativeW + 8)
  for (const width of used) {
    const resized = graded.clone().resize({ width, withoutEnlargement: true })
    await resized.clone().avif({ quality: QUALITY.avif }).toFile(path.join(OUT, `${stem}-${width}.avif`))
    await resized.clone().webp({ quality: QUALITY.webp, effort: 4 }).toFile(path.join(OUT, `${stem}-${width}.webp`))
    await resized.clone().jpeg({ quality: QUALITY.jpeg, mozjpeg: true }).toFile(path.join(OUT, `${stem}-${width}.jpg`))
  }
  await graded.clone().webp({ quality: QUALITY.webp, effort: 4 }).toFile(path.join(OUT, `${stem}.webp`))
  const lqipBuf = await graded.clone().resize({ width: 24 }).blur(12).webp({ quality: 38 }).toBuffer()
  return {
    used,
    lqip: `data:image/webp;base64,${lqipBuf.toString('base64')}`,
  }
}

async function compare(beforePath, afterSharp, dest, label) {
  const height = 420
  const left = await sharp(beforePath).rotate().resize({ height, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()
  const right = await afterSharp.clone().resize({ height, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()
  const L = await sharp(left).metadata()
  const R = await sharp(right).metadata()
  const gap = 16
  const width = (L.width || 320) + gap + (R.width || 320)
  const canvas = sharp({
    create: {
      width,
      height: height + 36,
      channels: 3,
      background: '#f4f1ec',
    },
  })
  const labeledLeft = await sharp(left)
    .extend({ top: 28, background: '#f4f1ec' })
    .composite([{
      input: Buffer.from(`<svg width="${L.width}" height="28"><text x="8" y="20" font-family="Georgia" font-size="14" fill="#2d3730">Before — ${label}</text></svg>`),
      top: 0,
      left: 0,
    }])
    .toBuffer()
  const labeledRight = await sharp(right)
    .extend({ top: 28, background: '#f4f1ec' })
    .composite([{
      input: Buffer.from(`<svg width="${R.width}" height="28"><text x="8" y="20" font-family="Georgia" font-size="14" fill="#2d3730">After — ${label}</text></svg>`),
      top: 0,
      left: 0,
    }])
    .toBuffer()
  await canvas
    .composite([
      { input: labeledLeft, top: 4, left: 0 },
      { input: labeledRight, top: 4, left: (L.width || 320) + gap },
    ])
    .jpeg({ quality: 82 })
    .toFile(dest)
}

fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(REPORT, { recursive: true })
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
const summary = { grade: GRADE, items: [] }

for (const { key, slug } of CATS) {
  const collection = manifest.collections[key]
  for (const kind of ['desktop', 'mobile']) {
    const stemOrig = `${slug}-${kind}`
    const srcPath = path.join(OUT, `${stemOrig}.webp`)
    const meta = await sharp(srcPath).metadata()
    const graded = await gradeRaw(srcPath)
    const stemSoft = `${stemOrig}-soft`
    const widths = kind === 'desktop' ? DESKTOP_WIDTHS : MOBILE_WIDTHS
    const exported = await exportGraded(graded, stemSoft, meta.width || 0, widths)
    await compare(srcPath, graded, path.join(REPORT, `${stemOrig}-before-after.jpg`), `${key} ${kind}`)

    collection[kind].graded = {
      src: `/media/categories/${stemSoft}.webp`,
      srcset: {
        avif: srcset(`/media/categories/${stemSoft}`, exported.used, 'avif'),
        webp: srcset(`/media/categories/${stemSoft}`, exported.used, 'webp'),
        jpeg: srcset(`/media/categories/${stemSoft}`, exported.used, 'jpg'),
      },
      lqip: exported.lqip,
      width: meta.width,
      height: meta.height,
    }

    summary.items.push({
      category: key,
      kind,
      source: `${meta.width}x${meta.height}`,
      widths: exported.used,
    })
    console.log(key, kind, meta.width, 'x', meta.height, '→', exported.used.join(','))
  }
}

fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
fs.writeFileSync(path.join(REPORT, 'grade-values.json'), `${JSON.stringify(summary, null, 2)}\n`)
console.log('graded files in', OUT)
console.log('comparisons in', REPORT)
