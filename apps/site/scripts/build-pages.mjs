import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CHECKED, FEATURES, compare, prSift } from './compare.mjs'
import { AUTHOR, INSTALL_URL, REPO_URL, SITE_URL, SIBLING_APPS, brand, guides, home } from './content.mjs'

const here = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url))
const BASE = process.env.SITE_BASE ?? '/'
const link = (path = '') => (/^https?:/.test(path) ? path : BASE + path)
const media = (path) => `${BASE}media/${path}`
const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const YEAR = new Date().getFullYear()
const VERSION = JSON.parse(readFileSync(here('../extension/manifest.json'), 'utf8')).version

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

const VENDORED_BRANDS = new Set(['microsoftedge', 'openai'])
const brandIcon = (slug, cls = 'size-5') => {
  const path = VENDORED_BRANDS.has(slug) ? here(`assets/brands/${slug}.svg`) : here(`node_modules/simple-icons/icons/${slug}.svg`)
  return readFileSync(path, 'utf8')
    .replace('<svg ', `<svg class="${cls}" fill="currentColor" aria-hidden="true" `)
    .replace(/<title>.*?<\/title>/, '')
}

const AI_TOOLS = [
  ['claude', 'Claude Code'],
  ['openai', 'Codex'],
  ['cursor', 'Cursor'],
  ['githubcopilot', 'GitHub Copilot'],
  ['claude', 'Claude'],
  ['openai', 'ChatGPT'],
]

const MARK = 'M22 28h56L57 53v20l-14-7V53L22 28Z'
const logo = (cls = 'size-7') =>
  `<svg viewBox="0 0 100 100" class="${cls}" aria-hidden="true"><rect width="100" height="100" rx="22" class="fill-ink"/><path d="${MARK}" fill="none" class="stroke-paper" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const logoFile = (bg, fg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${bg}"/><path d="${MARK}" fill="none" stroke="${fg}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const button = (href, text, primary = true) =>
  `<a href="${href}" class="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-[15px] font-medium transition-colors ${primary ? 'bg-ink text-paper hover:opacity-85' : 'border border-line bg-paper text-ink hover:bg-raised'}">${text}</a>`

const shot = (name, alt) =>
  `<img src="${media(`screenshots/${name}.webp`)}" alt="${esc(alt)}" width="3200" height="2120" class="block h-auto w-full rounded-lg border border-line" loading="lazy" decoding="async" />`

const video = (name, label, attrs = '') =>
  `<figure class="overflow-hidden rounded-lg border border-line bg-raised"><video class="block aspect-[16/10] h-auto w-full bg-raised" data-autoplay muted loop playsinline preload="none" width="1600" height="1000" poster="${media(`videos/${name}.jpg`)}" aria-label="${esc(label)}" ${attrs}><source src="${media(`videos/${name}.mp4`)}" type="video/mp4" /></video></figure>`

const iconBox = (name, cls = 'size-9') =>
  `<span class="flex ${cls} shrink-0 items-center justify-center rounded-md border border-line bg-paper">${icon(name, 'size-[18px]')}</span>`

const h2 = (text, cls = '') =>
  `<h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-[2.5rem] sm:leading-[1.1] ${cls}">${esc(text)}</h2>`
const lead = (text, cls = '') => `<p class="mt-4 max-w-2xl text-lg leading-relaxed text-muted ${cls}">${esc(text)}</p>`

const BROWSERS = [
  ['googlechrome', 'Chrome'],
  ['microsoftedge', 'Edge'],
  ['brave', 'Brave'],
  ['arc', 'Arc'],
  ['dia', 'Dia'],
  ['opera', 'Opera'],
  ['vivaldi', 'Vivaldi'],
]

const browsers = () =>
  `<ul class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" aria-label="Supported browsers">
    ${BROWSERS.map(([slug, name]) => `<li class="inline-flex items-center gap-1.5">${slug === 'dia' ? `<img src="${link('brand/dia.svg')}" alt="" class="size-5 rounded grayscale" />` : brandIcon(slug)}${name}</li>`).join('')}
  </ul>`

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

function playground() {
  const types = [...new Set(PLAYGROUND.map(([f]) => typeOf(f)))]
  const statuses = ['added', 'modified', 'deleted', 'renamed']
  const count = (pred) => PLAYGROUND.filter(pred).length
  const chip = (key, label, n) =>
    `<button type="button" data-chip="${key}" class="chip inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1 font-mono text-[13px] transition hover:border-ink">${esc(label)}<span class="text-muted">${n}</span></button>`
  return `<div class="rounded-lg border border-line bg-paper" data-playground data-autoplay>
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
    <p class="border-t border-line px-4 py-2.5 text-[13px] text-muted">Click a chip to show only that. Shift-click to hide it.</p>
  </div>`
}

const NAV = [
  ['Notes', '#notes'],
  ['Features', '#features'],
  ['Guides', 'guides/'],
  ['Compare', 'compare/'],
  ['Changelog', 'changelog/'],
]

const navHref = (href) => (href.startsWith('#') ? link() + href : link(href))

