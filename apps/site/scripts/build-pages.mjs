import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compare } from './compare.mjs'
import { AUTHOR, INSTALL_URL, REPO_URL, SITE_URL, brand, guides, home } from './content.mjs'

const here = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url))
const BASE = process.env.SITE_BASE ?? '/pr-sift/'
const link = (path = '') => BASE + path
const media = (path) => `${BASE}media/${path}`
const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const YEAR = new Date().getFullYear()

const GITHUB_PATH =
  'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z'

function icon(name, cls = 'size-5') {
  if (name === 'github')
    return `<svg viewBox="0 0 16 16" class="${cls}" fill="currentColor" aria-hidden="true"><path d="${GITHUB_PATH}"/></svg>`
  return readFileSync(here(`node_modules/lucide-static/icons/${name}.svg`), 'utf8')
    .replace(/<!--.*?-->\s*/s, '')
    .replace(/class="[^"]*"/, `class="${cls}" aria-hidden="true"`)
    .replace(/\s*width="24"\s*height="24"/, '')
    .replace(/\n\s*/g, ' ')
}

const brandIcon = (slug) =>
  readFileSync(here(`node_modules/simple-icons/icons/${slug}.svg`), 'utf8')
    .replace('<svg ', '<svg class="size-5" fill="currentColor" aria-hidden="true" ')
    .replace(/<title>.*?<\/title>/, '')

