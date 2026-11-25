import { enableAutoUnmount, mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import ReviewActions from '../../../src/features/review/ReviewActions.vue'
import type { Conversation } from '../../../src/features/review/conversation'
import { portalTargetKey } from '../../../src/lib/portal'
import type { PrInfo } from '../../../src/lib/types'
import { PR } from '@pr-sift/core/testing'
import { installChrome } from '../../helpers/chrome'

enableAutoUnmount(afterEach)

const info: PrInfo = { title: 'Ship', author: 'sam', base: 'main', head: 'feat/ship', state: 'open' }

const conversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  conversation: 0,
  code: 0,
  byFile: new Map(),
  threads: new Map(),
  discussion: [],
  viewer: 'lee',
  reviews: { approvals: 0, changesRequested: 0, mine: null },
  readiness: 'ready',
  canMerge: true,
  ...overrides,
})

function mountActions(props: { info?: PrInfo; conversation?: Conversation | null } = {}) {
  installChrome()
  const target = document.createElement('div')
  document.body.appendChild(target)
  return mount(ReviewActions, {
    props: { pr: PR, info, headSha: 'abc', canAct: true, conversation: conversation(), method: 'squash', ...props },
    global: { provide: { [portalTargetKey as symbol]: shallowRef(target) } },
    attachTo: document.body,
  })
}

const mergeButton = (wrapper: ReturnType<typeof mountActions>) => wrapper.get('button[aria-label^="Squash and merge"]')

describe('ReviewActions', () => {
  it('leads with Approve until you approve, then with Merge', () => {
    const before = mountActions()
    expect(before.text()).toContain('Approve')
    expect(mergeButton(before).attributes('data-variant')).toBe('outline')

    const after = mountActions({ conversation: conversation({ reviews: { approvals: 1, changesRequested: 0, mine: 'approved' } }) })
    expect(after.text()).toContain('Approved')
    expect(mergeButton(after).attributes('data-variant')).toBe('success')
  })

  it('keeps Approve for the author, disabled with the reason', () => {
    const wrapper = mountActions({ conversation: conversation({ viewer: 'Sam' }) })
    const approve = wrapper.find('button[aria-label^="Approve"]')
    expect(approve.attributes('disabled')).toBeDefined()
    expect(approve.attributes('aria-label')).toContain('your own pull request')
    expect(mergeButton(wrapper).attributes('data-variant')).toBe('success')
  })

  it('says when only optional checks hold the merge back', () => {
    const wrapper = mountActions({ conversation: conversation({ readiness: 'checks' }) })
    expect(mergeButton(wrapper).attributes('title')).toBe('Squash and merge · Some checks are failing or still running')
  })

  it.each([
    ['blocked', 'Needs an approval or required checks first'],
    ['behind', 'Update the branch from its base first'],
    ['conflicts', 'Has merge conflicts'],
    ['draft', 'Still a draft'],
    ['unknown', 'GitHub is still checking it'],
  ] as const)('keeps Merge disabled while GitHub would refuse it (%s)', (readiness, reason) => {
    const wrapper = mountActions({ conversation: conversation({ readiness }) })
    const merge = wrapper.find(`button[aria-label="${reason}"]`)
    expect(merge.exists()).toBe(true)
    expect(merge.attributes('disabled')).toBeDefined()
  })

  it('keeps Merge disabled when you cannot push to the repository', () => {
    const wrapper = mountActions({ conversation: conversation({ canMerge: false }) })
    expect(wrapper.find('button[aria-label="You don’t have permission to merge here"]').attributes('disabled')).toBeDefined()
  })

  it('shows nothing once the pull request is merged', () => {
    expect(
      mountActions({ info: { ...info, state: 'merged' } })
        .find('button')
        .exists(),
    ).toBe(false)
  })
})