const header = () => `<header class="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-xl">
    <nav class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6" aria-label="Main">
      <a href="${link()}" class="flex shrink-0 items-center gap-2 font-semibold tracking-tight whitespace-nowrap">${logo()}PR Sift</a>
      <div class="hidden items-center gap-6 text-sm text-muted md:flex">
        ${NAV.map(([label, href]) => `<a href="${navHref(href)}" class="whitespace-nowrap hover:text-ink">${label}</a>`).join('')}
      </div>
      <span class="flex-1"></span>
      <a href="${REPO_URL}" aria-label="Star PR Sift on GitHub" class="inline-flex h-8 shrink-0 items-center gap-2 rounded-md border border-line px-3 text-sm font-medium hover:bg-raised">${icon('github', 'size-4')}<span class="h-4 w-px bg-line" aria-hidden="true"></span><span class="flex items-center gap-1.5">${icon('star', 'size-3.5')}Star</span><span data-stars class="text-muted empty:hidden"></span></a>
      <details data-menu class="relative md:hidden">
        <summary aria-label="Menu" class="flex size-8 cursor-pointer list-none items-center justify-center rounded-md border border-line text-muted hover:text-ink [&::-webkit-details-marker]:hidden">${icon('menu', 'size-4')}</summary>
        <div class="absolute right-0 top-full mt-2 flex w-48 flex-col rounded-lg border border-line bg-paper p-1.5 shadow-lg">
          ${NAV.map(([label, href]) => `<a href="${navHref(href)}" class="rounded-md px-3 py-2 text-sm hover:bg-raised">${label}</a>`).join('')}
        </div>
      </details>
    </nav>
  </header>`

const themePicker = () => `<div role="group" aria-label="Theme" class="inline-flex items-center gap-0.5 rounded-full bg-raised p-[3px]">
          ${[
            ['system', 'monitor', 'System'],
            ['light', 'sun', 'Light'],
            ['dark', 'moon', 'Dark'],
          ]
            .map(
              ([mode, ic, label]) =>
                `<button type="button" data-theme-mode="${mode}" aria-pressed="false" aria-label="${label} theme" title="${label}" class="flex h-[26px] w-[30px] items-center justify-center rounded-full text-muted transition-colors hover:text-ink">${icon(ic, 'size-[15px]')}</button>`,
            )
            .join('')}
        </div>`

const appLogo = (slug) =>
  readFileSync(here(`assets/apps/${slug}.svg`), 'utf8').replace('<svg ', '<svg class="size-9 shrink-0" aria-hidden="true" ')

const appName = (app) => (app.logo === 'easyshoot' ? 'Easy<span class="text-[#1a63d6] dark:text-[#8cc4ff]">Shoot</span>' : esc(app.name))

const SIGNATURE = readFileSync(here('assets/haythamasalama-signature.svg'), 'utf8').replace('<svg ', '<svg class="h-[22px] w-11" ')

function footer() {
  const column = (title, items, extra = '') =>
    `<div><p class="text-sm font-medium">${title}</p><ul class="mt-4 flex flex-col gap-2.5 text-sm text-muted">${items.map(([label, href]) => `<li><a href="${href}" class="hover:text-ink">${esc(label)}</a></li>`).join('')}</ul>${extra}</div>`
  const legal = 'px-3 leading-none text-ink/80 hover:text-ink'
  return `<footer class="border-t border-line">
    <div class="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(4,1fr)]">
      <div class="col-span-2 md:col-span-1">
        <a href="${link()}" class="flex items-center gap-2 font-semibold">${logo('size-6')}PR Sift</a>
        <p class="mt-4 max-w-56 text-sm leading-relaxed text-muted">Review large GitHub pull requests without the noise.</p>
        <a href="${link('changelog/')}" class="mt-3 inline-block font-mono text-xs text-muted hover:text-ink">Version ${VERSION}</a>
      </div>
      ${column('Product', [
        ['Private notes', link() + '#notes'],
        ['Features', link() + '#features'],
        ['Changelog', link('changelog/')],
      ])}
      ${column(
        'Guides',
        guides.map((g) => [g.short, link(`guides/${g.slug}/`)]),
      )}
      ${column('Compare', [...compare.map((c) => [`vs ${c.name}`, link(`compare/${c.slug}/`)]), ['All tools', link('compare/')]])}
      ${column(
        'Resources',
        [
          ['GitHub', REPO_URL],
          ['Report a bug', `${REPO_URL}/issues/new/choose`],
          ['Brand', link('brand/')],
          ['Sitemap', link('sitemap.xml')],
        ],
        `<div class="mt-6">${themePicker()}</div>`,
      )}
    </div>
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line py-6">
        <p class="w-full text-sm text-muted sm:w-auto">Sibling apps</p>
        <ul class="-mx-2.5 flex flex-wrap items-center gap-2 sm:mx-0">
          ${SIBLING_APPS.map((app) => `<li><a href="${app.url}" class="flex items-center gap-3 rounded-xl py-2 pr-4 pl-2.5 transition-colors hover:bg-raised">${appLogo(app.logo)}<span class="flex flex-col"><span class="leading-tight font-semibold tracking-tight">${appName(app)}</span><span class="text-xs text-muted">${esc(app.about)}</span></span></a></li>`).join('')}
        </ul>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-line py-6 text-sm">
        <p class="text-muted">Copyright © ${YEAR} ${AUTHOR.name}. All rights reserved.</p>
        <nav aria-label="Legal" class="-ml-3 flex items-center">
          <a href="${link('privacy/')}" class="${legal}">Privacy Policy</a>
          <a href="${REPO_URL}/blob/main/LICENSE" class="border-l border-line ${legal}">License</a>
          <a href="${AUTHOR.x}" aria-label="${AUTHOR.name} on X" title="X" class="ml-2 flex size-8 items-center justify-center rounded-full bg-raised text-ink/80 hover:text-ink">${brandIcon('x', 'size-3.5')}</a>
          <a href="${AUTHOR.url}" rel="author" aria-label="${AUTHOR.name}" title="${AUTHOR.name}" class="signature ml-4">${SIGNATURE}</a>
        </nav>
      </div>
    </div>
  </footer>`
}