const MARK = 'M22 28h56L57 53v20l-14-7V53L22 28Z'
const logo = (cls = 'size-7') =>
  `<svg viewBox="0 0 100 100" class="${cls}" aria-hidden="true"><rect width="100" height="100" rx="22" class="fill-neutral-950 dark:fill-white"/><path d="${MARK}" fill="none" class="stroke-white dark:stroke-neutral-950" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const logoFile = (bg, fg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${bg}"/><path d="${MARK}" fill="none" stroke="${fg}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const button = (href, text, primary = true) =>
  `<a href="${href}" class="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-medium transition ${primary ? 'bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200' : 'border border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800'}">${text}</a>`

const shot = (name, alt, eager = false) =>
  `<img src="${media(`screenshots/${name}.webp`)}" alt="${esc(alt)}" width="3200" height="2120" class="block h-auto w-full rounded-2xl shadow-[0_24px_70px_-30px_rgba(0,0,0,0.45)] ring-1 ring-black/5 dark:ring-white/10" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`

const video = (name, label) =>
  `<div class="overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_-30px_rgba(0,0,0,0.45)] ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
    <div class="flex h-9 items-center gap-1.5 border-b border-neutral-200 px-4 dark:border-neutral-800"><span class="size-3 rounded-full bg-[#ff5f57]"></span><span class="size-3 rounded-full bg-[#febc2e]"></span><span class="size-3 rounded-full bg-[#28c840]"></span></div>
    <video class="block h-auto w-full" autoplay muted loop playsinline preload="metadata" width="1920" height="1200" poster="${media(`videos/${name}.jpg`)}" aria-label="${esc(label)}"><source src="${media(`videos/${name}.mp4`)}" type="video/mp4" /></video>
  </div>`

const eyebrow = (text, iconName) =>
  `<p class="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1 text-sm font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">${iconName ? icon(iconName, 'size-4') : ''}${esc(text)}</p>`

const BROWSERS = [
  ['googlechrome', 'Chrome'],
  ['brave', 'Brave'],
  ['arc', 'Arc'],
  ['opera', 'Opera'],
  ['vivaldi', 'Vivaldi'],
]

const browsers = () =>
  `<div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
    <span class="text-neutral-400 dark:text-neutral-500">Works in</span>
    ${BROWSERS.map(([slug, name]) => `<span class="inline-flex items-center gap-2">${brandIcon(slug)}${name}</span>`).join('')}
    <span class="inline-flex items-center gap-2">${icon('globe', 'size-5')}Edge, Dia and other Chromium browsers</span>
  </div>`

const PLAYGROUND = [
  ['src/Billing/GenerateInvoice.php', 'modified'],
  ['src/Billing/Usage/UsageMeter.php', 'added'],
  ['src/Billing/Usage/UsageRepository.php', 'added'],
  ['src/Billing/Legacy/InvoiceCalculator.php', 'deleted'],
  ['resources/js/pages/billing/InvoiceList.vue', 'added'],
  ['resources/js/lib/money.ts', 'modified'],
  ['tests/Billing/GenerateInvoiceTest.php', 'added'],
  ['resources/js/billing/InvoiceList.test.ts', 'added'],
  ['lang/ar/billing.php', 'modified'],
  ['docs/billing/usage.md', 'renamed'],
  ['composer.lock', 'modified'],
  ['pnpm-lock.yaml', 'modified'],
]

const typeOf = (file) => {
  const name = file.split('/').pop()
  if (name.endsWith('.test.ts')) return '.test.ts'
  if (name.endsWith('.lock') || name.endsWith('-lock.yaml')) return '.lock'
  return name.slice(name.lastIndexOf('.'))
}

const STATUS_COLOR = {
  added: 'text-[#1a7f37] dark:text-[#3fb950]',
  modified: 'text-[#9a6700] dark:text-[#d29922]',
  deleted: 'text-[#cf222e] dark:text-[#f85149]',
  renamed: 'text-neutral-500',
}

function playground() {
  const types = [...new Set(PLAYGROUND.map(([f]) => typeOf(f)))]
  const statuses = ['added', 'modified', 'deleted', 'renamed']
  const count = (pred) => PLAYGROUND.filter(pred).length
  const chip = (key, label, n) =>
    `<button type="button" data-chip="${key}" class="chip inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[13px] font-medium transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"><span class="font-mono">${esc(label)}</span><span class="opacity-50">${n}</span></button>`
  return `<div class="rounded-3xl border border-neutral-200 bg-neutral-50 p-4 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900/60" data-playground>
    <div class="flex flex-wrap items-center gap-2">
      ${types
        .map((t) =>
          chip(
            t,
            t,
            count(([f]) => typeOf(f) === t),
          ),
        )
        .join('')}
      <span class="mx-1 h-4 w-px bg-neutral-300 dark:bg-neutral-700"></span>
      ${statuses
        .map((s) =>
          chip(
            'status:' + s,
            s,
            count(([, st]) => st === s),
          ),
        )
        .join('')}
      <button type="button" data-reset class="ms-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] text-neutral-500 hover:text-neutral-950 dark:hover:text-white">${icon('rotate-ccw', 'size-3.5')}Reset</button>
    </div>
    <p class="mt-3 text-sm text-neutral-500" data-summary>Click a chip to show only that. Shift-click to hide it. Try .php, then added.</p>
    <ul class="mt-4 flex flex-col font-mono text-[13px]">
      ${PLAYGROUND.map(
        ([file, status]) =>
          `<li data-file data-type="${typeOf(file)}" data-status="${status}" class="mb-1.5 flex items-center gap-3 overflow-hidden rounded-lg bg-white px-3 py-2 ring-1 ring-neutral-200 transition-all duration-300 dark:bg-neutral-950 dark:ring-neutral-800"><span class="w-16 shrink-0 font-sans text-xs font-medium ${STATUS_COLOR[status]}">${status}</span><span class="truncate">${esc(file)}</span></li>`,
      ).join('\n      ')}
    </ul>
  </div>`
}

const NAV = [
  ['Features', '#features'],
  ['Notes to AI', '#ai'],
  ['Guides', 'guides/'],
  ['Compare', 'compare/'],
]

const header =
  () => `<header class="sticky top-0 z-30 border-b border-neutral-200/70 bg-white/80 backdrop-blur-xl dark:border-neutral-800/70 dark:bg-neutral-950/80">
    <nav class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6" aria-label="Main">
      <a href="${link()}" class="flex items-center gap-2 font-semibold tracking-tight">${logo()}PR Sift</a>
      <div class="hidden items-center gap-6 text-sm text-neutral-600 md:flex dark:text-neutral-400">
        ${NAV.map(([label, href]) => `<a href="${href.startsWith('#') ? link() + href : link(href)}" class="hover:text-neutral-950 dark:hover:text-white">${label}</a>`).join('')}
      </div>
      <span class="flex-1"></span>
      <button type="button" data-theme-toggle class="flex size-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900" aria-label="Switch between light and dark">${icon('moon', 'size-[18px] dark:hidden')}${icon('sun', 'hidden size-[18px] dark:block')}</button>
      <a href="${REPO_URL}" class="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3.5 py-1.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">${icon('github', 'size-4')}<span class="hidden sm:inline">Star</span><span data-stars class="text-neutral-500"></span></a>
    </nav>
  </header>`

function footer() {
  const column = (title, items) =>
    `<div><p class="text-sm font-semibold">${title}</p><ul class="mt-4 flex flex-col gap-3 text-sm text-neutral-500 dark:text-neutral-400">${items.map(([label, href]) => `<li><a href="${href}" class="hover:text-neutral-950 dark:hover:text-white">${esc(label)}</a></li>`).join('')}</ul></div>`
  return `<footer class="border-t border-neutral-200 dark:border-neutral-800">
    <div class="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_repeat(4,1fr)]">
      <div>
        <a href="${link()}" class="flex items-center gap-2 font-semibold">${logo('size-6')}PR Sift</a>
        <p class="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">A Chrome extension for reviewing large GitHub pull requests. Free, open source and private.</p>
      </div>
      ${column('Product', [
        ['Features', link() + '#features'],
        ['Notes to AI', link() + '#ai'],
        ['Privacy', link('privacy/')],
        ['FAQ', link() + '#faq'],
      ])}
      ${column(
        'Guides',
        guides.map((g) => [g.short, link(`guides/${g.slug}/`)]),
      )}
      ${column(
        'Compare',
        compare.map((c) => [`vs ${c.name}`, link(`compare/${c.slug}/`)]),
      )}
      ${column('Help', [
        ['Install', INSTALL_URL],
        ['Report a problem', `${REPO_URL}/issues/new/choose`],
        ['Changelog', `${REPO_URL}/blob/main/CHANGELOG.md`],
        ['Brand', link('brand/')],
        ['Sitemap', link('sitemap.xml')],
      ])}
    </div>
    <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 border-t border-neutral-200 px-4 py-6 text-sm text-neutral-500 sm:px-6 dark:border-neutral-800">
      <span>© ${YEAR} PR Sift · MIT license · Not affiliated with GitHub</span>
      <span class="flex-1"></span>
      <span>Developed by <a href="${AUTHOR.url}" class="font-medium text-neutral-900 hover:underline dark:text-white">${AUTHOR.name}</a></span>
    </div>
  </footer>`
}

const THEME_SCRIPT = `<script>try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}</script>`

function layout({ path, title, description, body, jsonLd = [], type = 'website' }) {
  const url = SITE_URL + path
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${THEME_SCRIPT}
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" href="${link('favicon.svg')}" type="image/svg+xml" />
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
    <meta name="author" content="${AUTHOR.name}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:site_name" content="PR Sift" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SITE_URL}media/og.png" />
    <meta property="og:image:width" content="2400" />
    <meta property="og:image:height" content="1260" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${SITE_URL}media/og.png" />
    ${jsonLd.map((data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`).join('\n    ')}
    <script type="module" src="/src/main.js"></script>
  </head>
  <body class="bg-white font-sans text-neutral-950 antialiased dark:bg-neutral-950 dark:text-neutral-50">
    ${header()}
    <main>${body}</main>
    ${footer()}
  </body>
