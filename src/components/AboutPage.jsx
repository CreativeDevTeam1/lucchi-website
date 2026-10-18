import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import Navigation from './Navigation'
import Footer from './Footer'
import ImageMedia from './ImageMedia'
import { imageManifest, DEFAULT_TITLE } from '../data/content'
import { about } from '../data/about'
import { EASE, SECTION_REVEAL } from '../config/siteMotion'

const MATERIALS = [
  'Romanian red beech wood',
  'Natural and HPL veneers',
  'Italian Calacatta marble',
  '304 stainless steel',
  'Velvet, mohair, and linen fabrics',
]

// The About photo lives in images.json (about.image). The block below is the previous image, kept as a fallback.
const PREVIOUS_ABOUT_IMAGE = {
  src: '/media/about/curve-set-soft.webp',
  alt: 'Curve Set living room by Lucchi Furniture',
  aspect: '4/5',
  status: 'final',
  source: 'client-photography',
  focalPoint: { x: 0.5, y: 0.48 },
  srcset: {
    avif: '/media/about/curve-set-soft-640.avif 640w, /media/about/curve-set-soft-800.avif 800w, /media/about/curve-set-soft-1080.avif 1080w',
    webp: '/media/about/curve-set-soft-640.webp 640w, /media/about/curve-set-soft-800.webp 800w, /media/about/curve-set-soft-1080.webp 1080w',
    jpeg: '/media/about/curve-set-soft-640.jpg 640w, /media/about/curve-set-soft-800.jpg 800w, /media/about/curve-set-soft-1080.jpg 1080w',
  },
}

const ABOUT_IMAGE = imageManifest.about?.image || PREVIOUS_ABOUT_IMAGE

const approach = about.sections.find((section) => section.id === 'approach')
const materials = about.sections.find((section) => section.id === 'materials')

function setMetaDescription(value) {
  let node = document.querySelector('meta[name="description"]')
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute('name', 'description')
    document.head.appendChild(node)
  }
  const previous = node.getAttribute('content')
  node.setAttribute('content', value)
  return () => {
    if (previous == null) node.remove()
    else node.setAttribute('content', previous)
  }
}

function pad(index) {
  return String(index).padStart(2, '0')
}

export default function AboutPage({ onNavigate, menuOpen, setMenuOpen, onOpenContact }) {
  const reduceMotion = useReducedMotion()
  const reveal = reduceMotion
    ? { initial: { opacity: 1 }, whileInView: { opacity: 1 } }
    : SECTION_REVEAL

  useEffect(() => {
    document.title = about.documentTitle
    const restoreMeta = setMetaDescription(about.metaDescription)
    return () => {
      document.title = DEFAULT_TITLE
      restoreMeta()
    }
  }, [])

  const titleMotion = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { y: '115%' }, animate: { y: '0%' }, transition: { duration: 0.85, ease: EASE } }

  const imageReveal = reduceMotion
    ? { initial: { opacity: 1 }, whileInView: { opacity: 1 } }
    : {
        initial: { clipPath: 'inset(8% 8% 8% 8%)', opacity: 0 },
        whileInView: { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 },
        viewport: { once: true, amount: 0.28 },
        transition: { duration: 0.9, ease: EASE },
      }

  return (
    <div className="site-shell about-page-shell">
      <Navigation
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onNavigate={onNavigate}
        revealed
      />

      <main>
        <section className="about-intro" aria-labelledby="about-heading">
          <div className="page-width about-intro-grid">
            <div className="about-title-mask">
              <motion.h1 id="about-heading" className="about-title" {...titleMotion}>
                {about.title}
              </motion.h1>
            </div>
            <motion.p className="about-intro-copy" {...reveal}>
              {about.intro}
            </motion.p>
          </div>
        </section>

        <section className="about-approach" aria-labelledby="about-approach-heading">
          <div className="page-width about-approach-grid">
            <motion.figure className="about-mat" {...imageReveal}>
              <div className="about-mat-card">
                <div className="about-mat-shift">
                  <ImageMedia
                    slot={ABOUT_IMAGE}
                    className="about-image"
                    aspectRatio="4 / 5"
                    loading="lazy"
                    sizes="(max-width: 900px) min(86vw, 520px), min(42vw, 560px)"
                    overlay={false}
                    showIllustrativeNote={false}
                  />
                </div>
              </div>
            </motion.figure>

            <div className="about-approach-copy">
              <h2 id="about-approach-heading" className="about-kicker">{approach.heading}</h2>
              <div className="about-approach-line-mask">
                <motion.p
                  className="about-approach-lead"
                  initial={reduceMotion ? { y: '0%' } : { y: '115%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: reduceMotion ? 0.01 : 0.85, delay: reduceMotion ? 0 : 0.12, ease: EASE }}
                >
                  {approach.body}
                </motion.p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-materials" aria-labelledby="about-materials-heading">
          <div className="page-width">
            <motion.div className="about-materials-intro" {...reveal}>
              <h2 id="about-materials-heading" className="about-kicker">{materials.heading}</h2>
              <p className="about-materials-copy">{materials.body}</p>
            </motion.div>
            <ul className="about-materials-grid">
              {MATERIALS.map((name, index) => (
                <motion.li key={name} className="about-material-item" {...reveal} transition={{ ...SECTION_REVEAL.transition, delay: reduceMotion ? 0 : index * 0.04 }}>
                  <span className="about-material-index">{pad(index + 1)}</span>
                  <span className="about-material-name">{name}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        <section className="about-visit" aria-labelledby="about-visit-heading">
          <div className="page-width about-visit-inner">
            <motion.div {...reveal}>
              <h2 id="about-visit-heading" className="about-visit-title">
                {about.visit.heading}
              </h2>
              <p className="about-visit-copy">{about.visit.body}</p>
              <button
                type="button"
                className="contact-primary-enquire-btn"
                onClick={() => onOpenContact?.(null, about.visit.viewingType)}
                aria-label="Arrange a viewing"
              >
                <span>{about.visit.viewingLabel}</span>
                <ArrowUpRight size={15} strokeWidth={1.4} />
              </button>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer onNavigate={onNavigate} onEnquire={() => onOpenContact?.()} />
    </div>
  )
}
