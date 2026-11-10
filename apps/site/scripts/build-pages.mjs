import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { INSTALL_URL, REPO_URL, SITE_URL, content } from './content.mjs'

const here = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url))
const media = (name) => `/media/${name}`
const esc = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const logo = `<svg viewBox="0 0 100 100" class="size-full" aria-hidden="true"><rect width="100" height="100" rx="22" fill="#171717"/><path d="M22 28h56L57 53v20l-14-7V53L22 28Z" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const github = `<svg viewBox="0 0 16 16" class="size-4" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`

const shot = (inner) =>
  `<div class="overflow-hidden rounded-2xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/5">${inner}</div>`

const browserWindow = (inner) =>
  `<div class="backdrop rounded-3xl p-3 ring-1 ring-black/5 sm:p-8"><div class="overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/10"><div class="flex h-8 items-center gap-1.5 border-b border-neutral-200 bg-neutral-50 px-3"><span class="size-2.5 rounded-full bg-neutral-300"></span><span class="size-2.5 rounded-full bg-neutral-300"></span><span class="size-2.5 rounded-full bg-neutral-300"></span></div>${inner}</div></div>`

const picture = (name, alt, eager = false) =>
  `<img src="${media(`screenshots/${name}.webp`)}" alt="${esc(alt)}" width="3200" height="2120" class="block h-auto w-full" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`

const video = (name, _image, label) =>
  `<video class="block h-auto w-full" autoplay muted loop playsinline preload="metadata" poster="${media(`videos/${name}.jpg`)}" aria-label="${esc(label)}"><source src="${media(`videos/${name}.mp4`)}" type="video/mp4" /></video>`

function jsonLd(t) {
  const app = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PR Sift',
    applicationCategory: 'DeveloperApplication',
    applicationSubCategory: 'Code review',
    operatingSystem: 'Chrome, Edge, Brave, Arc, Dia',
    description: t.description,
    url: SITE_URL + t.path,
    downloadUrl: INSTALL_URL,
    codeRepository: REPO_URL,
    license: 'https://opensource.org/licenses/MIT',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    image: SITE_URL + 'media/og.png',
    screenshot: t.features.map((f) => SITE_URL + `media/screenshots/${f.image}.webp`),
    featureList: t.features.map((f) => f.title),
    inLanguage: t.lang,
  }
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faq.items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }
  return [app, faq].map((data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`).join('\n    ')
}

