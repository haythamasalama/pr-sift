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
  `<svg viewBox="0 0 100 100" class="${cls}" aria-hidden="true"><rect width="100" height="100" rx="22" class="fill-ink"/><path d="${MARK}" fill="none" class="stroke-paper" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const logoFile = (bg, fg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${bg}"/><path d="${MARK}" fill="none" stroke="${fg}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const button = (href, text, primary = true) =>
  `<a href="${href}" class="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-[15px] font-medium transition-colors ${primary ? 'bg-ink text-paper hover:opacity-85' : 'border border-line bg-paper text-ink hover:bg-raised'}">${text}</a>`

const shot = (name, alt, eager = false) =>
  `<img src="${media(`screenshots/${name}.webp`)}" alt="${esc(alt)}" width="3200" height="2120" class="block h-auto w-full rounded-lg border border-line" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`

const video = (name, label) =>
  `<figure class="overflow-hidden rounded-lg border border-line bg-raised">
    <video class="block h-auto w-full" autoplay muted loop playsinline preload="metadata" width="1920" height="1200" poster="${media(`videos/${name}.jpg`)}" aria-label="${esc(label)}"><source src="${media(`videos/${name}.mp4`)}" type="video/mp4" /></video>
  </figure>`

const eyebrow = (text, iconName) =>
  `<p class="inline-flex items-center gap-2 text-sm font-medium text-muted">${iconName ? icon(iconName, 'size-4') : ''}${esc(text)}</p>`

const BROWSERS = [
  ['googlechrome', 'Chrome'],
  ['brave', 'Brave'],
  ['arc', 'Arc'],
  ['opera', 'Opera'],
  ['vivaldi', 'Vivaldi'],
]

const browsers = () =>
  `<p class="text-sm text-muted">Works in Chrome and every Chromium browser</p>
  <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
    ${BROWSERS.map(([slug, name]) => `<span class="inline-flex items-center gap-1.5">${brandIcon(slug)}${name}</span>`).join('')}
    <span>Edge</span><span>Dia</span>
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

const STATUS_SIGN = {
  added: ['+', 'text-add'],
  modified: ['~', 'text-[#9a6700] dark:text-[#d29922]'],
  deleted: ['−', 'text-del'],
  renamed: ['→', 'text-muted'],
}

function playground(autoplay = false) {
  const types = [...new Set(PLAYGROUND.map(([f]) => typeOf(f)))]
  const statuses = ['added', 'modified', 'deleted', 'renamed']
  const count = (pred) => PLAYGROUND.filter(pred).length
  const chip = (key, label, n) =>
    `<button type="button" data-chip="${key}" class="chip inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1 font-mono text-[13px] transition hover:border-ink">${esc(label)}<span class="text-muted">${n}</span></button>`
  return `<div class="rounded-lg border border-line bg-paper" data-playground ${autoplay ? 'data-autoplay' : ''}>
    <div class="flex items-center gap-2 border-b border-line bg-raised px-4 py-2.5 text-sm">
      ${logo('size-5')}<span class="font-medium">feat(billing): usage-based invoices</span><span class="ms-auto font-mono text-xs text-muted" data-summary>12 files</span>
    </div>
    <div class="flex flex-wrap gap-1.5 border-b border-line px-4 py-3">
      ${types
        .map((t) =>
          chip(
            t,
            t,
            count(([f]) => typeOf(f) === t),
          ),
        )
        .join('')}
      ${statuses
        .map((s) =>
          chip(
            'status:' + s,
            s,
            count(([, st]) => st === s),
          ),
        )
        .join('')}
      <button type="button" data-reset class="ms-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-muted hover:text-ink">${icon('rotate-ccw', 'size-3.5')}Reset</button>
    </div>
    <ul class="flex flex-col px-4 py-3 font-mono text-[13px]">
      ${PLAYGROUND.map(
        ([file, status]) =>
          `<li data-file data-type="${typeOf(file)}" data-status="${status}" class="flex items-center gap-3 overflow-hidden border-b border-line py-2 last:border-b-0"><span class="w-3 shrink-0 text-center ${STATUS_SIGN[status][1]}" aria-hidden="true">${STATUS_SIGN[status][0]}</span><span class="min-w-0 truncate">${esc(file)}</span><span class="ms-auto shrink-0 font-sans text-xs text-muted">${status}</span></li>`,
      ).join('\n      ')}
    </ul>
    <p class="border-t border-line px-4 py-2.5 text-[13px] text-muted">Click a chip to show only that, shift-click to hide it.</p>
  </div>`
}

