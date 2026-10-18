import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sharp = createRequire(path.join(root, 'package.json'))('sharp')
const OUT = path.join(root, 'public', 'media', 'categories')
const REPORT = path.join(root, 'grade-report')

const ITEMS = [
  'living-room-desktop',
  'living-room-mobile',
  'bedroom-desktop',
  'bedroom-mobile',
  'dining-desktop',
  'dining-mobile',
  'kids-bedroom-desktop',
  'kids-bedroom-mobile',
  'accessories-desktop',
  'accessories-mobile',
]

fs.mkdirSync(REPORT, { recursive: true })

for (const stem of ITEMS) {
  const beforePath = path.join(OUT, `${stem}.webp`)
  const afterPath = path.join(OUT, `${stem}-soft.webp`)
  const dest = path.join(REPORT, `${stem}-before-after.jpg`)
  const height = 420
  const left = await sharp(beforePath).rotate().resize({ height, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()
  const right = await sharp(afterPath).rotate().resize({ height, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()
  const L = await sharp(left).metadata()
  const R = await sharp(right).metadata()
  const gap = 16
  const labeledLeft = await sharp(left)
    .extend({ top: 28, background: '#f4f1ec' })
    .composite([{
      input: Buffer.from(`<svg width="${L.width}" height="28"><text x="8" y="20" font-family="Georgia" font-size="14" fill="#2d3730">Before — ${stem}</text></svg>`),
      top: 0,
      left: 0,
    }])
    .toBuffer()
  const labeledRight = await sharp(right)
    .extend({ top: 28, background: '#f4f1ec' })
    .composite([{
      input: Buffer.from(`<svg width="${R.width}" height="28"><text x="8" y="20" font-family="Georgia" font-size="14" fill="#2d3730">After — ${stem}</text></svg>`),
      top: 0,
      left: 0,
    }])
    .toBuffer()
  await sharp({
    create: {
      width: (L.width || 320) + gap + (R.width || 320),
      height: height + 36,
      channels: 3,
      background: '#f4f1ec',
    },
  })
    .composite([
      { input: labeledLeft, top: 4, left: 0 },
      { input: labeledRight, top: 4, left: (L.width || 320) + gap },
    ])
    .jpeg({ quality: 82 })
    .toFile(dest)
  console.log('wrote', dest)
}
