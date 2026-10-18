import Navigation from './Navigation'

export default function NotFound({ onNavigate, menuOpen, setMenuOpen }) {
  return (
    <div className="site-shell not-found-page">
      <Navigation
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onNavigate={onNavigate}
        revealed
      />
      <main className="not-found-main">
        <h1 className="not-found-title">Page not found</h1>
        <p className="not-found-copy">This page is not available.</p>
        <button type="button" className="not-found-home" onClick={() => onNavigate('home')}>
          Return home
        </button>
      </main>
    </div>
  )
}
