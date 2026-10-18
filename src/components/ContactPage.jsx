import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowUpRight, Check } from 'lucide-react'
import { products, DEFAULT_TITLE } from '../data/content'
import Navigation from './Navigation'
import ContactChannels from './ContactChannels'
import Footer from './Footer'
import { canShow, contact, useContactPreview, visibleBranches } from '../data/contact'

const enquiryTypes = [
  { value: 'product', label: 'Product enquiry (Selected piece or archive design)' },
  { value: 'showroom', label: 'Showroom / private viewing consultation' },
  { value: 'project', label: 'Project / interior design commission' },
  { value: 'designer', label: 'Designer / architectural developer conversation' },
]

const TYPE_FROM_QUERY = {
  product: 'product',
  viewing: 'showroom',
  showroom: 'showroom',
  project: 'project',
  designer: 'designer',
}

const QUERY_FROM_TYPE = {
  product: 'product',
  showroom: 'viewing',
  project: 'project',
  designer: 'designer',
}

function parseEnquiryType(value, fallback = 'showroom') {
  if (!value) return fallback
  return TYPE_FROM_QUERY[String(value).trim().toLowerCase()] || fallback
}

function readContactQuery() {
  if (typeof window === 'undefined') {
    return { pieceId: null, enquiryType: 'showroom' }
  }
  const params = new URLSearchParams(window.location.search)
  const pieceId = params.get('product') || params.get('piece')
  const fallback = pieceId ? 'product' : 'showroom'
  return {
    pieceId,
    enquiryType: parseEnquiryType(params.get('type'), fallback),
  }
}

function writeTypeToUrl(enquiryType) {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const slug = QUERY_FROM_TYPE[enquiryType]
  if (slug) params.set('type', slug)
  else params.delete('type')
  const next = params.toString() ? `/contact?${params.toString()}` : '/contact'
  window.history.replaceState({}, '', next)
}

export default function ContactPage({ onNavigate, menuOpen, setMenuOpen }) {
  useEffect(() => {
    document.title = 'Contact — Lucchi Furniture'
    return () => {
      document.title = DEFAULT_TITLE
    }
  }, [])

  const selectedProduct = useMemo(() => {
    const { pieceId } = readContactQuery()
    return products.find((p) => p.id === pieceId) || null
  }, [])

  const [form, setForm] = useState(() => {
    const query = readContactQuery()
    const selected = products.find((p) => p.id === query.pieceId) || null
    return {
      name: '',
      email: '',
      phone: '',
      enquiryType: query.enquiryType,
      preferredChannel: 'Email',
      message: selected ? `I am enquiring about the ${selected.name} (${selected.productCode || 'Lucchi Archive'}).` : '',
    }
  })

  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const applyQuery = () => {
      const query = readContactQuery()
      setForm((curr) => (
        curr.enquiryType === query.enquiryType ? curr : { ...curr, enquiryType: query.enquiryType }
      ))
    }
    applyQuery()
    window.addEventListener('popstate', applyQuery)
    return () => window.removeEventListener('popstate', applyQuery)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.get('type') && !params.get('piece') && !params.get('product')) return undefined
    const formEl = document.getElementById('enquiry-form')
    const typeField = formEl?.querySelector('[name="enquiryType"]')
    formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => typeField?.focus({ preventScroll: true }), 280)
    return undefined
  }, [])

  const updateField = (e) => {
    const { name, value } = e.target
    setForm((curr) => ({ ...curr, [name]: value }))
    setError('')
    setSubmitted(false)
    if (name === 'enquiryType') writeTypeToUrl(value)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Please provide your name.')
      return
    }
    if (!form.email.trim() && !form.phone.trim()) {
      setError('Please provide either an email address or a phone number so the atelier can contact you.')
      return
    }
    setError('')
    setSubmitted(true)
  }

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
                Whether you are enquiring about a specific piece, arranging a private showroom consultation, or discussing a whole-residence architectural commission, the atelier will prepare a considered response.
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

        {/* Form & Context Section */}
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
                  <span className="enquiry-card-tag">Enquiring about piece</span>
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

            {/* Right Form Column */}
            <div className="contact-form-col">
              <form id="enquiry-form" className="atelier-enquiry-form" onSubmit={handleSubmit} noValidate>
                <div className="form-group-row">
                  <label className="form-input-label">
                    <span>Your Name <strong className="req-star">*</strong></span>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={updateField}
                      placeholder="e.g. Karim Mansour"
                      required
                    />
                  </label>

                  <label className="form-input-label">
                    <span>Preferred Response Channel</span>
                    <select
                      name="preferredChannel"
                      value={form.preferredChannel}
                      onChange={updateField}
                    >
                      <option value="Email">Email</option>
                      <option value="Phone">Phone Call</option>
                      <option value="WhatsApp">WhatsApp</option>
                    </select>
                  </label>
                </div>

                <div className="form-group-row">
                  <label className="form-input-label">
                    <span>Email Address</span>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={updateField}
                      placeholder="name@example.com"
                    />
                  </label>

                  <label className="form-input-label">
                    <span>Phone / WhatsApp</span>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={updateField}
                      placeholder="+20 ..."
                    />
                  </label>
                </div>

                <label className="form-input-label">
                  <span>Nature of Enquiry</span>
                  <select
                    name="enquiryType"
                    value={form.enquiryType}
                    onChange={updateField}
                  >
                    {enquiryTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </label>

                <label className="form-input-label">
                  <span>Project Context or Piece Notes</span>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={updateField}
                    rows={5}
                    placeholder="Describe your room dimensions, desired suite, timeline, or residential project requirements..."
                  />
                </label>

                {error && (
                  <p className="form-validation-error" role="alert">
                    {error}
                  </p>
                )}

                {submitted ? (
                  <div className="form-success-box" role="status">
                    <Check size={18} strokeWidth={1.5} />
                    <div>
                      <strong>Your enquiry is prepared for the atelier.</strong>
                      <p>
                        This enquiry will route directly to Lucchi once the verified client email / CRM destination is connected.
                      </p>
                    </div>
                  </div>
                ) : (
                  <button type="submit" className="form-submit-enquiry-btn">
                    <span>Submit Atelier Enquiry</span>
                    <ArrowUpRight size={14} strokeWidth={1.4} />
                  </button>
                )}

                <p className="form-privacy-disclaimer">
                  Lucchi Furniture will only use your details to answer your enquiry and coordinate private consultations.
                </p>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer
        onNavigate={onNavigate}
        onEnquire={() => document.getElementById('enquiry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />
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
