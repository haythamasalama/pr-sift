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
  canMerge: true,
  canBypass: false,
  discussion: [],
  viewer: 'lee',
  reviews: { approvals: 0, changesRequested: 0, mine: null },
  readiness: 'ready',
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

  it('keeps Approve in place for the author, disabled with the reason', () => {
    const wrapper = mountActions({ conversation: conversation({ viewer: 'Sam' }) })
    const approve = wrapper.findAll('button').find((b) => b.text().includes('Approve'))!
    expect(approve.attributes('disabled')).toBeDefined()
    expect(approve.element.parentElement!.getAttribute('title')).toBe("You can't approve your own pull request")
    expect(mergeButton(wrapper).attributes('data-variant')).toBe('success')
  })

  it('says why a merge may not go through', () => {
    const wrapper = mountActions({ conversation: conversation({ readiness: 'checks' }) })
    expect(mergeButton(wrapper).attributes('title')).toBe('Squash and merge · Some checks are failing or still running')
  })

  it('keeps Merge in place but disabled, with the reason, when GitHub would refuse it', () => {
    const wrapper = mountActions({ conversation: conversation({ readiness: 'blocked' }) })
    expect(mergeButton(wrapper).attributes('disabled')).toBeDefined()
    expect(mergeButton(wrapper).element.parentElement!.getAttribute('title')).toBe(
      'Can’t merge yet: Needs an approval or required checks first',
    )
  })

  it('lets you merge a blocked pull request when you may bypass its rules', () => {
    const wrapper = mountActions({ conversation: conversation({ readiness: 'blocked', canBypass: true }) })
    expect(mergeButton(wrapper).attributes('disabled')).toBeUndefined()
    expect(mergeButton(wrapper).attributes('title')).toBe('Squash and merge · You can bypass the rules')
  })

  it('shows nothing once the pull request is merged', () => {
    expect(
      mountActions({ info: { ...info, state: 'merged' } })
        .find('button')
        .exists(),
    ).toBe(false)
  })
})
