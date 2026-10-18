import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { products, DEFAULT_TITLE } from '../data/content'
import ProductGallery from './ProductGallery'
import Navigation from './Navigation'
import Footer from './Footer'
import { CATALOGUE_CATEGORIES, collectionsPath, parseCategoryParam } from '../config/catalogue'

export default function CollectionsPage({ onNavigate, menuOpen, setMenuOpen, onShowroomInquiry }) {
  const reduceMotion = useReducedMotion()

  const readCategoryFromUrl = () => {
    if (typeof window === 'undefined') return 'All'
    return parseCategoryParam(new URLSearchParams(window.location.search).get('category'))
  }

  const [activeCategory, setActiveCategory] = useState(() => readCategoryFromUrl())

  useEffect(() => {
    document.title = 'Collections — Lucchi Furniture'
    // The list follows the categories in Sanity, so a new category is mentioned without a code change.
    const names = CATALOGUE_CATEGORIES.map((name) => name.toLowerCase())
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}` : names.join('')
    const description = `Lucchi Furniture collections across ${list}.`
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    const previous = meta.getAttribute('content')
    meta.setAttribute('content', description)
    return () => {
      document.title = DEFAULT_TITLE
      if (previous) meta.setAttribute('content', previous)
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => setActiveCategory(readCategoryFromUrl())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const next = collectionsPath(activeCategory)
    if (`${window.location.pathname}${window.location.search}` !== next) {
      window.history.replaceState({}, '', next)
    }
  }, [])

  useEffect(() => {
    if (activeCategory === 'All') return undefined
    const grid = document.getElementById('catalogue-grid')
    if (!grid) return undefined
    const header = document.querySelector('.site-nav')
    const offset = Math.round(header?.getBoundingClientRect().height || 72)
    const top = window.scrollY + grid.getBoundingClientRect().top - offset
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' })
    return undefined
  }, [])

  const handleFilter = (cat) => {
    setActiveCategory(cat)
    const next = collectionsPath(cat)
    window.history.pushState({}, '', next)
    const grid = document.getElementById('catalogue-grid')
    if (!grid) return
    const header = document.querySelector('.site-nav')
    const offset = Math.round(header?.getBoundingClientRect().height || 72)
    const top = window.scrollY + grid.getBoundingClientRect().top - offset
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <div className="site-shell archive-page-shell">
      <Navigation
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onNavigate={onNavigate}
        revealed
      />

      <main>
        <section className="archive-hero-block section-dark" aria-labelledby="collections-page-heading">
          <div className="page-width archive-hero-inner">
            <motion.h1
              id="collections-page-heading"
              className="archive-main-title"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Collections
            </motion.h1>

            <div className="archive-hero-sub-row">
              <button
                className="archive-return-ghost-btn"
                onClick={() => onNavigate('home')}
              >
                <span>Return home</span>
                <ArrowUpRight size={14} strokeWidth={1.4} />
              </button>
            </div>
          </div>
        </section>

        <ProductGallery
          products={products}
          activeCategory={activeCategory}
          categories={CATALOGUE_CATEGORIES}
          onFilter={handleFilter}
          onShowroomInquiry={onShowroomInquiry}
          reduceMotion={reduceMotion}
        />
      </main>

      <Footer onNavigate={onNavigate} onEnquire={() => onShowroomInquiry()} />
    </div>
  )
}