</html>
`
}

const breadcrumb = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE_URL + path })),
})

const faqLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
})

const appLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'PR Sift',
  applicationCategory: 'DeveloperApplication',
  applicationSubCategory: 'Code review',
  operatingSystem: 'Chrome, Edge, Brave, Arc, Dia, Opera, Vivaldi',
  description: home.description,
  url: SITE_URL,
  downloadUrl: INSTALL_URL,
  softwareHelp: SITE_URL + 'guides/',
  license: 'https://opensource.org/licenses/MIT',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  image: SITE_URL + 'media/og.png',
  screenshot: ['review', 'filters', 'notes', 'ai-export', 'split'].map((n) => SITE_URL + `media/screenshots/${n}.webp`),
  featureList: home.features.map((f) => f.title),
  author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
}

const ctaBlock = () => `<section class="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div class="reveal rounded-3xl border border-neutral-200 px-6 py-16 text-center sm:py-20 dark:border-neutral-800">
        ${logo('mx-auto size-14')}
        <h2 class="mx-auto mt-6 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Make your next big review the easy one.</h2>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          ${button(INSTALL_URL, `${icon('download', 'size-4')}Install PR Sift`)}
          ${button(`${REPO_URL}/blob/main/CONTRIBUTING.md`, `${icon('github', 'size-4')}Contribute`, false)}
        </div>
      </div>
    </section>`

function homePage() {
  const h = home
  const features = h.features
    .map(
      (f, i) => `
      <section id="${f.id}" class="reveal grid items-center gap-10 py-14 lg:grid-cols-12 lg:gap-14 lg:py-20">
        <div class="lg:col-span-4 ${i % 2 ? 'lg:order-2' : ''}">
          ${eyebrow(f.eyebrow, f.icon)}
          <h3 class="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">${esc(f.title)}</h3>
          <p class="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">${esc(f.text)}</p>
          <ul class="mt-7 flex flex-col gap-4">
            ${f.points
              .map(
                ([ic, a, b]) =>
                  `<li class="flex gap-3"><span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-900">${icon(ic, 'size-4')}</span><span><strong class="block text-[15px] font-semibold">${esc(a)}</strong><span class="text-[15px] text-neutral-600 dark:text-neutral-400">${esc(b)}</span></span></li>`,
              )
              .join('\n            ')}
          </ul>
        </div>
        <div class="lg:col-span-8">${video(f.video, f.title)}</div>
      </section>`,
    )
    .join('')

  const body = `
    <section class="relative overflow-hidden">
      <div class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(0,0,0,0.06),transparent)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.08),transparent)]"></div>
      <div class="mx-auto max-w-6xl px-4 pt-16 text-center sm:px-6 sm:pt-24">
        <div class="flex justify-center">${eyebrow(h.hero.eyebrow, 'github')}</div>
        <h1 class="mx-auto mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-balance sm:text-7xl">${esc(h.hero.title)}</h1>
        <p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-neutral-600 sm:text-xl dark:text-neutral-400">${esc(h.hero.lead)}</p>
        <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
          ${button(INSTALL_URL, `${icon('download', 'size-4')}${esc(h.hero.cta)}`)}
          ${button(REPO_URL, `${icon('github', 'size-4')}${esc(h.hero.secondary)}`, false)}
        </div>
        <div class="mt-10">${browsers()}</div>
        <div class="mt-14">${video('filters', 'PR Sift filtering a pull request')}</div>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div class="reveal mx-auto max-w-3xl text-center">
        <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">${esc(h.problem.title)}</h2>
        <p class="mt-5 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">${esc(h.problem.lead)}</p>
      </div>
      <div class="mt-14 grid gap-4 md:grid-cols-3">
        ${h.problem.cards.map(([ic, title, text]) => `<div class="reveal rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800"><span class="flex size-10 items-center justify-center rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">${icon(ic, 'size-5')}</span><h3 class="mt-5 text-lg font-semibold">${esc(title)}</h3><p class="mt-2 leading-relaxed text-neutral-600 dark:text-neutral-400">${esc(text)}</p></div>`).join('\n        ')}
      </div>
    </section>

    <section class="mx-auto max-w-4xl px-4 pb-10 sm:px-6">
      <div class="reveal text-center">
        ${eyebrow('Try it here', 'zap')}
        <h2 class="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">A pull request, minus the noise.</h2>
        <p class="mt-4 text-lg text-neutral-600 dark:text-neutral-400">The filters PR Sift adds to GitHub, on a small pull request.</p>
      </div>
      <div class="reveal mt-10">${playground()}</div>
    </section>

    <div id="features" class="mx-auto max-w-6xl px-4 sm:px-6">${features}</div>

    <section id="ai" class="border-y border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div class="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div class="reveal mx-auto max-w-3xl text-center">
          ${eyebrow(h.ai.eyebrow, 'bot')}
          <h2 class="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">${esc(h.ai.title)}</h2>
          <p class="mt-5 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">${esc(h.ai.lead)}</p>
        </div>
        <ol class="mt-14 grid gap-4 md:grid-cols-4">
          ${h.ai.steps.map(([ic, title, text], i) => `<li class="reveal rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950"><div class="flex items-center justify-between"><span class="flex size-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-900">${icon(ic, 'size-4')}</span><span class="text-sm font-semibold text-neutral-400">0${i + 1}</span></div><h3 class="mt-4 font-semibold">${esc(title)}</h3><p class="mt-1.5 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">${esc(text)}</p></li>`).join('\n          ')}
        </ol>
        <div class="reveal mt-12 grid items-start gap-6 lg:grid-cols-2">
          ${video('notes', 'Writing a note and copying it for Claude')}
          ${shot(h.ai.image, 'Choosing Claude, ChatGPT or Gemini')}
        </div>
      </div>
    </section>

    <section id="how" class="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <h2 class="reveal text-center text-3xl font-semibold tracking-tight sm:text-5xl">${esc(h.how.title)}</h2>
      <ol class="mt-14 grid gap-4 md:grid-cols-3">
        ${h.how.steps.map(([ic, title, text], i) => `<li class="reveal flex gap-4 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800"><span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">${icon(ic, 'size-5')}</span><span><span class="text-sm font-semibold text-neutral-400">Step ${i + 1}</span><h3 class="mt-1 text-lg font-semibold">${esc(title)}</h3><p class="mt-1 text-neutral-600 dark:text-neutral-400">${esc(text)}</p></span></li>`).join('\n        ')}
      </ol>
      <div class="reveal mx-auto mt-12 max-w-5xl">${shot('launcher', 'The PR Sift button on a real GitHub pull request')}</div>
    </section>

    <section class="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div class="reveal grid gap-6 lg:grid-cols-2">
        <div>${shot('dark', 'PR Sift in dark mode')}</div>
        <div class="flex flex-col justify-center rounded-3xl bg-neutral-950 p-10 text-white dark:bg-white dark:text-neutral-950">
          <span class="flex size-11 items-center justify-center rounded-xl bg-white/10 dark:bg-neutral-950/10">${icon('shield-check', 'size-5')}</span>
          <h2 class="mt-6 text-3xl font-semibold tracking-tight">${esc(h.privacy.title)}</h2>
          <p class="mt-4 text-lg leading-relaxed text-neutral-300 dark:text-neutral-600">${esc(h.privacy.text)}</p>
          <a href="${link('privacy/')}" class="mt-6 inline-flex items-center gap-1.5 font-medium">Read the privacy policy ${icon('arrow-right', 'size-4')}</a>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <h2 class="reveal text-center text-3xl font-semibold tracking-tight sm:text-4xl">How PR Sift compares</h2>
      <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        ${compare.map((c) => `<a href="${link(`compare/${c.slug}/`)}" class="reveal block rounded-2xl border border-neutral-200 p-5 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"><span class="flex items-center justify-between font-semibold">vs ${esc(c.name)}${icon('arrow-right', 'size-4')}</span><span class="mt-2 block text-sm text-neutral-600 dark:text-neutral-400">${esc(c.summary)}</span></a>`).join('\n        ')}
      </div>
    </section>

    <section id="faq" class="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
      <h2 class="reveal text-center text-3xl font-semibold tracking-tight sm:text-4xl">Questions</h2>
      <div class="mt-10 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        ${h.faq.map(([q, a]) => `<details class="group py-5"><summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">${esc(q)}<span class="text-neutral-400 transition group-open:rotate-45">${icon('plus', 'size-5')}</span></summary><p class="mt-3 leading-relaxed text-neutral-600 dark:text-neutral-400">${esc(a)}</p></details>`).join('\n        ')}
      </div>
    </section>

    ${ctaBlock()}`
  return layout({ path: '', title: h.title, description: h.description, body, jsonLd: [appLd, faqLd(h.faq)] })
}

