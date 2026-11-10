/**
 * Tells a "cut-out on a white background" picture from a styled-room scene.
 * It downloads a tiny PNG rendition of the picture from the Sanity image CDN (about 1 KB) and measures how much
 * of its outer edge is near white. No dependency. On any failure the answer is "not plain", so a picture is never hidden by mistake.
 */
import zlib from 'node:zlib'

const SIZE = 48 // px, longest side of the rendition
const EDGE = 4 // px, thickness of the edge ring that is measured
const EDGE_SHARE = 0.3 // measured: rooms at most 12% near white, white-background shots at least 18% (nearly all above 75%)
const NEAR_WHITE = 240
const PNG_SIGNATURE = '89504e470d0a1a0a'

// Minimal PNG reader for the 8-bit, non-interlaced previews Sanity makes. Returns null for anything else.
function decodePng(buffer) {
  if (buffer.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) return null
  let width = 0
  let height = 0
  let channels = 0
  const parts = []
  for (let pos = 8; pos < buffer.length;) {
    const length = buffer.readUInt32BE(pos)
    const type = buffer.toString('ascii', pos + 4, pos + 8)
    const body = buffer.subarray(pos + 8, pos + 8 + length)
    if (type === 'IHDR') {
      width = body.readUInt32BE(0)
      height = body.readUInt32BE(4)
      const depth = body[8]
      const colour = body[9]
      const interlace = body[12]
      channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colour] || 0
      if (depth !== 8 || interlace !== 0 || !channels) return null
    } else if (type === 'IDAT') parts.push(body)
    else if (type === 'IEND') break
    pos += 12 + length
  }
  if (!width || !height || !parts.length) return null
  const raw = zlib.inflateSync(Buffer.concat(parts))
  const stride = width * channels
  const out = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const row = y * stride
    const src = y * (stride + 1) + 1
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? out[row + x - channels] : 0
      const up = y ? out[row - stride + x] : 0
      const upLeft = y && x >= channels ? out[row - stride + x - channels] : 0
      let value = raw[src + x]
      if (filter === 1) value += left
      else if (filter === 2) value += up
      else if (filter === 3) value += (left + up) >> 1
      else if (filter === 4) {
        const p = left + up - upLeft
        const pa = Math.abs(p - left)
        const pb = Math.abs(p - up)
        const pc = Math.abs(p - upLeft)
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft
      }
      out[row + x] = value & 255
    }
  }
  return { width, height, channels, data: out }
}

/** True when most of the picture's outer edge is near white. */
export function hasPlainEdge(png) {
  let image
  try { image = decodePng(png) } catch { return false }
  if (!image) return false
  const { width, height, channels, data } = image
  const ring = Math.min(EDGE, Math.floor(Math.min(width, height) / 4)) || 1
  let edge = 0
  let white = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= ring && y >= ring && x < width - ring && y < height - ring) continue
      const i = (y * width + x) * channels
      const grey = channels < 3 ? data[i] : data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      edge++
      if (grey >= NEAR_WHITE) white++
    }
  }
  return edge > 0 && white / edge >= EDGE_SHARE
}

/** Downloads the small rendition of one Sanity image URL and answers hasPlainEdge. false on any error. */
export async function hasPlainBackground(imageUrl) {
  if (!imageUrl) return false
  try {
    const response = await fetch(`${imageUrl}?w=${SIZE}&h=${SIZE}&fit=max&fm=png`, { signal: AbortSignal.timeout(15000) })
    if (!response.ok) return false
    return hasPlainEdge(Buffer.from(await response.arrayBuffer()))
  } catch {
    return false
  }
}

/**
 * Adds `plain: true|false` to every gallery picture of every piece (true = cut-out on a white background).
 * A picture whose flag is already known from the previous snapshot (same image URL) is not downloaded again.
 */
export async function annotateGalleries(pieces, previous = []) {
  const known = new Map()
  for (const piece of previous || []) {
    for (const frame of piece?.gallery || []) if (frame?.asset?.url && typeof frame.plain === 'boolean') known.set(frame.asset.url, frame.plain)
  }
  const jobs = []
  for (const piece of pieces) {
    for (const frame of piece.gallery || []) {
      const url = frame?.asset?.url
      if (!url) continue
      if (known.has(url)) frame.plain = known.get(url)
      else jobs.push(async () => { frame.plain = await hasPlainBackground(url) })
    }
  }
  const workers = Array.from({ length: 8 }, async () => { while (jobs.length) await jobs.shift()() })
  await Promise.all(workers)
  return jobs.length
}
