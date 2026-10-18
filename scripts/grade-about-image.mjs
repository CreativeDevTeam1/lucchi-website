import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sharp = createRequire(path.join(root, 'package.json'))('sharp')
const GRADE = {
  blackLift: 0.06,
  highlightPull: 0.12,
  contrast: 0.93,
  saturation: 0.93,
  exposureStops: 0.2,
  warmShift: 0.006,
}
const SRC = path.join(root, 'public', 'media', 'catalogue', 'curve-set', 'collection-primary.jpg')
const OUT = path.join(root, 'public', 'media', 'about')
const WIDTHS = [640, 800, 1080]
const QUALITY = { avif: 80, webp: 80, jpeg: 80 }

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

const { data, info } = await sharp(SRC).rotate().removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
const out = Buffer.from(data)
for (let i = 0; i < out.length; i += info.channels) {
  let r = out[i] / 255
  let g = out[i + 1] / 255
  let b = out[i + 2] / 255
  r = curve(r)
  g = curve(g)
  b = curve(b)
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  r = y + (r - y) * GRADE.saturation + GRADE.warmShift
  g = y + (g - y) * GRADE.saturation + GRADE.warmShift * 0.25
  b = y + (b - y) * GRADE.saturation - GRADE.warmShift * 0.55
  out[i] = Math.round(Math.min(1, Math.max(0, r)) * 255)
  out[i + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255)
  out[i + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255)
}

const image = sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } })
fs.mkdirSync(OUT, { recursive: true })
const used = WIDTHS.filter((w) => w <= info.width + 8)
for (const w of used) {
  const resized = image.clone().resize({ width: w, withoutEnlargement: true })
  await resized.clone().avif({ quality: QUALITY.avif }).toFile(path.join(OUT, `curve-set-soft-${w}.avif`))
  await resized.clone().webp({ quality: QUALITY.webp, effort: 4 }).toFile(path.join(OUT, `curve-set-soft-${w}.webp`))
  await resized.clone().jpeg({ quality: QUALITY.jpeg, mozjpeg: true }).toFile(path.join(OUT, `curve-set-soft-${w}.jpg`))
}
await image.clone().webp({ quality: QUALITY.webp, effort: 4 }).toFile(path.join(OUT, 'curve-set-soft.webp'))
console.log(JSON.stringify({ source: `${info.width}x${info.height}`, widths: used, out: 'public/media/about' }))