function article({ path, crumbs, kicker, title, description, body, jsonLd = [] }) {
  const content = `
    <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <nav class="flex flex-wrap items-center gap-1.5 text-sm text-neutral-500" aria-label="Breadcrumb">
        ${crumbs.map(([name, href], i) => (i < crumbs.length - 1 ? `<a href="${link(href)}" class="hover:text-neutral-950 dark:hover:text-white">${esc(name)}</a>${icon('chevron-right', 'size-3.5')}` : `<span class="text-neutral-900 dark:text-neutral-200">${esc(name)}</span>`)).join('')}
      </nav>
      <p class="mt-8 text-sm font-medium text-neutral-500">${esc(kicker)}</p>
      <h1 class="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">${esc(title)}</h1>
      <p class="mt-5 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">${esc(description)}</p>
      ${body}
    </div>
    ${ctaBlock()}`
  return layout({ path, title: `${title} | PR Sift`, description, body: content, type: 'article', jsonLd: [breadcrumb(crumbs), ...jsonLd] })
}

const GUIDE_MEDIA = {
  'review-large-pull-requests': ['video', 'review'],
  'hide-lock-and-generated-files': ['video', 'filters'],
  'filter-pull-request-files-by-type-and-status': ['shot', 'filters'],
  'send-code-review-notes-to-ai': ['video', 'notes'],
}

