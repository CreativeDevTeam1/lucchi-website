import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

/* Scroll hero from the original MP4 sources (never from the GIFs).
   Needs ffmpeg on PATH.
   Run: node scripts/make-hero-from-mp4.mjs "<folder with the mp4 files>" [desktop|mobile]
   - Desktop: "3 merge.mp4" (2560x1440, 24 fps), frames START..END (calm resting room, then the furniture lifts),
     scaled DOWN to 1920x1080. Mobile: the same frames, a 4:5 crop (1152x1440 from x = MOBILE_CROP_X) scaled down to 896x1120.
   - Every frame is a keyframe (-g 1), no B-frames, no audio, yuv420p, +faststart, so scroll = playhead is cheap.
   - Same mild tone step as the previous hero (gamma 1.05, contrast 1.03). No denoise, no sharpen.
   - The CRF is picked per file: the best quality that still fits the size limit (6 MB desktop, 3 MB mobile).
   - Poster = exact frame 0 of the encoded clip (webp, 1920 / 896 wide).
   Output: public/media/hero/hero-hq-{desktop,mobile}.{mp4,webm} and hero-hq-*-poster.webp. */

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sharp = createRequire(path.join(root, 'package.json'))('sharp')
const outDir = path.join(root, 'public', 'media', 'hero')
const srcDir = process.argv[2]
const ONLY = process.argv[3] // optional: 'desktop' or 'mobile' (the other files are left untouched)
if (!srcDir) throw new Error('usage: node scripts/make-hero-from-mp4.mjs "<folder with the mp4 files>"')
const SOURCE = path.join(srcDir, '3 merge.mp4')

const START = 122 // first frame: calm, cleanest resting frame (almost no motion between frames)
const PEAK_FRAMES = 82 // desktop: the peak = START + 82 (source frame 204): pillows highest, sofa and table still a wide shot. Later frames tilt and push in close, so they are cut.
const END = START + PEAK_FRAMES
const MOBILE_END = 200 // mobile: pillows still on screen in the 4:5 crop
const MOBILE_CROP_X = 850 // 4:5 crop of the 2560x1440 frame: keeps the sofa and (at rest) all three pillows
const TONE = 'eq=gamma=1.05:contrast=1.03'
const BT709 = 'scale=out_color_matrix=bt709:out_range=tv'
const MB = 1048576

const JOBS = [
  { name: 'desktop', end: END, crop: '', width: 1920, height: 1080, limit: 6 * MB },
  { name: 'mobile', end: MOBILE_END, crop: `crop=1152:1440:${MOBILE_CROP_X}:0,`, width: 896, height: 1120, limit: 3 * MB },
]

const run = (args, quiet = true) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`)
}
const size = (file) => fs.statSync(file).size
const mb = (file) => (size(file) / MB).toFixed(2)

for (const job of JOBS) {
  if (ONLY && job.name !== ONLY) continue
  const vf = `select='between(n,${START},${job.end})',setpts=N/FRAME_RATE/TB,${job.crop}scale=${job.width}:${job.height}:flags=lanczos,${TONE},${BT709},format=yuv420p,setsar=1`
  const mid = path.join(os.tmpdir(), `hero-hq-${job.name}.mkv`)
  const base = path.join(outDir, `hero-hq-${job.name}`)
  run(['-i', SOURCE, '-vf', vf, '-an', '-c:v', 'ffv1', mid])

  // H.264: best CRF that fits the limit.
  let chosen = null
  for (const crf of [16, 18, 20, 22, 24, 26, 28, 30, 32]) {
    run(['-i', mid, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-g', '1', '-keyint_min', '1', '-sc_threshold', '0', '-bf', '0',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', `${base}.mp4`])
    if (size(`${base}.mp4`) <= job.limit) { chosen = crf; break }
  }
  if (chosen == null) throw new Error(`${job.name} mp4 does not fit ${job.limit / MB} MB even at CRF 30`)
  console.log(job.name, 'mp4 crf', chosen, mb(`${base}.mp4`), 'MB')

  // WebM (VP9): same idea, all intra.
  let vp9 = null
  for (const crf of [36, 40, 44, 48, 52, 56, 60, 63]) {
    run(['-i', mid, '-an', '-c:v', 'libvpx-vp9', '-crf', String(crf), '-b:v', '0', '-row-mt', '1', '-cpu-used', '1', '-pix_fmt', 'yuv420p',
      '-g', '1', '-lag-in-frames', '0',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', `${base}.webm`])
    if (size(`${base}.webm`) <= job.limit) { vp9 = crf; break }
  }
  if (vp9 == null) {
    // No acceptable WebM inside the limit: ship the MP4 only (H.264 plays everywhere).
    fs.rmSync(`${base}.webm`, { force: true })
    console.log(job.name, 'webm: does not fit', job.limit / MB, 'MB, skipped (mp4 only)')
  } else console.log(job.name, 'webm crf', vp9, mb(`${base}.webm`), 'MB')

  // Poster: frame 0 of the encoded clip (decoded from the mp4 that ships).
  const png = path.join(os.tmpdir(), `hero-hq-${job.name}-f0.png`)
  run(['-i', `${base}.mp4`, '-frames:v', '1', png])
  await sharp(png).webp({ quality: 92, effort: 5 }).toFile(`${base}-poster.webp`)
  console.log(job.name, 'poster', mb(`${base}-poster.webp`), 'MB')
  fs.rmSync(png, { force: true })
  fs.rmSync(mid, { force: true })
}
