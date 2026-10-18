import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sharp = createRequire(path.join(root, 'package.json'))('sharp')

const WEB = path.join(root, 'client-assets', 'Lucchi website')
const OUT = path.join(root, 'public', 'media', 'categories')
const MANIFEST = path.join(root, 'src', 'data', 'images.json')

const QUALITY = { avif: 62, webp: 80, jpeg: 80 }
const DESKTOP_WIDTHS = [800, 1280, 1920, 2560]
const MOBILE_WIDTHS = [800, 1080, 1440]

const PICKS = {
  'Living Room': {
    desktop: {
      rel: path.join('lucchi', 'طقم كيرف', 'magnific_photo-a-modern-living-roo_tCxJDkpmZJ.JPG'),
      productId: 'curve-set',
      productName: 'Curve Set',
      alt: 'Curve Set living room by Lucchi Furniture',
      why: 'Full sofa, table and chair visible with floor around them',
      weakness: 'Glass wall behind is a little dark',
    },
    mobile: {
      rel: path.join('lucchi', 'طقم كيرف', 'magnific_photo-a-creamcolored-curv_BhKSYI0oQR.JPG'),
      productId: 'curve-set',
      productName: 'Curve Set',
      alt: 'Curve sofa by Lucchi Furniture',
      why: 'Single sofa centred, easier to read on a tall phone card',
      weakness: 'Ottoman on the left is slightly cut',
    },
  },
  Bedroom: {
    desktop: {
      rel: path.join('room 1', 'magnific_photo-a-bedroom-with-a-la_bxOV9Dw5Y2.JPG'),
      productId: 'areej-bedroom',
      productName: 'Areej Bedroom',
      alt: 'Bedroom suite by Lucchi Furniture',
      why: 'Whole bed, wardrobe and desk in frame with empty floor',
      weakness: 'Showroom styling, not a finished home',
    },
    mobile: {
      rel: path.join('lucchi', 'نوم اريج', 'magnific_photo-a-kingsize-bed-with_1l6ztghr4r.JPG'),
      productId: 'areej-bedroom',
      productName: 'Areej Bedroom',
      alt: 'Areej bedroom bed by Lucchi Furniture',
      why: 'Bed centred and complete, no signage or people',
      weakness: 'Less of the full suite visible',
    },
  },
  Dining: {
    desktop: {
      rel: path.join('lucchi', 'سفره رهف', 'magnific_photo-a-dining-room-with-_WDa5vwAcXe.JPG'),
      productId: 'rahaf-dining-table',
      productName: 'Rahaf Dining Table',
      alt: 'Rahaf dining set by Lucchi Furniture',
      why: 'Table, chairs, buffet and vitrine all visible',
      weakness: 'Stairs on the left edge',
    },
    mobile: {
      rel: path.join('room13', 'magnific_photo-a-dining-room-with-_s7RIr2Hl8e.JPG'),
      productId: 'rahaf-dining-table',
      productName: 'Rahaf Dining Table',
      alt: 'Dining table and chairs by Lucchi Furniture',
      why: 'Frontal table with chairs, less side clutter',
      weakness: 'Table top is slightly cropped at the sides',
    },
  },
  'Kids Bedroom': {
    desktop: {
      rel: path.join('lucchi', 'نوم اطفال جولف', 'magnific_photo-two-twin-beds-with-_mEjJq43hJQ.JPG'),
      productId: 'golf-kids-bedroom-set',
      productName: "Golf Kids' Bedroom Set",
      alt: 'Kids twin bedroom by Lucchi Furniture',
      why: 'Both beds, dresser and wardrobe visible with floor space',
      weakness: 'Air-conditioning unit in the corner',
    },
    mobile: {
      rel: path.join('lucchi', 'اطفال بونكيو', 'magnific_photo-a-bedroom-with-two-_6AehMk2iJO.JPG'),
      productId: 'bonkio-kids-bedroom-set',
      productName: "Bonkio Kids' Bedroom Set",
      alt: 'Kids single bed by Lucchi Furniture',
      why: 'Clean single bed, easy to read on a tall card',
      weakness: 'Second bed is only just in frame',
    },
  },
  Accessories: {
    desktop: {
      rel: path.join('table 3', 'magnific_photo-a-black-electric-fi_gO2taaYSXO.JPG'),
      productId: 'electric-decorative-fireplace',
      productName: 'Electric Decorative Fireplace',
      alt: 'Electric decorative fireplace by Lucchi Furniture',
      why: 'Only clean full-piece accessories photo; whole fireplace visible',
      weakness: 'Wallpaper backdrop and a visible cable; no wider room shot',
    },
    mobile: {
      rel: path.join('table 3', 'magnific_photo-a-black-electric-fi_gO2taaYSXO.JPG'),
      productId: 'electric-decorative-fireplace',
      productName: 'Electric Decorative Fireplace',
      alt: 'Electric decorative fireplace by Lucchi Furniture',
      why: 'Same source; no second clean accessories photo',
      weakness: 'Same wallpaper and cable',
    },
  },
}