function page(t) {
  const other = t.lang === 'en' ? content.ar : content.en
  const url = SITE_URL + t.path
  const features = t.features
    .map(
      (f, i) => `
      <section id="${f.id}" class="reveal grid items-center gap-10 py-16 lg:grid-cols-12 lg:gap-14 lg:py-24">
        <div class="lg:col-span-4 ${i % 2 ? 'lg:order-2' : ''}">
          <p class="text-sm font-semibold text-neutral-500">${esc(f.eyebrow)}</p>
          <h3 class="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">${esc(f.title)}</h3>
          <p class="mt-4 text-lg leading-relaxed text-neutral-600">${esc(f.text)}</p>
          <ul class="mt-6 flex flex-col gap-3 text-[15px] text-neutral-600">
            ${f.points.map(([a, b]) => `<li><strong class="font-semibold text-neutral-900">${esc(a)}</strong> ${esc(b)}</li>`).join('\n            ')}
          </ul>
        </div>
        <div class="lg:col-span-8">${f.video ? browserWindow(video(f.video, f.image, f.alt)) : shot(picture(f.image, f.alt))}</div>
      </section>`,
    )
    .join('')

  return `<!doctype html>
<html lang="${t.lang}" dir="${t.dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(t.title)}</title>
    <meta name="description" content="${esc(t.description)}" />
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="${t.lang}" href="${url}" />
    <link rel="alternate" hreflang="${other.lang}" href="${SITE_URL + other.path}" />
    <link rel="alternate" hreflang="x-default" href="${SITE_URL}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta name="theme-color" content="#ffffff" />
    <meta name="keywords" content="GitHub pull request review, code review Chrome extension, review large pull requests, hide viewed files GitHub, filter PR files by extension, AI code review notes, Claude, ChatGPT, Gemini" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="PR Sift" />
    <meta property="og:title" content="${esc(t.title)}" />
    <meta property="og:description" content="${esc(t.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SITE_URL}media/og.png" />
    <meta property="og:image:width" content="2400" />
    <meta property="og:image:height" content="1260" />
    <meta property="og:locale" content="${t.lang === 'ar' ? 'ar_AR' : 'en_US'}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(t.title)}" />
    <meta name="twitter:description" content="${esc(t.description)}" />
    <meta name="twitter:image" content="${SITE_URL}media/og.png" />
    ${jsonLd(t)}
    <script type="module" src="/src/main.js"></script>
  </head>
  <body class="bg-white font-sans text-neutral-900 antialiased">
    <header class="sticky top-0 z-30 border-b border-neutral-200/70 bg-white/80 backdrop-blur">
      <nav class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6" aria-label="Main">
        <a href="/${t.path}" class="flex items-center gap-2 font-semibold"><span class="size-7">${logo}</span>PR Sift</a>
        <div class="hidden items-center gap-6 text-sm text-neutral-600 md:flex">
          <a href="#filters" class="hover:text-neutral-900">${t.nav.features}</a>
          <a href="#how" class="hover:text-neutral-900">${t.nav.how}</a>
          <a href="#faq" class="hover:text-neutral-900">${t.nav.faq}</a>
        </div>
        <span class="flex-1"></span>
        <a href="/${other.path}" hreflang="${other.lang}" class="text-sm text-neutral-600 hover:text-neutral-900">${t.nav.switch}</a>
        <a href="${REPO_URL}" class="hidden items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 sm:inline-flex">${github}<span>${t.nav.star}</span><span data-stars class="text-neutral-500"></span></a>
      </nav>
    </header>

    <main>
      <section class="mx-auto max-w-6xl px-4 pt-16 text-center sm:px-6 sm:pt-24">
        <p class="text-sm font-medium text-neutral-500">${esc(t.hero.eyebrow)}</p>
        <h1 class="mx-auto mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">${esc(t.hero.title)}</h1>
        <p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-neutral-600 sm:text-xl">${esc(t.hero.lead)}</p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="${INSTALL_URL}" class="rounded-xl bg-neutral-900 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-neutral-800">${esc(t.hero.cta)}</a>
          <a href="${REPO_URL}" class="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-6 py-3 text-base font-semibold hover:bg-neutral-50">${github}${esc(t.hero.secondary)}</a>
        </div>
        <p class="mt-4 text-sm text-neutral-500">${esc(t.hero.note)}</p>
        <div class="mt-14">${browserWindow(video('filters-demo', 'review', t.features[0].alt))}</div>
      </section>

      <section class="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div class="reveal mx-auto max-w-3xl text-center">
          <p class="text-sm font-semibold text-neutral-500">${esc(t.problem.eyebrow)}</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">${esc(t.problem.title)}</h2>
          <p class="mt-5 text-lg leading-relaxed text-neutral-600">${esc(t.problem.lead)}</p>
        </div>
        <div class="mt-14 grid gap-5 md:grid-cols-3">
          ${t.problem.cards.map(([title, text]) => `<div class="reveal rounded-2xl border border-neutral-200 bg-neutral-50 p-6"><h3 class="text-lg font-semibold">${esc(title)}</h3><p class="mt-2 leading-relaxed text-neutral-600">${esc(text)}</p></div>`).join('\n          ')}
        </div>
      </section>

      <div class="mx-auto max-w-6xl px-4 sm:px-6">${features}</div>

      <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div class="reveal text-center">
          <p class="text-sm font-semibold text-neutral-500">${esc(t.gallery.eyebrow)}</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">${esc(t.gallery.title)}</h2>
        </div>
        <div class="reveal mt-10">${shot(picture(t.gallery.image, t.gallery.alt))}</div>
      </section>

      <section id="how" class="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div class="reveal text-center">
          <p class="text-sm font-semibold text-neutral-500">${esc(t.how.eyebrow)}</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">${esc(t.how.title)}</h2>
        </div>
        <ol class="mt-14 grid gap-5 md:grid-cols-3">
          ${t.how.steps.map(([title, text], i) => `<li class="reveal rounded-2xl border border-neutral-200 p-6"><span class="flex size-9 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">${i + 1}</span><h3 class="mt-4 text-lg font-semibold">${esc(title)}</h3><p class="mt-2 text-neutral-600">${esc(text)}</p></li>`).join('\n          ')}
        </ol>
        <div class="reveal mx-auto mt-12 max-w-4xl">${shot(picture('launcher', t.how.steps[2][1]))}</div>
      </section>

      <section class="bg-neutral-950 text-white">
        <div class="reveal mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <p class="text-sm font-semibold text-neutral-400">${esc(t.privacy.eyebrow)}</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">${esc(t.privacy.title)}</h2>
          <p class="mt-6 text-lg leading-relaxed text-neutral-300">${esc(t.privacy.text)}</p>
        </div>
      </section>

      <section id="faq" class="mx-auto max-w-3xl px-4 py-24 sm:px-6">
        <h2 class="reveal text-center text-3xl font-semibold tracking-tight sm:text-4xl">${esc(t.faq.title)}</h2>
        <div class="mt-10 divide-y divide-neutral-200 border-y border-neutral-200">
          ${t.faq.items.map(([q, a]) => `<details class="group py-5"><summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">${esc(q)}<span class="text-neutral-400 transition group-open:rotate-45">+</span></summary><p class="mt-3 leading-relaxed text-neutral-600">${esc(a)}</p></details>`).join('\n          ')}
        </div>
      </section>

      <section class="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div class="reveal rounded-3xl bg-neutral-950 px-6 py-16 text-center text-white sm:py-20">
          <h2 class="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">${esc(t.cta.title)}</h2>
          <div class="mt-8 flex flex-wrap justify-center gap-3">
            <a href="${INSTALL_URL}" class="rounded-xl bg-white px-6 py-3 font-semibold text-neutral-900 hover:bg-neutral-100">${esc(t.cta.button)}</a>
            <a href="${REPO_URL}/blob/main/CONTRIBUTING.md" class="rounded-xl border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">${esc(t.cta.contribute)}</a>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-neutral-200">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-sm text-neutral-500 sm:px-6">
        <span class="flex items-center gap-2 font-medium text-neutral-900"><span class="size-5">${logo}</span>PR Sift</span>
        <span>${esc(t.footer.made)}</span>
        <span>${esc(t.footer.disclaimer)}</span>
        <span class="flex-1"></span>
        <a href="${REPO_URL}/issues/new/choose" class="hover:text-neutral-900">${esc(t.footer.report)}</a>
        <a href="${REPO_URL}" class="hover:text-neutral-900">GitHub</a>
      </div>
    </footer>
  </body>
</html>
`
}

writeFileSync(here('index.html'), page(content.en))
mkdirSync(here('ar'), { recursive: true })
writeFileSync(here('ar/index.html'), page(content.ar))

rmSync(here('public/media'), { recursive: true, force: true })
cpSync(fileURLToPath(new URL('../../../media', import.meta.url)), here('public/media'), { recursive: true })
writeFileSync(here('public/favicon.svg'), logo.replace('class="size-full" ', 'xmlns="http://www.w3.org/2000/svg" '))

const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  here('public/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${['', 'ar/']
  .map(
    (path) => `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${SITE_URL}ar/" />
  </url>`,
  )
  .join('\n')}
</urlset>
`,
)
writeFileSync(here('public/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`)

const en = content.en
writeFileSync(
  here('public/llms.txt'),
  `# PR Sift

> ${en.description}

PR Sift is a browser extension for github.com. It opens a review workspace on top of a pull request's "Files changed" tab.

## Features

${en.features.map((f) => `- ${f.title} ${f.text}`).join('\n')}

## Facts

- Price: free. License: MIT. Source: ${REPO_URL}
- Browsers: Chrome and Chromium browsers (Edge, Brave, Arc, Dia).
- Privacy: no server, no account, no analytics. Data stays in the browser. Talks only to GitHub.
- A GitHub token is optional and only used to post a note as a review comment.
- Not affiliated with GitHub.

## FAQ

${en.faq.items.map(([q, a]) => `### ${q}\n\n${a}`).join('\n\n')}

## Links

- Website (English): ${SITE_URL}
- Website (Arabic): ${SITE_URL}ar/
- Install and docs: ${INSTALL_URL}
- Report a problem: ${REPO_URL}/issues/new/choose
`,
)
console.log('pages written')