const moreLinks = (title, items) => `<div class="mt-14 border-t border-neutral-200 pt-8 dark:border-neutral-800">
        <p class="text-sm font-semibold">${title}</p>
        <ul class="mt-3 flex flex-col gap-2">${items.map(([href, text]) => `<li><a href="${link(href)}" class="inline-flex items-center gap-1.5 text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white">${icon('arrow-right', 'size-4')}${esc(text)}</a></li>`).join('')}</ul>
      </div>`

function guidePage(g) {
  const [kind, name] = GUIDE_MEDIA[g.slug]
  const body = `
      <div class="mt-10">${kind === 'video' ? video(name, g.title) : shot(name, g.title)}</div>
      <ol class="mt-12 flex flex-col gap-10">
        ${g.sections.map(([h, p], i) => `<li><h2 class="flex items-center gap-3 text-2xl font-semibold tracking-tight"><span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm text-white dark:bg-white dark:text-neutral-950">${i + 1}</span>${esc(h)}</h2><p class="mt-3 text-[17px] leading-relaxed text-neutral-700 dark:text-neutral-300">${esc(p)}</p></li>`).join('\n        ')}
      </ol>
      ${moreLinks(
        'More guides',
        guides.filter((o) => o.slug !== g.slug).map((o) => [`guides/${o.slug}/`, o.title]),
      )}`
  const howTo = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: g.title,
    description: g.description,
    tool: { '@type': 'HowToTool', name: 'PR Sift' },
    step: g.sections.map(([stepName, text], i) => ({ '@type': 'HowToStep', position: i + 1, name: stepName, text })),
  }
  return article({
    path: `guides/${g.slug}/`,
    crumbs: [
      ['Home', ''],
      ['Guides', 'guides/'],
      [g.short, `guides/${g.slug}/`],
    ],
    kicker: 'Guide',
    title: g.title,
    description: g.description,
    body,
    jsonLd: [howTo],
  })
}

function listPage({ path, kicker, title, description, items }) {
  const body = `<ul class="mt-12 grid gap-4">${items
    .map(
      ([href, name, text]) =>
        `<li><a href="${link(href)}" class="block rounded-2xl border border-neutral-200 p-6 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"><span class="flex items-center justify-between gap-4 text-lg font-semibold">${esc(name)}${icon('arrow-right', 'size-5 shrink-0')}</span><span class="mt-2 block text-neutral-600 dark:text-neutral-400">${esc(text)}</span></a></li>`,
    )
    .join('')}</ul>`
  return article({
    path,
    crumbs: [
      ['Home', ''],
      [title, path],
    ],
    kicker,
    title,
    description,
    body,
  })
}

function comparePage(c) {
  const cell = (v) => {
    if (/^yes/i.test(v))
      return `<td class="px-4 py-3 align-top"><span class="flex items-start gap-1.5">${icon('check', 'mt-0.5 size-4 shrink-0')}<span>${esc(v)}</span></span></td>`
    if (/^(no|not listed)/i.test(v))
      return `<td class="px-4 py-3 align-top text-neutral-500"><span class="flex items-start gap-1.5">${icon('minus', 'mt-0.5 size-4 shrink-0')}<span>${esc(v)}</span></span></td>`
    return `<td class="px-4 py-3 align-top">${esc(v)}</td>`
  }
  const choose = (title, items) =>
    `<div class="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800"><h2 class="font-semibold">${esc(title)}</h2><ul class="mt-4 flex flex-col gap-2.5 text-neutral-600 dark:text-neutral-400">${items.map((t) => `<li class="flex gap-2">${icon('check', 'mt-1 size-4 shrink-0')}<span>${esc(t)}</span></li>`).join('')}</ul></div>`
  const body = `
      <p class="mt-4 text-sm text-neutral-500">Updated ${esc(c.checked)}</p>
      <div class="mt-10 overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <table class="w-full min-w-[600px] text-left text-[15px]">
          <thead class="bg-neutral-50 text-sm dark:bg-neutral-900"><tr><th class="px-4 py-3 font-semibold">Feature</th><th class="px-4 py-3 font-semibold">PR Sift</th><th class="px-4 py-3 font-semibold">${esc(c.name)}</th></tr></thead>
          <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
            ${c.rows.map(([feature, ours, theirs]) => `<tr><th scope="row" class="px-4 py-3 align-top font-medium">${esc(feature)}</th>${cell(ours)}${cell(theirs)}</tr>`).join('\n            ')}
          </tbody>
        </table>
      </div>
      <p class="mt-4 text-sm text-neutral-500">${esc(c.name)} details come from its official pages, read on ${esc(c.checked)}. "Not listed" means we found nothing on those pages, not that it is missing. Products change, so check before you choose. Sources: ${c.sources.map((s) => `<a href="${s}" class="underline" rel="nofollow noopener">${esc(new URL(s).hostname)}</a>`).join(', ')}.</p>
      <div class="mt-12 grid gap-4 sm:grid-cols-2">${choose('Choose PR Sift if', c.choosePrSift)}${choose(`Choose ${c.name} if`, c.chooseThem)}</div>
      ${c.together ? `<p class="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">${icon('info', 'me-1.5 inline size-4 align-[-2px]')}${esc(c.together)}</p>` : ''}
      <h2 class="mt-14 text-2xl font-semibold tracking-tight">Questions</h2>
      <div class="mt-4 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        ${c.faq.map(([q, a]) => `<details class="group py-4"><summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">${esc(q)}<span class="text-neutral-400 transition group-open:rotate-45">${icon('plus', 'size-4')}</span></summary><p class="mt-2 leading-relaxed text-neutral-600 dark:text-neutral-400">${esc(a)}</p></details>`).join('')}
      </div>
      ${moreLinks(
        'Other comparisons',
        compare.filter((o) => o.slug !== c.slug).map((o) => [`compare/${o.slug}/`, `PR Sift vs ${o.name}`]),
      )}`
  return article({
    path: `compare/${c.slug}/`,
    crumbs: [
      ['Home', ''],
      ['Compare', 'compare/'],
      [`vs ${c.name}`, `compare/${c.slug}/`],
    ],
    kicker: 'Compare',
    title: c.title,
    description: c.description,
    body,
    jsonLd: [faqLd(c.faq)],
  })
}