const NAV = [
  ['Features', '#features'],
  ['Notes to AI', '#ai'],
  ['Guides', 'guides/'],
  ['Compare', 'compare/'],
]

const header = () => `<header class="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-xl">
    <nav class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6" aria-label="Main">
      <a href="${link()}" class="flex items-center gap-2 font-semibold tracking-tight">${logo()}PR Sift</a>
      <div class="hidden items-center gap-6 text-sm text-muted md:flex">
        ${NAV.map(([label, href]) => `<a href="${href.startsWith('#') ? link() + href : link(href)}" class="hover:text-ink">${label}</a>`).join('')}
      </div>
      <span class="flex-1"></span>
      <button type="button" data-theme-toggle class="flex size-9 items-center justify-center rounded-md text-muted hover:bg-raised hover:text-ink" aria-label="Switch between light and dark">${icon('moon', 'size-[18px] dark:hidden')}${icon('sun', 'hidden size-[18px] dark:block')}</button>
      <a href="${REPO_URL}" class="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-raised">${icon('github', 'size-4')}<span class="hidden sm:inline">Star</span><span data-stars class="text-muted"></span></a>
    </nav>
  </header>`

function footer() {
  const column = (title, items) =>
    `<div><p class="text-sm font-semibold">${title}</p><ul class="mt-4 flex flex-col gap-3 text-sm text-muted">${items.map(([label, href]) => `<li><a href="${href}" class="hover:text-ink">${esc(label)}</a></li>`).join('')}</ul></div>`
  return `<footer class="border-t border-line">
    <div class="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_repeat(4,1fr)]">
      <div>
        <a href="${link()}" class="flex items-center gap-2 font-semibold">${logo('size-6')}PR Sift</a>
        <p class="mt-4 max-w-xs text-sm leading-relaxed text-muted">A Chrome extension for reviewing large GitHub pull requests. Free, open source and private.</p>
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
    <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-4 py-6 text-sm text-muted sm:px-6">
      <span>© ${YEAR} PR Sift · MIT license · Not affiliated with GitHub</span>
      <span class="flex-1"></span>
      <span>Developed by <a href="${AUTHOR.url}" class="font-medium text-ink hover:underline">${AUTHOR.name}</a></span>
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
  <body class="bg-paper font-sans text-ink antialiased">
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

const ctaBlock = () => `<section class="border-t border-line">
      <div class="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-20 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-5">${logo('size-12 shrink-0')}<h2 class="max-w-xl text-3xl font-semibold tracking-tight text-balance">Make your next big review the easy one.</h2></div>
        <div class="flex flex-wrap gap-3">
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
      <section id="${f.id}" class="grid items-center gap-10 border-t border-line py-16 lg:grid-cols-12 lg:gap-16 lg:py-24">
        <div class="lg:col-span-4 ${i % 2 ? 'lg:order-2' : ''}">
          <span class="flex size-9 items-center justify-center rounded-md border border-line">${icon(f.icon, 'size-[18px]')}</span>
          <h2 class="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-[2.5rem] sm:leading-[1.1]">${esc(f.title)}</h2>
          <p class="mt-4 max-w-prose text-lg leading-relaxed text-muted">${esc(f.text)}</p>
          <dl class="mt-8 flex flex-col gap-5">
            ${f.points.map(([, a, b]) => `<div><dt class="font-medium">${esc(a)}</dt><dd class="mt-0.5 text-muted">${esc(b)}</dd></div>`).join('\n            ')}
          </dl>
        </div>
        <div class="lg:col-span-8">${video(f.video, f.title)}</div>
      </section>`,
    )
    .join('')

  const body = `
    <section class="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-24 lg:pb-24">
      <div class="min-w-0">
        <h1 class="font-mono text-[clamp(1.35rem,2.6vw,2.15rem)] leading-[1.25] font-medium tracking-tight">
          <span class="flex gap-3 rounded-t-md bg-del-bg px-3 py-2"><span class="select-none text-del" aria-hidden="true">−</span><span>Scroll 214 changed files.</span></span>
          <span class="flex gap-3 rounded-b-md bg-add-bg px-3 py-2"><span class="select-none text-add" aria-hidden="true">+</span><span>Review the 12 that matter.</span></span>
        </h1>
        <p class="mt-8 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">${esc(h.hero.lead)}</p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          ${button(INSTALL_URL, `${icon('download', 'size-4')}${esc(h.hero.cta)}`)}
          ${button(REPO_URL, `${icon('github', 'size-4')}${esc(h.hero.secondary)}`, false)}
        </div>
        <div class="mt-10">${browsers()}</div>
      </div>
      <div class="min-w-0">${playground(true)}</div>
    </section>

    <section class="mx-auto max-w-6xl px-4 pb-20 sm:px-6">${video('filters', 'PR Sift filtering a real-size pull request')}</section>

    <section class="border-y border-line bg-raised">
      <div class="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12">
        <div class="lg:col-span-5">
          <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-[2.5rem] sm:leading-[1.1]">${esc(h.problem.title)}</h2>
          <p class="mt-5 text-lg leading-relaxed text-muted">${esc(h.problem.lead)}</p>
        </div>
        <div class="grid gap-8 sm:grid-cols-3 lg:col-span-7">
          ${h.problem.cards.map(([ic, title, text]) => `<div>${icon(ic, 'size-5')}<h3 class="mt-4 font-semibold">${esc(title)}</h3><p class="mt-2 leading-relaxed text-muted">${esc(text)}</p></div>`).join('\n          ')}
        </div>
      </div>
    </section>

    <div id="features" class="mx-auto max-w-6xl px-4 sm:px-6">${features}</div>

    <section id="ai" class="border-y border-line bg-raised">
      <div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div class="max-w-3xl">
          <span class="flex size-9 items-center justify-center rounded-md border border-line bg-paper">${icon('bot', 'size-[18px]')}</span>
          <h2 class="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-[2.5rem] sm:leading-[1.1]">${esc(h.ai.title)}</h2>
          <p class="mt-5 text-lg leading-relaxed text-muted">${esc(h.ai.lead)}</p>
        </div>
        <ol class="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
          ${h.ai.steps.map(([ic, title, text], i) => `<li class="bg-paper p-6"><span class="flex items-center gap-3"><span class="font-mono text-sm text-muted">${i + 1}</span>${icon(ic, 'size-[18px]')}</span><h3 class="mt-4 font-semibold">${esc(title)}</h3><p class="mt-1.5 leading-relaxed text-muted">${esc(text)}</p></li>`).join('\n          ')}
        </ol>
        <div class="mt-10 grid items-start gap-6 lg:grid-cols-2">
          ${video('notes', 'Writing a note and copying it for Claude')}
          ${shot(h.ai.image, 'Choosing Claude, ChatGPT or Gemini')}
        </div>
      </div>
    </section>

    <section id="how" class="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
      <h2 class="text-3xl font-semibold tracking-tight sm:text-[2.5rem]">${esc(h.how.title)}</h2>
      <ol class="mt-10 grid gap-8 md:grid-cols-3">
        ${h.how.steps.map(([ic, title, text], i) => `<li class="border-t-2 border-ink pt-5"><span class="flex items-center gap-3"><span class="font-mono text-sm text-muted">${i + 1}</span>${icon(ic, 'size-[18px]')}</span><h3 class="mt-3 text-lg font-semibold">${esc(title)}</h3><p class="mt-1 text-muted">${esc(text)}</p></li>`).join('\n        ')}
      </ol>
      <div class="mt-12">${shot('launcher', 'The PR Sift button on a real GitHub pull request')}</div>
    </section>

    <section class="border-y border-line">
      <div class="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div>${shot('dark', 'PR Sift in dark mode')}</div>
        <div>
          ${icon('shield-check', 'size-6')}
          <h2 class="mt-5 text-3xl font-semibold tracking-tight">${esc(h.privacy.title)}</h2>
          <p class="mt-4 text-lg leading-relaxed text-muted">${esc(h.privacy.text)}</p>
          <a href="${link('privacy/')}" class="mt-6 inline-block font-medium underline underline-offset-4">Read the privacy policy</a>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h2 class="text-3xl font-semibold tracking-tight">How PR Sift compares</h2>
      <ul class="mt-8 divide-y divide-line border-y border-line">
        ${compare.map((c) => `<li><a href="${link(`compare/${c.slug}/`)}" class="group grid gap-1 py-5 sm:grid-cols-[18rem_1fr] sm:gap-8"><span class="font-medium group-hover:underline">PR Sift vs ${esc(c.name)}</span><span class="text-muted">${esc(c.summary)}</span></a></li>`).join('\n        ')}
      </ul>
    </section>

    <section id="faq" class="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div class="grid gap-10 lg:grid-cols-12">
        <h2 class="text-3xl font-semibold tracking-tight lg:col-span-4">Questions</h2>
        <div class="divide-y divide-line border-y border-line lg:col-span-8">
          ${h.faq.map(([q, a]) => `<details class="group py-5"><summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">${esc(q)}<span class="text-muted transition-transform group-open:rotate-45">${icon('plus', 'size-5')}</span></summary><p class="mt-3 max-w-prose leading-relaxed text-muted">${esc(a)}</p></details>`).join('\n          ')}
        </div>
      </div>
    </section>

    ${ctaBlock()}`
  return layout({ path: '', title: h.title, description: h.description, body, jsonLd: [appLd, faqLd(h.faq)] })
}

function article({ path, crumbs, kicker, title, description, body, jsonLd = [] }) {
  const content = `
    <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <nav class="flex flex-wrap items-center gap-1.5 text-sm text-muted" aria-label="Breadcrumb">
        ${crumbs.map(([name, href], i) => (i < crumbs.length - 1 ? `<a href="${link(href)}" class="hover:text-ink">${esc(name)}</a>${icon('chevron-right', 'size-3.5')}` : `<span class="text-ink">${esc(name)}</span>`)).join('')}
      </nav>
      <p class="mt-8 text-sm font-medium text-muted">${esc(kicker)}</p>
      <h1 class="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">${esc(title)}</h1>
      <p class="mt-5 text-lg leading-relaxed text-muted">${esc(description)}</p>
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

const moreLinks = (title, items) => `<div class="mt-14 border-t border-line pt-8">
        <p class="text-sm font-semibold">${title}</p>
        <ul class="mt-3 flex flex-col gap-2">${items.map(([href, text]) => `<li><a href="${link(href)}" class="inline-flex items-center gap-1.5 text-muted hover:text-ink">${icon('arrow-right', 'size-4')}${esc(text)}</a></li>`).join('')}</ul>
      </div>`

function guidePage(g) {
  const [kind, name] = GUIDE_MEDIA[g.slug]
  const body = `
      <div class="mt-10">${kind === 'video' ? video(name, g.title) : shot(name, g.title)}</div>
      <ol class="mt-12 flex flex-col gap-10">
        ${g.sections.map(([h, p], i) => `<li><h2 class="flex items-center gap-3 text-2xl font-semibold tracking-tight"><span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-sm text-paper">${i + 1}</span>${esc(h)}</h2><p class="mt-3 text-[17px] leading-relaxed text-ink/85">${esc(p)}</p></li>`).join('\n        ')}
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
        `<li><a href="${link(href)}" class="block rounded-lg border border-line p-6 transition hover:border-ink"><span class="flex items-center justify-between gap-4 text-lg font-semibold">${esc(name)}${icon('arrow-right', 'size-5 shrink-0')}</span><span class="mt-2 block text-muted">${esc(text)}</span></a></li>`,
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
      return `<td class="px-4 py-3 align-top text-muted"><span class="flex items-start gap-1.5">${icon('minus', 'mt-0.5 size-4 shrink-0')}<span>${esc(v)}</span></span></td>`
    return `<td class="px-4 py-3 align-top">${esc(v)}</td>`
  }
  const choose = (title, items) =>
    `<div class="rounded-lg border border-line p-6"><h2 class="font-semibold">${esc(title)}</h2><ul class="mt-4 flex flex-col gap-2.5 text-muted">${items.map((t) => `<li class="flex gap-2">${icon('check', 'mt-1 size-4 shrink-0')}<span>${esc(t)}</span></li>`).join('')}</ul></div>`
  const body = `
      <p class="mt-4 text-sm text-muted">Updated ${esc(c.checked)}</p>
      <div class="mt-10 overflow-x-auto rounded-lg border border-line">
        <table class="w-full min-w-[600px] text-left text-[15px]">
          <thead class="bg-raised text-sm"><tr><th class="px-4 py-3 font-semibold">Feature</th><th class="px-4 py-3 font-semibold">PR Sift</th><th class="px-4 py-3 font-semibold">${esc(c.name)}</th></tr></thead>
          <tbody class="divide-y divide-line">
            ${c.rows.map(([feature, ours, theirs]) => `<tr><th scope="row" class="px-4 py-3 align-top font-medium">${esc(feature)}</th>${cell(ours)}${cell(theirs)}</tr>`).join('\n            ')}
          </tbody>
        </table>
      </div>
      <p class="mt-4 text-sm text-muted">${esc(c.name)} details come from its official pages, read on ${esc(c.checked)}. "Not listed" means we found nothing on those pages, not that it is missing. Products change, so check before you choose. Sources: ${c.sources.map((s) => `<a href="${s}" class="underline" rel="nofollow noopener">${esc(new URL(s).hostname)}</a>`).join(', ')}.</p>
      <div class="mt-12 grid gap-4 sm:grid-cols-2">${choose('Choose PR Sift if', c.choosePrSift)}${choose(`Choose ${c.name} if`, c.chooseThem)}</div>
      ${c.together ? `<p class="mt-6 rounded-lg bg-raised p-5">${icon('info', 'me-1.5 inline size-4 align-[-2px]')}${esc(c.together)}</p>` : ''}
      <h2 class="mt-14 text-2xl font-semibold tracking-tight">Questions</h2>
      <div class="mt-4 divide-y divide-line border-y border-line">
        ${c.faq.map(([q, a]) => `<details class="group py-4"><summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">${esc(q)}<span class="text-muted transition group-open:rotate-45">${icon('plus', 'size-4')}</span></summary><p class="mt-2 leading-relaxed text-muted">${esc(a)}</p></details>`).join('')}
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
        <div class="flex flex-col items-center gap-4 rounded-lg border border-line bg-white p-10"><img src="${link('brand/pr-sift-logo.svg')}" alt="PR Sift logo, black" class="size-24" /><a href="${link('brand/pr-sift-logo.svg')}" download class="text-sm font-medium text-neutral-900 underline">Download SVG</a></div>
        <div class="flex flex-col items-center gap-4 rounded-lg border border-line bg-black p-10"><img src="${link('brand/pr-sift-logo-light.svg')}" alt="PR Sift logo, white" class="size-24" /><a href="${link('brand/pr-sift-logo-light.svg')}" download class="text-sm font-medium text-white underline">Download SVG</a></div>
      </div>
      <p class="mt-4 text-muted">The mark is a sieve: many files go in, the ones that matter come out. Use it black on light backgrounds and white on dark ones, with space around it. Please do not recolor it or add effects.</p>
      <h2 class="mt-12 text-2xl font-semibold tracking-tight">Name</h2>
      <p class="mt-3 text-muted">Write <strong class="text-ink">PR Sift</strong>, with a space and a capital S, not "PRSift" or "Pr Sift". PR Sift is not affiliated with GitHub; please say so when you show GitHub screens.</p>
      <h2 class="mt-12 text-2xl font-semibold tracking-tight">Colors and type</h2>
      <div class="mt-5 grid grid-cols-3 gap-4">${brand.colors.map(([n, hex]) => `<div class="overflow-hidden rounded-lg border border-line"><div class="h-20" style="background:${hex}"></div><div class="p-3 text-sm"><p class="font-medium">${n}</p><p class="font-mono text-muted">${hex}</p></div></div>`).join('')}</div>
      <p class="mt-4 text-muted">The typeface is Inter. Green and red appear only where they mean added and removed code.</p>
      <h2 class="mt-12 text-2xl font-semibold tracking-tight">Descriptions</h2>
      <dl class="mt-5 flex flex-col gap-4">${brand.descriptions.map(([k, v]) => `<div class="rounded-lg border border-line p-5"><dt class="text-sm font-medium text-muted">${k}</dt><dd class="mt-1.5 text-[17px]">${esc(v)}</dd></div>`).join('')}</dl>
      <h2 class="mt-12 text-2xl font-semibold tracking-tight">Screenshots and videos</h2>
      <div class="mt-5 grid gap-4 sm:grid-cols-2">${['review', 'filters', 'notes', 'ai-export', 'split', 'dark'].map((n) => `<a href="${media(`screenshots/${n}.webp`)}" download class="block">${shot(n, `PR Sift screenshot: ${n}`)}</a>`).join('')}</div>
      <p class="mt-4 text-muted">Videos: ${['filters', 'smart-filters', 'review', 'notes', 'views'].map((n) => `<a href="${media(`videos/${n}.mp4`)}" class="underline">${n}.mp4</a>`).join(', ')}. Social image: <a href="${media('og.png')}" class="underline">og.png</a>.</p>`
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
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code class="rounded bg-raised px-1">$1</code>')
  const html = readFileSync(fileURLToPath(new URL('../../../PRIVACY.md', import.meta.url)), 'utf8')
    .split(/\n{2,}/)
    .map((block) => {
      const b = block.trim()
      if (b.startsWith('# ')) return ''
      if (b.startsWith('## ')) return `<h2 class="mt-10 text-2xl font-semibold tracking-tight">${esc(b.slice(3))}</h2>`
      if (/^[-*] /.test(b))
        return `<ul class="mt-4 list-disc ps-6 text-ink/85">${b
          .split('\n')
          .map((l) => `<li class="mt-1.5">${inline(l.replace(/^[-*] /, ''))}</li>`)
          .join('')}</ul>`
      return `<p class="mt-4 leading-relaxed text-ink/85">${inline(b.replace(/\n/g, ' '))}</p>`
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
    body: `<div class="mx-auto max-w-xl px-4 py-32 text-center"><h1 class="text-4xl font-semibold">Page not found</h1><p class="mt-4 text-muted">The page moved or never existed.</p><div class="mt-8">${button(link(), 'Go home')}</div></div>`,
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
