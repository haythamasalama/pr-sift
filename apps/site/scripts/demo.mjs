import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { DIFF, TITLE } from '../../../tools/capture/demo-pr.mjs'
import { INSTALL_URL } from './content.mjs'

// The content script finds the pull request in the path, so the demo lives at /demo/<repo>/pull/<number>.
export const DEMO_PR = { owner: 'demo', repo: 'storefront', number: 482 }
const PR_BASE = `/${DEMO_PR.owner}/${DEMO_PR.repo}/pull/${DEMO_PR.number}`
export const DEMO_URL = `${PR_BASE}/files/`

const FILES = [...DIFF.matchAll(/^diff --git a\/\S+ b\/(\S+)$/gm)].map((m) => m[1])

const DESCRIPTION = `<h2 dir="auto">Summary</h2>
<ul dir="auto">
<li><strong>Invoices</strong> now include usage lines from <code>UsageMeter</code>, priced with the account's plan.</li>
<li>The business portal lists invoices per period, with a PDF download.</li>
<li>Totals are rounded to the currency's precision.</li>
</ul>
<h2 dir="auto">How to test</h2>
<ul class="contains-task-list">
<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" checked disabled> <code>php artisan test --filter=Billing</code></li>
<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" disabled> Open an invoice for a metered plan and check the usage lines</li>
</ul>`

const PAGE_DATA = {
  payload: {
    pullRequestsLayoutRoute: {
      pullRequest: {
        title: TITLE,
        author: { login: 'haythamasalama' },
        baseBranch: 'main',
        headBranch: 'feat/usage-invoices',
        commitsCount: 4,
        state: 'OPEN',
      },
    },
  },
}

const commit = (message, name, email, login) => ({ commit: { message, author: { name, email } }, author: { login } })
const me = { login: 'haythamasalama' }
const person = (login) => ({ login })
const reviewComment = (id, path, line, user, body, hoursAgo, extra = {}) => ({
  id,
  path,
  line,
  side: 'RIGHT',
  body_html: body,
  hoursAgo,
  html_url: '#',
  user,
  ...extra,
})

const API = {
  viewer: { login: 'you' },
  pull: {
    title: TITLE,
    body: '',
    comments: 2,
    review_comments: 4,
    commits: 4,
    mergeable_state: 'blocked',
    user: me,
    head: { sha: 'a1b2c3d', label: 'haythamasalama:feat/usage-invoices' },
  },
  issueComments: [
    { id: 701, body_html: "<p>Thanks! I'll review the billing part today.</p>", hoursAgo: 30, html_url: '#', user: person('taylor') },
    {
      id: 702,
      body_html: '<p>Rebased on <code>main</code> and fixed the totals rounding.</p>',
      hoursAgo: 5,
      html_url: '#',
      user: me,
    },
  ],
  reviews: [{ id: 801, state: 'APPROVED', body_html: '<p>Looks good to me.</p>', hoursAgo: 3, html_url: '#', user: person('lee-park') }],
  comments: [
    reviewComment(
      901,
      'src/Domain/Billing/Actions/GenerateInvoice.php',
      33,
      person('taylor'),
      '<p>Should the currency come from the plan instead of the account? A plan change mid-period would bill in the old currency.</p>',
      26,
    ),
    reviewComment(
      902,
      'src/Domain/Billing/Actions/GenerateInvoice.php',
      33,
      me,
      "<p>Plans don't have a currency yet, so the account is the source for now. I'll note it in <code>docs/billing/usage.md</code>.</p>",
      20,
      { in_reply_to_id: 901 },
    ),
    reviewComment(
      903,
      'src/Domain/Billing/Actions/GenerateInvoice.php',
      65,
      person('kim-dev'),
      '<p><code>roundTo</code> should round half up for invoices. Can you add a test for <code>0.005</code>?</p>',
      8,
    ),
    reviewComment(
      904,
      'src/Presentation/Business/Controllers/InvoiceController.php',
      31,
      person('lee-park'),
      '<p>Paginate here, a business can have thousands of invoices.</p>',
      6,
      { start_line: 27 },
    ),
  ],
  commits: [
    commit(
      'feat(billing): add usage lines to invoices\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
      'Haytham A. Salama',
      'haytham@storefront.dev',
      'haythamasalama',
    ),
    commit('feat(billing): list invoices in the business portal', 'Taylor', 'taylor@storefront.dev', 'taylor'),
    commit(
      'fix(billing): round totals to the currency precision\n\nCo-authored-by: Codex <codex@openai.com>',
      'Haytham A. Salama',
      'haytham@storefront.dev',
      'haythamasalama',
    ),
    commit('test(billing): cover month-end usage totals', 'Haytham A. Salama', 'haytham@storefront.dev', 'haythamasalama'),
  ],
}

