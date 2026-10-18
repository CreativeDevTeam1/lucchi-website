import { canShow, contact, formatPhone, phoneHref, useContactPreview, visibleBranches, whatsappHref } from '../data/contact'

const ext = { target: '_blank', rel: 'noopener noreferrer' }

export default function ContactChannels({ variant = 'stack' }) {
  const preview = useContactPreview()
  const email = canShow(contact.email, preview)
  const phone = canShow(contact.phone, preview)
  const whatsapp = canShow(contact.whatsapp, preview)
  const branchList = visibleBranches(preview)
  const address = branchList.length === 0 && canShow(contact.address, preview)
  const maps = canShow(contact.mapsUrl, preview)
  const hours = canShow(contact.hours, preview)
  const instagram = canShow(contact.instagram, preview)
  const facebook = canShow(contact.facebook, preview)
  const any = email || phone || whatsapp || branchList.length > 0 || address || maps || hours || instagram || facebook

  if (!any) return null

  return (
    <div className={`contact-channels contact-channels-${variant}`}>
      {email ? (
        <a className="contact-channel-link" href={`mailto:${contact.email.value}`} aria-label={`Email Lucchi at ${contact.email.value}`}>
          {contact.email.value}
        </a>
      ) : null}
      {phone ? (
        <a className="contact-channel-link" href={phoneHref(contact.phone)} aria-label={`Call Lucchi on ${contact.phone.display || formatPhone(contact.phone.value)}`}>
          {contact.phone.display || formatPhone(contact.phone.value)}
        </a>
      ) : null}
      {whatsapp ? (
        <a className="contact-channel-link" href={whatsappHref(contact.whatsapp)} {...ext} aria-label="Message Lucchi on WhatsApp">
          WhatsApp
        </a>
      ) : null}
      {branchList.map((branch) => (
        <span className="contact-branch" key={branch.name || branch.address}>
          {branch.name ? <span className="contact-branch-name">{branch.name}</span> : null}
          {branch.mapsUrl ? (
            <a className="contact-channel-link" href={branch.mapsUrl} {...ext} aria-label={`Open ${branch.name || 'the showroom'} on Google Maps`}>
              {branch.address}
            </a>
          ) : (
            <span className="contact-channel-text contact-branch-address">{branch.address}</span>
          )}
        </span>
      ))}
      {address ? (
        maps ? (
          <a className="contact-channel-link" href={contact.mapsUrl.value} {...ext} aria-label="Open Lucchi showroom on Google Maps">
            {contact.address.value}
          </a>
        ) : (
          <span className="contact-channel-text">{contact.address.value}</span>
        )
      ) : null}
      {!address && maps ? (
        <a className="contact-channel-link" href={contact.mapsUrl.value} {...ext} aria-label="Open Lucchi showroom on Google Maps">
          Showroom map
        </a>
      ) : null}
      {hours ? <span className="contact-channel-text">{contact.hours.value}</span> : null}
      {instagram ? (
        <a className="contact-channel-link" href={contact.instagram.value} {...ext} aria-label="Lucchi Furniture on Instagram">
          Instagram {contact.instagram.handle || ''}
        </a>
      ) : null}
      {facebook ? (
        <a className="contact-channel-link" href={contact.facebook.value} {...ext} aria-label="Lucchi Furniture on Facebook">
          Facebook
        </a>
      ) : null}
    </div>
  )
}
