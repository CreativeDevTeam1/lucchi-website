import { useMemo, useState } from 'react'
import { ALLOW_AI_RENDERS, CATALOGUE_NOTE } from '../config/siteMotion'

/**
 * Shared media surface for the Lucchi image manifest.
 * Generated imagery remains replaceable from images.json only; when a managed
 * storage image is unavailable locally, referenceSrc provides a graceful fallback.
 */
export default function ImageMedia({
  slot,
  aspectRatio,
  className = '',
  loading = 'lazy',
  fetchPriority,
  decoding,
  showDebugBadge = false,
  showIllustrativeNote = false,
  overlay = true,
  sizes = '100vw',
  draggable,
  children,
}) {
  const isDebugActive = useMemo(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('imgdebug') === '1'
  }, [])
  const [hasFallback, setHasFallback] = useState(false)

  if (!slot || !slot.src) {
    return (
      <div className={`media-frame media-frame-fallback ${className}`}>
        <span className="media-fallback-text">Image pending</span>
      </div>
    )
  }

  const { src, referenceSrc, alt, focalPoint, status, source, srcset } = slot
  const objectPosition = focalPoint ? `${Math.round(focalPoint.x * 100)}% ${Math.round(focalPoint.y * 100)}%` : '50% 50%'
  const isAiSlot = status === 'ai-placeholder' || source === 'ai-generated'
  // ALLOW_AI_RENDERS = false: an AI-render slot shows its previous real / reference image instead
  const swapAiOut = !ALLOW_AI_RENDERS && isAiSlot && !!referenceSrc
  const isAiPlaceholder = isAiSlot && !swapAiOut
  const isPlaceholder = status === 'placeholder' || isAiSlot
  const useReference = swapAiOut || (hasFallback && !!referenceSrc)
  const currentSrc = useReference ? referenceSrc : src

  const handleError = () => {
    if (referenceSrc && !hasFallback) setHasFallback(true)
  }

  return (
    <div
      className={`media-frame ${className} ${isPlaceholder ? 'is-placeholder-slot' : 'is-final-slot'} ${isAiPlaceholder ? 'is-ai-placeholder' : ''}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {srcset && !useReference ? (
        <picture>
          {srcset.avif && <source type="image/avif" srcSet={srcset.avif} sizes={sizes} />}
          {srcset.webp && <source type="image/webp" srcSet={srcset.webp} sizes={sizes} />}
          <img
            src={currentSrc}
            srcSet={srcset.jpeg}
            sizes={sizes}
            alt={alt || ''}
            loading={loading}
            fetchPriority={fetchPriority}
            decoding={decoding}
            draggable={draggable}
            onError={handleError}
            style={{ objectPosition }}
          />
        </picture>
      ) : (
        <img
          src={currentSrc}
          alt={alt || ''}
          loading={loading}
          fetchPriority={fetchPriority}
          decoding={decoding}
          draggable={draggable}
          onError={handleError}
          style={{ objectPosition }}
        />
      )}

      {overlay && <span className="media-tonal-scrim" aria-hidden="true" />}

      {(isDebugActive || showDebugBadge) && (
        <span className={`media-debug-badge ${isAiPlaceholder ? 'is-ai' : isPlaceholder ? 'is-placeholder' : 'is-final'}`}>
          {isAiPlaceholder ? 'AI Concept' : isPlaceholder ? 'Reference' : 'Final Shoot'}
        </span>
      )}

      {CATALOGUE_NOTE.enabled && (showIllustrativeNote || isPlaceholder) && (
        <span className={`media-illustrative-note${CATALOGUE_NOTE.hoverOnly ? ' is-hover-only' : ''}`}>
          {CATALOGUE_NOTE.text}
        </span>
      )}

      {children}
    </div>
  )
}
