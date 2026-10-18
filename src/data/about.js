import { snapshot, text } from './sanity'

/**
 * About page copy — draft awaiting client approval.
 * The text now comes from Sanity (aboutPage) through the build snapshot. The values below are the fallback
 * (used for any field that is missing). Image: see src/data/content.js.
 * Only facts already confirmed in the site or client files belong here.
 */
const localAbout = {
  title: 'About Lucchi',
  documentTitle: 'About Lucchi — Lucchi Furniture',
  metaDescription:
    'About Lucchi Furniture — a furniture brand and showroom in Egypt, creating living room, bedroom, dining, kids bedroom, and accessory pieces for private homes, designers, and projects.',
  intro:
    'Lucchi is a furniture brand and showroom in Egypt, creating living room, bedroom, dining, kids bedroom, and accessory pieces for private homes, designers, and projects.',
  sections: [
    {
      id: 'approach',
      heading: 'Our approach',
      body: 'Every piece is shaped around proportion, comfort, and the quality of its materials, from a single piece to a complete room.',
    },
    {
      id: 'materials',
      heading: 'Materials',
      body: 'We work with materials such as Romanian red beech wood, natural and HPL veneers, Italian Calacatta marble, 304 stainless steel, and velvet, mohair, and linen fabrics.',
    },
  ],
  visit: {
    heading: 'Visit the showroom',
    body: 'See the collections in person. Arrange a viewing with our team in Cairo.',
    viewingLabel: 'Arrange a Viewing',
    viewingType: 'viewing',
  },
  image: {
    category: 'Living Room',
    variant: 'desktop',
    useGrade: true,
  },
}

const remote = snapshot.about || {}
const remoteSections = Array.isArray(remote.sections) ? remote.sections.filter((x) => text(x?.heading) || text(x?.body)) : []

// The page shows two sections ('approach', 'materials'). They are matched by position and any empty
// Sanity field falls back to the local text, so the page can never lose a block.
const sections = localAbout.sections.map((local, index) => ({
  id: local.id,
  heading: text(remoteSections[index]?.heading) || local.heading,
  body: text(remoteSections[index]?.body) || local.body,
}))

export const about = {
  ...localAbout,
  title: text(remote.title) || localAbout.title,
  documentTitle: text(remote.documentTitle) || localAbout.documentTitle,
  metaDescription: text(remote.metaDescription) || localAbout.metaDescription,
  intro: text(remote.intro) || localAbout.intro,
  sections,
  visit: {
    ...localAbout.visit,
    heading: text(remote.visitHeading) || localAbout.visit.heading,
    body: text(remote.visitBody) || localAbout.visit.body,
    viewingLabel: text(remote.visitButtonLabel) || localAbout.visit.viewingLabel,
  },
}
