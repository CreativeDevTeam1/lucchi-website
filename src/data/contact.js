/**
 * Lucchi Furniture (Egypt) contact details.
 * The values and the `confirmed` switches now come from Sanity (contactSettings) through the build snapshot.
 * The items below are the fallback, used when the snapshot has no contact data. Flip `confirmed` in the Studio to publish an item.
 * Unconfirmed items stay hidden unless the URL has ?previewContact=1
 */
import { useEffect, useState } from 'react'
import { snapshot, text } from './sanity'

export const CONTACT_CHECKED_ON = '2026-10-04'

const item = (value, source, confidence, confirmed, extra = {}) => ({
  value,
  source,
  confidence,
  confirmed,
  ...extra,
})

const localContact = {
  email: item(
    '',
    'Not found in client-assets, catalogues, or official public pages on 2026-10-04. The example atelier@lucchi.com in the old contact file is a placeholder, not a real inbox.',
    '—',
    false,
  ),
  phone: item(
    '01094830060',
    'Confirmed by the client, 2026-10-09 (replaces the Facebook-page number +20 12 03988877 and the two conflicting directory numbers)',
    'High',
    true,
    { display: '0109 483 0060', tel: '+201094830060' },
  ),
  whatsapp: item(
    '',
    'No official WhatsApp Business link found on the verified Facebook, Instagram, Maps, or website pages on 2026-10-04.',
    '—',
    false,
  ),
  address: item(
    'Spot Mall, in front of Gate 4 of the American University (AUC), Fifth Settlement (New Cairo), Ground Floor',
    'Confirmed by the client, 2026-10-09',
    'High',
    true,
  ),
  mapsUrl: item(
    'https://www.google.com/maps/place/Lucchi+Furniture/@30.0150489,31.499995,17z/data=!3m1!4b1!4m6!3m5!1s0x1458235bd33ce08b:0x89cdc08e5625e0c!8m2!3d30.0150489!4d31.499995',
    'Google Maps place page for Lucchi Furniture, The Spot Mall, 2026-10-04',
    'Medium',
    false,
  ),
  hours: item(
    'Daily 11:00–23:00',
    'Google Maps listing (open, closes 23:00) and Improuse directory 11am–11pm, 2026-10-04',
    'Medium',
    false,
  ),
  instagram: item(
    'https://www.instagram.com/lucchi.furniture/',
    'Client onboarding URL in src/components/ContactPage.jsx; verified live as Lucchi Furniture (@lucchi.furniture), 24.9k followers, 2026-10-04',
    'High',
    false,
    { handle: '@lucchi.furniture', followers: '24.9k' },
  ),
  facebook: item(
    'https://www.facebook.com/Lucchifurniture/',
    'Client share URL https://www.facebook.com/share/18LTZVR1KW/ resolved to this page; 163k followers; links to @lucchi.furniture; 2026-10-04',
    'High',
    false,
    { handle: 'Lucchifurniture', followers: '163k' },
  ),
  website: item(
    'https://lucchifurniture.com/',
    'Linked from the Google Maps listing; live page has no email or phone, 2026-10-04',
    'Medium',
    false,
  ),
  threads: item(
    'https://www.threads.net/@lucchi.furniture',
    'Linked from the Instagram profile, 2026-10-04',
    'Medium',
    false,
    { handle: '@lucchi.furniture' },
  ),
  tiktok: item('', 'Not found for Lucchi Furniture Egypt on 2026-10-04.', '—', false),
  linkedin: item('', 'Not found for Lucchi Furniture Egypt on 2026-10-04.', '—', false),
  pinterest: item('', 'Not found for Lucchi Furniture Egypt on 2026-10-04.', '—', false),
  youtube: item('', 'Not found for Lucchi Furniture Egypt on 2026-10-04.', '—', false),
}

/* The two showrooms (confirmed by the client, 2026-10-09). Sanity's `branches` list wins when it has entries;
   this is the fallback. A branch is shown only when `confirmed` is true (all of them with ?previewContact=1). */
const localBranches = [
  {
    name: 'Fifth Settlement (New Cairo)',
    address: 'Spot Mall, in front of Gate 4 of the American University (AUC), Fifth Settlement (New Cairo), Ground Floor',
    mapsUrl: '',
    confirmed: true,
  },
  {
    name: 'Nasr City',
    address: '8 Hesham Labib St, off Makram Ebeid, Nasr City',
    mapsUrl: '',
    confirmed: true,
  },
]

