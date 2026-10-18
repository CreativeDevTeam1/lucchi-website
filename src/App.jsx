import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Navigation from './components/Navigation'
import Hero from './components/Hero'
import IntroLoader from './components/IntroLoader'
import BestSellers from './components/BestSellers'
import CategoryShowcase from './components/CategoryShowcase'
import CollectionsPage from './components/CollectionsPage'
import ContactPage from './components/ContactPage'
import AboutPage from './components/AboutPage'
import ContactSection from './components/ContactSection'
import NotFound from './components/NotFound'
import PiecePage from './components/PiecePage'
import { EASE, hideBootOverlay, shouldPlayIntro } from './config/siteMotion'
import OrganizationJsonLd from './components/OrganizationJsonLd'
import {
  archiveSearchToCollections,
  collectionsPath,
  isArchivePath,
  isAboutPath,
  isCollectionsPath,
  isContactPath,
  isPiecePath,
  piecePath,
  pieceSlugFromPath,
} from './config/catalogue'

function normalizePathname(pathname) {
  if (isArchivePath(pathname)) return '/collections'
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

export default function App() {
  const reduceMotion = useReducedMotion()
  const [route, setRoute] = useState(() => normalizePathname(window.location.pathname))
  const [menuOpen, setMenuOpen] = useState(false)

  const isCollectionsRoute = isCollectionsPath(route)
  const isContactRoute = isContactPath(route)
  const isAboutRoute = isAboutPath(route)
  const isPieceRoute = isPiecePath(route)
  const isKnownRoute = route === '/' || isCollectionsRoute || isContactRoute || isAboutRoute || isPieceRoute
  const isSubpage = isCollectionsRoute || isContactRoute || isAboutRoute || isPieceRoute || !isKnownRoute

  const [showLoader, setShowLoader] = useState(() => shouldPlayIntro())
  const [heroReady, setHeroReady] = useState(() => !shouldPlayIntro())
  const pendingScrollRef = useRef(null)
  const pendingHomeSectionRef = useRef(null) // set when we go back to the homepage and should land on a section
  const routeRef = useRef(route)
  routeRef.current = route

  const [loaderLeaveMs, setLoaderLeaveMs] = useState(0)
  const handleLoaderExit = (leaveMs) => {
    setLoaderLeaveMs(typeof leaveMs === 'number' ? leaveMs : 0)
    setHeroReady(true)
  }
  const handleLoaderDone = () => {
    setHeroReady(true)
    setShowLoader(false)
    hideBootOverlay()
    document.documentElement.classList.add('intro-done')
    document.documentElement.classList.remove('is-intro')
  }

  useEffect(() => {
    if (showLoader) return
    hideBootOverlay()
    document.documentElement.classList.add('intro-done')
  }, [showLoader])

  useEffect(() => {
    if (!isArchivePath(window.location.pathname)) return
    const next = archiveSearchToCollections(window.location.search)
    window.history.replaceState({}, '', next)
    setRoute('/collections')
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      if (isArchivePath(path)) {
        const next = archiveSearchToCollections(window.location.search)
        window.history.replaceState({}, '', next)
        setRoute('/collections')
      } else {
        const next = normalizePathname(path)
        if (next === '/' && isPiecePath(routeRef.current)) pendingHomeSectionRef.current = 'selected-pieces'
        setRoute(next)
      }
      setMenuOpen(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const runScrollToSection = (id) => {
    const target = id === 'top' ? null : document.getElementById(id)
    const header = document.querySelector('.site-nav')
    const offset = Math.round(header?.getBoundingClientRect().height || 72)

    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
      return
    }

    if (!target) return

    const top = Math.round(window.scrollY + target.getBoundingClientRect().top - offset)
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  useEffect(() => {
    if (menuOpen) {
      document.documentElement.classList.add('is-menu-open')
      return
    }
    document.documentElement.classList.remove('is-menu-open')
    const pending = pendingScrollRef.current
    if (pending) {
      pendingScrollRef.current = null
      runScrollToSection(pending)
    }
  }, [menuOpen])

  const navigateToCollections = (category) => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    window.history.pushState({}, '', collectionsPath(category || 'All'))
    setMenuOpen(false)
    setRoute('/collections')
  }

  const navigateToContact = (piece, type) => {
    const params = new URLSearchParams()
    if (piece?.id) {
      params.set('product', piece.id)
      params.set('type', type || 'product')
    } else if (type) {
      params.set('type', type)
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    window.scrollTo({ top: 0, behavior: 'auto' })
    window.history.pushState({}, '', `/contact${query}`)
    setMenuOpen(false)
    setRoute('/contact')
  }

  const navigateToPiece = (slug) => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    window.history.pushState({}, '', piecePath(slug))
    setMenuOpen(false)
    setRoute(piecePath(slug))
  }

  // From a piece page: back to the homepage, landing on the Selected Pieces section (no reload).
  const goHomeSection = (id = 'selected-pieces') => {
    pendingHomeSectionRef.current = id
    window.history.pushState({}, '', `/#${id}`)
    setMenuOpen(false)
    setRoute('/')
  }

  const navigateHome = () => {
    if (isSubpage) {
      window.location.href = '/'
      return
    }
    scrollToSection('top')
  }

  const scrollToSection = (id) => {
    if (menuOpen) {
      pendingScrollRef.current = id
      setMenuOpen(false)
      return
    }
    runScrollToSection(id)
  }

  const handleNavigate = (id) => {
    if (id === 'home' || id === 'top') {
      navigateHome()
      return
    }
    if (id === 'collections') {
      const alreadyAll = isCollectionsRoute && !new URLSearchParams(window.location.search).get('category')
      if (alreadyAll) {
        setMenuOpen(false)
        return
      }
      navigateToCollections()
      return
    }
    if (id === 'about') {
      if (!isAboutRoute) {
        window.scrollTo({ top: 0, behavior: 'auto' })
        window.history.pushState({}, '', '/about')
        setMenuOpen(false)
        setRoute('/about')
      } else {
        setMenuOpen(false)
      }
      return
    }
    if (id === 'contact') {
      if (!isContactRoute) navigateToContact()
      else setMenuOpen(false)
      return
    }

    if (isSubpage) {
      window.location.href = id === 'top' ? '/' : `/#${id}`
      return
    }

    scrollToSection(id)
  }

  const pageFade = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: reduceMotion ? 0.15 : 0.45, ease: EASE },
  }

  useEffect(() => {
    if (isSubpage || showLoader) {
      document.documentElement.classList.remove('is-collections-inview')
      document.documentElement.classList.remove('is-footer-inview')
      return undefined
    }
    const section = document.getElementById('collections')
    const footer = document.querySelector('.site-footer')
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target.id === 'collections') {
          document.documentElement.classList.toggle('is-collections-inview', entry.isIntersecting)
        }
        if (entry.target.classList.contains('site-footer')) {
          document.documentElement.classList.toggle('is-footer-inview', entry.isIntersecting)
        }
      })
    }, { threshold: 0.08 })
    if (section) io.observe(section)
    if (footer) io.observe(footer)
    return () => {
      io.disconnect()
      document.documentElement.classList.remove('is-collections-inview')
      document.documentElement.classList.remove('is-footer-inview')
    }
  }, [isSubpage, showLoader])

  // Land on the wanted homepage section once the homepage is on screen (instant, header offset via scroll-margin).
  useEffect(() => {
    if (route !== '/' || showLoader) return undefined
    const id = pendingHomeSectionRef.current || (window.location.hash ? window.location.hash.slice(1) : null)
    if (!id) return undefined
    pendingHomeSectionRef.current = null
    let tries = 0
    let timer = 0
    const go = () => {
      const target = document.getElementById(id)
      if (target) {
        target.scrollIntoView({ block: 'start', behavior: 'instant' })
        return
      }
      tries += 1
      if (tries < 20) timer = window.setTimeout(go, 100)
    }
    timer = window.setTimeout(go, 60)
    return () => window.clearTimeout(timer)
  }, [route, showLoader])

  const loader = showLoader ? (
    <IntroLoader onExitStart={handleLoaderExit} onComplete={handleLoaderDone} />
  ) : null

  if (isCollectionsRoute) {
    return (
      <>
        {loader}
        <OrganizationJsonLd />
        <motion.div key="collections" {...pageFade}>
          <CollectionsPage
            onNavigate={handleNavigate}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            onShowroomInquiry={navigateToContact}
          />
        </motion.div>
      </>
    )
  }

  if (isPieceRoute) {
    return (
      <>
        {loader}
        <OrganizationJsonLd />
        <motion.div key="piece" {...pageFade}>
          <PiecePage
            key={route}
            slug={pieceSlugFromPath(route)}
            onNavigate={handleNavigate}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            onInquire={navigateToContact}
            onGoHome={() => goHomeSection('selected-pieces')}
          />
        </motion.div>
      </>
    )
  }

  if (isAboutRoute) {
    return (
      <>
        {loader}
        <OrganizationJsonLd />
        <motion.div key="about" {...pageFade}>
          <AboutPage
            onNavigate={handleNavigate}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            onOpenContact={navigateToContact}
          />
        </motion.div>
      </>
    )
  }

  if (isContactRoute) {
    return (
      <>
        {loader}
        <OrganizationJsonLd />
        <motion.div key="contact" {...pageFade}>
          <ContactPage
            onNavigate={handleNavigate}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
          />
        </motion.div>
      </>
    )
  }

  if (!isKnownRoute) {
    return (
      <>
        {loader}
        <OrganizationJsonLd />
        <motion.div key="not-found" {...pageFade}>
          <NotFound
            onNavigate={handleNavigate}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
          />
        </motion.div>
      </>
    )
  }

  return (
    <div className="site-shell">
      <OrganizationJsonLd />
      {loader}

      <Navigation
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onNavigate={handleNavigate}
        revealed={heroReady}
      />

      <AnimatePresence mode="wait">
        <motion.main key="home" {...pageFade}>
          <Hero
            reduceMotion={reduceMotion}
            introReady={heroReady}
            loaderLeaveMs={loaderLeaveMs}
          />

          <BestSellers
            onOpenPiece={navigateToPiece}
          />

          <CategoryShowcase
            onSelect={(catKey) => navigateToCollections(catKey)}
          />

          <ContactSection
            onOpenContact={navigateToContact}
            onNavigate={handleNavigate}
          />
        </motion.main>
      </AnimatePresence>

      <motion.button
        className="floating-back-top-btn"
        onClick={() => scrollToSection('top')}
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ amount: 0.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Back to top"
      >
        <span>Top</span>
        <span className="top-arrow">↗</span>
      </motion.button>
    </div>
  )
}
