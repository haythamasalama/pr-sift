import { computed, shallowRef, type Ref } from 'vue'
import { NOTES_CHIP, buildSmartScopes, extensionsOf, matcher, matchesChip, matchesScope } from '@pr-sift/core'
import { saveSetting } from '../lib/settings'
import type { ExtChip, PrFile, Settings } from '../lib/types'

const STATUS_LABELS: Record<string, string> = { added: 'added', modified: 'modified', removed: 'deleted', renamed: 'renamed' }

export function useFileFilter(
  files: Ref<PrFile[]>,
  settings: Ref<Settings>,
  isViewed: (f: PrFile) => boolean,
  openNotes: Ref<ReadonlyMap<string, number>> = shallowRef(new Map<string, number>()),
) {
  const presetName = shallowRef('')
  const scopes = shallowRef<string[]>([])
  const query = shallowRef('')
  const showHidden = shallowRef(false)
  const reviewMode = shallowRef(true)
  const shownOnly = shallowRef<string[]>([])
  const alwaysHidden = shallowRef<string[]>([])

  const activePreset = computed(() => settings.value.presets.find((p) => p.name === presetName.value))

  const presetFiles = computed(() => {
    const inPreset = activePreset.value ? matcher(activePreset.value.include) : () => true
    const q = query.value.trim().toLowerCase()
    const matchesQuery = (name: string) => !q || (q.startsWith('.') ? name.toLowerCase().endsWith(q) : name.toLowerCase().includes(q))
    return files.value.filter((f) => inPreset(f.filename) && matchesQuery(f.filename))
  })

  const stateOf = (key: string): ExtChip['state'] =>
    shownOnly.value.includes(key) ? 'include' : alwaysHidden.value.includes(key) ? 'exclude' : undefined

  const chips = computed<ExtChip[]>(() => {
    const custom = settings.value.customExtensions
    const counts = new Map<string, number>()
    for (const f of presetFiles.value) {
      for (const ext of extensionsOf(f.filename, custom)) counts.set(ext, (counts.get(ext) ?? 0) + 1)
    }
    const active = [...shownOnly.value, ...alwaysHidden.value]
    for (const c of [...custom, ...active.filter((k) => !k.startsWith('status:') && k !== NOTES_CHIP)]) if (!counts.has(c)) counts.set(c, 0)
    const extChips = [...counts]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([ext, count]) => ({ ext, label: ext, count, state: stateOf(ext), custom: custom.includes(ext) }))
    const statusChips = Object.keys(STATUS_LABELS)
      .map((status) => ({
        ext: 'status:' + status,
        label: STATUS_LABELS[status]!,
        count: presetFiles.value.filter((f) => f.status === status).length,
        state: stateOf('status:' + status),
        custom: false,
      }))
      .filter((c) => c.count > 0 || c.state)
    const notesChip = {
      ext: NOTES_CHIP,
      label: 'with notes',
      count: presetFiles.value.reduce((sum, f) => sum + (openNotes.value.get(f.filename) ?? 0), 0),
      state: stateOf(NOTES_CHIP),
      custom: false,
    }
    return [...extChips, ...statusChips, ...(notesChip.count > 0 || notesChip.state ? [notesChip] : [])]
  })

  const byChip = computed(() =>
    presetFiles.value.filter((f) => {
      if (alwaysHidden.value.some((k) => matchesChip(f, k, openNotes.value))) return false
      return !shownOnly.value.length || shownOnly.value.some((k) => matchesChip(f, k, openNotes.value))
    }),
  )

  const hiddenByRules = computed(() => {
    const byGlob = matcher(settings.value.hide)
    const statuses = new Set(settings.value.hideStatuses)
    const presetShowsHidden = activePreset.value?.includeHidden ?? false
    return (f: PrFile) => !presetShowsHidden && (byGlob(f.filename) || statuses.has(f.status))
  })

  const isHidden = computed(() => (f: PrFile) => !shownOnly.value.some((k) => matchesChip(f, k, openNotes.value)) && hiddenByRules.value(f))

  const hiddenCount = computed(() => byChip.value.filter(isHidden.value).length)
  const candidates = computed(() => (showHidden.value ? byChip.value : byChip.value.filter((f) => !isHidden.value(f))))
  const inScopeKeys = (f: PrFile) => scopes.value.some((k) => matchesScope(f.filename, k))
  const pool = computed(() => (reviewMode.value ? candidates.value.filter((f) => !isViewed(f)) : candidates.value))
  const inScope = computed(() => (scopes.value.length ? pool.value.filter(inScopeKeys) : pool.value))
  const scopedAll = computed(() => (scopes.value.length ? candidates.value.filter(inScopeKeys) : candidates.value))
  const viewedInView = computed(() => scopedAll.value.filter(isViewed))
  const progress = computed(() => {
    const all = showHidden.value ? files.value : files.value.filter((f) => !hiddenByRules.value(f))
    const total = all.length
    const done = all.filter(isViewed).length
    return { total, done, left: total - done }
  })

  const smart = computed(() => buildSmartScopes(pool.value))
  const selectedFolder = computed(() =>
    scopes.value.length === 1 && scopes.value[0]!.startsWith('path:') ? scopes.value[0]!.slice(5) : '',
  )

  const filtersActive = computed(
    () =>
      shownOnly.value.length > 0 ||
      alwaysHidden.value.length > 0 ||
      scopes.value.length > 0 ||
      query.value.trim().length > 0 ||
      presetName.value !== '' ||
      showHidden.value,
  )

  const without = (list: string[], key: string) => list.filter((k) => k !== key)

  function toggleChip(key: string, hide = false) {
    if (hide) {
      shownOnly.value = without(shownOnly.value, key)
      alwaysHidden.value = alwaysHidden.value.includes(key) ? without(alwaysHidden.value, key) : [...alwaysHidden.value, key]
      return saveSetting('hiddenTypes', alwaysHidden.value)
    }
    const wasHidden = alwaysHidden.value.includes(key)
    if (wasHidden) alwaysHidden.value = without(alwaysHidden.value, key)
    shownOnly.value = shownOnly.value.includes(key) || wasHidden ? without(shownOnly.value, key) : [...shownOnly.value, key]
    return wasHidden ? saveSetting('hiddenTypes', alwaysHidden.value) : Promise.resolve()
  }

  const loadHiddenTypes = (keys: string[]) => (alwaysHidden.value = [...keys])

  function resetFilters() {
    shownOnly.value = []
    scopes.value = []
    query.value = ''
    presetName.value = ''
    showHidden.value = false
    alwaysHidden.value = []
    return saveSetting('hiddenTypes', [])
  }

  function toggleScope(key: string) {
    scopes.value = scopes.value.includes(key) ? scopes.value.filter((k) => k !== key) : [...scopes.value, key]
  }

  const setScopes = (keys: string[]) => (scopes.value = keys)
  const togglePreset = (name: string) => (presetName.value = presetName.value === name ? '' : name)

  return {
    activePreset,
    query,
    scopes,
    showHidden,
    reviewMode,
    chips,
    hiddenCount,
    candidates,
    pool,
    inScope,
    viewedInView,
    progress,
    smart,
    selectedFolder,
    filtersActive,
    toggleChip,
    loadHiddenTypes,
    resetFilters,
    toggleScope,
    setScopes,
    togglePreset,
  }
}
