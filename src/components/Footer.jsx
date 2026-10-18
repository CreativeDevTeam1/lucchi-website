import { useLayoutEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import ContactChannels from './ContactChannels'
import { canShow, contact, useContactPreview, visibleBranches } from '../data/contact'

/* The one site footer (Home, Collections, About, Contact).
   - Solid green background, no image or video behind the text.
   - Right column: only contact items with `confirmed: true` in src/data/contact.js
     (all of them, plus a small note, with ?previewContact=1). Nothing confirmed: a plain
     "Showroom enquiry" / "Request a viewing" link to /contact.
   - Animation: content fades up once when it scrolls into view (opacity + transform only).
     It is visible by default; the hidden start state is only added by this component once it
     is running, and a backup check reveals it as soon as it is on screen, so it cannot stay hidden. */

const FOOTER_LINKS = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'collections', label: 'Collections', href: '/collections' },
  { id: 'about', label: 'About', href: '/about' },
  { id: 'contact', label: 'Contact', href: '/contact' },
]
const CONTACT_KEYS = ['email', 'phone', 'whatsapp', 'address', 'mapsUrl', 'hours', 'instagram', 'facebook']
const CHECK_MS = 800

export default function Footer({ onNavigate, onEnquire }) {
  const reduceMotion = useReducedMotion()
  const preview = useContactPreview()
  const rootRef = useRef(null)
  const shown = CONTACT_KEYS.filter((key) => canShow(contact[key], preview))
  const branchList = visibleBranches(preview)
  const hasContact = shown.length > 0 || branchList.length > 0
  const unconfirmedShown = preview && (shown.some((key) => contact[key].confirmed !== true) || branchList.some((b) => b.confirmed !== true))

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || reduceMotion || typeof IntersectionObserver === 'undefined') return undefined
    root.classList.add('is-armed')
    let timer = 0
    const reveal = () => {
      root.classList.add('is-in')
      window.clearInterval(timer)
      io.disconnect()
    }
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) reveal() }, { threshold: 0.12 })
    io.observe(root)
    // Backup in case the observer never fires: reveal as soon as the footer is on screen.
    timer = window.setInterval(() => {
      const rect = root.getBoundingClientRect()
      if (rect.top < window.innerHeight && rect.bottom > 0) reveal()
    }, CHECK_MS)
    return () => {
      window.clearInterval(timer)
      io.disconnect()
      root.classList.remove('is-armed', 'is-in')
    }
  }, [reduceMotion])

  const go = (event, id) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return
    event.preventDefault()
    onNavigate?.(id)
  }
  const enquire = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return
    event.preventDefault()
    if (onEnquire) onEnquire()
    else onNavigate?.('contact')
  }
  const toTop = () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })

  return (
    <footer ref={rootRef} className="site-footer" aria-label="Site footer">
      <div className="page-width">
        <div className="site-footer-grid">
          <div className="site-footer-col sf-reveal" style={{ '--i': 0 }}>
            <p className="site-footer-brand">Lucchi Furniture</p>
            <p className="site-footer-note">Made with solid Romanian red beech wood &amp; natural veneers</p>
            <p className="site-footer-place">Cairo · By enquiry</p>
          </div>

          <nav className="site-footer-col sf-reveal" style={{ '--i': 1 }} aria-label="Footer">
            <p className="site-footer-label">Explore</p>
            <ul className="site-footer-list">
              {FOOTER_LINKS.map((link) => (
                <li key={link.id}>
                  <a className="sf-link" href={link.href} onClick={(event) => go(event, link.id)}>{link.label}</a>
                </li>
              ))}
              <li>
                <a className="sf-link" href="/contact" onClick={enquire}>Enquire</a>
              </li>
            </ul>
          </nav>

          <div className="site-footer-col sf-reveal" style={{ '--i': 2 }}>
            <p className="site-footer-label">Visit</p>
            {hasContact ? (
              <>
                <ContactChannels variant="stack" />
                {unconfirmedShown ? <p className="site-footer-preview">Preview: not yet confirmed</p> : null}
              </>
            ) : (
              <ul className="site-footer-list">
                <li><a className="sf-link" href="/contact" onClick={enquire}>Showroom enquiry</a></li>
                <li><a className="sf-link" href="/contact" onClick={(event) => go(event, 'contact')}>Request a viewing</a></li>
              </ul>
            )}
          </div>
        </div>

        <div className="site-footer-bottom sf-reveal" style={{ '--i': 3 }}>
          <p className="site-footer-copy">© {new Date().getFullYear()} Lucchi Furniture</p>
          <button type="button" className="site-footer-top" onClick={toTop}>
            <span>Return to top</span>
            <ArrowUp size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  )
}
