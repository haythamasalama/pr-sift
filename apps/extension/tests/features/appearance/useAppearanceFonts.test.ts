import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installChrome } from '../../helpers/chrome'

const installFonts = vi.fn()
vi.mock('../../../src/lib/fonts', () => ({ installFonts }))

describe('useAppearance fonts', () => {
  beforeEach(() => {
    vi.resetModules()
    installFonts.mockClear()
  })

  const load = async (themeStyle: string) => {
    const { store } = installChrome()
    store.settings = { themeStyle }
    const { useAppearance } = await import('../../../src/features/appearance/useAppearance')
    const appearance = useAppearance()
    await flushPromises()
    return appearance
  }

  it('skips the IBM Plex fonts for themes that do not use them', async () => {
    await load('github')
    expect(installFonts).not.toHaveBeenCalled()
  })

  it('adds the fonts for the PR Sift theme, saved or picked', async () => {
    await load('prsift')
    expect(installFonts).toHaveBeenCalled()
    installFonts.mockClear()
    const appearance = await load('mono')
    expect(installFonts).not.toHaveBeenCalled()
    await appearance.setThemeStyle('prsift')
    expect(installFonts).toHaveBeenCalled()
  })
})
