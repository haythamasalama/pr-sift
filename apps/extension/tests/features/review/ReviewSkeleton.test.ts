import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReviewSkeleton from '../../../src/features/review/ReviewSkeleton.vue'

describe('ReviewSkeleton', () => {
  it('announces loading and draws the sidebar and file cards', () => {
    const wrapper = mount(ReviewSkeleton, { props: { sidebarWidth: 300 } })
    expect(wrapper.get('[role="status"]').attributes('aria-label')).toBe('Loading pull request')
    expect(wrapper.find('aside').exists()).toBe(true)
    expect(wrapper.findAll('.rounded-md.border')).toHaveLength(3)
  })

  it('leaves the sidebar out in a narrow window', () => {
    const wrapper = mount(ReviewSkeleton, { props: { sidebarWidth: 300, compact: true } })
    expect(wrapper.find('aside').exists()).toBe(false)
  })
})