function brandPage() {
  const body = `
      <h2 class="mt-12 text-2xl font-semibold tracking-tight">Logo</h2>
      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-10"><img src="${link('brand/pr-sift-logo.svg')}" alt="PR Sift logo, black" class="size-24" /><a href="${link('brand/pr-sift-logo.svg')}" download class="text-sm font-medium text-neutral-900 underline">Download SVG</a></div>
        <div class="flex flex-col items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-10"><img src="${link('brand/pr-sift-logo-light.svg')}" alt="PR Sift logo, white" class="size-24" /><a href="${link('brand/pr-sift-logo-light.svg')}" download class="text-sm font-medium text-white underline">Download SVG</a></div>
      </div>
      <p class="mt-4 text-neutral-600 dark:text-neutral-400">The mark is a sieve: many files go in, the ones that matter come out. Use it black on light backgrounds and white on dark ones, with space around it. Please do not recolor it or add effects.</p>
      <h2 class="mt-12 text-2xl font-semibold tracking-tight">Name</h2>
      <p class="mt-3 text-neutral-600 dark:text-neutral-400">Write <strong class="text-neutral-950 dark:text-white">PR Sift</strong>, with a space and a capital S, not "PRSift" or "Pr Sift". PR Sift is not affiliated with GitHub; please say so when you show GitHub screens.</p>
      <h2 class="mt-12 text-2xl font-semibold tracking-tight">Colors and type</h2>
      <div class="mt-5 grid grid-cols-3 gap-4">${brand.colors.map(([n, hex]) => `<div class="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800"><div class="h-20" style="background:${hex}"></div><div class="p-3 text-sm"><p class="font-medium">${n}</p><p class="font-mono text-neutral-500">${hex}</p></div></div>`).join('')}</div>
      <p class="mt-4 text-neutral-600 dark:text-neutral-400">The typeface is Inter. Green and red appear only where they mean added and removed code.</p>
      <h2 class="mt-12 text-2xl font-semibold tracking-tight">Descriptions</h2>
      <dl class="mt-5 flex flex-col gap-4">${brand.descriptions.map(([k, v]) => `<div class="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800"><dt class="text-sm font-medium text-neutral-500">${k}</dt><dd class="mt-1.5 text-[17px]">${esc(v)}</dd></div>`).join('')}</dl>
      <h2 class="mt-12 text-2xl font-semibold tracking-tight">Screenshots and videos</h2>
      <div class="mt-5 grid gap-4 sm:grid-cols-2">${['review', 'filters', 'notes', 'ai-export', 'split', 'dark'].map((n) => `<a href="${media(`screenshots/${n}.webp`)}" download class="block">${shot(n, `PR Sift screenshot: ${n}`)}</a>`).join('')}</div>
      <p class="mt-4 text-neutral-600 dark:text-neutral-400">Videos: ${['filters', 'smart-filters', 'review', 'notes', 'views'].map((n) => `<a href="${media(`videos/${n}.mp4`)}" class="underline">${n}.mp4</a>`).join(', ')}. Social image: <a href="${media('og.png')}" class="underline">og.png</a>.</p>`
  return article({
    path: 'brand/',
    crumbs: [
      ['Home', ''],
      ['Brand', 'brand/'],
    ],
    kicker: 'Press kit',
    title: brand.title,
    description: brand.description,
    body,
  })
}

