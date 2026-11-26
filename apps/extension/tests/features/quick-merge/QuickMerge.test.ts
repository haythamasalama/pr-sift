import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PR } from '@pr-sift/core/testing'
import QuickMerge from '../../../src/features/quick-merge/QuickMerge.vue'
import { findMergeButton } from '../../../src/features/quick-merge/mergeBox'
import { portalTargetKey } from '../../../src/lib/portal'
import { installChrome } from '../../helpers/chrome'

enableAutoUnmount(afterEach)

const COMMITS = [
  {
    commit: { message: 'feat: invoices\n\nCo-Authored-By: Claude <noreply@anthropic.com>', author: { name: 'Haytham', email: 'h@x.dev' } },
    author: { login: 'haytham' },
  },
  { commit: { message: 'fix: totals', author: { name: 'Sam', email: 'sam@x.dev' } }, author: { login: 'sam' } },
]

function github(mergeableState = 'clean', withToken = true) {
  const chrome = installChrome((message) => {
    const path = String(message.path)
    if (message.method === 'PUT') return { ok: true, status: 200, data: { sha: 'def4567890' } }
    if (path.endsWith('/pulls/7'))
      return {
        ok: true,
        status: 200,
        data: {
          title: 'Ship invoices',
          body: '',
          commits: 2,
          mergeable_state: mergeableState,
          user: { login: 'haytham' },
          head: { sha: 'abc', label: 'haytham:feat/x' },
        },
      }
    if (path === '/repos/o/r') return { ok: true, status: 200, data: {} }
    if (path.includes('/commits')) return { ok: true, status: 200, data: COMMITS }
    return { ok: false, status: 404, data: {} }
  })
  if (withToken) chrome.store.token = 'ghp_test'
  return chrome
}

function mergeBox(label = 'Squash and merge', disabled = false) {
  const box = document.createElement('div')
  box.className = 'merge-box'
  box.innerHTML = `<div class="group"><button ${disabled ? 'disabled' : ''}><span>${label}</span></button><button aria-haspopup="true">▾</button></div>`
  document.body.appendChild(box)
  return box
}

let portal: HTMLElement

function mountQuickMerge() {
  portal = document.createElement('div')
  document.body.appendChild(portal)
  return mount(QuickMerge, {
    props: { pr: PR, dark: false },
    global: { provide: { [portalTargetKey as symbol]: shallowRef(portal) } },
    attachTo: document.body,
  })
}

const host = () => document.querySelector<HTMLElement>('[data-pr-sift="quick-merge"]')
const ourButton = () => host()?.shadowRoot?.querySelector('button') ?? null
const button = (text: string) => [...portal.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!

beforeEach(() => {
  document.body.innerHTML = ''
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList)
})

afterEach(() => vi.restoreAllMocks())

describe('findMergeButton', () => {
  it("anchors after GitHub's button group and ignores the method menu", () => {
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    menu.innerHTML = '<button>Squash and merge</button>'
    document.body.appendChild(menu)
    const box = mergeBox()

    const match = findMergeButton()!
    expect(match.button.closest('.merge-box')).toBe(box)
    expect(match.anchor).toBe(box.querySelector('.group'))
    expect(match.disabled).toBe(false)
  })

  it("goes up to GitHub's flex row so it sits beside the button, not under it", () => {
    const row = document.createElement('div')
    row.style.display = 'flex'
    row.innerHTML =
      '<div class="column"><div class="group"><button>Squash and merge</button><button aria-haspopup="true">▾</button></div></div><p>You can also merge this with the command line.</p>'
    document.body.appendChild(row)

    expect(findMergeButton()!.anchor).toBe(row.querySelector('.column'))
  })

  it('reports a disabled merge button and skips other labels', () => {
    mergeBox('Merge pull request', true)
    expect(findMergeButton()!.disabled).toBe(true)
    document.body.innerHTML = ''
    mergeBox('Merge when ready')
    expect(findMergeButton()).toBeNull()
  })
})

describe('QuickMerge', () => {
  it("shows next to GitHub's merge button and merges without AI co-authors", async () => {
    const { sent } = github()
    const box = mergeBox()
    const wrapper = mountQuickMerge()

    await vi.waitFor(() => expect(ourButton()?.textContent).toContain('Merge without AI'))
    expect(box.querySelector('.group')!.nextSibling).toBe(host())

    ourButton()!.click()
    await vi.waitFor(() => expect(document.body.textContent).toContain('Ship invoices (#7)'))
    expect(document.body.textContent).toContain('Co-authored-by: Sam <sam@x.dev>')
    expect(document.body.textContent).toContain('Left out')
    expect(document.body.textContent).toContain('Claude <noreply@anthropic.com>')

    await vi.waitFor(() => expect(button('Squash and merge').hasAttribute('disabled')).toBe(false))
    button('Squash and merge').click()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Merged as def4567'))

    expect(sent.find((m) => m.method === 'PUT')!.body).toEqual({
      merge_method: 'squash',
      sha: 'abc',
      commit_title: 'Ship invoices (#7)',
      commit_message: '* feat: invoices\n\n* fix: totals\n\nCo-authored-by: Sam <sam@x.dev>',
    })
  })

  it('stays hidden without a GitHub token', async () => {
    github('clean', false)
    mergeBox()
    mountQuickMerge()
    await flushPromises()
    expect(ourButton()).toBeNull()
  })

  it("stays in place but disabled, with the reason, when GitHub's button is disabled or the branch has conflicts", async () => {
    github('dirty')
    mergeBox()
    mountQuickMerge()
    await vi.waitFor(() => expect(ourButton()).not.toBeNull())
    await flushPromises()
    expect(ourButton()!.disabled).toBe(true)
    expect(ourButton()!.parentElement!.title).toBe('Can’t merge yet: Has merge conflicts')

    document.body.innerHTML = ''
    github()
    mergeBox('Squash and merge', true)
    mountQuickMerge()
    await vi.waitFor(() => expect(ourButton()).not.toBeNull())
    await flushPromises()
    expect(ourButton()!.disabled).toBe(true)
  })

  it('moves back next to the merge button when GitHub re-renders the merge box', async () => {
    github()
    const first = mergeBox()
    mountQuickMerge()
    await vi.waitFor(() => expect(ourButton()).not.toBeNull())

    first.remove()
    const second = mergeBox()
    await vi.waitFor(() => expect(second.querySelector('.group')!.nextSibling).toBe(host()))
    await vi.waitFor(() => expect(ourButton()?.textContent).toContain('Merge without AI'))
  })

  it('shows why GitHub refused the merge', async () => {
    const { chrome } = github()
    mergeBox()
    mountQuickMerge()
    await vi.waitFor(() => expect(ourButton()).not.toBeNull())
    const respond = chrome.runtime.sendMessage.getMockImplementation()!
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if ((message as { method?: string }).method === 'PUT')
        return callback?.({ ok: false, status: 405, data: { message: 'Required status check is expected' } })
      return respond(message, callback)
    })

    ourButton()!.click()
    await vi.waitFor(() => expect(button('Squash and merge').hasAttribute('disabled')).toBe(false))
    button('Squash and merge').click()
    await vi.waitFor(() => expect(document.body.textContent).toContain('Required status check is expected'))
  })
})
