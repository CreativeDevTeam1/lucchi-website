/**
 * Reads the build-time snapshot (src/data/sanity-snapshot.json, written by scripts/sync-sanity.mjs).
 * The site never calls Sanity from the browser. Everything here is plain, pure data work.
 * Nothing in this file or the snapshot is secret: no token, no price.
 */
import rawSnapshot from './sanity-snapshot.json'

export const snapshot = rawSnapshot && typeof rawSnapshot === 'object' ? rawSnapshot : {}

/** A trimmed, non-empty string, or undefined. Empty Sanity fields count as "not provided". */
export const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined)

const IMAGE_WIDTHS = [400, 640, 800, 1080, 1440, 1920]
const DEFAULT_WIDTH = 1080
const QUALITY = 80

/** A cdn.sanity.io image with width / format parameters. `rect` is Sanity's crop, if one was set in the Studio. */
function cdnUrl(base, width, rect) {
  const params = [`w=${width}`, 'fm=webp', `q=${QUALITY}`]
  if (rect) params.unshift(`rect=${rect.join(',')}`)
  return `${base}?${params.join('&')}`
}

/**
 * Turns a snapshot image ({ alt, hotspot, crop, asset: { url, w, h, lqip } }) into the same "slot" shape the
 * components already use for images.json entries: { src, srcset: { webp }, alt, focalPoint, aspect, lqip, ... }.
 * Returns null when there is no Sanity asset, so the caller can keep its local image.
 *
 * `base` holds values to keep from the local slot (for example the focal point from images.json when the
 * Studio has no hotspot). Sanity wins when it has a value.
 */
export function frameFromSanityImage(image, base = {}) {
  const asset = image?.asset
  if (!asset?.url || !asset.w || !asset.h) return null

  // Studio crop (fractions trimmed from each edge) -> pixel rectangle on the original.
  const crop = image.crop
  const hasCrop = crop && (crop.top || crop.bottom || crop.left || crop.right)
  const rect = hasCrop
    ? [
        Math.round(crop.left * asset.w),
        Math.round(crop.top * asset.h),
        Math.round((1 - crop.left - crop.right) * asset.w),
        Math.round((1 - crop.top - crop.bottom) * asset.h),
      ]
    : null
  const width = rect ? rect[2] : asset.w
  const height = rect ? rect[3] : asset.h

  const widths = IMAGE_WIDTHS.filter((w) => w < width)
  if (!widths.length || widths[widths.length - 1] < width) widths.push(width) // never ask for more than the original
  const srcWidth = widths.includes(DEFAULT_WIDTH) ? DEFAULT_WIDTH : widths[widths.length - 1]
  const hotspot = image.hotspot
  return {
    ...base,
    src: cdnUrl(asset.url, srcWidth, rect),
    srcset: { webp: widths.map((w) => `${cdnUrl(asset.url, w, rect)} ${w}w`).join(', ') },
    alt: text(image.alt) || base.alt || '',
    focalPoint: hotspot && typeof hotspot.x === 'number' ? { x: hotspot.x, y: hotspot.y } : base.focalPoint || { x: 0.5, y: 0.5 },
    width,
    height,
    lqip: asset.lqip || undefined,
    status: base.status && base.status !== 'pending' ? base.status : 'final',
    source: 'sanity',
    referenceSrc: base.referenceSrc || base.src,
  }
}
