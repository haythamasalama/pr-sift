import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ApproveDialog from '../../../src/features/review/ApproveDialog.vue'
import { portalTargetKey } from '../../../src/lib/portal'
import { PR } from '@pr-sift/core/testing'
import { installChrome } from '../../helpers/chrome'

enableAutoUnmount(afterEach)

function mountDialog() {
  const target = document.createElement('div')
  document.body.appendChild(target)
  return mount(ApproveDialog, {
    props: { pr: PR, title: 'Ship invoices', headSha: 'abc', canAct: true },
    global: { provide: { [portalTargetKey as symbol]: shallowRef(target) } },
    attachTo: document.body,
  })
}

const approveButton = () => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Approve')!

describe('ApproveDialog', () => {
  it('approves the reviewed commit with an optional comment', async () => {
    const { sent } = installChrome(() => ({ ok: true, status: 200, data: {} }))
    const wrapper = mountDialog()
    await vi.waitFor(() => expect(document.querySelector('#approve-comment')).not.toBeNull())
    const area = document.querySelector<HTMLTextAreaElement>('#approve-comment')!
    area.value = 'Looks good'
    area.dispatchEvent(new Event('input'))
    await flushPromises()

    approveButton().click()
    await vi.waitFor(() => expect(wrapper.emitted('approved')).toBeTruthy())
    expect(sent[0]).toMatchObject({
      path: '/repos/o/r/pulls/7/reviews',
      method: 'POST',
      body: { event: 'APPROVE', commit_id: 'abc', body: 'Looks good' },
    })
  })

  it("shows GitHub's reason when the approval is refused", async () => {
    installChrome(() => ({ ok: false, status: 422, data: { message: 'Can not approve your own pull request' } }))
    const wrapper = mountDialog()
    await vi.waitFor(() => expect(document.querySelector('#approve-comment')).not.toBeNull())

    approveButton().click()
    await vi.waitFor(() => expect(document.body.textContent).toContain('Can not approve your own pull request'))
    expect(wrapper.emitted('approved')).toBeUndefined()
  })
})
