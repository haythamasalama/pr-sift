import { flushPromises } from '@vue/test-utils'
import { effectScope } from 'vue'
import { describe, expect, it } from 'vitest'
import { checkMessage, useUpdates } from '../../../src/features/updates/useUpdates'
import { checkForUpdate, currentVersion } from '../../../src/lib/updates'
import { installChrome, invalidateExtension } from '../../helpers/chrome'

function withUpdates() {
  const scope = effectScope()
  const updates = scope.run(useUpdates)!
  return { updates, stop: () => scope.stop() }
}

describe('checkMessage', () => {
  it('says what each update check result means', () => {
    expect(checkMessage({ status: 'no_update' })).toBe('You have the latest version')
    expect(checkMessage({ status: 'update_available', version: '1.2.0' })).toBe('Downloading 1.2.0…')
    expect(checkMessage({ status: 'throttled' })).toBe('Chrome limits this check. It updates PR Sift on its own within a few hours.')
    expect(checkMessage({ status: 'error' })).toBe('Could not check for updates')
  })
})

describe('checkForUpdate', () => {
  it('asks the background worker and passes its answer on', async () => {
    const { sent } = installChrome(() => ({ status: 'update_available', version: '1.2.0' }))
    expect(await checkForUpdate()).toEqual({ status: 'update_available', version: '1.2.0' })
    expect(sent).toEqual([{ type: 'update-check' }])
  })

  it('reports an error for an answer it does not recognise', async () => {
    installChrome(() => ({ ok: false, status: 401 }))
    expect(await checkForUpdate()).toEqual({ status: 'error' })
    installChrome(() => undefined)
    expect(await checkForUpdate()).toEqual({ status: 'error' })
  })

  it('reports an error once the extension was reloaded', async () => {
    const { sent } = installChrome()
    invalidateExtension()
    expect(await checkForUpdate()).toEqual({ status: 'error' })
    expect(currentVersion()).toBe('')
    expect(sent).toEqual([])
  })
})

describe('useUpdates', () => {
  it('reads the installed version from the manifest', () => {
    installChrome()
    const { updates, stop } = withUpdates()
    expect(updates.version).toBe('1.1.0')
    stop()
  })

  it('shows the result of a check, then a downloaded update as ready', async () => {
    const { store } = installChrome(() => ({ status: 'update_available', version: '1.2.0' }))
    const { updates, stop } = withUpdates()
    expect(updates.status.value).toBe('')
    const pending = updates.check()
    expect(updates.status.value).toBe('Checking…')
    await pending
    expect(updates.status.value).toBe('Downloading 1.2.0…')

    store.updateReady = '1.2.0'
    stop()
    const reopened = withUpdates()
    await flushPromises()
    expect(reopened.updates.ready.value).toBe('1.2.0')
    expect(reopened.updates.status.value).toBe('Update ready')
    reopened.stop()
  })

  it('asks the background worker to restart into the new version', () => {
    const { sent } = installChrome()
    const { updates, stop } = withUpdates()
    updates.restart()
    expect(sent).toEqual([{ type: 'apply-update' }])
    stop()
  })

  it('forgets the installed update once dismissed', async () => {
    const { store } = installChrome()
    store.updated = { version: '1.2.0', previous: '1.1.0' }
    const { updates, stop } = withUpdates()
    await flushPromises()
    expect(updates.updated.value).toEqual({ version: '1.2.0', previous: '1.1.0' })
    await updates.dismiss()
    expect(updates.updated.value).toBeNull()
    expect('updated' in store).toBe(false)
    stop()
  })
})
