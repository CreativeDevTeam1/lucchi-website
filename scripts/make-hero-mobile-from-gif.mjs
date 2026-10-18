import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

/* MOBILE scroll hero from the client's 4:5 GIF "Sequence-02_1.gif" (1080x1350, 25 fps, 57 frames).
   There is no mp4 of this clip, so the GIF is the source (256-colour palette, dithered).
   Needs ffmpeg on PATH. Run: node scripts/make-hero-mobile-from-gif.mjs "<path to Sequence-02_1.gif>" [width]
   The GIF starts chaotic (sofa tilted about 45 degrees, pillows flying) and ends calm. It is played BACKWARDS,
   so the clip STARTS on the resting frame and ENDS on the peak:
     REST_FRAME (56, the last GIF frame): sofa level, pillows settled, the calmest frame of the file.
     PEAK_FRAME (31): pillows high in the air, the sofa already almost level, the shot still wide.
     Frames 0-30 (tilted, close to 45 degrees) are not used.
   Output (public/media/hero): hero-mobile-seq.mp4 / .webm (every frame a keyframe, no audio, yuv420p, +faststart,
   25 fps, at most 3 MB each) and hero-mobile-seq-poster.webp (exact frame 0 of the encoded clip). The same mild tone
   step as the desktop clip. No denoise, no sharpen. Width 896 by default (4:5 = 896x1120). */

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sharp = createRequire(path.join(root, 'package.json'))('sharp')
const outDir = process.env.HERO_OUT_DIR || path.join(root, 'public', 'media', 'hero')
const gif = process.argv[2]
const WIDTH = Number(process.argv[3] || 896)
const HEIGHT = Math.round((WIDTH * 5) / 4)
if (!gif) throw new Error('usage: node scripts/make-hero-mobile-from-gif.mjs "<path to Sequence-02_1.gif>" [width]')

const REST_FRAME = 56
const PEAK_FRAME = 31
const LIMIT = 3 * 1048576
const TONE = 'eq=gamma=1.05:contrast=1.03'
const BT709 = 'scale=out_color_matrix=bt709:out_range=tv'
const NAME = WIDTH === 896 ? 'hero-mobile-seq' : `hero-mobile-seq-${WIDTH}`

const run = (args) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`)
}
const size = (file) => fs.statSync(file).size
const mb = (file) => (size(file) / 1048576).toFixed(2)

const mid = path.join(os.tmpdir(), `${NAME}.mkv`)
const base = path.join(outDir, NAME)
const vf = `select='between(n,${PEAK_FRAME},${REST_FRAME})',setpts=N/FRAME_RATE/TB,scale=${WIDTH}:${HEIGHT}:flags=lanczos,reverse,${TONE},${BT709},format=yuv420p,setsar=1`
run(['-i', gif, '-vf', vf, '-r', '25', '-an', '-c:v', 'ffv1', mid])

let chosen = null
for (const crf of [14, 16, 18, 20, 22, 24, 26, 28]) {
  run(['-i', mid, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-g', '1', '-keyint_min', '1', '-sc_threshold', '0', '-bf', '0',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', `${base}.mp4`])
  if (size(`${base}.mp4`) <= LIMIT) { chosen = crf; break }
}
if (chosen == null) throw new Error('mp4 does not fit 3 MB even at CRF 28')
console.log('mp4 crf', chosen, mb(`${base}.mp4`), 'MB')

let vp9 = null
for (const crf of [28, 32, 36, 40, 44, 48, 52, 56]) {
  run(['-i', mid, '-an', '-c:v', 'libvpx-vp9', '-crf', String(crf), '-b:v', '0', '-row-mt', '1', '-cpu-used', '1', '-pix_fmt', 'yuv420p',
    '-g', '1', '-lag-in-frames', '0',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', `${base}.webm`])
  if (size(`${base}.webm`) <= LIMIT) { vp9 = crf; break }
}
if (vp9 == null) { fs.rmSync(`${base}.webm`, { force: true }); console.log('webm: does not fit 3 MB, skipped (mp4 only)') } else console.log('webm crf', vp9, mb(`${base}.webm`), 'MB')

const png = path.join(os.tmpdir(), `${NAME}-f0.png`)
run(['-i', `${base}.mp4`, '-frames:v', '1', png])
await sharp(png).webp({ quality: 92, effort: 5 }).toFile(`${base}-poster.webp`)
console.log('poster', mb(`${base}-poster.webp`), 'MB')
fs.rmSync(png, { force: true })
fs.rmSync(mid, { force: true })
