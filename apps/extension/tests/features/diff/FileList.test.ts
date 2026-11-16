import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, shallowRef } from 'vue'
import FileList from '../../../src/features/diff/FileList.vue'
import type { PrFile } from '../../../src/lib/types'
import { notesContext, provideContext } from '../../helpers/context'
import { file } from '@pr-sift/core/testing'

const SCROLLER_TOP = 100
const PADDING = 16
const CONTENT_TOP = SCROLLER_TOP + PADDING
const OPEN_HEIGHT = 900
const COLLAPSED_HEIGHT = 40

// happy-dom has no layout, so lay the cards out in a column: each card is as tall as it is open or collapsed.
function fakeLayout(scroller: () => HTMLElement) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const root = scroller()
    if (this === root) return DOMRect.fromRect({ x: 0, y: SCROLLER_TOP, width: 800, height: 700 })
    let top = CONTENT_TOP - root.scrollTop
    for (const card of root.querySelectorAll<HTMLElement>('section[data-file]')) {
      const height = card.querySelector('[aria-label="Expand file"]') ? COLLAPSED_HEIGHT : OPEN_HEIGHT
      if (card === this) return DOMRect.fromRect({ x: 0, y: top, width: 800, height })
      top += height
    }
    return DOMRect.fromRect()
  })
}

function mountReview(hideViewed: boolean) {
  const files = [file('src/A.php'), file('src/B.php'), file('src/C.php')]
  const Review = defineComponent(() => {
    const viewed = shallowRef<Record<string, string>>({})
    const setViewed = (f: PrFile, value: boolean) => {
      const next = { ...viewed.value }
      if (value) next[f.filename] = f.hash
      else delete next[f.filename]
      viewed.value = next
    }
    return () =>
      h('main', { style: `overflow-y: auto; padding-top: ${PADDING}px` }, [
        h(FileList, {
          files: hideViewed ? files.filter((f) => viewed.value[f.filename] !== f.hash) : files,
          viewed: viewed.value,
          onSetViewed: setViewed,
        }),
      ])
  })
  const wrapper = mount(Review, { attachTo: document.body, global: { provide: provideContext(notesContext()) } })
  const scroller = wrapper.get('main').element as HTMLElement
  fakeLayout(() => scroller)
  return { wrapper, scroller }
}

const topOf = (scroller: HTMLElement, name: string) =>
  scroller.querySelector<HTMLElement>(`section[data-file="${name}"]`)!.getBoundingClientRect().top

async function markViewed(wrapper: ReturnType<typeof mountReview>['wrapper'], name: string) {
  await wrapper.get(`section[data-file="${name}"] [role=checkbox]`).trigger('click')
  await flushPromises()
}

describe('FileList', () => {
  beforeEach(() => document.body.replaceChildren())
  afterEach(() => vi.restoreAllMocks())

  it('brings the next file to the top after marking a file viewed while viewed files are hidden', async () => {
    const { wrapper, scroller } = mountReview(true)
    scroller.scrollTop = 600
    expect(topOf(scroller, 'src/A.php')).toBeLessThan(SCROLLER_TOP)

    await markViewed(wrapper, 'src/A.php')

    expect(wrapper.find('section[data-file="src/A.php"]').exists()).toBe(false)
    expect(topOf(scroller, 'src/B.php')).toBe(CONTENT_TOP)
  })

  it('keeps the collapsed file and the next one in view when viewed files stay listed', async () => {
    const { wrapper, scroller } = mountReview(false)
    scroller.scrollTop = 600

    await markViewed(wrapper, 'src/A.php')

    expect(topOf(scroller, 'src/A.php')).toBe(CONTENT_TOP)
    expect(topOf(scroller, 'src/B.php')).toBe(CONTENT_TOP + COLLAPSED_HEIGHT)
  })

  it('leaves the scroll position alone when the top of the file was already in view', async () => {
    const { wrapper, scroller } = mountReview(true)
    scroller.scrollTop = 0

    await markViewed(wrapper, 'src/A.php')

    expect(scroller.scrollTop).toBe(0)
    expect(topOf(scroller, 'src/B.php')).toBe(CONTENT_TOP)
  })

  it('does not scroll when a file is marked as not viewed', async () => {
    const { wrapper, scroller } = mountReview(false)
    await markViewed(wrapper, 'src/B.php')
    scroller.scrollTop = 1000

    await markViewed(wrapper, 'src/B.php')

    expect(scroller.scrollTop).toBe(1000)
  })
})
