import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sharp = createRequire(path.join(root, 'package.json'))('sharp')

const WEB = path.join(root, 'client-assets', 'Lucchi website')
const OUT = path.join(root, 'public', 'media', 'selected')
const MANIFEST = path.join(root, 'src', 'data', 'images.json')
const QUALITY = { avif: 62, webp: 80, jpeg: 80 }
const WIDTHS = [800, 1200, 1600]
const CANVAS = { width: 1600, height: 2000, background: '#f4f1ec' }

const PICKS = {
  'electric-decorative-fireplace': {
    productId: 'electric-decorative-fireplace',
    productName: 'Electric Decorative Fireplace',
    category: 'Accessories',
    productCode: 'Fireplace',
    full: {
      rel: path.join('table 3', 'magnific_photo-a-black-electric-fi_gO2taaYSXO.JPG'),
      mode: 'contain',
    },
    detail: {
      rel: path.join('table 3', 'magnific_photo-a-black-electric-fi_gO2taaYSXO.JPG'),
      mode: 'cover',
      gravity: 'centre',
    },
    context: null,
  },
  'side-table': {
    productId: 'side-table',
    productName: 'Side Table',
    category: 'Accessories',
    productCode: '',
    full: {
      rel: path.join('table 1', 'magnific_photo-a-round-dark-brown-_YMmsNauWeC.JPG'),
      mode: 'contain',
    },
    detail: {
      rel: path.join('table 1', 'magnific_photo-a-round-dark-brown-_YMmsNauWeC.JPG'),
      mode: 'cover',
      gravity: 'north',
    },
    context: {
      rel: path.join('table 1', 'magnific_photo-a-wooden-table-with_CqlzX3jEEy.JPG'),
      mode: 'contain',
    },
  },
  'pedestal-table': {
    productId: 'pedestal-table',
    productName: 'Pedestal Table',
    category: 'Accessories',
    productCode: '',
    full: {
      rel: path.join('table 2', 'magnific_photo-a-gold-ornate-table_ks4pHVI16B.JPG'),
      mode: 'contain',
    },
    detail: {
      rel: path.join('table 2', 'magnific_photo-a-gold-ornate-table_ks4pHVI16B.JPG'),
      mode: 'cover',
      gravity: 'centre',
    },
    context: null,
  },
  'table-lamp': {
    productId: 'table-lamp',
    productName: 'Table Lamp',
    category: 'Accessories',
    productCode: '',
    full: {
      rel: path.join('lamp 2', 'magnific_photo-a-modern-gold-floor_N2Mb4DZ6D9.jpg'),
      mode: 'contain',
    },
    detail: {
      rel: path.join('lamp 2', 'magnific_photo-a-modern-gold-floor_N2Mb4DZ6D9.jpg'),
      mode: 'cover',
      gravity: 'north',
    },
    context: null,
  },
}

function srcset(base, ext) {
  return WIDTHS.map((width) => `${base}-${width}.${ext} ${width}w`).join(', ')
}

async function exportView(src, stem, { mode, gravity }) {
  const meta = await sharp(src).rotate().metadata()
  for (const width of WIDTHS) {
    if (width > (meta.width || 0) + 8) continue
    const height = Math.round((width * CANVAS.height) / CANVAS.width)
    const pipeline = sharp(src).rotate().resize({
      width,
      height,
      fit: mode === 'cover' ? 'cover' : 'contain',
      position: gravity || 'centre',
      withoutEnlargement: true,
      background: CANVAS.background,
    })
    await pipeline.clone().avif({ quality: QUALITY.avif }).toFile(path.join(OUT, `${stem}-${width}.avif`))
    await pipeline.clone().webp({ quality: QUALITY.webp, effort: 4 }).toFile(path.join(OUT, `${stem}-${width}.webp`))
    await pipeline.clone().jpeg({ quality: QUALITY.jpeg, mozjpeg: true }).toFile(path.join(OUT, `${stem}-${width}.jpg`))
  }
  const master = Math.max(...WIDTHS.filter((width) => width <= (meta.width || 0)))
  const masterH = Math.round((master * CANVAS.height) / CANVAS.width)
  await sharp(src).rotate().resize({
    width: master,
    height: masterH,
    fit: mode === 'cover' ? 'cover' : 'contain',
    position: gravity || 'centre',
    withoutEnlargement: true,
    background: CANVAS.background,
  }).webp({ quality: QUALITY.webp, effort: 4 }).toFile(path.join(OUT, `${stem}.webp`))
  const lqip = await sharp(src).rotate().resize(20, 25, {
    fit: 'contain',
    background: CANVAS.background,
  }).blur(2).webp({ quality: 36 }).toBuffer()
  return {
    width: meta.width,
    height: meta.height,
    lqip: `data:image/webp;base64,${lqip.toString('base64')}`,
  }
}

function pendingSlot(productName, view) {
  return {
    src: '',
    alt: `${productName} ${view} view pending`,
    focalPoint: { x: 0.5, y: 0.5 },
    aspect: '4/5',
    status: 'pending',
  }
}

fs.mkdirSync(OUT, { recursive: true })
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
const previous = { ...(manifest.selectedPieces || {}) }

for (const [slug, pick] of Object.entries(PICKS)) {
  const entry = {
    productId: pick.productId,
    productName: pick.productName,
    category: pick.category,
    productCode: pick.productCode,
    fallback: previous[slug] || previous[pick.productId] || null,
  }
  for (const view of ['full', 'detail', 'context']) {
    const spec = pick[view]
    if (!spec) {
      entry[view] = pendingSlot(pick.productName, view)
      console.log(slug, view, 'pending')
      continue
    }
    const abs = path.join(WEB, spec.rel)
    const stem = `selected-${slug}-${view}`
    const meta = await exportView(abs, stem, spec)
    entry[view] = {
      src: `/media/selected/${stem}.webp`,
      alt: `${pick.productName} ${view} view`,
      focalPoint: { x: 0.5, y: 0.52 },
      aspect: '4/5',
      status: 'placeholder',
      source: 'client-photography',
      clientFile: spec.rel.split(path.sep).join('/'),
      referenceSrc: previous[slug]?.[view]?.src || previous[pick.productId]?.[view]?.src || '',
      srcset: {
        avif: srcset(`/media/selected/${stem}`, 'avif'),
        webp: srcset(`/media/selected/${stem}`, 'webp'),
        jpeg: srcset(`/media/selected/${stem}`, 'jpg'),
      },
      lqip: meta.lqip,
      original: `${meta.width}x${meta.height}`,
    }
    console.log(slug, view, meta.width, 'x', meta.height)
  }
  manifest.selectedPieces[slug] = entry
}

fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
console.log('wrote', OUT)
