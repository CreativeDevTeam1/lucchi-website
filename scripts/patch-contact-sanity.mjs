/**
 * One-off: write the client-confirmed contact details (2026-10-09) into the existing
 * `contactSettings` document in Sanity (project szy0z3lw, dataset production). It patches, never duplicates.
 *   node scripts/patch-contact-sanity.mjs            -> dry run (prints what it would set)
 *   node scripts/patch-contact-sanity.mjs --write    -> patch
 * Token: SANITY_WRITE_TOKEN from the git-ignored .env.local (never printed). Never touches prices.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STUDIO = path.resolve(ROOT, '..', 'studio-lucchi')
const WRITE = process.argv.includes('--write')

const PHONE = '01094830060' // Egyptian mobile, 11 digits
const BRANCHES = [
  {
    _key: 'fifth-settlement',
    _type: 'branch',
    name: 'Fifth Settlement (New Cairo)',
    address: 'Spot Mall, in front of Gate 4 of the American University (AUC), Fifth Settlement (New Cairo), Ground Floor',
    confirmed: true,
  },
  {
    _key: 'nasr-city',
    _type: 'branch',
    name: 'Nasr City',
    address: '8 Hesham Labib St, off Makram Ebeid, Nasr City',
    confirmed: true,
  },
]

if (!/^01\d{9}$/.test(PHONE)) throw new Error('The phone does not look like an Egyptian mobile number. Stopping.')

function readToken() {
  if (process.env.SANITY_WRITE_TOKEN) return process.env.SANITY_WRITE_TOKEN
  const envFile = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envFile)) return ''
  const line = fs.readFileSync(envFile, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SANITY_WRITE_TOKEN='))
  return line ? line.slice('SANITY_WRITE_TOKEN='.length).trim().replace(/^["']|["']$/g, '') : ''
}

const set = {
  phone: { _type: 'object', value: PHONE, confirmed: true },
  // the single-address fallback follows branch 1
  address: { _type: 'object', value: BRANCHES[0].address, confirmed: true },
  branches: BRANCHES,
}
console.log(WRITE ? 'WRITE' : 'DRY RUN', '- contactSettings: phone', PHONE, '(confirmed), address = branch 1 (confirmed),', BRANCHES.length, 'branches (confirmed)')
if (!WRITE) process.exit(0)

const token = readToken()
if (!token) {
  console.error('SANITY_WRITE_TOKEN not found in .env.local. Create one at sanity.io/manage > project "lucchi" > API > Tokens (Editor), put it in .env.local, and run again.')
  process.exit(1)
}
const { createClient } = createRequire(path.join(STUDIO, 'package.json'))('@sanity/client')
const client = createClient({ projectId: 'szy0z3lw', dataset: 'production', apiVersion: '2025-02-19', token, useCdn: false })

const existing = await client.getDocument('contactSettings')
if (!existing) {
  console.error('contactSettings document not found. Nothing written.')
  process.exit(1)
}
console.log('old phone in Sanity:', existing.phone?.value, '| confirmed:', existing.phone?.confirmed)
// Publish the draft too, if one exists, so the Studio and the published copy agree.
const ids = ['contactSettings']
if (await client.getDocument('drafts.contactSettings')) ids.push('drafts.contactSettings')
for (const id of ids) {
  await client.patch(id).set(set).commit()
  console.log('patched', id)
}
