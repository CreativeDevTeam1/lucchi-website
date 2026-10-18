import fs from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Default SEO (siteSettings in Sanity) written into the static index.html at build time, from the snapshot.
// If the snapshot has no value, index.html keeps its own text.
function seoFromSnapshot() {
  const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return {
    name: 'seo-from-snapshot',
    transformIndexHtml(html) {
      let site
      try {
        site = JSON.parse(fs.readFileSync(new URL('./src/data/sanity-snapshot.json', import.meta.url), 'utf8')).site
      } catch {
        return html
      }
      const title = typeof site?.seoTitle === 'string' && site.seoTitle.trim()
      const description = typeof site?.seoDescription === 'string' && site.seoDescription.trim()
      const ogUrl = site?.ogImage?.asset?.url
      if (title) {
        html = html
          .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
          .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
          .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
      }
      if (description) html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`)
      if (ogUrl) {
        const img = `${ogUrl}?w=1200&fm=jpg&q=80`
        html = html
          .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${img}$2`)
          .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${img}$2`)
      }
      return html
    },
  }
}

export default defineConfig({
  plugins: [react(), seoFromSnapshot()],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
})