const NOTES = [
  {
    id: 'n1',
    file: 'src/Domain/Billing/Actions/GenerateInvoice.php',
    side: 'new',
    startLine: 20,
    line: 22,
    lineText: '->merge($this->usage->linesFor($account, $period));',
    quote: '',
    text: 'Usage lines are merged after subscriptions. Check that plan discounts still apply to both.',
    createdAt: 1,
  },
  {
    id: 'n2',
    file: 'src/Presentation/Business/Controllers/InvoiceController.php',
    side: 'new',
    line: 23,
    lineText: "if (! auth()->user()->can('billing.invoices.index')) {",
    quote: "auth()->user()->can('billing.invoices.index')",
    text: 'Use the InvoicePolicy here, like OrderController does, instead of an inline permission check.',
    createdAt: 2,
  },
]

const SEED = {
  token: 'demo',
  settings: { autoOpen: true },
  autoOpenTipDismissed: true,
  seenNew: ['auto-open', 'co-authors', 'saved-filters', 'updates'],
  [`notes:${DEMO_PR.owner}/${DEMO_PR.repo}#${DEMO_PR.number}`]: NOTES,
}

// Stands in for the extension's chrome.* APIs inside the page. Storage lives in memory, so every load starts from the
// same example, and GitHub calls are answered from the fixtures above. Nothing leaves the browser.
function chromeShim({ seed, api, version, installUrl }) {
  // The demo is one component on the website, so only the install link may leave it.
  const leaves = (href) => new URL(href, location.href).origin !== location.origin
  const allowed = (href) => href.startsWith(installUrl)
  const open = window.open.bind(window)
  window.open = (url, ...rest) => (url && allowed(String(url)) ? open(url, ...rest) : null)
  document.addEventListener(
    'click',
    (event) => {
      const link = event.composedPath().find((el) => el instanceof HTMLAnchorElement)
      if (link && (link.target === '_blank' || leaves(link.href)) && !allowed(link.href)) event.preventDefault()
    },
    true,
  )
  // The website keeps the review open and leaves settings to the installed extension. Full screen, closing goes back.
  const embedded = window.top !== window
  const leave = () => (history.length > 1 ? history.back() : location.assign('/#try'))
  const SETTINGS_LABELS = ['Options', 'Options, update ready', 'Edit saved filters', 'Edit hidden files']
  const SETTINGS_TEXT = ['Settings', 'Connect GitHub', 'Change token', 'Edit list']
  const opensSettings = (button) =>
    SETTINGS_LABELS.includes(button.getAttribute('aria-label')) || SETTINGS_TEXT.includes(button.textContent.trim())
  const closesReview = (button) => button.getAttribute('aria-label') === 'Close' && !!button.closest('header')
  const stop = (event) => {
    event.preventDefault()
    event.stopImmediatePropagation()
  }
  const guard = (event) => {
    const button = event.composedPath().find((el) => el instanceof HTMLButtonElement)
    if (!button) return
    if (opensSettings(button)) stop(event)
    else if (closesReview(button)) {
      stop(event)
      if (!embedded && (event.type === 'click' || event.type === 'keydown')) leave()
    }
  }
  for (const type of ['pointerdown', 'mousedown', 'click']) window.addEventListener(type, guard, true)
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape') {
        if (['Enter', ' ', 'ArrowDown'].includes(event.key)) guard(event)
        return
      }
      const root = document.getElementById('pr-sift-host')?.shadowRoot
      if (root?.querySelector('[role="dialog"], [role="menu"]')) return
      stop(event)
      if (!embedded) leave()
    },
    true,
  )
  const css = `${embedded ? 'header button[aria-label="Close"] { display: none !important; }' : ''}
    button[aria-label^="Options"], button[aria-label="Edit saved filters"], button[aria-label="Edit hidden files"] { pointer-events: none; }`
  const decorate = () => {
    const host = document.getElementById('pr-sift-host')
    if (!host) return false
    const style = document.createElement('style')
    style.textContent = css
    host.shadowRoot.append(style)
    return true
  }
  new MutationObserver((_, observer) => decorate() && observer.disconnect()).observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
  let site = null
  try {
    site = localStorage.getItem('theme')
  } catch {
    // Private windows can refuse storage; the demo follows the system theme then.
  }
  let store = structuredClone(seed)
  store.settings = { ...store.settings, theme: site === 'light' || site === 'dark' ? site : 'system' }
  const listeners = new Set()
  const emit = (changes) => listeners.forEach((l) => l(changes, 'local'))
  const write = (next) => {
    const changes = {}
    for (const k of new Set([...Object.keys(store), ...Object.keys(next)]))
      if (JSON.stringify(store[k]) !== JSON.stringify(next[k])) changes[k] = { oldValue: store[k], newValue: next[k] }
    store = next
    if (Object.keys(changes).length) emit(changes)
  }
  const ago = (hours) => new Date(Date.now() - hours * 3600_000).toISOString()
  const dated = (items, field) => items.map(({ hoursAgo, ...item }) => ({ ...item, [field]: ago(hoursAgo) }))
  const local = {
    get: async (key) => {
      if (typeof key === 'string') return key in store ? { [key]: structuredClone(store[key]) } : {}
      if (Array.isArray(key)) return Object.fromEntries(key.filter((k) => k in store).map((k) => [k, structuredClone(store[k])]))
      return structuredClone(store)
    },
    set: async (values) => write({ ...store, ...structuredClone(values) }),
    remove: async (key) => {
      const next = { ...store }
      for (const k of [key].flat()) delete next[k]
      write(next)
    },
  }
  const gh = (m) => {
    if (!store.token) return { ok: false, status: 401, data: { message: 'No token set in the extension options.' } }
    const path = m.path.split('?')[0]
    const reviews = store['demo:reviews'] ?? dated(api.reviews, 'submitted_at')
    if (m.method === 'PUT' && path.endsWith('/merge')) return { ok: true, status: 200, data: { sha: '9f8e7d6c5b4a', merged: true } }
    if (m.method === 'POST' && path.endsWith('/reviews')) {
      const state = { APPROVE: 'APPROVED', REQUEST_CHANGES: 'CHANGES_REQUESTED', COMMENT: 'COMMENTED' }[m.body.event]
      const text = String(m.body.body ?? '').replace(/[<>&]/g, '')
      const review = {
        id: Date.now(),
        state,
        body_html: text ? `<p>${text}</p>` : '',
        submitted_at: ago(0),
        html_url: '#',
        user: api.viewer,
      }
      const next = { ...store, 'demo:reviews': [...reviews, review] }
      if (state === 'APPROVED') next['demo:mergeable'] = 'clean'
      write(next)
      return { ok: true, status: 200, data: review }
    }
    if (path === '/user') return { ok: true, status: 200, data: api.viewer }
    if (path.endsWith('/reviews')) return { ok: true, status: 200, data: reviews }
    if (path.includes('/issues/')) return { ok: true, status: 200, data: dated(api.issueComments, 'created_at') }
    if (m.method === 'POST' && path.endsWith('/comments')) return { ok: true, status: 201, data: { html_url: '#' } }
    if (path.endsWith('/comments')) return { ok: true, status: 200, data: dated(api.comments, 'created_at') }
    if (path.endsWith('/commits')) return { ok: true, status: 200, data: api.commits }
    if (path.includes('/pulls/'))
      return { ok: true, status: 200, data: { ...api.pull, mergeable_state: store['demo:mergeable'] ?? api.pull.mergeable_state } }
    return { ok: true, status: 200, data: {} }
  }
  const respond = (m) => {
    if (m.type === 'gh') return gh(m)
    if (m.type === 'options') {
      window.open(installUrl, '_blank', 'noopener')
      return undefined
    }
    if (m.type === 'update-check') return { status: 'no_update' }
    return { ok: false, status: 0, url: '', text: '', error: 'Not available in the demo' }
  }
  const event = () => ({ addListener() {}, removeListener() {} })
  window.chrome = {
    runtime: {
      id: 'pr-sift-demo',
      lastError: undefined,
      getManifest: () => ({ version }),
      sendMessage: (m, cb) => {
        const res = respond(m)
        if (cb) setTimeout(() => cb(res), 120)
      },
      openOptionsPage: () => window.open(installUrl, '_blank', 'noopener'),
      requestUpdateCheck: async () => ({ status: 'no_update' }),
      reload: () => location.reload(),
      onMessage: event(),
      onUpdateAvailable: event(),
      onInstalled: event(),
      onStartup: event(),
    },
    storage: { local, onChanged: { addListener: (l) => listeners.add(l), removeListener: (l) => listeners.delete(l) } },
  }
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const pullPage = ({ shim, ext }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(TITLE)} · Pull Request #${DEMO_PR.number} · ${DEMO_PR.owner}/${DEMO_PR.repo}</title>
<script>
  const theme = localStorage.getItem('theme')
  document.documentElement.dataset.colorMode = theme === 'light' || theme === 'dark' ? theme : 'auto'
