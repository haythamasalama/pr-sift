import { shallowRef } from 'vue'
import { loadInbox, type Inbox } from './github'
import { errorText } from './format'

// One copy of "what is waiting for you", shared by the Needs you page and the count in the sidebar.
const inbox = shallowRef<Inbox | null>(null)
const loading = shallowRef(false)
const error = shallowRef('')
const loadedAt = shallowRef<number | null>(null)

async function load() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    inbox.value = await loadInbox()
    loadedAt.value = Date.now()
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}

export function useInbox() {
  return { inbox, loading, error, loadedAt, load }
}
