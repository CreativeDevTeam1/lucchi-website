import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

/* Ready-to-use ALTERNATE hero clips from the other MP4 sources (not used by the site, not uploaded:
   public/media/hero/alt/ is listed in .vercelignore).
   Run: node scripts/make-hero-alts.mjs "<folder with the mp4 files>"
   Each source plays "floating, then settles into the calm room". For the scroll hero (rest, peak, rest) it is
   encoded REVERSED, so frame 0 is the calm resting room and the last frame is the floating peak.
   Output per clip: alt-<n>-desktop.mp4 (1920x1080), alt-<n>-mobile.mp4 (896x1120, centre 4:5 crop),
   alt-<n>-poster.webp / alt-<n>-mobile-poster.webp. All intra (-g 1), no audio, CRF 22, no denoise or sharpen.
   To use one: copy it over hero-hq-* (or point HERO_VIDEO in src/config/heroMedia.js and index.html at it). */

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sharp = createRequire(path.join(root, 'package.json'))('sharp')
const outDir = path.join(root, 'public', 'media', 'hero', 'alt')
const srcDir = process.argv[2]
if (!srcDir) throw new Error('usage: node scripts/make-hero-alts.mjs "<folder with the mp4 files>"')
fs.mkdirSync(outDir, { recursive: true })

const CLIPS = [
  // [name, file, frames to keep]: 1.mp4 and 2.mp4 end with one black frame, which would become frame 0 when reversed.
  ['alt-1', '1.mp4', 120], // terracotta armchair, green-grey room
  ['alt-2', '2.mp4', 110], // green armchair, daylit sage room
  ['alt-3', '3 without merge.mp4', 125], // the live shot's first half (same room as the hero)
]
const BT709 = 'scale=out_color_matrix=bt709:out_range=tv'
const run = (args) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`)
}

for (const [name, file, frames] of CLIPS) {
  const input = path.join(srcDir, file)
  for (const [kind, crop, w, h] of [['desktop', '', 1920, 1080], ['mobile', 'crop=1152:1440:704:0,', 896, 1120]]) {
    const suffix = kind === 'desktop' ? '' : '-mobile'
    const mp4 = path.join(outDir, `${name}${suffix}.mp4`)
    const vf = `trim=end_frame=${frames},setpts=N/FRAME_RATE/TB,${crop}scale=${w}:${h}:flags=lanczos,reverse,${BT709},format=yuv420p,setsar=1`
    run(['-i', input, '-vf', vf, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-g', '1', '-keyint_min', '1', '-sc_threshold', '0', '-bf', '0', '-r', '24',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', mp4])
    const png = path.join(os.tmpdir(), `${name}${suffix}-f0.png`)
    run(['-i', mp4, '-frames:v', '1', png])
    await sharp(png).webp({ quality: 92, effort: 5 }).toFile(path.join(outDir, `${name}${suffix}-poster.webp`))
    fs.rmSync(png, { force: true })
    console.log(name, kind, (fs.statSync(mp4).size / 1048576).toFixed(1), 'MB')
  }
}
