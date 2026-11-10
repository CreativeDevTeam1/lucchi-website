import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { products, DEFAULT_TITLE } from '../data/content'
import Navigation from './Navigation'
import ContactChannels from './ContactChannels'
import Footer from './Footer'
import { GENERAL_MESSAGE, WhatsAppIcon, pieceMessage } from './WhatsAppButton'
import {
  canShow,
  contact,
  formatPhone,
  phoneHref,
  useContactPreview,
  visibleBranches,
  whatsappChatUrl,
  whatsappDisplay,
} from '../data/contact'

// A link such as /contact?product=<slug> (older links, shared pieces) keeps the piece in the WhatsApp message.
function readPieceFromQuery() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const pieceId = params.get('product') || params.get('piece')
  return products.find((p) => p.id === pieceId) || null
}

export default function ContactPage({ onNavigate, menuOpen, setMenuOpen }) {
  useEffect(() => {
    document.title = 'Contact — Lucchi Furniture'
    return () => {
      document.title = DEFAULT_TITLE
    }
  }, [])

  const selectedProduct = useMemo(() => readPieceFromQuery(), [])

  return (
    <div className="site-shell contact-page-shell">
      <Navigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} onNavigate={onNavigate} />

      <main>
        {/* Contact Hero Header */}
        <section className="contact-page-hero section-dark" aria-labelledby="contact-page-heading">
          <div className="page-width contact-page-hero-inner">
            <motion.h1
              id="contact-page-heading"
              className="contact-main-title"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              Bring Lucchi<br />
              into your space.
            </motion.h1>

            <div className="contact-hero-sub-row">
              <p className="contact-hero-deck">
                Whether you are asking about a specific piece, arranging a private showroom consultation, or discussing a whole-residence architectural commission, message us and we will prepare a considered response.
              </p>

              <button
                className="contact-back-home-btn"
                onClick={() => onNavigate('top')}
              >
                <ArrowLeft size={13} strokeWidth={1.4} />
                <span>Return to Showroom</span>
              </button>
            </div>
          </div>
        </section>

        {/* Context & message section */}
        <section className="contact-form-section section-light">
          <div className="page-width contact-layout-split">
            {/* Left Context Column */}
            <div className="contact-context-col">
              <h2 className="context-heading">
                A personal conversation<br />
                around your project.
              </h2>

              <p className="context-body">
                We work directly with private homeowners, interior architects, and residential developers to customize proportions, finishes, and room configurations.
              </p>

              {selectedProduct && (
                <div className="selected-piece-enquiry-card">
                  <span className="enquiry-card-tag">Asking about piece</span>
                  <strong className="enquiry-card-name">{selectedProduct.name}</strong>
                  <span className="enquiry-card-meta">
                    {selectedProduct.category} · {selectedProduct.productCode ? `Code ${selectedProduct.productCode}` : 'Lucchi'}
                  </span>
                  {selectedProduct.materials ? <p className="enquiry-card-materials">{selectedProduct.materials}</p> : null}
                </div>
              )}

              <div className="consultation-path-list">
                <div className="path-item">
                  <div>
                    <strong>Private Showroom Viewing</strong>
                    <p>Experience physical suites, tactile Romanian beech frames, and upholstery swatches.</p>
                  </div>
                </div>

                <div className="path-item">
                  <div>
                    <strong>Bespoke Dimensions & Finishes</strong>
                    <p>Adapt sofa lengths, table marble selections, and bedroom veneer bookmatching for villa plans.</p>
                  </div>
                </div>
              </div>

              <ContactDetailsNote />
            </div>

            {/* Right column: WhatsApp (and phone) */}
            <div className="contact-form-col">
              <MessageCard piece={selectedProduct} />
            </div>
          </div>
        </section>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  )
}

/* The one way to write to Lucchi from this page: a WhatsApp chat (message ready to send, about the piece when there is one),
   and the phone number for calls. Nothing is shown for a number that is not confirmed. */
function MessageCard({ piece }) {
  const preview = useContactPreview()
  const chatUrl = whatsappChatUrl(piece ? pieceMessage(piece) : GENERAL_MESSAGE)
  const phone = canShow(contact.phone, preview)
  const phoneText = contact.phone.display || formatPhone(contact.phone.value)
  if (!chatUrl && !phone) return null

  return (
    <div className="contact-message-card">
      <span className="enquiry-card-tag">WhatsApp</span>
      <h3 className="contact-message-title">Message us on WhatsApp</h3>
      <p className="contact-message-copy">
        {piece
          ? `Ask about the ${piece.name}. Your message opens in WhatsApp, ready to send.`
          : 'Ask about a piece, a finish or a showroom visit. Your message opens in WhatsApp, ready to send.'}
      </p>

      {chatUrl ? (
        <a className="contact-message-cta" href={chatUrl} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon size={20} />
          <span>Chat on WhatsApp</span>
        </a>
      ) : null}
      {chatUrl && whatsappDisplay() ? <p className="contact-message-number">{whatsappDisplay()}</p> : null}

      {phone ? (
        <div className="contact-message-call">
          <span>Prefer to call?</span>
          <a href={phoneHref(contact.phone)} aria-label={`Call Lucchi on ${phoneText}`}>{phoneText}</a>
        </div>
      ) : null}
    </div>
  )
}

function ContactDetailsNote() {
  const preview = useContactPreview()
  const hasAny = ['email', 'phone', 'whatsapp', 'address', 'mapsUrl', 'hours', 'instagram', 'facebook']
    .some((key) => canShow(contact[key], preview)) || visibleBranches(preview).length > 0
  // Nothing confirmed: show nothing (no "pending" text).
  if (!hasAny) return null

  return (
    <div className="contact-official-note">
      <span className="official-note-label">
        {preview && !contact.instagram.confirmed ? 'Preview — not yet confirmed' : 'Showrooms & contact'}
      </span>
      <ContactChannels variant="stack" />
    </div>
  )
}
