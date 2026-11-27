// Drawn in HTML rather than cropped from screenshots, so they stay sharp at any width and follow the theme.

const panel = (cls, inner) =>
  `<div class="w-full rounded-lg border border-line bg-paper shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_-12px_rgb(0_0_0/0.18)] ${cls}">${inner}</div>`

const label = (text, cls = '') => `<span class="text-[10.5px] font-medium tracking-[0.08em] text-muted uppercase ${cls}">${text}</span>`

// Every card can be clicked. State lives in aria-pressed / aria-checked / data-state, which the classes read,
// and src/main.js flips it (see "Feature cards" there).
const CHIP_BASE =
  'group/chip inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-paper px-2 text-xs whitespace-nowrap transition-colors hover:border-muted aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper data-[state=off]:border-dashed data-[state=off]:text-muted data-[state=off]:line-through'

const chip = (text, { count, state = 'plain', mono = false, lead = '', cls = '', still = false } = {}) => {
  const countHtml = count === undefined ? '' : `<span class="text-muted group-aria-pressed/chip:text-paper/70">${count}</span>`
  if (state === 'ghost' || still)
    return `<span class="inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs whitespace-nowrap ${state === 'ghost' ? 'border-dashed border-line bg-paper text-muted' : 'border-line bg-paper'} ${mono ? 'font-mono' : ''} ${cls}">${lead}${text}${countHtml}</span>`
  return `<button type="button" data-chip aria-pressed="${state === 'on'}"${state === 'off' ? ' data-state="off"' : ''} class="${CHIP_BASE} ${mono ? 'font-mono' : ''} ${cls}">${lead}${text}${countHtml}</button>`
}

// A checkbox drawn inside a clickable row: the row is the button, named group "row".
const box = () =>
  '<span class="size-[13px] shrink-0 rounded-[3px] border border-muted/60 bg-paper transition-colors group-aria-pressed/row:border-ink group-aria-pressed/row:bg-ink"></span>'

const toggle = (on = true, extra = '') =>
  `<button type="button" role="switch" data-switch aria-checked="${on}" ${extra} class="relative inline-block h-4 w-7 shrink-0 cursor-pointer rounded-full bg-line transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-3 after:rounded-full after:bg-paper after:transition-transform aria-checked:bg-ink aria-checked:after:translate-x-3"><span class="sr-only">Toggle</span></button>`

const ring = (size) =>
  `<svg viewBox="0 0 36 36" class="${size} shrink-0 -rotate-90"><circle cx="18" cy="18" r="14" fill="none" stroke-width="4" class="stroke-line"/><circle data-ring cx="18" cy="18" r="14" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="11.3 88" class="stroke-accent transition-[stroke-dasharray] duration-300"/></svg>`

const code = (num, sign, text, tone = '') => {
  const bg = { add: 'bg-add-bg', del: 'bg-del-bg', gap: 'bg-raised' }[tone] ?? ''
  const signColor = { add: 'text-add', del: 'text-del' }[tone] ?? 'text-muted'
  return `<div class="flex h-[21px] items-center gap-2.5 overflow-hidden px-2.5 font-mono text-[11.5px] whitespace-nowrap ${bg}"><span class="w-[18px] shrink-0 text-right text-muted">${num}</span><span class="w-2 shrink-0 ${signColor}">${sign}</span><span class="truncate">${text}</span></div>`
}

const fn = (name) => `<span class="text-code-fn">${name}</span>`

function treeRow(icon, { depth, open, name, count, parent = false, cls = '', actions = '' }) {
  const chevron = parent
    ? icon('chevron-right', 'size-[13px] shrink-0 text-muted transition-transform group-aria-expanded/tree:rotate-90')
    : '<span class="size-[13px] shrink-0"></span>'
  return `<button type="button" data-tree-row data-depth="${depth}"${parent ? ` aria-expanded="${open}"` : ''} class="group/tree flex h-[26px] w-full cursor-pointer items-center gap-1.5 rounded-md pe-1.5 text-start hover:bg-raised ${cls}" style="padding-inline-start:${4 + depth * 16}px">${chevron}${icon('folder', 'size-3.5 shrink-0 text-muted')}${name}<span class="ms-auto text-xs text-muted">${count}</span>${actions}</button>`
}