function privacyPage() {
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code class="rounded bg-neutral-100 px-1 dark:bg-neutral-900">$1</code>')
  const html = readFileSync(fileURLToPath(new URL('../../../PRIVACY.md', import.meta.url)), 'utf8')
    .split(/\n{2,}/)
    .map((block) => {
      const b = block.trim()
      if (b.startsWith('# ')) return ''
      if (b.startsWith('## ')) return `<h2 class="mt-10 text-2xl font-semibold tracking-tight">${esc(b.slice(3))}</h2>`
      if (/^[-*] /.test(b))
        return `<ul class="mt-4 list-disc ps-6 text-neutral-700 dark:text-neutral-300">${b
          .split('\n')
          .map((l) => `<li class="mt-1.5">${inline(l.replace(/^[-*] /, ''))}</li>`)
          .join('')}</ul>`
      return `<p class="mt-4 leading-relaxed text-neutral-700 dark:text-neutral-300">${inline(b.replace(/\n/g, ' '))}</p>`
    })
    .join('\n')
  return article({
    path: 'privacy/',
    crumbs: [
      ['Home', ''],
      ['Privacy', 'privacy/'],
    ],
    kicker: 'Privacy',
    title: 'Privacy policy',
    description: 'What PR Sift stores, where it stays, and what it never sends.',
    body: `<div class="mt-6">${html}</div>`,
  })
}

