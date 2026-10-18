import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import imageManifest from '../data/images.json'
import { homeCopy } from '../data/content'
import { SECTION_REVEAL } from '../config/siteMotion'
import ContactChannels from './ContactChannels'
import Footer from './Footer'
import { canShow, contact, useContactPreview } from '../data/contact'

// Closing block copy: from Sanity (homePage), these constants are the fallback.
// The heading breaks after the first two words, as in the design.
function splitHeading(text) {
  const words = text.split(/\s+/)
  return words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : [text]
}
const CTA_HEADING_LINES = (homeCopy.contactHeadline ? splitHeading(homeCopy.contactHeadline) : ['Experience Lucchi', 'in person.'])
const CTA_COPY = homeCopy.contactCopy || 'Lucchi Furniture is made in Cairo from solid Romanian red beech and natural veneers. Visit the showroom to see the pieces up close, or learn more about how we work.'
const CTA_BUTTON_LABEL = homeCopy.contactButtonLabel || 'About Lucchi'
const CTA_BUTTON_HREF = '/about'
// Frame image width: about 430px on desktop, the full column on phones.
const CTA_IMAGE_SIZES = '(max-width: 900px) 92vw, 440px'

export default function ContactSection({ onOpenContact, onNavigate }) {
  const reduceMotion = useReducedMotion()
  const reveal = reduceMotion
    ? { initial: { opacity: 1 }, whileInView: { opacity: 1 } }
    : SECTION_REVEAL
  const frame = imageManifest.contact?.cta

  return (
    <>
      <section id="contact" className="contact-closing-section" aria-labelledby="contact-heading">
        <div className="page-width">
          <motion.div className="contact-closing-layout" {...reveal}>
            <div className="contact-closing-text">
              <h2 id="contact-heading" className="section-display-title">
                {CTA_HEADING_LINES.map((line, index) => (
                  <span key={line}>
                    {line}
                    {index < CTA_HEADING_LINES.length - 1 ? <br /> : null}
                  </span>
                ))}
              </h2>
              <p className="contact-closing-copy">{CTA_COPY}</p>
              <a
                className="contact-primary-enquire-btn"
                href={CTA_BUTTON_HREF}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return
                  event.preventDefault()
                  onNavigate?.('about')
                }}
              >
                <span>{CTA_BUTTON_LABEL}</span>
                <ArrowUpRight size={16} strokeWidth={1.4} aria-hidden="true" />
              </a>
              <ContactCtaChannels />
            </div>

            {frame?.src ? (
              <aside className="contact-closing-frame">
                <picture>
                  {frame.srcset?.avif && <source type="image/avif" srcSet={frame.srcset.avif} sizes={CTA_IMAGE_SIZES} />}
                  {frame.srcset?.webp && <source type="image/webp" srcSet={frame.srcset.webp} sizes={CTA_IMAGE_SIZES} />}
                  <img
                    src={frame.src}
                    alt={frame.alt || ''}
                    width={frame.width}
                    height={frame.height}
                    sizes={CTA_IMAGE_SIZES}
                    loading="lazy"
                    decoding="async"
                    style={{ objectPosition: `${Math.round((frame.focalPoint?.x ?? 0.5) * 100)}% ${Math.round((frame.focalPoint?.y ?? 0.5) * 100)}%` }}
                  />
                </picture>
              </aside>
            ) : null}
          </motion.div>

          <motion.div className="contact-service-cards-row" {...reveal} transition={{ ...SECTION_REVEAL.transition, delay: reduceMotion ? 0 : 0.08 }}>
            <div className="service-editorial-card">
              <strong className="service-title">Private Consultations</strong>
              <p className="service-copy">
                Explore material samples, tactile wood finishes, and tailored upholstery swatches directly with our team in Cairo.
              </p>
            </div>

            <div className="service-editorial-card">
              <strong className="service-title">Selected Pieces by Enquiry</strong>
              <p className="service-copy">
                Individual occasional tables, decorative fireplaces, and sculptural seating available for standalone residential acquisition.
              </p>
            </div>

            <div className="service-editorial-card">
              <strong className="service-title">Designers & Developers</strong>
              <p className="service-copy">
                Custom dimensions, bespoke finish pairings, and room ensembles tailored for interior designers and residential developers.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer onNavigate={onNavigate} onEnquire={onOpenContact} />
    </>
  )
}

function ContactCtaChannels() {
  const preview = useContactPreview()
  const show = ['phone', 'whatsapp', 'instagram', 'facebook'].some((key) => canShow(contact[key], preview))
  if (!show) return null
  return <ContactChannels variant="inline" />
}