const THEME_SCRIPT = `<script>(function(){var m='system';try{m=localStorage.getItem('theme')||m}catch(e){}if(m!=='light'&&m!=='dark')m='system';var r=document.documentElement;r.dataset.theme=m;if(m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))r.classList.add('dark')})()</script>`

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
    <link rel="alternate" type="application/atom+xml" title="PR Sift changelog" href="${SITE_URL}changelog/feed.xml" />
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#111113" media="(prefers-color-scheme: dark)" />
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

const bands = (sections) =>
  sections
    .map(
      ([id, inner], i) =>
        `<section ${id ? `id="${id}"` : ''} class="${i % 2 ? 'border-y border-line bg-raised' : ''}"><div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">${inner}</div></section>`,
    )
    .join('\n')

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
  releaseNotes: SITE_URL + 'changelog/',
  softwareVersion: VERSION,
  license: 'https://polyformproject.org/licenses/shield/1.0.0',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  image: SITE_URL + 'media/og.png',
  screenshot: ['review', 'filters', 'notes', 'ai-export', 'split'].map((n) => SITE_URL + `media/screenshots/${n}.webp`),
  featureList: [home.notesStory.title, ...home.features.map((f) => f.title)],
  author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
}

const ctaBlock = () => `<section class="border-t border-line">
      <div class="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-20 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-5">${logo('size-12 shrink-0')}<h2 class="max-w-xl text-3xl font-semibold tracking-tight text-balance">Make your next big review the easy one.</h2></div>
        <div class="flex flex-wrap gap-3">
          ${button(INSTALL_URL, `${icon('download', 'size-4')}Install PR Sift`)}
          ${button(REPO_URL, `${icon('github', 'size-4')}Star on GitHub`, false)}
        </div>
      </div>
    </section>`

const STATE = {
  yes: ['check', 'text-add', 'Yes'],
  partial: ['circle-dot', 'text-[#9a6700] dark:text-[#d29922]', 'Partly'],
  no: ['x', 'text-del', 'No'],
  unknown: ['minus', 'text-muted', 'Not listed'],
}
const stateIcon = ([state, note], cls = 'size-4') =>
  `<span class="inline-flex ${STATE[state][1]}" title="${esc(note)}">${icon(STATE[state][0], cls)}<span class="sr-only">${esc(STATE[state][2])}: ${esc(note)}</span></span>`
const score = (values) => FEATURES.reduce((sum, [key]) => sum + (values[key][0] === 'yes' ? 1 : values[key][0] === 'partial' ? 0.5 : 0), 0)

function matrix() {
  const columns = [{ name: 'PR Sift', avatar: null, slug: null, values: prSift.values }, ...compare]
  return `<div class="relative overflow-x-auto rounded-lg border border-line">
    <table class="w-full min-w-[720px] text-left text-sm">
      <thead class="bg-raised"><tr><th class="px-4 py-3 font-medium">Feature</th>${columns
        .map(
          (c) =>
            `<th class="px-3 py-3 text-center font-medium"><span class="flex flex-col items-center gap-1.5">${c.avatar ? iconBox(c.avatar, 'size-8') : logo('size-8')}${c.slug ? `<a href="${link(`compare/${c.slug}/`)}" class="hover:underline">${esc(c.name)}</a>` : esc(c.name)}</span></th>`,
        )
        .join('')}</tr></thead>
      <tbody class="divide-y divide-line">
        ${FEATURES.map(([key, ic, label]) => `<tr><th scope="row" class="px-4 py-2.5 font-normal"><span class="flex items-center gap-2.5">${icon(ic, 'size-4 text-muted')}${esc(label)}</span></th>${columns.map((c) => `<td class="px-3 py-2.5 text-center">${stateIcon(c.values[key])}</td>`).join('')}</tr>`).join('\n        ')}
      </tbody>
    </table>
  </div>
  <p class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">${Object.values(STATE)
    .map(
      ([ic, cls, label]) =>
        `<span class="inline-flex items-center gap-1.5"><span class="${cls}">${icon(ic, 'size-4')}</span>${label}</span>`,
    )
    .join('')}<span>From official pages, ${CHECKED}.</span></p>`
}

