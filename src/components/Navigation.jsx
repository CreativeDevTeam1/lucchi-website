import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { imageManifest } from '../data/content'
import { EASE, MENU, MENU_THEMES } from '../config/siteMotion'
import { MENU_CATALOGUE_LABEL, isAboutPath, isCollectionsPath, isContactPath } from '../config/catalogue'
import { canShow, contact, useContactPreview } from '../data/contact'

const navItems = [
  { label: 'Home', id: 'home', index: '01', previewKey: 'home' },
  { label: MENU_CATALOGUE_LABEL, id: 'collections', index: '02', previewKey: 'collections' },
  { label: 'About', id: 'about', index: '03', previewKey: 'about' },
  { label: 'Contact', id: 'contact', index: '04', previewKey: 'contact' },
]

const NAV_HREF = { home: '/', collections: '/collections', about: '/about', contact: '/contact' }

function previewFor(key) {
  const collections = imageManifest.collections || {}
  const map = {
    home: imageManifest.menu?.home || imageManifest.hero?.desktop,
    collections: collections['Living Room']?.primary,
    about: collections.Dining?.primary || collections['Living Room']?.secondary,
    contact: collections.Bedroom?.secondary || collections.Bedroom?.primary,
  }
  return map[key] || collections['Living Room']?.primary
}

function currentNavId() {
  if (typeof window === 'undefined') return 'home'
  const path = window.location.pathname
  if (isCollectionsPath(path)) return 'collections'
  if (isAboutPath(path)) return 'about'
  if (isContactPath(path)) return 'contact'
  if (path && path !== '/') return 'page'
  return 'home'
}

