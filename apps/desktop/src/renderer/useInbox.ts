import { shallowRef } from 'vue'
import { loadInbox, type Inbox } from './github'
import { errorText } from './format'
import { readCache, writeCache } from './cache'

// One copy of "what is waiting for you", shared by the Needs you page and the count in the sidebar.
// Starts with what was seen last time, so the count and the page show at once while GitHub is asked again.
const saved = readCache<Inbox>('inbox')
const inbox = shallowRef<Inbox | null>(saved?.value ?? null)
const loading = shallowRef(false)
const error = shallowRef('')
const loadedAt = shallowRef<number | null>(saved?.at ?? null)

async function load() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const entry = writeCache('inbox', await loadInbox())
    inbox.value = entry.value
    loadedAt.value = entry.at
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}

export function useInbox() {
  return { inbox, loading, error, loadedAt, load }
}