</script>
<style>
  :root { color-scheme: light dark; --bg: #fff; --fg: #1f2328; --muted: #59636e; --line: #d1d9e0; --raised: #f6f8fa; }
  @media (prefers-color-scheme: dark) { :root:not([data-color-mode=light]) { --bg: #0d1117; --fg: #f0f6fc; --muted: #9198a1; --line: #3d444d; --raised: #151b23; } }
  :root[data-color-mode=dark] { --bg: #0d1117; --fg: #f0f6fc; --muted: #9198a1; --line: #3d444d; --raised: #151b23; }
  body { margin: 0; font: 14px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--fg); background: var(--bg); }
  .top { min-height: 56px; background: var(--raised); border-bottom: 1px solid var(--line); display: flex; flex-wrap: wrap; align-items: center; padding: 8px 24px; gap: 8px 12px; color: var(--muted); }
  .top b { color: var(--fg); }
  .top button { margin-left: auto; font: inherit; color: inherit; background: none; border: 1px solid var(--line); border-radius: 6px; padding: 4px 10px; cursor: pointer; }
  main { max-width: 1100px; margin: 20px auto 96px; padding: 0 24px; }
  h1 { font-size: 24px; font-weight: 400; margin: 0 0 8px; }
  .state { display: inline-block; background: #1f883d; color: #fff; border-radius: 999px; padding: 2px 10px; font-size: 13px; margin-right: 8px; }
  .hint { margin: 16px 0; padding: 10px 14px; border: 1px solid var(--line); border-radius: 6px; background: var(--raised); }
  .tabs { display: flex; gap: 20px; border-bottom: 1px solid var(--line); margin: 16px 0 12px; padding-bottom: 8px; color: var(--muted); }
  .tabs .on { color: var(--fg); font-weight: 600; }
  .file { border: 1px solid var(--line); border-radius: 6px; margin-bottom: 8px; padding: 8px 14px; background: var(--raised); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; overflow-wrap: anywhere; }
</style>
${shim}
</head>
<body>
<div class="top"><b>${DEMO_PR.owner} / ${DEMO_PR.repo}</b> · PR Sift demo <button type="button" onclick="location.reload()">Start over</button></div>
<main>
  <h1 class="js-issue-title">${esc(TITLE)}</h1>
  <div><span class="state">Open</span> haythamasalama wants to merge 4 commits into <code>main</code></div>
  <p class="hint">This page stands in for GitHub, and nothing you do here leaves your browser. Close PR Sift to see it, then open it again with the PR Sift button at the bottom right.</p>
  <div class="tabs"><span>Conversation</span><span>Commits 4</span><span class="on">Files changed ${FILES.length}</span></div>
  ${FILES.map((f) => `<div class="file">${esc(f)}</div>`).join('\n  ')}
  <script type="application/json" data-target="react-app.embeddedData">${JSON.stringify(PAGE_DATA)}</script>
  <rails-partial data-partial-name="pullRequestsConversationsRoute.Body" hidden><div class="comment-body markdown-body js-comment-body">${DESCRIPTION}</div></rails-partial>
</main>
<script src="${ext}content.js"></script>
</body>
</html>
`

// Pages go where Vite builds HTML, so the dev server and GitHub Pages both serve /pull/482/ and /pull/482/files/.
// The extension bundle and the diff are copied as they are.
export function buildDemo({ dist, pages, assets, version }) {
  if (!existsSync(`${dist}/content.js`)) {
    console.warn('Skipping the live demo: build the extension first (pnpm --filter @pr-sift/extension build).')
    return false
  }
  const ext = '/demo/ext/'
  const shim = `<script>(${chromeShim})(${JSON.stringify({ seed: SEED, api: API, version, installUrl: INSTALL_URL })})</script>`
  const root = `${pages}${PR_BASE}`
  mkdirSync(`${root}/files`, { recursive: true })
  mkdirSync(`${assets}/demo/ext`, { recursive: true })
  mkdirSync(`${assets}/${DEMO_PR.owner}/${DEMO_PR.repo}/pull`, { recursive: true })
  cpSync(`${dist}/content.js`, `${assets}/demo/ext/content.js`)
  writeFileSync(`${assets}${PR_BASE}.diff`, DIFF)
  writeFileSync(`${root}/index.html`, pullPage({ shim, ext }))
  writeFileSync(`${root}.html`, pullPage({ shim, ext }))
  writeFileSync(`${root}/files/index.html`, pullPage({ shim, ext }))
  return true
}