export default function Navigation({ menuOpen, setMenuOpen, onNavigate, revealed = true }) {
  const reduceMotion = useReducedMotion()
  const innerPage = currentNavId() !== 'home'
  const [hidden, setHidden] = useState(false)
  const [solid, setSolid] = useState(() => currentNavId() !== 'home')
  const [hot, setHot] = useState(null)
  const [settled, setSettled] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  const theme = MENU_THEMES[MENU.theme] || MENU_THEMES.sand
  const menuVars = {
    '--menu-bg': theme.bg,
    '--menu-text': theme.text,
    '--menu-muted': theme.muted,
    '--menu-index': theme.index,
    '--menu-hover-color': theme.hover,
    '--menu-enquire-bg': theme.enquireBg,
    '--menu-enquire-text': theme.enquireText,
    '--menu-logo-filter': theme.logoFilter,
    '--menu-blur': `${MENU.blurPx}px`,
    '--menu-dim': MENU.dimOpacity,
    '--menu-hover': `${MENU.hoverMs}ms`,
    '--menu-panel-vh': `${MENU.panelVh}vh`,
  }
  const lastY = useRef(0)
  const userScroll = useRef(false)
  const panelRef = useRef(null)
  const toggleRef = useRef(null)
  const goTimer = useRef(0)

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  // From 1024px the links sit in the header, so the overlay menu is closed if the window grows.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const onChange = () => { if (mql.matches) setMenuOpen(false) }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [setMenuOpen])

  useEffect(() => {
    const markUserScroll = () => {
      userScroll.current = true
    }
    const onScroll = () => {
      const y = window.scrollY
      if (y <= 88) {
        setHidden(false)
      } else if (userScroll.current) {
        setHidden(!menuOpen && y > lastY.current)
        userScroll.current = false
      }
      setSolid(innerPage || y > window.innerHeight * 0.62)
      lastY.current = y
    }
    onScroll()
    const retry = window.requestAnimationFrame(onScroll)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', markUserScroll, { passive: true })
    window.addEventListener('touchmove', markUserScroll, { passive: true })
    return () => {
      window.cancelAnimationFrame(retry)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', markUserScroll)
      window.removeEventListener('touchmove', markUserScroll)
    }
  }, [menuOpen, innerPage])

  useEffect(() => {
    if (!menuOpen) {
      setHot(null)
      setSettled(false)
      return undefined
    }
    const previous = document.body.style.overflow
    document.documentElement.classList.add('is-menu-open')
    document.documentElement.dataset.menuTheme = MENU.theme
    Object.entries(menuVars).forEach(([name, value]) => {
      document.documentElement.style.setProperty(name, String(value))
    })
    document.body.style.overflow = 'hidden'

    const onKey = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const scope = [document.querySelector('.site-nav'), panelRef.current].filter(Boolean)
      const focusable = scope.flatMap((node) => [...node.querySelectorAll('button, a, [tabindex]:not([tabindex="-1"])')])
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.classList.remove('is-menu-open')
      delete document.documentElement.dataset.menuTheme
      Object.keys(menuVars).forEach((name) => {
        document.documentElement.style.removeProperty(name)
      })
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(goTimer.current)
      toggleRef.current?.focus()
    }
  }, [menuOpen, setMenuOpen])

  const close = () => setMenuOpen(false)
  // Tapping empty space in the panel (not a word or a button) closes it.
  const onPanelClick = (event) => {
    if (event.target.closest('button, a')) return
    close()
  }

  const go = (id) => {
    setMenuOpen(false)
    onNavigate(id)
  }

  const activate = (item) => {
    if (isTouch && !reduceMotion) {
      setHot(item.id)
      window.clearTimeout(goTimer.current)
      goTimer.current = window.setTimeout(() => go(item.id), 250)
      return
    }
    go(item.id)
  }

  const shown = previewFor(hot ? navItems.find((item) => item.id === hot)?.previewKey : 'home')
  const duration = (menuOpen ? MENU.openMs : MENU.closeMs) / 1000

  return (
    <>
      <header
        className={[
          'site-nav',
          revealed ? 'is-revealed' : 'is-waiting',
          hidden ? 'is-hidden' : '',
          innerPage ? 'is-inner' : '',
          solid || menuOpen || innerPage ? 'is-solid' : '',
          menuOpen ? 'is-open' : '',
        ].filter(Boolean).join(' ')}
        style={menuOpen ? menuVars : undefined}
      >
        <div className="nav-main">
          <button className="brand-lockup" onClick={() => go('home')} aria-label="Lucchi Furniture — Home">
            <img src="/brand/lucchi-logo-beige.png" alt="Lucchi Furniture" />
          </button>

          <button
            ref={toggleRef}
            className="nav-menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className={`nav-menu-icon${menuOpen ? ' is-close' : ''}`} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </button>

          <nav className="nav-links" aria-label="Main">
            {navItems.map((item) => {
              const current = currentNavId() === item.id
              return (
                <a
                  key={item.id}
                  className={`nav-link${current ? ' is-current' : ''}`}
                  href={NAV_HREF[item.id]}
                  aria-current={current ? 'page' : undefined}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return
                    event.preventDefault()
                    go(item.id)
                  }}
                >
                  {item.label}
                </a>
              )
            })}
          </nav>

          <div className="nav-actions">
            <button
              className="nav-enquire-btn"
              data-magnetic="true"
              onClick={() => go('contact')}
              aria-label="Enquire with Lucchi"
            >
              <span>Enquire</span>
              <ArrowUpRight size={13} strokeWidth={1.4} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              className="site-menu-backdrop"
              aria-label="Close menu"
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.2 : 0.45, ease: EASE }}
            />
            <motion.div
              id="site-menu"
              ref={panelRef}
              className={`site-menu-panel${settled ? ' is-settled' : ''}`}
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              style={menuVars}
              initial={reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
              animate={reduceMotion ? { opacity: 1 } : { clipPath: 'inset(0 0 0% 0)' }}
              exit={reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
              transition={{ duration: reduceMotion ? 0.2 : duration, ease: EASE }}
              onAnimationComplete={() => setSettled(true)}
              onClick={onPanelClick}
            >
              <div className="site-menu-body">
                <nav
                  className={`site-menu-cloud${hot ? ' is-hot' : ''}`}
                  aria-label="Primary"
                  onMouseLeave={() => !isTouch && setHot(null)}
                >
                  {navItems.map((item, index) => {
                    const active = hot === item.id
                    const dimmed = Boolean(hot) && !active
                    const current = currentNavId() === item.id
                    return (
                      <div key={item.id} className="site-menu-mask">
                        <button
                          type="button"
                          className={`site-menu-word${active ? ' is-active' : ''}${dimmed ? ' is-dim' : ''}${current ? ' is-current' : ''}`}
                          aria-label={item.label}
                          aria-current={current ? 'page' : undefined}
                          onMouseEnter={() => !isTouch && setHot(item.id)}
                          onFocus={() => setHot(item.id)}
                          onBlur={() => !isTouch && setHot((current) => (current === item.id ? null : current))}
                          onClick={() => activate(item)}
                        >
                          <motion.span
                            className="site-menu-word-rise"
                            initial={reduceMotion ? { opacity: 0 } : { y: '115%' }}
                            animate={{ y: '0%', opacity: 1 }}
                            transition={{
                              duration: reduceMotion ? 0.15 : 0.8,
                              delay: reduceMotion ? 0 : 0.16 + index * (MENU.staggerMs / 1000),
                              ease: EASE,
                            }}
                          >
                            <span className="site-menu-index">{item.index}</span>
                            <span className="site-menu-word-shell">
                              <span className="site-menu-word-ghost" aria-hidden="true">{item.label}</span>
                              <span className="site-menu-word-live">{item.label}</span>
                            </span>
                          </motion.span>
                        </button>
                      </div>
                    )
                  })}
                </nav>

                <aside className="site-menu-preview" aria-hidden="true">
                  {shown?.src && (
                    <motion.img
                      key={shown.src}
                      src={shown.src}
                      alt={shown.alt || ""}
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, clipPath: 'inset(10% 10% 10% 10%)' }}
                      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' }}
                      transition={{ duration: reduceMotion ? 0.15 : 0.45, ease: EASE }}
                    />
                  )}
                </aside>
              </div>

              <div className="site-menu-foot">
                <button type="button" onClick={() => go('contact')}>Enquire</button>
                <MenuContactLinks />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function MenuContactLinks() {
  const preview = useContactPreview()
  const instagram = canShow(contact.instagram, preview)
  const facebook = canShow(contact.facebook, preview)
  const whatsapp = canShow(contact.whatsapp, preview)
  if (!instagram && !facebook && !whatsapp) {
    return null
  }
  return (
    <span className="contact-channels contact-channels-inline">
      {instagram ? (
        <a href={contact.instagram.value} target="_blank" rel="noopener noreferrer" aria-label="Lucchi Furniture on Instagram">
          Instagram
        </a>
      ) : null}
      {facebook ? (
        <a href={contact.facebook.value} target="_blank" rel="noopener noreferrer" aria-label="Lucchi Furniture on Facebook">
          Facebook
        </a>
      ) : null}
      {whatsapp ? (
        <a href={`https://wa.me/${contact.whatsapp.value.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="Message Lucchi on WhatsApp">
          WhatsApp
        </a>
      ) : null}
    </span>
  )
}
