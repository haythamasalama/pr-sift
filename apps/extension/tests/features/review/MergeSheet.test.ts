import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MergeSheet from '../../../src/features/review/MergeSheet.vue'
import { portalTargetKey } from '../../../src/lib/portal'
import { PR } from '@pr-sift/core/testing'
import { installChrome } from '../../helpers/chrome'

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

function mountDialog(canAct = true) {
  const target = document.createElement('div')
  document.body.appendChild(target)
  return mount(MergeSheet, {
    props: { pr: PR, info: { title: 'Ship invoices', base: 'main', head: 'feat/x' }, canAct },
    global: { provide: { [portalTargetKey as symbol]: shallowRef(target) } },
    attachTo: document.body,
  })
}

const button = (text: string) => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!
const checked = (id: string) => document.querySelector(`#${id}`)?.getAttribute('aria-checked')

describe('MergeSheet', () => {
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

  it('explains that merging needs a token', async () => {
    installChrome()
    mountDialog(false)
    await vi.waitFor(() => expect(document.body.textContent).toContain('needs a GitHub token'))
    expect(button('Squash and merge').hasAttribute('disabled')).toBe(true)
  })

  it('loads the commits as soon as a token is saved, without a reload', async () => {
    github()
    const wrapper = mountDialog(false)
    await vi.waitFor(() => expect(document.body.textContent).toContain('needs a GitHub token'))
    await wrapper.setProps({ canAct: true })
    await vi.waitFor(() => expect(document.querySelector('#co-author-1')).not.toBeNull())
    expect(button('Squash and merge').hasAttribute('disabled')).toBe(false)
  })
})