function homePage() {
  const h = home
  const demoTabs = `<div class="grid grid-cols-1 gap-8 lg:grid-cols-[18rem_1fr]" data-demo>
      <div role="tablist" aria-label="Demos" class="flex gap-2 overflow-x-auto lg:flex-col">
        ${h.demos.map(([id, ic, title, text], i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-video="${id}" class="demo-tab flex shrink-0 items-center gap-3 rounded-lg lg:items-start border border-transparent p-3 text-left transition aria-selected:border-line aria-selected:bg-paper lg:w-full">${iconBox(ic)}<span><span class="block font-medium">${esc(title)}</span><span class="hidden text-sm text-muted lg:block">${esc(text)}</span></span></button>`).join('\n        ')}
      </div>
      <div>${video(h.demos[0][0], h.demos[0][2], 'data-demo-video')}</div>
    </div>`

  const features = h.features
    .filter((f) => f.id !== 'notes')
    .map((f, i) => [
      i === 0 ? 'features' : f.id,
      `<div class="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        <div class="lg:col-span-4 ${i % 2 ? 'lg:order-2' : ''}">
          ${iconBox(f.icon)}
          ${h2(f.title, 'mt-5')}
          ${lead(f.text)}
          <ul class="mt-7 flex flex-col gap-3.5">
            ${f.points.map(([ic, a, b]) => `<li class="flex gap-3">${icon(ic, 'mt-0.5 size-[18px] shrink-0 text-muted')}<span><strong class="font-medium">${esc(a)}</strong> <span class="text-muted">${esc(b)}</span></span></li>`).join('\n            ')}
          </ul>
        </div>
        <div class="lg:col-span-8">${video(f.video, f.title)}</div>
      </div>`,
    ])

  const sections = [
    [
      'notes',
      `<div class="grid items-start gap-12 lg:grid-cols-12">
        <div class="lg:col-span-5">
          ${iconBox('lock')}
          ${h2(h.notesStory.title, 'mt-5')}
          ${lead(h.notesStory.lead)}
          <ul class="mt-8 flex flex-col gap-6">
            ${h.notesStory.cases.map(([ic, title, text]) => `<li class="flex gap-4">${iconBox(ic)}<span><span class="block font-medium">${esc(title)}</span><span class="mt-1 block leading-relaxed text-muted">${esc(text)}</span></span></li>`).join('\n            ')}
          </ul>
        </div>
        <div class="lg:col-span-7">${video('notes', 'Writing a private note on several lines')}</div>
      </div>`,
    ],
    [
      'ai',
      `<div class="max-w-3xl">${iconBox('bot')}${h2(h.ai.title, 'mt-5')}${lead(h.ai.lead)}</div>
      <ul class="mt-8 flex flex-wrap gap-2" aria-label="Supported AI tools">
        ${AI_TOOLS.map(([slug, name]) => `<li class="inline-flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-1.5 text-sm font-medium">${brandIcon(slug, 'size-4')}${esc(name)}</li>`).join('')}
        <li class="inline-flex items-center gap-2 rounded-md border border-dashed border-line px-3 py-1.5 text-sm text-muted">${icon('clipboard', 'size-4')}Any other AI</li>
      </ul>
      <ol class="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        ${h.ai.steps.map(([ic, title, text], i) => `<li class="flex gap-3 bg-paper p-5"><span class="font-mono text-sm text-muted">${i + 1}</span><span>${icon(ic, 'size-[18px]')}<span class="mt-2 block font-medium">${esc(title)}</span><span class="text-muted">${esc(text)}</span></span></li>`).join('\n        ')}
      </ol>
      <div class="mt-10">${video('claude', 'Copying notes for Codex, Cursor and Claude Code')}</div>`,
    ],
    [
      'pain',
      `<div class="max-w-3xl">${iconBox('messages-square')}${h2(h.pain.title, 'mt-5')}${lead(h.pain.lead)}</div>
      <ul class="mt-10 grid gap-4 md:grid-cols-3">
        ${h.pain.issues
          .map(
            ([ic, title, text, url, fix]) => `<li class="flex flex-col rounded-lg border border-line p-6">
          ${icon(ic, 'size-5')}
          <h3 class="mt-4 font-medium">${esc(title)}</h3>
          <p class="mt-1.5 text-muted">${esc(text)}</p>
          <p class="mt-4 flex gap-2 border-t border-line pt-4 text-sm">${icon('check', 'mt-0.5 size-4 shrink-0 text-add')}${esc(fix)}</p>
          <a href="${url}" class="mt-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink" rel="noopener">${icon('github', 'size-4')}Discussion #${url.split('/').pop()}${icon('arrow-up-right', 'size-3.5')}</a>
        </li>`,
          )
          .join('\n        ')}
      </ul>`,
    ],
    ...features,
    [
      'theme',
      `<div class="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        <div class="lg:col-span-4">${iconBox('sun-moon')}${h2(h.theme.title, 'mt-5')}${lead(h.theme.text)}</div>
        <div class="lg:col-span-8">${video('theme', h.theme.title)}</div>
      </div>`,
    ],
    [
      'how',
      `${h2('Three steps. No account.')}
      <ol class="mt-10 grid gap-8 md:grid-cols-3">
        ${h.how.map(([ic, title, text], i) => `<li class="border-t-2 border-ink pt-5"><span class="flex items-center gap-3"><span class="font-mono text-sm text-muted">${i + 1}</span>${icon(ic, 'size-[18px]')}</span><h3 class="mt-3 text-lg font-medium">${esc(title)}</h3><p class="mt-1 text-muted">${esc(text)}</p></li>`).join('\n        ')}
      </ol>
      <div class="mt-12">${shot('launcher', 'The PR Sift button on a real GitHub pull request')}</div>`,
    ],
    [
      'source-code',
      `<div class="grid gap-12 lg:grid-cols-12">
        <div class="lg:col-span-5">
          ${iconBox('github')}${h2(h.openSource.title, 'mt-5')}${lead(h.openSource.text)}
          <p class="mt-8 flex gap-3">${icon('shield-check', 'mt-0.5 size-5 shrink-0')}<span><span class="block font-medium">${esc(h.privacy.title)}</span><span class="text-muted">${esc(h.privacy.text)}</span></span></p>
        </div>
        <ul class="grid gap-px self-start overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:col-span-7">
          ${h.openSource.links.map(([ic, label, href]) => `<li><a href="${link(href)}" class="flex items-center gap-3 bg-paper p-5 hover:bg-raised">${icon(ic, 'size-5')}<span class="font-medium">${esc(label)}</span>${icon('arrow-up-right', 'ms-auto size-4 text-muted')}</a></li>`).join('\n          ')}
        </ul>
      </div>`,
    ],
    [
      'compare',
      `${h2('PR Sift and the tools you know')}${lead('Feature by feature, from each tool’s official pages.')}<div class="mt-10">${matrix()}</div>`,
    ],
    [
      'faq',
      `<div class="grid gap-10 lg:grid-cols-12">
        ${h2('Questions', 'lg:col-span-4')}
        <div class="divide-y divide-line border-y border-line lg:col-span-8">
          ${h.faq.map(([q, a]) => `<details class="group py-5"><summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">${esc(q)}<span class="text-muted transition-transform group-open:rotate-45">${icon('plus', 'size-5')}</span></summary><p class="mt-3 max-w-prose leading-relaxed text-muted">${esc(a)}</p></details>`).join('\n          ')}
        </div>
      </div>`,
    ],
  ]

  const body = `
    <section class="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-20 lg:pb-24">
      <div class="@container min-w-0">
        <a href="${link('changelog/')}" class="inline-flex items-center gap-2 rounded-full border border-line py-1 ps-1 pe-3 text-sm hover:bg-raised"><span class="rounded-full bg-ink px-2 py-0.5 font-mono text-xs font-medium text-paper">v${VERSION}</span><span class="flex items-center gap-1.5">${['claude', 'openai', 'cursor', 'githubcopilot'].map((slug) => brandIcon(slug, 'size-4')).join('')}</span>Send notes to your AI agent${icon('chevron-right', 'size-3.5 text-muted')}</a>
        <h1 class="hero-diff mt-7 font-mono leading-[1.25] font-medium tracking-tight whitespace-nowrap">
          <span class="flex gap-3 rounded-t-md bg-del-bg px-3 py-2"><span class="select-none text-del" aria-hidden="true">−</span><span>Scroll 214 changed files.</span></span>
          <span class="flex gap-3 rounded-b-md bg-add-bg px-3 py-2"><span class="select-none text-add" aria-hidden="true">+</span><span>Review the 12 that matter.</span></span>
        </h1>
        <p class="mt-7 max-w-xl text-lg leading-relaxed text-muted">${esc(h.hero.lead)}</p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          ${button(INSTALL_URL, `${icon('download', 'size-4')}${esc(h.hero.cta)}`)}
          ${button(REPO_URL, `${icon('github', 'size-4')}${esc(h.hero.secondary)}`, false)}
        </div>
        <div class="mt-10">${browsers()}</div>
      </div>
      <div class="min-w-0">${playground()}</div>
    </section>
    <section class="border-y border-line bg-raised"><div class="mx-auto max-w-6xl px-4 py-16 sm:px-6">${demoTabs}</div></section>
    ${bands(sections)}
    ${ctaBlock()}`
  return layout({ path: '', title: h.title, description: h.description, body, jsonLd: [appLd, faqLd(h.faq)] })
}

function article({ path, crumbs, kicker, title, description, body, jsonLd = [], wide = false }) {
  const content = `
    <div class="mx-auto ${wide ? 'max-w-6xl' : 'max-w-3xl'} px-4 py-14 sm:px-6 sm:py-20">
      <nav class="flex flex-wrap items-center gap-1.5 text-sm text-muted" aria-label="Breadcrumb">
        ${crumbs.map(([name, href], i) => (i < crumbs.length - 1 ? `<a href="${link(href)}" class="hover:text-ink">${esc(name)}</a>${icon('chevron-right', 'size-3.5')}` : `<span class="text-ink">${esc(name)}</span>`)).join('')}
      </nav>
      ${kicker ? `<p class="mt-8 text-sm text-muted">${esc(kicker)}</p>` : '<div class="mt-8"></div>'}
      <h1 class="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">${esc(title)}</h1>
      <p class="mt-5 max-w-2xl text-lg leading-relaxed text-muted">${esc(description)}</p>
      ${body}
    </div>
    ${ctaBlock()}`
  return layout({ path, title: `${title} | PR Sift`, description, body: content, type: 'article', jsonLd: [breadcrumb(crumbs), ...jsonLd] })
}

const moreLinks = (title, items) => `<div class="mt-14 border-t border-line pt-8">
        <p class="text-sm font-medium">${title}</p>
        <ul class="mt-3 flex flex-col gap-2">${items.map(([href, text]) => `<li><a href="${link(href)}" class="inline-flex items-center gap-1.5 text-muted hover:text-ink">${icon('arrow-right', 'size-4')}${esc(text)}</a></li>`).join('')}</ul>
      </div>`

function guidePage(g) {
  const body = `
      <div class="mt-10">${video(g.video, g.title)}</div>
      <ol class="mt-12 flex flex-col gap-9">
        ${g.sections.map(([ic, h, p], i) => `<li class="flex gap-4">${iconBox(ic)}<div><h2 class="text-xl font-semibold tracking-tight"><span class="me-2 font-mono text-base text-muted">${i + 1}</span>${esc(h)}</h2><p class="mt-2 text-[17px] leading-relaxed text-muted">${esc(p)}</p></div></li>`).join('\n        ')}
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
    step: g.sections.map(([, stepName, text], i) => ({ '@type': 'HowToStep', position: i + 1, name: stepName, text })),
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

