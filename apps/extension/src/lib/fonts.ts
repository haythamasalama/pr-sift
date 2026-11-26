import monoMedium from '../assets/fonts/ibm-plex-mono-latin-500-normal.woff2?inline'
import mono from '../assets/fonts/ibm-plex-mono-latin-400-normal.woff2?inline'
import sansMedium from '../assets/fonts/ibm-plex-sans-latin-500-normal.woff2?inline'
import sans from '../assets/fonts/ibm-plex-sans-latin-400-normal.woff2?inline'
import sansSemibold from '../assets/fonts/ibm-plex-sans-latin-600-normal.woff2?inline'

// The PR Sift theme uses the website's IBM Plex fonts, bundled so nothing loads from another host. They are
// added from memory with the FontFace API: github.com's content security policy blocks font URLs it does not
// list, and fonts declared inside a shadow root are ignored. The names are ours, so no site uses them.
const FACES: [family: string, url: string, weight: string][] = [
  ['PR Sift Plex Sans', sans, '400'],
  ['PR Sift Plex Sans', sansMedium, '500'],
  ['PR Sift Plex Sans', sansSemibold, '600'],
  ['PR Sift Plex Mono', mono, '400'],
  ['PR Sift Plex Mono', monoMedium, '500'],
]

const bytes = (dataUrl: string) => Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), (c) => c.charCodeAt(0))

let installed = false

export function installFonts(fonts: FontFaceSet | undefined = document.fonts) {
  if (installed || !fonts || typeof FontFace !== 'function') return
  installed = true
  for (const [family, url, weight] of FACES) {
    const face = new FontFace(family, bytes(url), { weight, style: 'normal', display: 'swap' })
    fonts.add(face)
  }
}
