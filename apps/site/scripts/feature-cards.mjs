// Drawn in HTML rather than cropped from screenshots, so they stay sharp at any width and follow the theme.

const panel = (cls, inner) =>
  `<div class="w-full rounded-lg border border-line bg-paper shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_-12px_rgb(0_0_0/0.18)] ${cls}">${inner}</div>`

const label = (text, cls = '') => `<span class="text-[10.5px] font-medium tracking-[0.08em] text-muted uppercase ${cls}">${text}</span>`

const CHIP = {
  plain: 'border-line bg-paper',
  on: 'border-ink bg-ink text-paper',
  off: 'border-dashed border-line bg-paper text-muted line-through',
  ghost: 'border-dashed border-line bg-paper text-muted',
}

const chip = (text, { count, state = 'plain', mono = false, lead = '', cls = '' } = {}) =>
  `<span class="inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs whitespace-nowrap ${CHIP[state]} ${mono ? 'font-mono' : ''} ${cls}">${lead}${text}${count === undefined ? '' : `<span class="${state === 'on' ? 'text-paper/70' : 'text-muted'}">${count}</span>`}</span>`

const box = (checked = false) =>
  `<span class="size-[13px] shrink-0 rounded-[3px] border ${checked ? 'border-ink bg-ink' : 'border-muted/60 bg-paper'}"></span>`

const toggle =
  '<span class="relative inline-block h-4 w-7 shrink-0 rounded-full bg-ink after:absolute after:top-0.5 after:right-0.5 after:size-3 after:rounded-full after:bg-paper"></span>'

const ring = (size) =>
  `<svg viewBox="0 0 36 36" class="${size} shrink-0 -rotate-90"><circle cx="18" cy="18" r="14" fill="none" stroke-width="4" class="stroke-line"/><circle cx="18" cy="18" r="14" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="11.3 88" class="stroke-accent"/></svg>`

const code = (num, sign, text, tone = '') => {
  const bg = { add: 'bg-add-bg', del: 'bg-del-bg', gap: 'bg-raised' }[tone] ?? ''
  const signColor = { add: 'text-add', del: 'text-del' }[tone] ?? 'text-muted'
  return `<div class="flex h-[21px] items-center gap-2.5 overflow-hidden px-2.5 font-mono text-[11.5px] whitespace-nowrap ${bg}"><span class="w-[18px] shrink-0 text-right text-muted">${num}</span><span class="w-2 shrink-0 ${signColor}">${sign}</span><span class="truncate">${text}</span></div>`
}

const fn = (name) => `<span class="text-code-fn">${name}</span>`

function treeRow(icon, { depth, open, name, count, cls = '', actions = '' }) {
  return `<div class="flex h-[26px] items-center gap-1.5 rounded-md pe-1.5 ${cls}" style="padding-inline-start:${4 + depth * 16}px">${icon(open ? 'chevron-down' : 'chevron-right', 'size-[13px] shrink-0 text-muted')}${box()}${icon('folder', 'size-3.5 shrink-0 text-muted')}${name}<span class="ms-auto text-xs text-muted">${count}</span>${actions}</div>`
}