function listPage({ path, kicker, title, description, items, before = '' }) {
  const body = `${before}<ul class="mt-12 divide-y divide-line border-y border-line">${items
    .map(
      ([href, name, text, ic]) =>
        `<li><a href="${link(href)}" class="group flex gap-4 py-6">${ic ? iconBox(ic) : ''}<span><span class="block text-lg font-medium group-hover:underline">${esc(name)}</span><span class="mt-1 block text-muted">${esc(text)}</span></span></a></li>`,
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
    wide: Boolean(before),
  })
}

function comparePage(c) {
  const ours = score(prSift.values)
  const theirs = score(c.values)
  const bar = (name, avatarHtml, value) =>
    `<div class="flex items-center gap-4">${avatarHtml}<div class="flex-1"><div class="flex justify-between text-sm"><span class="font-medium">${esc(name)}</span><span class="font-mono text-muted">${value}/${FEATURES.length}</span></div><div class="mt-2 h-2 overflow-hidden rounded-full bg-raised"><div class="h-full rounded-full bg-ink" style="width:${(value / FEATURES.length) * 100}%"></div></div></div></div>`
  const choose = (title, items, ic) =>
    `<div class="rounded-lg border border-line p-6"><h2 class="flex items-center gap-2.5 font-medium">${icon(ic, 'size-5')}${esc(title)}</h2><ul class="mt-4 flex flex-col gap-2.5 text-muted">${items.map((t) => `<li class="flex gap-2">${icon('check', 'mt-1 size-4 shrink-0 text-ink')}<span>${esc(t)}</span></li>`).join('')}</ul></div>`
  const body = `
      <div class="mt-10 grid gap-5 rounded-lg border border-line p-6 sm:p-8">
        ${bar('PR Sift', logo('size-10 shrink-0'), ours)}
        ${bar(c.name, iconBox(c.avatar, 'size-10'), theirs)}
        <p class="text-sm text-muted">Features below with full support count as 1, partial as ½. Checked ${esc(CHECKED)}.</p>
      </div>
      <div class="relative mt-10 overflow-x-auto rounded-lg border border-line">
        <table class="w-full min-w-[620px] text-left text-[15px]">
          <thead class="bg-raised text-sm"><tr><th class="px-4 py-3 font-medium">Feature</th><th class="px-4 py-3 font-medium"><span class="flex items-center gap-2">${logo('size-5')}PR Sift</span></th><th class="px-4 py-3 font-medium"><span class="flex items-center gap-2">${icon(c.avatar, 'size-5')}${esc(c.name)}</span></th></tr></thead>
          <tbody class="divide-y divide-line">
            ${FEATURES.map(([key, ic, label]) => `<tr><th scope="row" class="px-4 py-3 align-top font-normal"><span class="flex items-center gap-2.5">${icon(ic, 'size-4 shrink-0 text-muted')}${esc(label)}</span></th>${[prSift.values[key], c.values[key]].map((v) => `<td class="px-4 py-3 align-top"><span class="flex items-start gap-2">${stateIcon(v, 'mt-0.5 size-4 shrink-0')}<span class="${v[0] === 'unknown' ? 'text-muted' : ''}">${esc(v[1])}</span></span></td>`).join('')}</tr>`).join('\n            ')}
            ${(c.extra ?? []).map(([label, ic, ours2, theirs2]) => `<tr><th scope="row" class="px-4 py-3 align-top font-normal"><span class="flex items-center gap-2.5">${icon(ic, 'size-4 shrink-0 text-muted')}${esc(label)}</span></th><td class="px-4 py-3 align-top">${esc(ours2)}</td><td class="px-4 py-3 align-top">${esc(theirs2)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-sm text-muted">From ${esc(c.name)}’s official pages on ${esc(CHECKED)}. "Not listed" means we found nothing there, not that it is missing. Sources: ${c.sources.map((s) => `<a href="${s}" class="underline" rel="nofollow noopener">${esc(new URL(s).hostname)}</a>`).join(', ')}.</p>
      <h2 class="mt-14 text-2xl font-semibold tracking-tight">See it in PR Sift</h2>
      <div class="mt-5 grid gap-5 sm:grid-cols-2">${c.showcase.map((v) => video(v, v)).join('')}</div>
      <div class="mt-14 grid gap-4 sm:grid-cols-2">${choose('Choose PR Sift if', c.choosePrSift, 'funnel')}${choose(`Choose ${c.name} if`, c.chooseThem, c.avatar)}</div>
      ${c.together ? `<p class="mt-5 flex gap-3 rounded-lg bg-raised p-5">${icon('info', 'mt-0.5 size-5 shrink-0')}<span>${esc(c.together)}</span></p>` : ''}
      <h2 class="mt-14 text-2xl font-semibold tracking-tight">Questions</h2>
      <div class="mt-4 divide-y divide-line border-y border-line">
        ${c.faq.map(([q, a]) => `<details class="group py-4"><summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">${esc(q)}<span class="text-muted transition-transform group-open:rotate-45">${icon('plus', 'size-4')}</span></summary><p class="mt-2 leading-relaxed text-muted">${esc(a)}</p></details>`).join('')}
      </div>
      ${moreLinks('Other comparisons', [...compare.filter((o) => o.slug !== c.slug).map((o) => [`compare/${o.slug}/`, `PR Sift vs ${o.name}`]), ['compare/', 'All tools side by side']])}`
  return article({
    path: `compare/${c.slug}/`,
    crumbs: [
      ['Home', ''],
      ['Compare', 'compare/'],
      [`vs ${c.name}`, `compare/${c.slug}/`],
    ],
    kicker: '',
    title: c.title,
    description: c.description,
    body,
    jsonLd: [faqLd(c.faq)],
  })
}

const AREAS = {
  Notes: 'notebook-pen',
  AI: 'bot',
  Filters: 'funnel',
  Tree: 'folder-tree',
  Review: 'list-checks',
  Views: 'columns-2',
  Appearance: 'sun-moon',
  Security: 'shield-check',
}
const KINDS = { Added: 'sparkles', Fixed: 'wrench', Changed: 'refresh-cw', Security: 'shield-check' }

function parseChangelog() {
  const releases = []
  let release
  let section
  for (const line of readFileSync(fileURLToPath(new URL('../../../CHANGELOG.md', import.meta.url)), 'utf8').split('\n')) {
    const version = /^## (\S+)(?: - (.+))?$/.exec(line)
    const kind = /^### (.+)$/.exec(line)
    const item = /^- (\w+): (.+)$/.exec(line)
    if (version) releases.push((release = { version: version[1], date: version[2] ?? '', sections: [] }))
    else if (kind && release) release.sections.push((section = { kind: kind[1], items: [] }))
    else if (item && section) section.items.push({ area: item[1], text: item[2] })
  }
  return releases
}
const changelog = parseChangelog()

function changelogPage() {
  const counts = new Map()
  for (const r of changelog) for (const s of r.sections) for (const i of s.items) counts.set(i.area, (counts.get(i.area) ?? 0) + 1)
  const chips = `<div class="mt-10 flex flex-wrap gap-2" data-areas>
      <button type="button" data-area="" aria-pressed="true" class="area-chip inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper">All<span class="opacity-60">${[...counts.values()].reduce((a, b) => a + b, 0)}</span></button>
      ${[...counts].map(([area, n]) => `<button type="button" data-area="${area}" aria-pressed="false" class="area-chip inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper">${icon(AREAS[area] ?? 'dot', 'size-4')}${esc(area)}<span class="opacity-60">${n}</span></button>`).join('')}
    </div>`
  const releases = changelog
    .map(
      (r) => `<article class="mt-12 grid gap-6 border-t border-line pt-10 lg:grid-cols-[12rem_1fr]" id="v${r.version.replace(/\./g, '-')}">
        <div><h2 class="font-mono text-2xl font-medium">${esc(r.version)}</h2><p class="mt-1 text-sm text-muted">${esc(r.date || '')}</p></div>
        <div class="flex flex-col gap-8">${r.sections
          .map(
            (
              s,
            ) => `<section><h3 class="flex items-center gap-2 font-medium">${icon(KINDS[s.kind] ?? 'dot', 'size-[18px]')}${esc(s.kind)}<span class="text-sm font-normal text-muted">${s.items.length}</span></h3>
            <ul class="mt-4 divide-y divide-line border-y border-line">${s.items
              .map(
                (i) =>
                  `<li data-area="${i.area}" class="flex items-start gap-3 py-3"><span class="mt-0.5 inline-flex w-28 shrink-0 items-center gap-1.5 text-sm text-muted">${icon(AREAS[i.area] ?? 'dot', 'size-4')}${esc(i.area)}</span><span>${esc(i.text)}</span></li>`,
              )
              .join('')}</ul></section>`,
          )
          .join('')}</div>
      </article>`,
    )
    .join('')
  const subscribe = `<div class="mt-6 flex flex-wrap gap-3">${button(`${SITE_URL}changelog/feed.xml`, `${icon('rss', 'size-4')}Subscribe`, false)}${button(`${REPO_URL}/releases`, `${icon('github', 'size-4')}Releases on GitHub`, false)}</div>`
  return article({
    path: 'changelog/',
    crumbs: [
      ['Home', ''],
      ['Changelog', 'changelog/'],
    ],
    kicker: '',
    title: 'Changelog',
    description: 'Every change to PR Sift, grouped by area.',
    body: subscribe + chips + releases,
  })
}

function changelogFeed() {
  const updated = new Date().toISOString()
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>PR Sift changelog</title>
  <link href="${SITE_URL}changelog/" />
  <link rel="self" href="${SITE_URL}changelog/feed.xml" />
  <id>${SITE_URL}changelog/</id>
  <updated>${updated}</updated>
  <author><name>${AUTHOR.name}</name></author>
${changelog
  .map(
    (r) => `  <entry>
    <title>PR Sift ${esc(r.version)}</title>
    <link href="${SITE_URL}changelog/#v${r.version.replace(/\./g, '-')}" />
    <id>${SITE_URL}changelog/#v${r.version.replace(/\./g, '-')}</id>
    <updated>${updated}</updated>
    <content type="html">${esc(r.sections.map((s) => `<h3>${s.kind}</h3><ul>${s.items.map((i) => `<li>${i.area}: ${i.text}</li>`).join('')}</ul>`).join(''))}</content>
  </entry>`,
  )
  .join('\n')}
</feed>
`
}

function brandPage() {
  const body = `
      <h2 class="mt-12 text-2xl font-semibold tracking-tight">Logo</h2>
      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col items-center gap-4 rounded-lg border border-line bg-white p-10"><img src="${link('brand/pr-sift-logo.svg')}" alt="PR Sift logo, black" class="size-24" /><a href="${link('brand/pr-sift-logo.svg')}" download class="text-sm font-medium text-black underline">Download SVG</a></div>
        <div class="flex flex-col items-center gap-4 rounded-lg border border-line bg-black p-10"><img src="${link('brand/pr-sift-logo-light.svg')}" alt="PR Sift logo, white" class="size-24" /><a href="${link('brand/pr-sift-logo-light.svg')}" download class="text-sm font-medium text-white underline">Download SVG</a></div>
      </div>
      <p class="mt-4 text-muted">A sieve: many files go in, the ones that matter come out. Black on light, white on dark. Please do not recolor it.</p>
      <h2 class="mt-12 text-2xl font-semibold tracking-tight">Name</h2>
      <p class="mt-3 text-muted">Write <strong class="text-ink">PR Sift</strong>, with a space and a capital S.</p>
      <h2 class="mt-12 text-2xl font-semibold tracking-tight">Colors and type</h2>
      <div class="mt-5 grid grid-cols-3 gap-4">${brand.colors.map(([n, hex]) => `<div class="overflow-hidden rounded-lg border border-line"><div class="h-20" style="background:${hex}"></div><div class="p-3 text-sm"><p class="font-medium">${n}</p><p class="font-mono text-muted">${hex}</p></div></div>`).join('')}</div>
      <p class="mt-4 text-muted">IBM Plex Sans and IBM Plex Mono. Green and red only mean added and removed code.</p>
      <h2 class="mt-12 text-2xl font-semibold tracking-tight">Descriptions</h2>
      <dl class="mt-5 flex flex-col gap-4">${brand.descriptions.map(([k, v]) => `<div class="rounded-lg border border-line p-5"><dt class="text-sm text-muted">${k}</dt><dd class="mt-1.5 text-[17px]">${esc(v)}</dd></div>`).join('')}</dl>
      <h2 class="mt-12 text-2xl font-semibold tracking-tight">Screenshots and videos</h2>
      <div class="mt-5 grid gap-4 sm:grid-cols-2">${['review', 'filters', 'notes', 'ai-export', 'split', 'dark'].map((n) => `<a href="${media(`screenshots/${n}.webp`)}" download class="block">${shot(n, `PR Sift screenshot: ${n}`)}</a>`).join('')}</div>
      <p class="mt-4 text-muted">Videos: ${['tour', 'filters', 'folders', 'smart-filters', 'review', 'notes', 'resolve', 'claude', 'theme', 'views'].map((n) => `<a href="${media(`videos/${n}.mp4`)}" class="underline">${n}</a>`).join(', ')}. Social image: <a href="${media('og.png')}" class="underline">og.png</a>.</p>`
  return article({
    path: 'brand/',
    crumbs: [
      ['Home', ''],
      ['Brand', 'brand/'],
    ],
    kicker: '',
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
    kicker: '',
    title: 'Privacy policy',
    description: 'What PR Sift stores, where it stays, and what it never sends.',
    body: `<div class="mt-6">${html}</div>`,
  })
}

const GUIDE_ICONS = ['bot', 'list-checks', 'eye-off', 'funnel', 'message-square-text']

const pages = {
  'index.html': homePage(),
  'brand/index.html': brandPage(),
  'privacy/index.html': privacyPage(),
  'changelog/index.html': changelogPage(),
  'guides/index.html': listPage({
    path: 'guides/',
    kicker: '',
    title: 'Guides',
    description: 'Short, practical guides for reviewing large GitHub pull requests.',
    items: guides.map((g, i) => [`guides/${g.slug}/`, g.title, g.description, GUIDE_ICONS[i] ?? 'file-text']),
  }),
  'compare/index.html': listPage({
    path: 'compare/',
    kicker: '',
    title: 'Compare PR Sift',
    description: 'PR Sift next to GitHub and other pull request extensions, feature by feature, from their official pages.',
    before: `<div class="mt-10">${matrix()}</div>`,
    items: compare.map((c) => [`compare/${c.slug}/`, `PR Sift vs ${c.name}`, c.summary, c.avatar]),
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
mkdirSync(here('public/changelog'), { recursive: true })
cpSync(fileURLToPath(new URL('../../../media', import.meta.url)), here('public/media'), { recursive: true })
cpSync(here('assets/brands/dia-favicon.svg'), here('public/brand/dia.svg'))
writeFileSync(here('public/favicon.svg'), logoFile('#000000', '#ffffff'))
writeFileSync(here('public/brand/pr-sift-logo.svg'), logoFile('#000000', '#ffffff'))
writeFileSync(here('public/brand/pr-sift-logo-light.svg'), logoFile('#ffffff', '#000000'))
writeFileSync(here('public/changelog/feed.xml'), changelogFeed())

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

PR Sift is a browser extension for github.com. It opens a review workspace on top of a pull request's "Files changed" tab. Made by ${AUTHOR.name} (${AUTHOR.url}).

Current version: ${VERSION}${changelog[0]?.date ? `, released ${changelog[0].date}` : ''}. Changelog: ${SITE_URL}changelog/

## Private notes

${home.notesStory.lead}
${home.notesStory.cases.map(([, t, d]) => `- ${t}: ${d}`).join('\n')}
- ${home.ai.title}. ${home.ai.lead}

## Features

${home.features.map((f) => `- ${f.title}. ${f.text}`).join('\n')}

## Facts

- Price: free, including at work. License: PolyForm Shield 1.0.0 (public source code; no resale and no competing copies). Source: ${REPO_URL}
- Browsers: Chrome, Edge, Brave, Arc, Dia, Opera, Vivaldi and other Chromium browsers.
- Privacy: no server, no account, no analytics. Data stays in the browser. Talks only to GitHub.
- A GitHub token is optional and only used to post a note as a review comment.

## Guides

${guides.map((g) => `- [${g.title}](${SITE_URL}guides/${g.slug}/): ${g.description}`).join('\n')}

## Comparisons

${compare.map((c) => `- [PR Sift vs ${c.name}](${SITE_URL}compare/${c.slug}/): ${c.description}`).join('\n')}

## Changelog

${SITE_URL}changelog/ (Atom feed: ${SITE_URL}changelog/feed.xml)

## FAQ

${home.faq.map(([q, a]) => `### ${q}\n\n${a}`).join('\n\n')}
`,
)
console.log(`${Object.keys(pages).length + 1} pages written`)