function srcset(base, widths, ext) {
  return widths.map((width) => `${base}-${width}.${ext} ${width}w`).join(', ')
}

async function exportSet(src, stem, widths, { contain, background }) {
  const meta = await sharp(src).rotate().metadata()
  const notes = { width: meta.width, height: meta.height, format: meta.format }
  for (const width of widths) {
    if (width > (meta.width || 0) + 8) continue
    const pipeline = sharp(src).rotate().resize({
      width,
      height: contain ? Math.round(width * 1.25) : undefined,
      fit: contain ? 'contain' : 'inside',
      withoutEnlargement: true,
      background: background || '#f4f1ec',
    })
    await pipeline.clone().avif({ quality: QUALITY.avif }).toFile(path.join(OUT, `${stem}-${width}.avif`))
    await pipeline.clone().webp({ quality: QUALITY.webp, effort: 4 }).toFile(path.join(OUT, `${stem}-${width}.webp`))
    await pipeline.clone().jpeg({ quality: QUALITY.jpeg, mozjpeg: true }).toFile(path.join(OUT, `${stem}-${width}.jpg`))
  }
  const master = Math.max(...widths.filter((width) => width <= (meta.width || 0)))
  await sharp(src).rotate().resize({ width: master, withoutEnlargement: true })
    .webp({ quality: QUALITY.webp, effort: 4 })
    .toFile(path.join(OUT, `${stem}.webp`))
  return notes
}

fs.mkdirSync(OUT, { recursive: true })
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
const report = []

for (const [category, slots] of Object.entries(PICKS)) {
  const slug = category.toLowerCase().replace(/\s+/g, '-')
  const collection = manifest.collections[category]
  const previousDesktop = collection.desktop?.src
  const previousMobile = collection.mobile?.src

  for (const kind of ['desktop', 'mobile']) {
    const pick = slots[kind]
    const abs = path.join(WEB, pick.rel)
    const stem = `${slug}-${kind}`
    const widths = kind === 'desktop' ? DESKTOP_WIDTHS : MOBILE_WIDTHS
    const meta = await exportSet(abs, stem, widths, {
      contain: kind === 'mobile',
      background: '#f4f1ec',
    })
    collection[kind] = {
      productId: pick.productId,
      productName: pick.productName,
      src: `/media/categories/${stem}.webp`,
      alt: pick.alt,
      focalPoint: { x: 0.5, y: 0.52 },
      aspect: kind === 'desktop' ? '3/2' : '4/5',
      status: 'placeholder',
      source: 'client-photography',
      referenceSrc: kind === 'desktop' ? previousDesktop : previousMobile,
      srcset: {
        avif: srcset(`/media/categories/${stem}`, widths, 'avif'),
        webp: srcset(`/media/categories/${stem}`, widths, 'webp'),
        jpeg: srcset(`/media/categories/${stem}`, widths, 'jpg'),
      },
    }
    report.push({
      category,
      kind,
      source: pick.rel.replace(/\\/g, '/'),
      original: `${meta.width}x${meta.height}`,
      why: pick.why,
      weakness: pick.weakness,
    })
    console.log(category, kind, meta.width, 'x', meta.height)
  }
}

fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
fs.writeFileSync(path.join(OUT, 'selection.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log('wrote', OUT)