export function featureVisual(id, icon) {
  const subtree = (cls) =>
    `${icon('chevrons-up-down', `size-[13px] shrink-0 ${cls}`)}${icon('chevrons-down-up', `size-[13px] shrink-0 ${cls}`)}`
  const hint = (ic, strong, rest) =>
    `<span class="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-[13px] whitespace-nowrap text-muted">${icon(ic, 'size-3.5 text-ink')}<strong class="font-medium text-ink">${strong}</strong> ${rest}</span>`

  const visuals = {
    filters: () => `<div class="flex w-full max-w-[600px] flex-col gap-3.5">
      ${panel(
        'flex flex-col gap-2.5 px-4 py-3.5',
        `<div class="flex flex-wrap items-center gap-1.5">${label('Types', 'me-1')}${chip('.php', { count: 28, state: 'on', mono: true })}${chip('.vue', { count: 5, mono: true })}${chip('.ts', { count: 4, mono: true })}${chip('.lock', { count: 1, state: 'off', mono: true, lead: icon('eye-off', 'size-3') })}${chip('+ type', { state: 'ghost' })}</div>
        <div class="flex flex-wrap items-center gap-1.5">${label('Changes', 'me-1')}${chip('added', { count: 23, lead: icon('square-plus', 'size-[13px] text-add') })}${chip('modified', { count: 16, lead: icon('square-dot', 'size-[13px] text-modified') })}${chip('deleted', { count: 1, lead: icon('square-minus', 'size-[13px] text-del') })}</div>`,
      )}
      <div class="flex flex-wrap gap-2">${hint('mouse-pointer-click', 'Click', 'shows only .php')}${hint('eye-off', 'Shift-click', 'hides .lock everywhere')}</div>
    </div>`,

    review: () =>
      panel(
        'max-w-[300px] overflow-hidden',
        `<div class="flex items-center gap-2.5 border-b border-line px-3.5 py-3">${ring('size-8')}<span class="flex flex-col"><span class="text-sm font-semibold">34 left</span><span class="text-xs text-muted">5 of 39 done</span></span><span class="ms-auto inline-flex items-center gap-1.5 text-xs">${toggle}Hide viewed</span></div>
        <div class="px-2 pt-1.5 pb-2 text-[13px]">
          ${['usage.php', 'billing.php'].map((name) => `<div class="flex h-[26px] items-center gap-1.5 rounded-md ps-1.5 pe-1.5 opacity-45">${box(true)}<span class="line-through">${name}</span><span class="ms-auto text-xs text-muted">Viewed</span></div>`).join('')}
          <div class="flex h-[26px] items-center gap-1.5 rounded-md ps-1.5">${box()}GenerateInvoice.php</div>
          <div class="mx-1.5 mt-1 flex items-center gap-1.5 rounded-md bg-attention-bg px-2 py-1.5 text-xs text-attention">${icon('git-compare', 'size-[13px] shrink-0')}New push: InvoiceStatus.php is back</div>
        </div>`,
      ),

    folders: () =>
      panel(
        'max-w-[290px] p-1.5 text-[13px]',
        `<div class="flex h-[26px] items-center gap-1.5 rounded-md bg-ink/6 ps-2 pe-1.5 font-medium">${icon('layers', 'size-3.5 shrink-0')}All folders<span class="ms-auto text-xs font-normal text-muted">33</span>${subtree('text-muted')}</div>
        ${treeRow(icon, { depth: 0, open: true, name: 'src', count: 14, cls: 'mt-0.5 bg-raised ring-1 ring-line ring-inset', actions: subtree('text-ink') })}
        ${treeRow(icon, { depth: 1, open: true, name: 'Domain', count: 9 })}
        ${treeRow(icon, { depth: 2, open: true, name: 'Billing', count: 9 })}
        ${treeRow(icon, { depth: 3, open: false, name: 'Actions', count: 1 })}
        ${treeRow(icon, { depth: 3, open: false, name: 'Enums', count: 1 })}
        ${treeRow(icon, { depth: 1, open: false, name: 'Presentation', count: 5 })}
        ${treeRow(icon, { depth: 0, open: false, name: 'tests', count: 4 })}`,
      ),

    smart: () =>
      panel(
        'flex max-w-[290px] flex-col gap-2.5 px-3 pt-2.5 pb-3',
        `<div class="grid grid-cols-2 rounded-md bg-raised p-[3px] text-xs"><span class="flex h-6 items-center justify-center text-muted">Tree</span><span class="flex h-6 items-center justify-center rounded bg-paper font-medium shadow-[0_1px_2px_rgb(0_0_0/0.12)]">Smart filters</span></div>
        ${label('Quick')}
        <div class="flex flex-wrap gap-1.5">${chip('Tests', { count: 5, state: 'on' })}${chip('Docs', { count: 1 })}${chip('Migrations', { count: 2 })}${chip('Translations', { count: 6 })}${chip('Config', { count: 1 })}${chip('CI / Docker', { count: 1 })}</div>
        ${label('Recurring folders', 'mt-0.5')}
        <div class="flex flex-col gap-1 text-xs">${[
          ['Billing', 16, 'w-full'],
          ['billing', 7, 'w-[44%]'],
        ]
          .map(
            ([name, count, width]) =>
              `<span class="relative flex justify-between overflow-hidden rounded px-2 py-1.5"><span class="absolute inset-y-0 start-0 ${width} bg-ink/8"></span><span class="relative">${name}</span><span class="relative text-muted">${count}</span></span>`,
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
          <span class="flex items-center gap-1.5 text-muted">${icon('message-square', 'size-3')}Line 33 · 2 comments on GitHub</span>
          ${comment('TA', 'bg-accent/15 text-accent', 'taylor', 'yesterday', 'Should the currency come from the plan instead of the account?')}
          ${comment('HS', 'bg-ink/8 text-ink', 'haythamasalama', '20 hours ago', 'Plans don’t have a currency yet, so the account is the source for now.', true)}
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
      return panel(
        'max-w-[640px] overflow-hidden',
        `<div class="flex items-center gap-2 border-b border-line px-2.5 py-2 text-xs">${icon('square-dot', 'size-[13px] shrink-0 text-modified')}<span class="min-w-0 truncate font-mono">src/Domain/Billing/Actions/GenerateInvoice.php</span><span class="ms-auto font-medium text-add">+14</span><span class="font-medium text-del">−3</span><span class="inline-flex shrink-0 overflow-hidden rounded-md border border-line"><span class="px-2 py-[3px] text-muted">Unified</span><span class="inline-flex items-center gap-1 bg-ink px-2 py-[3px] text-paper">${icon('columns-2', 'size-3')}Split this file</span></span></div>
        <div class="grid grid-cols-2"><div class="min-w-0 border-e border-line">${left.join('')}</div><div class="min-w-0">${right.join('')}</div></div>`,
      )
    },

    theme: () => {
      // Each tile is a tiny diff drawn in that theme's own corners and type, so the difference shows without colour.
      const lines = [
        ['', 'w-3/5'],
        ['bg-del-bg text-del', 'w-1/2'],
        ['bg-add-bg text-add', 'w-4/5'],
        ['bg-add-bg text-add', 'w-2/5'],
      ]
        .map(
          ([tone, width]) =>
            `<span class="flex h-2.5 items-center px-1.5 ${tone}"><span class="h-[3px] rounded-full bg-current opacity-60 ${width}"></span></span>`,
        )
        .join('')
      const tile = (name, { radius, font, selected = false, dark = false }) =>
        `<span class="flex flex-col gap-2"><span class="${dark ? 'dark' : 'light'} relative flex h-16 flex-col justify-center overflow-hidden border border-line bg-paper text-muted ${radius} ${selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-raised' : ''}">${lines}</span><span class="text-center text-xs ${font} ${selected ? 'font-medium' : 'text-muted'}">${name}</span></span>`
      const modes = ['Light', 'Dark', 'System']
        .map(
          (m) =>
            `<span class="flex-1 rounded-[5px] py-1 text-center ${m === 'System' ? 'bg-paper font-medium shadow-sm' : 'text-muted'}">${m}</span>`,
        )
        .join('')
      return `<div class="flex w-full max-w-[300px] flex-col gap-3">
        <div class="grid grid-cols-3 gap-3">${tile('GitHub', { radius: 'rounded-md', font: '', selected: true })}${tile('PR Sift', { radius: 'rounded', font: '', dark: true })}${tile('Mono', { radius: 'rounded-none', font: 'font-mono' })}</div>
        <div class="flex rounded-md border border-line bg-raised p-0.5 text-[11.5px]">${modes}</div>
      </div>`
    },

    settings: () =>
      panel(
        'max-w-[290px] overflow-hidden text-[12.5px]',
        `<div class="flex items-center border-b border-line px-3 py-2.5 text-[13px] font-semibold">Settings${icon('x', 'ms-auto size-3.5 text-muted')}</div>
        ${['Open PR Sift automatically', 'Leave out AI co-authors'].map((name) => `<span class="flex items-center gap-2.5 border-b border-line/60 px-3 py-2.5">${name}<span class="ms-auto">${toggle}</span></span>`).join('')}
        <span class="flex flex-col gap-1.5 px-3 py-2.5">Always hidden<span class="flex flex-wrap gap-1">${chip('package-lock.json', { mono: true })}${chip('*.snap', { mono: true })}</span></span>`,
      ),
  }

  return visuals[id]()
}
