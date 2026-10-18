export const EASE = [0.22, 1, 0.36, 1]
export const EASE_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)'

export const SECTION_REVEAL = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.7, ease: EASE },
}

export const LOADER = {
  enabled: true,
  maxMs: 3500,
  minMs: 1100,
  handoffMs: 800,
}

export const HERO = {
  introSeconds: 1.0,
  introScaleFrom: 1.18,
  kenBurnsScale: 1.07,
  kenBurnsScaleMobile: 1.03,
  kenBurnsSeconds: 20,
  kenBurnsSecondsMobile: 16,
  sweepSeconds: 26,
  sweepOpacity: 0.14,
  pointerShiftPx: 16,
  pointerCounterShiftPx: 8,
  scrollParallaxPx: 120,
  scrollDarkenMax: 0.36,
  scrimStrength: 0.6,
  lineStagger: 0.1,
  wordStagger: 0.06,
}

export const MENU_THEMES = {
  sand: {
    bg: '#ddd0c1',
    text: '#2d3730',
    muted: 'rgba(68, 83, 73, 0.76)',
    index: 'rgba(68, 83, 73, 0.6)',
    hover: '#2d3730',
    enquireBg: '#2d3730',
    enquireText: '#e8dccd',
    logoFilter: 'brightness(0)',
  },
  green: {
    bg: '#2d3730',
    text: '#e8dccd',
    muted: 'rgba(232, 220, 205, 0.76)',
    index: 'rgba(232, 220, 205, 0.6)',
    hover: '#f4f3f0',
    enquireBg: '#e8dccd',
    enquireText: '#2d3730',
    logoFilter: 'none',
  },
}

export const MENU = {
  openMs: 860,
  closeMs: 720,
  staggerMs: 70,
  hoverMs: 400,
  blurPx: 3,
  dimOpacity: 0.5,
  panelVh: 70,
  theme: 'sand',
}

export const MARQUEE = {
  seconds: 38,
  hoverSeconds: 90,
}

export const CAROUSEL = {
  speedDesktop: 32,
  speedMobile: 22,
  pauseOnHover: true,
  resumeDelay: 1200,
  edgeMaskWidth: 7,
  speedEaseSeconds: 0.45,
  dragFriction: 0.93,
  dragClickThreshold: 6,
  arrowStepMs: 720,
  edgeScale: 0.95,
  edgeOpacity: 0.8,
  parallaxStrength: 0.035,
  parallaxOverscan: 1.06,
}

/* ALLOW_AI_RENDERS = true: slots marked "ai-placeholder" (AI studio renders from the client's Drive)
   are shown. Set it to false to make every one of them fall back to its previous real or reference image. */
export const ALLOW_AI_RENDERS = true

export const CATALOGUE_NOTE = {
  enabled: true,
  hoverOnly: true,
  text: 'Catalogue reference · final photography in preparation',
}

export function shouldPlayIntro() {
  if (typeof window === 'undefined') return false
  return LOADER.enabled !== false
}

export function hideBootOverlay() {
  const boot = document.getElementById('lucchi-boot')
  if (boot) boot.hidden = true
}