function mergeBranches(local, remote) {
  if (!Array.isArray(remote) || remote.length === 0) return local
  const list = remote
    .map((b) => ({
      name: text(b?.name) || '',
      address: text(b?.address) || '',
      mapsUrl: text(b?.mapsUrl) || '',
      confirmed: b?.confirmed === true,
    }))
    .filter((b) => b.address)
  return list.length ? list : local
}

// Sanity wins per item: its value and its `confirmed` switch. An empty Sanity value means "not provided" and
// stays hidden. Extra details that Sanity has no field for (display, tel, handle) are kept only when the
// value is unchanged, so an edited number never keeps an old display format.
function mergeContact(local, remote) {
  if (!remote) return local
  const merged = { ...local }
  for (const key of Object.keys(local)) {
    const field = remote[key]
    if (!field) continue
    const value = text(field.value) || ''
    const same = value === local[key].value
    const { display, tel, handle, followers, conflicts, ...base } = local[key]
    merged[key] = {
      ...base,
      ...(same ? { display, tel, handle, followers, conflicts } : {}),
      value,
      confirmed: field.confirmed === true,
    }
  }
  return merged
}

export const contact = mergeContact(localContact, snapshot.contact)
export const branches = mergeBranches(localBranches, snapshot.contact?.branches)

/** Egyptian numbers read as 0109 483 0060; anything else is shown as typed. */
export function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  const national = digits.startsWith('20') && digits.length === 12 ? `0${digits.slice(2)}` : digits
  return /^01\d{9}$/.test(national) ? `${national.slice(0, 4)} ${national.slice(4, 7)} ${national.slice(7)}` : value
}

/** The branches a visitor may see: confirmed ones, or all of them in preview mode. */
export function visibleBranches(preview = false) {
  return branches.filter((b) => b.address && (b.confirmed === true || preview))
}

export function isPreviewContact() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('previewContact') === '1'
}

export function canShow(field, preview = false) {
  return Boolean(field?.value) && (field.confirmed === true || preview)
}

export function useContactPreview() {
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    const read = () => setPreview(isPreviewContact())
    read()
    window.addEventListener('popstate', read)
    return () => window.removeEventListener('popstate', read)
  }, [])
  return preview
}

export function visibleFields() {
  return Object.fromEntries(
    Object.entries(contact).filter(([, field]) => canShow(field)),
  )
}

export function confirmedFields() {
  return Object.fromEntries(
    Object.entries(contact).filter(([, field]) => field?.value && field.confirmed === true),
  )
}

export function phoneHref(field) {
  const raw = field?.tel || field?.value || ''
  let digits = raw.replace(/[^\d+]/g, '')
  if (/^01\d{9}$/.test(digits)) digits = `+20${digits.slice(1)}` // Egyptian mobile typed with the leading 0
  if (!digits) return ''
  return digits.startsWith('tel:') ? digits : `tel:${digits}`
}

export function whatsappHref(field) {
  if (!field?.value) return ''
  const digits = field.value.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : ''
}

export function organizationJsonLd({ siteUrl, logoUrl }) {
  const published = confirmedFields()
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    name: 'Lucchi Furniture',
    url: siteUrl,
    logo: logoUrl,
  }
  const sameAs = ['instagram', 'facebook', 'threads', 'website']
    .map((key) => published[key]?.value)
    .filter(Boolean)
  if (sameAs.length) data.sameAs = sameAs
  if (published.phone?.tel || published.phone?.value) {
    data.telephone = phoneHref(published.phone).replace(/^tel:/, '')
  }
  if (published.email?.value) data.email = published.email.value
  const confirmedBranches = branches.filter((b) => b.address && b.confirmed === true)
  if (confirmedBranches.length) {
    const toAddress = (b) => ({ '@type': 'PostalAddress', streetAddress: b.address, addressCountry: 'EG' })
    data.address = confirmedBranches.length === 1 ? toAddress(confirmedBranches[0]) : confirmedBranches.map(toAddress)
  } else if (published.address?.value) {
    data.address = {
      '@type': 'PostalAddress',
      streetAddress: published.address.value,
      addressCountry: 'EG',
    }
  }
  return data
}
