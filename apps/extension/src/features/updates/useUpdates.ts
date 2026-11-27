import { computed, onScopeDispose, shallowRef } from 'vue'
import {
  applyUpdate,
  checkForUpdate,
  currentVersion,
  dismissUpdated,
  openExtensionsPage,
  watchUpdated,
  watchUpdateReady,
  type UpdateCheck,
  type UpdatedInfo,
} from '../../lib/updates'

export function checkMessage(check: UpdateCheck): string {
  switch (check.status) {
    case 'no_update':
      return 'You have the latest version'
    case 'update_available':
      return check.version ? `Downloading ${check.version}…` : 'Downloading the update…'
    case 'throttled':
      return 'Chrome limits this check. It updates PR Sift on its own within a few hours.'
    default:
      return 'Could not check for updates'
  }
}

export function useUpdates() {
  const version = currentVersion()
  const ready = shallowRef('')
  const updated = shallowRef<UpdatedInfo | null>(null)
  const checking = shallowRef(false)
  const lastCheck = shallowRef<UpdateCheck | null>(null)

  const stops = [watchUpdateReady((value) => (ready.value = value ?? '')), watchUpdated((value) => (updated.value = value ?? null))]
  onScopeDispose(() => stops.forEach((stop) => stop()))

  /** Chrome refused the last check: the wait grows after each check that found nothing, up to hours. */
  const throttled = computed(() => !ready.value && lastCheck.value?.status === 'throttled')

  const status = computed(() => {
    if (ready.value) return 'Update ready'
    if (checking.value) return 'Checking…'
    return lastCheck.value ? checkMessage(lastCheck.value) : ''
  })

  async function check() {
    if (checking.value) return
    checking.value = true
    try {
      lastCheck.value = await checkForUpdate()
    } finally {
      checking.value = false
    }
  }

  async function dismiss() {
    updated.value = null
    await dismissUpdated()
  }

  return { version, ready, updated, checking, status, throttled, check, restart: applyUpdate, dismiss, openExtensionsPage }
}
