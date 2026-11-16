import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MergeSheet from '../../../src/features/review/MergeSheet.vue'
import { portalTargetKey } from '../../../src/lib/portal'
import { PR } from '@pr-sift/core/testing'
import { installChrome } from '../../helpers/chrome'
import { explain } from '../../../src/features/review/actions'
import { GhError } from '../../../src/features/review/github'

enableAutoUnmount(afterEach)

const COMMITS = [
  {
    commit: { message: 'feat: invoices\n\nCo-Authored-By: Claude <noreply@anthropic.com>', author: { name: 'Haytham', email: 'h@x.dev' } },
    author: { login: 'haytham' },
  },
  { commit: { message: 'fix: totals', author: { name: 'Sam', email: 'sam@x.dev' } }, author: { login: 'sam' } },
]

function github() {
  const chrome = installChrome((message) => {
    const path = String(message.path)
    if (message.method === 'PUT') return { ok: true, status: 200, data: { sha: 'def4567890' } }
    if (path.endsWith('/pulls/7'))
      return {
        ok: true,
        status: 200,
        data: { title: 'Ship invoices', body: '', commits: 2, user: { login: 'haytham' }, head: { sha: 'abc', label: 'haytham:feat/x' } },
      }
    if (path === '/repos/o/r') return { ok: true, status: 200, data: { allow_rebase_merge: false } }
    if (path.includes('/commits')) return { ok: true, status: 200, data: COMMITS }
    return { ok: false, status: 404, data: {} }
  })
  chrome.store.token = 'ghp_test'
  return chrome
}

function mountDialog(canAct = true, method?: 'squash' | 'merge' | 'rebase') {
  const target = document.createElement('div')
  document.body.appendChild(target)
  return mount(MergeSheet, {
    props: { pr: PR, info: { title: 'Ship invoices', base: 'main', head: 'feat/x' }, canAct, method },
    global: { provide: { [portalTargetKey as symbol]: shallowRef(target) } },
    attachTo: document.body,
  })
}

const button = (text: string) => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!
const checked = (id: string) => document.querySelector(`#${id}`)?.getAttribute('aria-checked')

