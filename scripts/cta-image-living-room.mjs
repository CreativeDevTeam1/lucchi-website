import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

/* Contact CTA image (homepage closing block, 4:3 frame): the client's 1536x1536 living-room picture.
   Crops the square to 4:3 (the same ratio the frame uses), keeps the furniture, writes responsive avif + webp
   into public/media/contact (new names; the earlier cta-drive-* files are left in place) and updates images.json.
   Usage: node scripts/cta-image-living-room.mjs <source image> */

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sharp = createRequire(path.join(root, 'package.json'))('sharp')
const SOURCE = process.argv[2]
const MANIFEST = path.join(root, 'src', 'data', 'images.json')
const OUT = path.join(root, 'public', 'media', 'contact')
const STEM = 'cta-living-room'
const WIDTHS = [640, 1080, 1536]
const CY = 0.58 // vertical centre of the 4:3 crop: keeps all the furniture, trims ceiling and some floor
const ALT = 'Living room with curved cream sofas and armchairs around a dark coffee table, in front of a travertine wall'

const meta = await sharp(SOURCE).metadata()
const w = meta.width
const h = Math.round(w * 3 / 4)
const top = Math.min(meta.height - h, Math.max(0, Math.round(meta.height * CY - h / 2)))
const base = sharp(SOURCE).rotate().extract({ left: 0, top, width: w, height: h })

fs.mkdirSync(OUT, { recursive: true })
const webp = []
const avif = []
for (const width of WIDTHS.filter((x) => x <= w)) {
  await base.clone().resize({ width }).webp({ quality: 82, effort: 5 }).toFile(path.join(OUT, `${STEM}-${width}.webp`))
  await base.clone().resize({ width }).avif({ quality: 55, effort: 5 }).toFile(path.join(OUT, `${STEM}-${width}.avif`))
  webp.push(`/media/contact/${STEM}-${width}.webp ${width}w`)
  avif.push(`/media/contact/${STEM}-${width}.avif ${width}w`)
}
const lqip = await base.clone().resize({ width: 24 }).blur(12).webp({ quality: 38 }).toBuffer()

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
const old = manifest.contact.cta
manifest.contact.cta = {
  src: `/media/contact/${STEM}-${w}.webp`,
  alt: ALT,
  focalPoint: { x: 0.5, y: 0.5 },
  aspect: '4/3',
  width: w,
  height: h,
  status: 'final',
  source: 'client-supplied',
  srcset: { avif: avif.join(', '), webp: webp.join(', ') },
  lqip: `data:image/webp;base64,${lqip.toString('base64')}`,
  original: `${meta.width}x${meta.height}`,
  previous: { src: old?.src, note: 'Previous CTA picture (cta-drive-*), files kept in public/media/contact' },
}
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
console.log('done', `${w}x${h}`, 'crop top', top, WIDTHS.filter((x) => x <= w).join(','))
