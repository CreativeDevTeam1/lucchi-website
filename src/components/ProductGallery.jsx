import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import ProductRow from './ProductRow'

// The first cards on the page load eagerly; the rest are lazy.
const EAGER_COUNT = 6

function ProductGrid({ products, orderOf, openProduct, setOpenProduct, onShowroomInquiry, reduceMotion }) {
  return (
    <div className="archive-items-grid">
      {products.map((product, index) => (
        <ProductRow
          key={product.id}
          product={product}
          index={index}
          eager={orderOf(product.id) < EAGER_COUNT}
          open={openProduct === product.id}
          onToggle={() => setOpenProduct((curr) => (curr === product.id ? null : product.id))}
          onShowroomInquiry={onShowroomInquiry}
          reduceMotion={reduceMotion}
        />
      ))}
    </div>
  )
}

export default function ProductGallery({
  products,
  activeCategory,
  categories,
  onFilter,
  onShowroomInquiry,
  reduceMotion,
}) {
  const [openProduct, setOpenProduct] = useState(null)
  const filterTabs = ['All', ...categories]
  const visible = activeCategory === 'All'
    ? products
    : products.filter((item) => item.category === activeCategory)

  // Position of each card in page order (All view lists the groups one after another).
  const pageOrder = activeCategory === 'All'
    ? categories.flatMap((cat) => products.filter((item) => item.category === cat))
    : visible
  const orderOf = (id) => pageOrder.findIndex((item) => item.id === id)

  // With six or more collections the tab row scrolls sideways on phones: keep the selected tab in view.
  const tabsRef = useRef(null)
  useEffect(() => {
    const list = tabsRef.current
    const active = list?.querySelector('[aria-selected="true"]')
    if (!list || !active) return
    const left = active.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft
    list.scrollTo({ left: Math.max(0, left - (list.clientWidth - active.offsetWidth) / 2), behavior: 'auto' })
  }, [activeCategory])

  // Switching filter keeps the old page height until the new cards are in, so the page never collapses and jumps.
  const bodyRef = useRef(null)
  const lastHeight = useRef(0)
  const lastCategory = useRef(activeCategory)
  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return undefined
    if (lastCategory.current !== activeCategory) {
      el.style.minHeight = `${lastHeight.current}px`
      lastCategory.current = activeCategory
      const timer = window.setTimeout(() => { el.style.minHeight = '' }, 700)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [activeCategory])
  useLayoutEffect(() => {
    if (bodyRef.current && !bodyRef.current.style.minHeight) lastHeight.current = bodyRef.current.offsetHeight
  })

  return (
    <section id="catalogue-grid" className="archive-catalogue-section section-light" aria-labelledby="collections-page-heading">
      <div className="page-width">
        <div className="archive-tabs-container">
          <div ref={tabsRef} className="archive-tabs-list" role="tablist" aria-label="Filter by collection">
            {filterTabs.map((cat) => {
              const isActive = activeCategory === cat

              return (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={isActive}
                  className={`archive-tab-btn ${isActive ? 'is-active' : ''}`}
                  onClick={() => onFilter(cat)}
                >
                  <span className="tab-label">{cat}</span>

                  {isActive && (
                    <motion.span
                      layoutId="archiveActiveUnderline"
                      className="tab-active-gliding-underline"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div ref={bodyRef} className="archive-catalogue-body">
        {activeCategory === 'All' ? (
          categories.map((cat) => {
            const items = products.filter((item) => item.category === cat)
            if (!items.length) return null
            return (
              <section key={cat} className="catalogue-group" aria-labelledby={`group-${cat.replace(/\s+/g, '-').toLowerCase()}`}>
                <h2 className="catalogue-group-heading" id={`group-${cat.replace(/\s+/g, '-').toLowerCase()}`}>
                  <button type="button" onClick={() => onFilter(cat)}>
                    {cat}
                  </button>
                  <span className="catalogue-group-rule" aria-hidden="true" />
                </h2>
                <ProductGrid
                  products={items}
                  orderOf={orderOf}
                  openProduct={openProduct}
                  setOpenProduct={setOpenProduct}
                  onShowroomInquiry={onShowroomInquiry}
                  reduceMotion={reduceMotion}
                />
              </section>
            )
          })
        ) : (
          <ProductGrid
            products={visible}
            orderOf={orderOf}
            openProduct={openProduct}
            setOpenProduct={setOpenProduct}
            onShowroomInquiry={onShowroomInquiry}
            reduceMotion={reduceMotion}
          />
        )}
        </div>
      </div>
    </section>
  )
}