describe('MergeSheet', () => {
  it('opens on the method picked on the button and explains co-authors outside a squash', async () => {
    github()
    mountDialog(true, 'merge')
    await vi.waitFor(() => expect(document.body.textContent).toContain('Merge commit keeps every commit as it is'))
    expect(document.querySelector('[data-state="on"]')?.textContent?.trim()).toBe('Merge commit')
    expect(document.body.textContent).toContain('Claude <noreply@anthropic.com>')
    expect(document.querySelector('#co-author-0')).toBeNull()

    button('Squash instead').click()
    await vi.waitFor(() => expect(document.querySelector('#co-author-0')).not.toBeNull())
    expect(document.querySelector('[data-state="on"]')?.textContent?.trim()).toBe('Squash')
  })

  it('leaves AI co-authors out of a squash merge by default', async () => {
    const { sent, store } = github()
    const wrapper = mountDialog()
    await vi.waitFor(() => expect(document.querySelector('#co-author-1')).not.toBeNull())

    expect(document.body.textContent).toContain('Claude <noreply@anthropic.com>')
    expect(checked('co-author-0')).toBe('false')
    expect(checked('co-author-1')).toBe('true')
    expect(button('Rebase').hasAttribute('disabled')).toBe(true)

    button('Squash and merge').click()
    await vi.waitFor(() => expect(wrapper.emitted('merged')).toEqual([['def4567890']]))

    const put = sent.find((m) => m.method === 'PUT')!
    expect(put.path).toBe('/repos/o/r/pulls/7/merge')
    expect(put.body).toEqual({
      merge_method: 'squash',
      sha: 'abc',
      commit_title: 'Ship invoices (#7)',
      commit_message: '* feat: invoices\n\n* fix: totals\n\nCo-authored-by: Sam <sam@x.dev>',
    })
    expect((store.settings as { mergeMethod: string }).mergeMethod).toBe('squash')
  })

  it('remembers a co-author you uncheck for the next merge', async () => {
    const { sent, store } = github()
    const wrapper = mountDialog()
    await vi.waitFor(() => expect(document.querySelector('#co-author-1')).not.toBeNull())

    document.querySelector<HTMLElement>('#co-author-1')!.click()
    await flushPromises()
    button('Squash and merge').click()
    await vi.waitFor(() => expect(wrapper.emitted('merged')).toBeTruthy())

    expect((sent.find((m) => m.method === 'PUT')!.body as { commit_message: string }).commit_message).not.toContain('Co-authored-by')
    expect((store.settings as { removedCoAuthors: string[] }).removedCoAuthors).toContain('sam@x.dev')
  })

  it('keeps your list as it is when leaving out co-authors is off', async () => {
    const { store } = github()
    store.settings = { leaveOutCoAuthors: false, removedCoAuthors: ['bot@example.com'] }
    const wrapper = mountDialog()
    await vi.waitFor(() => expect(document.querySelector('#co-author-1')).not.toBeNull())
    expect(checked('co-author-0')).toBe('true')

    document.querySelector<HTMLElement>('#co-author-1')!.click()
    await flushPromises()
    button('Squash and merge').click()
    await vi.waitFor(() => expect(wrapper.emitted('merged')).toBeTruthy())

    expect((store.settings as { removedCoAuthors: string[] }).removedCoAuthors).toEqual(['bot@example.com'])
  })

  it('adds a co-author typed by hand', async () => {
    const { sent } = github()
    const wrapper = mountDialog()
    await vi.waitFor(() => expect(document.querySelector('#co-author-1')).not.toBeNull())

    const input = document.querySelector<HTMLInputElement>('[aria-label="Add a co-author"]')!
    input.value = 'Lee <lee@x.dev>'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    button('Add').click()
    await flushPromises()
    button('Squash and merge').click()
    await vi.waitFor(() => expect(wrapper.emitted('merged')).toBeTruthy())

    expect((sent.find((m) => m.method === 'PUT')!.body as { commit_message: string }).commit_message).toContain(
      'Co-authored-by: Sam <sam@x.dev>\nCo-authored-by: Lee <lee@x.dev>',
    )
  })

  it('keeps every co-author checked when leaving out AI co-authors is off', async () => {
    const { store } = github()
    store.settings = { leaveOutCoAuthors: false }
    mountDialog()
    await vi.waitFor(() => expect(document.querySelector('#co-author-1')).not.toBeNull())
    expect(checked('co-author-0')).toBe('true')
    expect(checked('co-author-1')).toBe('true')
  })

  it.each([
    [
      403,
      'Resource not accessible by personal access token',
      'Your token can’t merge here. Use a classic token with the repo scope, and check that you can merge in this repository. GitHub said: “Resource not accessible by personal access token.”',
    ],
    [404, 'Not Found', 'Your token can’t see this repository. Use a classic token with the repo scope, then try again.'],
    [
      403,
      'Resource protected by organization SAML enforcement. You must grant your Personal Access token access to this organization.',
      'This organization uses single sign-on. On GitHub, open your token, choose Configure SSO and authorize the organization, then try again.',
    ],
  ])('says why GitHub refused to load the merge (%i: %s)', (status, message, expected) => {
    expect(explain(new GhError(`${status}: ${message}`, status), 'merge')).toContain(expected)
  })

  it('explains that merging needs a token', async () => {
    installChrome()
    mountDialog(false)
    await vi.waitFor(() => expect(document.body.textContent).toContain('needs a classic GitHub token'))
    expect(button('Squash and merge').hasAttribute('disabled')).toBe(true)
  })

  it('loads the commits as soon as a token is saved, without a reload', async () => {
    github()
    const wrapper = mountDialog(false)
    await vi.waitFor(() => expect(document.body.textContent).toContain('needs a classic GitHub token'))
    await wrapper.setProps({ canAct: true })
    await vi.waitFor(() => expect(document.querySelector('#co-author-1')).not.toBeNull())
    expect(button('Squash and merge').hasAttribute('disabled')).toBe(false)
  })
})
