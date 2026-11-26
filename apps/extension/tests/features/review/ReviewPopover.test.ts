import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ReviewPopover from '../../../src/features/review/ReviewPopover.vue'
import { portalTargetKey } from '../../../src/lib/portal'
import { PR } from '@pr-sift/core/testing'
import { installChrome } from '../../helpers/chrome'

enableAutoUnmount(afterEach)

function mountPopover(
  props: { canAct?: boolean; mine?: 'approved' | 'changes_requested' | null; blocked?: string; changesBlocked?: string } = {},
) {
  const target = document.createElement('div')
  document.body.appendChild(target)
  return mount(ReviewPopover, {
    props: { pr: PR, headSha: 'abc', canAct: true, mine: null, ...props },
    global: { provide: { [portalTargetKey as symbol]: shallowRef(target) } },
    attachTo: document.body,
  })
}

const buttons = (text: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('[data-slot="popover-content"] button')].filter((b) => b.textContent?.trim() === text)

async function openPopover(wrapper: ReturnType<typeof mountPopover>) {
  await wrapper.get('[aria-label="Approve with a comment, request changes or comment"]').trigger('click')
  await vi.waitFor(() => expect(document.querySelector('[aria-label="Comment"]')).not.toBeNull())
}

async function type(text: string) {
  const area = document.querySelector<HTMLTextAreaElement>('[aria-label="Comment"]')!
  area.value = text
  area.dispatchEvent(new Event('input'))
  await flushPromises()
}

describe('ReviewPopover', () => {
  it('approves the reviewed commit, with an optional comment', async () => {
    const { sent } = installChrome(() => ({ ok: true, status: 200, data: {} }))
    const wrapper = mountPopover()
    await openPopover(wrapper)
    await type('Looks good')

    buttons('Approve').at(-1)!.click()
    await vi.waitFor(() => expect(wrapper.emitted('reviewed')).toEqual([['APPROVE']]))
    expect(sent[0]).toMatchObject({
      path: '/repos/o/r/pulls/7/reviews',
      method: 'POST',
      body: { event: 'APPROVE', commit_id: 'abc', body: 'Looks good' },
    })
  })

  it('approves in one click from the main button, without a comment', async () => {
    const { sent } = installChrome(() => ({ ok: true, status: 200, data: {} }))
    const wrapper = mountPopover()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Approve')!
      .trigger('click')
    await vi.waitFor(() => expect(wrapper.emitted('reviewed')).toEqual([['APPROVE']]))
    expect(sent[0]).toMatchObject({ method: 'POST', body: { event: 'APPROVE', commit_id: 'abc' } })
    expect(sent[0]!.body).not.toHaveProperty('body')
  })

  it('asks for a comment before requesting changes', async () => {
    const { sent } = installChrome(() => ({ ok: true, status: 200, data: {} }))
    const wrapper = mountPopover()
    await openPopover(wrapper)
    document.querySelector<HTMLElement>('#review-REQUEST_CHANGES')!.click()
    await flushPromises()

    const submit = () => buttons('Request changes').at(-1)!
    expect(submit().hasAttribute('disabled')).toBe(true)
    await type('Rename this')
    submit().click()
    await vi.waitFor(() => expect(wrapper.emitted('reviewed')).toEqual([['REQUEST_CHANGES']]))
    expect(sent[0]?.body).toMatchObject({ event: 'REQUEST_CHANGES', body: 'Rename this' })
  })

  it("shows GitHub's reason when the review is refused", async () => {
    installChrome(() => ({ ok: false, status: 422, data: { message: 'Can not approve your own pull request' } }))
    const wrapper = mountPopover()
    await openPopover(wrapper)
    buttons('Approve').at(-1)!.click()
    await vi.waitFor(() => expect(document.body.textContent).toContain('Can not approve your own pull request'))
    expect(wrapper.emitted('reviewed')).toBeUndefined()
  })

  it('lets the author comment on their own pull request, with Approve and Request changes off', async () => {
    const { sent } = installChrome(() => ({ ok: true, status: 200, data: {} }))
    const wrapper = mountPopover({
      blocked: "You can't approve your own pull request",
      changesBlocked: "You can't request changes on your own pull request",
    })
    expect(
      wrapper
        .findAll('button')
        .find((b) => b.text() === 'Approve')!
        .attributes('disabled'),
    ).toBeDefined()
    await wrapper.get('[aria-label="Comment on this pull request"]').trigger('click')
    await vi.waitFor(() => expect(document.querySelector('[aria-label="Comment"]')).not.toBeNull())
    expect(document.querySelector('#review-APPROVE')!.hasAttribute('disabled')).toBe(true)
    expect(document.querySelector('#review-REQUEST_CHANGES')!.hasAttribute('disabled')).toBe(true)
    expect(document.querySelector('#review-COMMENT')!.getAttribute('data-state')).toBe('checked')
    await type('Note for reviewers')
    buttons('Comment').at(-1)!.click()
    await vi.waitFor(() => expect(wrapper.emitted('reviewed')).toEqual([['COMMENT']]))
    expect(sent[0]).toMatchObject({ body: { event: 'COMMENT', body: 'Note for reviewers' } })
  })

  it('says when you already approved', () => {
    installChrome()
    expect(mountPopover({ mine: 'approved' }).text()).toContain('Approved')
  })
})