export function featureVisual(id, icon) {
  const subtree = (cls) =>
    `${icon('chevrons-up-down', `size-[13px] shrink-0 ${cls}`)}${icon('chevrons-down-up', `size-[13px] shrink-0 ${cls}`)}`
  const hint = (ic, strong, rest) =>
    `<span class="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-[13px] whitespace-nowrap text-muted">${icon(ic, 'size-3.5 text-ink')}<strong class="font-medium text-ink">${strong}</strong> ${rest}</span>`

  const visuals = {
    filters: () => `<div data-filters class="flex w-full max-w-[600px] flex-col gap-3.5">
      ${panel(
        'flex flex-col gap-2.5 px-4 py-3.5',
        `<div class="flex flex-wrap items-center gap-1.5">${label('Types', 'me-1')}${chip('.php', { count: 28, state: 'on', mono: true })}${chip('.vue', { count: 5, mono: true })}${chip('.ts', { count: 4, mono: true })}${chip('.lock', { count: 1, state: 'off', mono: true })}${chip('+ type', { state: 'ghost' })}</div>
        <div class="flex flex-wrap items-center gap-1.5">${label('Changes', 'me-1')}${chip('added', { count: 23, lead: icon('square-plus', 'size-[13px] text-add') })}${chip('modified', { count: 16, lead: icon('square-dot', 'size-[13px] text-modified') })}${chip('deleted', { count: 1, lead: icon('square-minus', 'size-[13px] text-del') })}</div>`,
      )}
      <div class="flex flex-wrap gap-2">${hint('mouse-pointer-click', 'Click', 'shows only that type')}${hint('eye-off', 'Shift-click', 'hides it everywhere')}</div>
    </div>`,

    review: () => {
      const file = (name, viewed) =>
        `<button type="button" data-file aria-pressed="${viewed}" class="group/row flex h-[26px] w-full cursor-pointer items-center gap-1.5 rounded-md ps-1.5 pe-1.5 text-start transition-opacity hover:bg-raised aria-pressed:opacity-45">${box()}<span class="group-aria-pressed/row:line-through">${name}</span><span class="ms-auto hidden text-xs text-muted group-aria-pressed/row:inline">Viewed</span></button>`
      return panel(
        'max-w-[300px] overflow-hidden',
        `<div data-review data-total="39" class="contents">
        <div class="flex items-center gap-2.5 border-b border-line px-3.5 py-3">${ring('size-8')}<span class="flex flex-col"><span class="text-sm font-semibold"><span data-left>34</span> left</span><span class="text-xs text-muted"><span data-done-count>5</span> of 39 done</span></span><span class="ms-auto inline-flex items-center gap-1.5 text-xs">${toggle(false, 'data-hide-viewed')}Hide viewed</span></div>
        <div class="px-2 pt-1.5 pb-2 text-[13px]">
          ${file('usage.php', true)}${file('billing.php', true)}${file('GenerateInvoice.php', false)}${file('InvoiceController.php', false)}
          <div class="mx-1.5 mt-1 flex items-center gap-1.5 rounded-md bg-attention-bg px-2 py-1.5 text-xs text-attention">${icon('git-compare', 'size-[13px] shrink-0')}New push: InvoiceStatus.php is back</div>
        </div></div>`,
      )
    },

    folders: () =>
      panel(
        'max-w-[290px] p-1.5 text-[13px]',
        `<div data-tree>
        <div class="flex h-[26px] items-center gap-1.5 rounded-md bg-ink/6 ps-2 pe-1.5 font-medium">${icon('layers', 'size-3.5 shrink-0')}All folders<span class="ms-auto text-xs font-normal text-muted">33</span>${subtree('text-muted')}</div>
        ${treeRow(icon, { depth: 0, open: true, parent: true, name: 'src', count: 14, cls: 'mt-0.5' })}
        ${treeRow(icon, { depth: 1, open: true, parent: true, name: 'Domain', count: 9 })}
        ${treeRow(icon, { depth: 2, open: true, parent: true, name: 'Billing', count: 9 })}
        ${treeRow(icon, { depth: 3, name: 'Actions', count: 1 })}
        ${treeRow(icon, { depth: 3, name: 'Enums', count: 1 })}
        ${treeRow(icon, { depth: 1, open: true, parent: true, name: 'Presentation', count: 5 })}
        ${treeRow(icon, { depth: 2, name: 'Controllers', count: 5 })}
        ${treeRow(icon, { depth: 0, open: false, parent: true, name: 'tests', count: 4 })}
        ${treeRow(icon, { depth: 1, name: 'Feature', count: 4, cls: 'hidden' })}
        </div>`,
      ),

    smart: () =>
      panel(
        'flex max-w-[290px] flex-col gap-2.5 px-3 pt-2.5 pb-3',
        `<div data-single class="grid grid-cols-2 rounded-md bg-raised p-[3px] text-xs">${['Tree', 'Smart filters'].map((name) => `<button type="button" data-press aria-pressed="${name !== 'Tree'}" class="flex h-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:text-ink aria-pressed:bg-paper aria-pressed:font-medium aria-pressed:text-ink aria-pressed:shadow-[0_1px_2px_rgb(0_0_0/0.12)]">${name}</button>`).join('')}</div>
        ${label('Quick')}
        <div class="flex flex-wrap gap-1.5">${chip('Tests', { count: 5, state: 'on' })}${chip('Docs', { count: 1 })}${chip('Migrations', { count: 2 })}${chip('Translations', { count: 6 })}${chip('Config', { count: 1 })}${chip('CI / Docker', { count: 1 })}${chip('AI', { count: 2 })}</div>
        ${label('Recurring folders', 'mt-0.5')}
        <div class="flex flex-col gap-1 text-xs">${[
          ['Billing', 16, 'w-full'],
          ['billing', 7, 'w-[44%]'],
        ]
          .map(
            ([name, count, width]) =>
              `<button type="button" data-press aria-pressed="false" class="group/bar relative flex cursor-pointer justify-between overflow-hidden rounded px-2 py-1.5 text-start"><span class="absolute inset-y-0 start-0 ${width} bg-ink/8 transition-colors group-hover/bar:bg-ink/12 group-aria-pressed/bar:bg-ink/20"></span><span class="relative group-aria-pressed/bar:font-medium">${name}</span><span class="relative text-muted">${count}</span></button>`,
          )
          .join('')}</div>`,
      ),

    comments: () => {
      const comment = (initials, avatar, name, when, text, reply = false) =>
        `<span class="flex gap-2 ${reply ? 'ms-2.5 border-s-2 border-line ps-2.5' : ''}"><span class="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${avatar}">${initials}</span><span><strong class="font-semibold">${name}</strong> <span class="text-muted">${when}</span><br />${text}</span></span>`
      return panel(
        'max-w-[310px] overflow-hidden',
        `${code(33, '+', '&#39;currency&#39; =&gt; $account-&gt;currency,', 'add')}
        <div class="flex flex-col gap-2.5 border-y border-line px-3 py-2.5 text-xs leading-[1.45]">
          <button type="button" data-collapse aria-expanded="true" class="group/c flex cursor-pointer items-center gap-1.5 text-start text-muted hover:text-ink">${icon('message-square', 'size-3')}Line 33 · 2 comments on GitHub${icon('chevron-down', 'size-3 transition-transform group-aria-expanded/c:rotate-180')}</button>
          <div data-collapsible class="flex flex-col gap-2.5">
          ${comment('TA', 'bg-accent/15 text-accent', 'taylor', 'yesterday', 'Should the currency come from the plan instead of the account?')}
          ${comment('HS', 'bg-ink/8 text-ink', 'haythamasalama', '20 hours ago', 'Plans don’t have a currency yet, so the account is the source for now.', true)}
          </div>
        </div>
        ${code(34, '+', ']);', 'add')}`,
      )
    },

    views: () => {
      const head = `<span class="text-code-keyword">public function</span> ${fn('handle')}(Account $account)`
      const left = [
        code(18, '', head),
        code(19, '', '{'),
        code(20, '−', `$lines = $account-&gt;subscriptions-&gt;${fn('map')}(fn ($sub) =&gt;`, 'del'),
        code('', '', '', 'gap'),
        code('', '', '', 'gap'),
        code(21, '', ''),
      ]
      const right = [
        code(18, '', head),
        code(19, '', '{'),
        code(20, '+', '$lines = $account-&gt;subscriptions', 'add'),
        code(
          21,
          '+',
          `&nbsp;&nbsp;&nbsp;&nbsp;-&gt;${fn('map')}(fn (Subscription $sub) =&gt; InvoiceLine::${fn('forSubscription')}($sub))`,
          'add',
        ),
        code(22, '+', `&nbsp;&nbsp;&nbsp;&nbsp;-&gt;${fn('merge')}($this-&gt;usage-&gt;${fn('linesFor')}($account));`, 'add'),
        code(23, '', ''),
      ]
      const unified = [
        code(18, '', head),
        code(19, '', '{'),
        code(20, '−', `$lines = $account-&gt;subscriptions-&gt;${fn('map')}(fn ($sub) =&gt;`, 'del'),
        right[2],
        right[3],
        right[4],
        code(23, '', ''),
      ]
      const viewButton = (view, name, ic, on) =>
        `<button type="button" data-press data-view="${view}" aria-pressed="${on}" class="inline-flex cursor-pointer items-center gap-1 px-2 py-[3px] text-muted transition-colors hover:text-ink aria-pressed:bg-ink aria-pressed:text-paper">${ic}${name}</button>`
      return panel(
        'max-w-[640px] overflow-hidden',
        `<div data-views>
        <div class="flex items-center gap-2 border-b border-line px-2.5 py-2 text-xs">${icon('square-dot', 'size-[13px] shrink-0 text-modified')}<span class="min-w-0 truncate font-mono">src/Domain/Billing/Actions/GenerateInvoice.php</span><span class="ms-auto font-medium text-add">+14</span><span class="font-medium text-del">−3</span><span data-single class="inline-flex shrink-0 overflow-hidden rounded-md border border-line">${viewButton('unified', 'Unified', '', false)}${viewButton('split', 'Split this file', icon('columns-2', 'size-3'), true)}</span></div>
        <div data-pane="split" class="grid grid-cols-2"><div class="min-w-0 border-e border-line">${left.join('')}</div><div class="min-w-0">${right.join('')}</div></div>
        <div data-pane="unified" hidden>${unified.join('')}</div>
        </div>`,
      )
    },

    theme: () => {
      // The same swatches as Settings > Appearance: each theme's surface, a muted block and its primary colour.
      const THEMES = [
        ['GitHub', 'rounded-md', 'rounded-sm', 'bg-[#0969da]', true],
        ['PR Sift', 'rounded', 'rounded-[2px]', 'bg-ink'],
        ['Minimal', 'rounded-[10px]', 'rounded-sm', 'bg-ink'],
        ['Soft', 'rounded-2xl', 'rounded-[5px]', 'bg-ink'],
        ['Mono', 'rounded-none', 'rounded-none', 'bg-ink'],
      ]
      const swatch = ([name, outer, inner, primary, selected]) =>
        `<button type="button" data-swatch aria-pressed="${selected ? 'true' : 'false'}" class="group flex cursor-pointer flex-col items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-ink aria-pressed:text-ink"><span class="flex h-[30px] w-11 items-center justify-center gap-1 border border-line bg-paper ring-offset-2 ring-offset-paper transition-shadow group-hover:border-muted group-aria-pressed:ring-2 group-aria-pressed:ring-ink ${outer}"><span class="h-2 w-3 border border-line bg-raised ${inner}"></span><span class="h-2 w-4 ${primary} ${inner}"></span></span>${name}</button>`
      const modes = [
        ['system', 'System'],
        ['light', 'Light'],
        ['dark', 'Dark'],
      ]
        .map(
          ([mode, name]) =>
            `<button type="button" data-theme-mode="${mode}" aria-pressed="false" class="flex-1 cursor-pointer rounded-[5px] py-1 text-center text-muted transition-colors hover:text-ink">${name}</button>`,
        )
        .join('')
      return panel(
        'flex max-w-[330px] flex-col gap-2.5 px-3.5 pt-3 pb-3.5 text-[12.5px]',
        `${label('Mode')}<div role="group" aria-label="Mode" class="flex rounded-md bg-raised p-[3px] text-xs">${modes}</div>
        ${label('Theme', 'mt-1')}<div data-swatches role="group" aria-label="Theme" class="flex justify-between">${THEMES.map(swatch).join('')}</div>`,
      )
    },

    notes: () =>
      panel(
        'max-w-[400px] overflow-hidden',
        `${code(20, '+', `$lines = $account->${fn('subscriptions')}`, 'add')}${code(21, '+', `->${fn('merge')}($usage)`, 'add')}
        <div data-note class="group/note flex items-start gap-2 border-y border-line bg-raised px-3 py-2 text-[12px]" data-state="open">
          <span class="flex min-w-0 flex-1 flex-col gap-1 transition-opacity group-data-[state=resolved]/note:opacity-50"><span class="flex items-center gap-1.5 text-muted">${icon('lock', 'size-3')}Lines 20–21 · only you</span><span class="group-data-[state=resolved]/note:line-through">Check that plan discounts still apply to both.</span></span>
          <button type="button" data-resolve class="inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-md border border-line bg-paper px-2 text-[11px] text-muted transition-colors hover:text-ink">${icon('circle-check', 'size-3')}<span class="group-data-[state=resolved]/note:hidden">Resolve</span><span class="hidden group-data-[state=resolved]/note:inline">Reopen</span></button>
        </div>
        ${code(22, '', '')}`,
      ),

    merge: () => {
      const person = (name, checked, ai = false) =>
        `<button type="button" data-press aria-pressed="${checked}" class="group/row flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-start text-muted line-through hover:bg-raised aria-pressed:text-ink aria-pressed:no-underline">${box()}<span class="truncate font-mono text-[11px]">Co-authored-by: ${name}</span>${ai ? '<span class="ms-auto rounded border border-line px-1 text-[10px]">AI</span>' : ''}</button>`
      return panel(
        'max-w-[440px] overflow-hidden text-[12.5px]',
        `<div class="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
          <span class="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-raised px-2.5 text-muted">Squash and merge${icon('chevron-down', 'size-3')}</span>
          <button type="button" data-merge class="group/m inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-ink bg-ink px-2.5 font-medium text-paper transition-opacity hover:opacity-90"><span class="contents group-data-[done]/m:hidden">${icon('git-merge', 'size-3.5')}Merge without AI</span><span class="hidden items-center gap-1.5 group-data-[done]/m:inline-flex">${icon('check', 'size-3.5')}Merged, no AI co-authors</span></button>
        </div>
        <div class="flex flex-col py-1">${person('Taylor', true)}${person('Claude', false, true)}${person('Copilot', false, true)}</div>`,
      )
    },

    settings: () =>
      panel(
        'max-w-[290px] overflow-hidden text-[12.5px]',
        `<div class="flex items-center border-b border-line px-3 py-2.5 text-[13px] font-semibold">Settings${icon('x', 'ms-auto size-3.5 text-muted')}</div>
        ${['Open PR Sift automatically', 'Leave out AI co-authors'].map((name) => `<label class="flex cursor-pointer items-center gap-2.5 border-b border-line/60 px-3 py-2.5">${name}<span class="ms-auto">${toggle(true)}</span></label>`).join('')}
        <span class="flex flex-col gap-1.5 px-3 py-2.5">Always hidden<span class="flex flex-wrap gap-1">${chip('package-lock.json', { mono: true })}${chip('*.snap', { mono: true })}</span></span>`,
      ),
  }

  return visuals[id]()
}
