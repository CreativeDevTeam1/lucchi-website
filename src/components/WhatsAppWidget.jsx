import { useEffect, useRef, useState } from 'react'
import { products } from '../data/content'
import { isPiecePath, pieceSlugFromPath } from '../config/catalogue'
import { whatsappChatUrl, whatsappDisplay } from '../data/contact'
import { GENERAL_MESSAGE, WhatsAppIcon, pieceMessage } from './WhatsAppButton'

// The piece the visitor is looking at, read when the pop-up opens (the page can change while it is closed).
function currentPiece() {
  if (typeof window === 'undefined' || !isPiecePath(window.location.pathname)) return null
  const slug = pieceSlugFromPath(window.location.pathname)
  return products.find((product) => product.id === slug) || null
}

/** A floating WhatsApp button on every page. It opens a small pop-up card; the card's button opens WhatsApp
 *  (with the piece's name and link when a piece page is open). Nothing is shown without a WhatsApp number. */
export default function WhatsAppWidget() {
  const [open, setOpen] = useState(false)
  const [piece, setPiece] = useState(null)
  const rootRef = useRef(null)
  const launcherRef = useRef(null)

  const close = (returnFocus = false) => {
    setOpen(false)
    if (returnFocus) launcherRef.current?.focus()
  }
  const toggle = () => {
    if (!open) setPiece(currentPiece())
    setOpen((value) => !value)
  }

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => { if (event.key === 'Escape') close(true) }
    const onPointer = (event) => { if (rootRef.current && !rootRef.current.contains(event.target)) close() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  const href = whatsappChatUrl(piece ? pieceMessage(piece) : GENERAL_MESSAGE)
  const display = whatsappDisplay()
  if (!href) return null

  return (
    <div className="wa-widget" ref={rootRef}>
      <div
        id="wa-popup"
        className="wa-popup"
        role="dialog"
        aria-label="Chat with Lucchi Furniture on WhatsApp"
        data-open={open ? 'true' : 'false'}
        inert={!open}
      >
        <div className="wa-popup-head">
          <span className="wa-avatar"><WhatsAppIcon size={22} /></span>
          <div className="wa-popup-id">
            <p className="wa-popup-title">Lucchi Furniture</p>
            <p className="wa-popup-sub">WhatsApp</p>
          </div>
          <button type="button" className="wa-popup-close" onClick={() => close(true)} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>
        <div className="wa-popup-body">
          <p className="wa-bubble">Questions about a piece? Message us on WhatsApp.</p>
          {piece ? <p className="wa-piece">About: <strong>{piece.name}</strong></p> : null}
          <a className="wa-cta" href={href} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon size={18} />
            <span>Chat on WhatsApp</span>
          </a>
          {display ? <p className="wa-number">{display}</p> : null}
        </div>
      </div>
      <button
        ref={launcherRef}
        type="button"
        className="wa-launcher"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="wa-popup"
        aria-label={open ? 'Close WhatsApp chat' : 'Chat with Lucchi on WhatsApp'}
      >
        <WhatsAppIcon size={26} />
      </button>
    </div>
  )
}
