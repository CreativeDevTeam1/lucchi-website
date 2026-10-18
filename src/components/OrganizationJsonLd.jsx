import { useEffect } from 'react'
import { organizationJsonLd } from '../data/contact'

const SCRIPT_ID = 'lucchi-organization-jsonld'

export default function OrganizationJsonLd() {
  useEffect(() => {
    const origin = window.location.origin
    const data = organizationJsonLd({
      siteUrl: origin,
      logoUrl: `${origin}/brand/lucchi-logo-beige.png`,
    })
    let node = document.getElementById(SCRIPT_ID)
    if (!node) {
      node = document.createElement('script')
      node.id = SCRIPT_ID
      node.type = 'application/ld+json'
      document.head.appendChild(node)
    }
    node.textContent = JSON.stringify(data)
    return () => {
      node?.remove()
    }
  }, [])

  return null
}
