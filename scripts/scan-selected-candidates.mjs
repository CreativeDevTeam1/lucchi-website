import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sharp = createRequire(path.join(root, 'package.json'))('sharp')

const WEB = path.join(root, 'client-assets', 'Lucchi website')
const OUT = path.join(root, 'client-assets', '_previews', 'selected-scan')
fs.mkdirSync(OUT, { recursive: true })

const folders = [
  'coffe corner',
  'Coffee corner 2',
  'lamp 2',
  'table 1',
  'table 2',
  'table 3',
]

const nameRe = /chair|armchair|كرسي|pouf|ottoman|stool|console|lamp|coffee|nightstand|vanity|mirror|fireplace/i
const imgRe = /\.(jpe?g|png|webp)$/i

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name)
    const stat = fs.statSync(abs)
    if (stat.isDirectory()) walk(abs, acc)
    else if (imgRe.test(name) && nameRe.test(name)) acc.push(abs)
  }
  return acc
}

const rows = []

async function one(abs, tag) {
  const meta = await sharp(abs).rotate().metadata()
  const stem = `${tag}-${path.basename(abs)}`.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 90)
  const dest = path.join(OUT, `${stem}.jpg`)
  await sharp(abs).rotate().resize({ width: 720, withoutEnlargement: true }).jpeg({ quality: 72 }).toFile(dest)
  const rel = path.relative(WEB, abs).split(path.sep).join('/')
  rows.push({
    tag,
    file: rel,
    w: meta.width,
    h: meta.height,
    format: meta.format,
    bytes: fs.statSync(abs).size,
    preview: dest,
  })
  console.log(tag, `${meta.width}x${meta.height}`, path.basename(abs))
}

for (const folder of folders) {
  const dir = path.join(WEB, folder)
  if (!fs.existsSync(dir)) {
    console.log('missing', folder)
    continue
  }
  for (const name of fs.readdirSync(dir)) {
    if (!imgRe.test(name)) continue
    await one(path.join(dir, name), folder)
  }
}

for (const abs of walk(path.join(WEB, 'lucchi'))) {
  await one(abs, 'lucchi-match')
}

fs.writeFileSync(path.join(OUT, 'scan.json'), `${JSON.stringify(rows, null, 2)}\n`)
console.log('TOTAL', rows.length)
