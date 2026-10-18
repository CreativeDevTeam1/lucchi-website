import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

/* Deploy-size trim, step 2. Run once: node scripts/trim-deploy-srcsets.mjs
   - removes the JPEG fallback list (srcset.jpeg) from every image slot, so <img> uses its WebP `src`
   - removes 2560w candidates from srcset.avif / srcset.webp (a missing candidate would be a broken image)
   The hero block is left alone: the hero still image is referenced directly (src = a JPG).
   No file is deleted. The files themselves are only left out of the upload in .vercelignore. */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = path.join(root, 'src', 'data', 'images.json')
const manifest = JSON.parse(fs.readFileSync(file, 'utf8'))

let jpegLists = 0
let w2560 = 0
const dropWidth = (list) => list.split(',').map((s) => s.trim()).filter((s) => !/\s2560w$/.test(s)).join(', ')

const walk = (node, inHero) => {
  if (!node || typeof node !== 'object') return
  for (const key of Object.keys(node)) {
    const value = node[key]
    if (key === 'hero' && node === manifest) { walk(value, true); continue }
    if (!inHero && key === 'srcset' && value && typeof value === 'object') {
      if (value.jpeg) { delete value.jpeg; jpegLists += 1 }
      for (const fmt of ['avif', 'webp']) {
        if (typeof value[fmt] === 'string' && / 2560w/.test(value[fmt])) { value[fmt] = dropWidth(value[fmt]); w2560 += 1 }
      }
      continue
    }
    walk(value, inHero)
  }
}
walk(manifest, false)

fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`removed ${jpegLists} JPEG srcset lists and 2560w from ${w2560} srcsets`)
