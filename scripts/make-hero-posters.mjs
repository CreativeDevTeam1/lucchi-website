import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

/* Hero posters = frame 0 of the hero videos, so the poster and the video look the same.
   Needs ffmpeg on PATH. Output: public/media/hero/hero-banner-poster-{desktop,mobile}.{webp,avif}
   Run: node scripts/make-hero-posters.mjs */

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sharp = createRequire(path.join(root, 'package.json'))('sharp')
const dir = path.join(root, 'public', 'media', 'hero')

const JOBS = [
  { video: 'hero-banner-desktop.mp4', name: 'hero-banner-poster-desktop' },
  { video: 'hero-banner-mobile.mp4', name: 'hero-banner-poster-mobile' },
]

for (const { video, name } of JOBS) {
  const png = path.join(os.tmpdir(), `${name}.png`)
  // The videos carry no colour tags; browsers treat HD as BT.709, so convert the same way.
  const run = spawnSync('ffmpeg', [
    '-v', 'error', '-y', '-i', path.join(dir, video), '-frames:v', '1',
    '-vf', 'scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24',
    png,
  ], { encoding: 'utf8' })
  if (run.status !== 0) throw new Error(`ffmpeg failed for ${video}: ${run.stderr}`)
  const image = sharp(png)
  const meta = await image.metadata()
  await image.clone().webp({ quality: 84, effort: 5 }).toFile(path.join(dir, `${name}.webp`))
  await image.clone().avif({ quality: 62 }).toFile(path.join(dir, `${name}.avif`))
  fs.rmSync(png, { force: true })
  console.log(name, `${meta.width}x${meta.height}`, 'from', video)
}
