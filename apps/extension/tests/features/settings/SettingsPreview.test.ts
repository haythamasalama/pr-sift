import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SettingsPreview from '../../../src/features/settings/SettingsPreview.vue'
import type { PreviewArea } from '../../../src/features/settings/sections'

const PARTS = ['toolbar', 'actions', 'filters', 'sidebar', 'files']

function litParts(area: PreviewArea) {
  const wrapper = mount(SettingsPreview, { props: { area } })
  return wrapper
    .findAll('[data-part]')
    .filter((part) => part.attributes('data-lit') === 'true')
    .map((part) => part.attributes('data-part'))
}

describe('SettingsPreview', () => {
  it('draws a small wireframe of the review that screen readers skip', () => {
    const svg = mount(SettingsPreview, { props: { area: 'none' } }).find('svg')
    expect(svg.attributes('viewBox')).toBe('0 0 44 30')
    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(svg.findAll('[data-part]').map((part) => part.attributes('data-part'))).toEqual(PARTS)
  })

  it.each(['toolbar', 'actions', 'filters', 'sidebar', 'files'] as const)('fills only the %s area', (area) => {
    expect(litParts(area)).toEqual([area])
  })

  it('fills every area for all and none for none', () => {
    expect(litParts('all')).toEqual(PARTS)
    expect(litParts('none')).toEqual([])
  })

  it('paints the lit area with the emphasis token and the rest with muted and border tokens', () => {
    const wrapper = mount(SettingsPreview, { props: { area: 'sidebar' } })
    expect(wrapper.find('[data-part="sidebar"]').classes()).toContain('fill-emphasis')
    expect(wrapper.find('[data-part="files"]').classes()).toEqual(['fill-muted', 'stroke-border'])
  })
})