const pages = {
  'index.html': homePage(),
  'brand/index.html': brandPage(),
  'privacy/index.html': privacyPage(),
  'guides/index.html': listPage({
    path: 'guides/',
    kicker: 'Guides',
    title: 'Guides',
    description: 'Practical guides for reviewing large GitHub pull requests faster.',
    items: guides.map((g) => [`guides/${g.slug}/`, g.title, g.description]),
  }),
  'compare/index.html': listPage({
    path: 'compare/',
    kicker: 'Compare',
    title: 'Compare PR Sift',
    description: 'How PR Sift compares with GitHub itself and other pull request extensions, based on their official pages.',
    items: compare.map((c) => [`compare/${c.slug}/`, `PR Sift vs ${c.name}`, c.description]),
  }),
}
for (const g of guides) pages[`guides/${g.slug}/index.html`] = guidePage(g)
for (const c of compare) pages[`compare/${c.slug}/index.html`] = comparePage(c)

rmSync(here('pages'), { recursive: true, force: true })
for (const [file, html] of Object.entries(pages)) {
  const target = here(`pages/${file}`)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, html)
}
writeFileSync(
  here('pages/404.html'),
  layout({
    path: '404.html',
    title: 'Page not found | PR Sift',
    description: 'This page does not exist.',
    body: `<div class="mx-auto max-w-xl px-4 py-32 text-center"><h1 class="text-4xl font-semibold">Page not found</h1><p class="mt-4 text-neutral-600 dark:text-neutral-400">The page moved or never existed.</p><div class="mt-8">${button(link(), 'Go home')}</div></div>`,
  }),
)

cpSync(here('src'), here('pages/src'), { recursive: true })

rmSync(here('public'), { recursive: true, force: true })
mkdirSync(here('public/brand'), { recursive: true })
cpSync(fileURLToPath(new URL('../../../media', import.meta.url)), here('public/media'), { recursive: true })
writeFileSync(here('public/favicon.svg'), logoFile('#0a0a0a', '#ffffff'))
writeFileSync(here('public/brand/pr-sift-logo.svg'), logoFile('#0a0a0a', '#ffffff'))
writeFileSync(here('public/brand/pr-sift-logo-light.svg'), logoFile('#ffffff', '#0a0a0a'))

const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  here('public/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(pages)
    .map((f) => `  <url><loc>${SITE_URL}${f.replace(/index\.html$/, '')}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
)
writeFileSync(here('public/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`)
writeFileSync(
  here('public/llms.txt'),
  `# PR Sift

> ${home.description}

PR Sift is a browser extension for github.com. It opens a review workspace on top of a pull request's "Files changed" tab. Developed by ${AUTHOR.name} (${AUTHOR.url}).

## Features

${home.features.map((f) => `- ${f.title} ${f.text}`).join('\n')}
- ${home.ai.title} ${home.ai.lead}

## Facts

- Price: free. License: MIT. Source: ${REPO_URL}
- Browsers: Chrome and Chromium browsers (Edge, Brave, Arc, Dia, Opera, Vivaldi).
- Privacy: no server, no account, no analytics. Data stays in the browser. Talks only to GitHub.
- A GitHub token is optional and only used to post a note as a review comment.
- Not affiliated with GitHub.

## Guides

${guides.map((g) => `- [${g.title}](${SITE_URL}guides/${g.slug}/): ${g.description}`).join('\n')}

## Comparisons

${compare.map((c) => `- [PR Sift vs ${c.name}](${SITE_URL}compare/${c.slug}/): ${c.description}`).join('\n')}

## FAQ

${home.faq.map(([q, a]) => `### ${q}\n\n${a}`).join('\n\n')}
`,
)
console.log(`${Object.keys(pages).length + 1} pages written`)
