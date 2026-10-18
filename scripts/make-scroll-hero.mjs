import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

/* Scroll-driven hero: builds the scrub videos and posters from the client's banner GIFs.
   Needs ffmpeg on PATH. Output goes to public/media/hero/hero-scroll-*.
   Run: node scripts/make-scroll-hero.mjs <desktop.gif> <mobile.gif> [--dry]
   - Desktop: the clip from START_DESKTOP (calm, settled room) to the end (furniture lifts off).
   - Mobile: the clip played in REVERSE, so it starts on the settled room and the furniture lifts.
   - Every 2nd frame is a keyframe and there are no B-frames, so seeking is cheap (scroll = playhead).
   - One mild tone step is baked in here (no runtime CSS filters).
   - Poster = frame 0 of the same filtered clip, exported at high quality. */

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sharp = createRequire(path.join(root, 'package.json'))('sharp')
const outDir = path.join(root, 'public', 'media', 'hero')
const [desktopGif, mobileGif] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (!desktopGif || !mobileGif) throw new Error('usage: node scripts/make-scroll-hero.mjs <desktop.gif> <mobile.gif>')

const TONE = 'eq=gamma=1.05:contrast=1.03'
const DENOISE = 'hqdn3d=1.2:1.2:2:2' // light: removes the GIF dither only
const BT709 = 'scale=out_color_matrix=bt709:out_range=tv'

const JOBS = [
  {
    name: 'desktop', input: desktopGif, seek: ['-ss', '5.4'], dur: ['-t', '4.9'],
    pre: '', width: 1920, height: 1080, fps: 24,
    crf: 31, vp9: 44, posterWidth: 1920,
  },
  {
    name: 'mobile', input: mobileGif, seek: [], dur: [],
    pre: 'reverse,', width: 896, height: 1120, fps: 25,
    crf: 24, vp9: 36, posterWidth: 896,
  },
]

const run = (args) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`)
}
const mb = (file) => (fs.statSync(file).size / 1048576).toFixed(2)

for (const job of JOBS) {
  const mid = path.join(os.tmpdir(), `hero-scroll-${job.name}.mkv`)
  const base = path.join(outDir, `hero-scroll-${job.name}`)
  const vf = `${job.pre}fps=${job.fps},scale=${job.width}:${job.height}:flags=lanczos,${DENOISE},${TONE},${BT709},format=yuv420p,setsar=1`
  run([...job.seek, '-i', job.input, ...job.dur, '-vf', vf, '-an', '-c:v', 'ffv1', mid])

  // H.264: keyframe every 2nd frame, no B-frames, first 6 frames at higher quality (frame 0 is the poster).
  run(['-i', mid, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(job.crf), '-profile:v', 'high',
    '-pix_fmt', 'yuv420p', '-g', '2', '-keyint_min', '2', '-sc_threshold', '0', '-bf', '0',
    '-x264-params', `zones=0,6,crf=17`,
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', `${base}.mp4`])
  // WebM (VP9): same idea.
  run(['-i', mid, '-an', '-c:v', 'libvpx-vp9', '-crf', String(job.vp9), '-b:v', '0', '-row-mt', '1', '-cpu-used', '1',
    '-pix_fmt', 'yuv420p', '-g', '2', '-lag-in-frames', '0',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', `${base}.webm`])

  // Poster: frame 0 of the filtered clip (lossless), then webp + avif at high quality.
  const png = path.join(os.tmpdir(), `hero-scroll-${job.name}-f0.png`)
  run(['-i', mid, '-frames:v', '1', png])
  const image = sharp(png)
  await image.clone().webp({ quality: 92, effort: 5 }).toFile(`${base}-poster.webp`)
  await image.clone().avif({ quality: 72, effort: 6 }).toFile(`${base}-poster.avif`)
  fs.rmSync(png, { force: true })
  fs.rmSync(mid, { force: true })
  console.log(job.name, `mp4 ${mb(`${base}.mp4`)} MB`, `webm ${mb(`${base}.webm`)} MB`,
    `poster webp ${mb(`${base}-poster.webp`)} MB avif ${mb(`${base}-poster.avif`)} MB`)
}
