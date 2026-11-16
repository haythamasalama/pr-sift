<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { CircleCheck, Eye, FolderTree, Info, Palette, Plug, RotateCcw } from '@lucide/vue'
import { matcher } from '@pr-sift/core'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldLabel } from '@/components/ui/field'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import type { DiffMode, MergeMethod, PrFile, ThemeMode } from '../../lib/types'
import { useAppearance } from '../appearance/useAppearance'
import AboutSection from './AboutSection.vue'
import ChoiceCards from './ChoiceCards.vue'
import ConnectionRow from './ConnectionRow.vue'
import DiffPreview from './DiffPreview.vue'
import PatternList from './PatternList.vue'
import SavedFiltersSection from './SavedFiltersSection.vue'
import SettingsGroup from './SettingsGroup.vue'
import SettingsRow from './SettingsRow.vue'
import SettingsSection from './SettingsSection.vue'
import ThemePreview from './ThemePreview.vue'
import TreePreview from './TreePreview.vue'
import { SETTINGS_TABS, TAB_OF, sectionElementId, type SettingsSectionId, type SettingsTab } from './sections'
import { useSettingsState } from './useSettingsState'

const STATUSES = [
  { value: 'added', label: 'Added' },
  { value: 'modified', label: 'Modified' },
  { value: 'removed', label: 'Deleted' },
  { value: 'renamed', label: 'Renamed' },
]

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const DIFF_VIEWS: { value: DiffMode; label: string; hint: string }[] = [
  { value: 'unified', label: 'Unified', hint: 'Removed and added lines in one column' },
  { value: 'split', label: 'Split', hint: 'Old on the left, new on the right. Small windows use Unified.' },
]

const MERGE_METHODS: { value: MergeMethod; label: string; hint: string }[] = [
  { value: 'squash', label: 'Squash', hint: 'One commit on the base branch' },
  { value: 'merge', label: 'Merge commit', hint: 'Every commit, plus a merge commit' },
  { value: 'rebase', label: 'Rebase', hint: 'Every commit, without a merge commit' },
]

const TAB_ICONS = { github: Plug, review: Eye, files: FolderTree, appearance: Palette, about: Info }

const { section, files } = defineProps<{ section?: SettingsSectionId; files?: PrFile[] }>()
const tab = shallowRef<SettingsTab>(section ? TAB_OF[section] : 'github')

const { theme, setTheme } = useAppearance()
const { settings, load, update, reset } = useSettingsState()
const root = useTemplateRef<HTMLElement>('root')
const treeIndent = shallowRef(settings.value.treeIndent)
const confirmReset = shallowRef(false)
const notice = shallowRef('')
let resetTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => settings.value.treeIndent,
  (value) => (treeIndent.value = value),
)

const hiddenSummary = computed(() => {
  if (!files) return 'Kept out of the list until you turn on Hidden in the review.'
  const byPath = matcher(settings.value.hide)
  const count = files.filter((f) => byPath(f.filename) || settings.value.hideStatuses.includes(f.status)).length
  return `Hides ${count} file${count === 1 ? '' : 's'} in this pull request until you turn on Hidden.`
})

function toggleStatus(status: string, on: boolean) {
  const current = settings.value.hideStatuses.filter((s) => s !== status)
  void update('hideStatuses', on ? [...current, status] : current)
}

async function resetAll() {
  clearTimeout(resetTimer)
  if (!confirmReset.value) {
    confirmReset.value = true
    resetTimer = setTimeout(() => (confirmReset.value = false), 3000)
    return
  }
  confirmReset.value = false
  await reset()
  notice.value = 'Settings reset to defaults'
  resetTimer = setTimeout(() => (notice.value = ''), 3000)
}

async function scrollToSection(id: SettingsSectionId) {
  tab.value = TAB_OF[id]
  await nextTick()
  const target = root.value?.querySelector<HTMLElement>(`#${sectionElementId(id)}`)
  if (!target) return
  target.scrollIntoView({ block: 'start' })
  target.querySelector<HTMLElement>('h2, h3')?.focus({ preventScroll: true })
}

function openTab(id: SettingsTab) {
  if (tab.value === id) return
  tab.value = id
  void nextTick(() => root.value?.scrollIntoView({ block: 'start' }))
}

watch(
  () => section,
  (id) => id && scrollToSection(id),
)

let settleTimer: ReturnType<typeof setTimeout> | undefined

onMounted(async () => {
  await load()
  await nextTick()
  if (!section) return
  void scrollToSection(section)
  // The connection row grows once GitHub answers, which can push the group below it down.
  settleTimer = setTimeout(() => void scrollToSection(section), 400)
})
onBeforeUnmount(() => {
  clearTimeout(resetTimer)
  clearTimeout(settleTimer)
})

defineExpose({ scrollToSection })
</script>

<template>
  <div ref="root" class="flex flex-col gap-8">
    <nav
      aria-label="Settings"
      role="tablist"
      class="sticky top-0 z-10 -mx-4 -mb-4 flex gap-1 overflow-x-auto border-b bg-background px-4 py-2"
    >
      <Button
        v-for="t in SETTINGS_TABS"
        :key="t.id"
        role="tab"
        :aria-selected="tab === t.id"
        variant="ghost"
        size="xs"
        :class="tab === t.id ? 'bg-muted text-foreground' : 'text-muted-foreground'"
        @click="openTab(t.id)"
      >
        <component :is="TAB_ICONS[t.id]" />{{ t.label }}
      </Button>
    </nav>

    <SettingsSection
      v-show="tab === 'github'"
      id="github"
      title="GitHub"
      description="Comment, review and merge without leaving the review."
    >
      <template #icon><Plug class="size-4" /></template>
      <SettingsGroup id="token" title="Connection">
        <ConnectionRow />
      </SettingsGroup>
      <SettingsGroup id="merging" title="Merging" description="Your last choice in the review becomes the default.">
        <ChoiceCards
          :model-value="settings.mergeMethod"
          :options="MERGE_METHODS"
          name="settings-merge"
          label="Merge method"
          @update:model-value="(v) => update('mergeMethod', v)"
        />
        <div class="flex flex-col gap-1.5">
          <p class="text-xs font-medium">Leave out these co-authors</p>
          <p class="text-xs text-muted-foreground">Anyone whose name or email contains one of these starts unchecked.</p>
          <PatternList
            :model-value="settings.removedCoAuthors"
            label="co-authors to leave out"
            placeholder="anthropic.com"
            @update:model-value="(v) => update('removedCoAuthors', v)"
          />
        </div>
      </SettingsGroup>
    </SettingsSection>

    <SettingsSection v-show="tab === 'review'" id="review" title="Reviewing" description="How each review starts." area="files">
      <SettingsRow label="Hide files once viewed" description="The list gets shorter as you go." control-id="settings-review-mode">
        <Switch id="settings-review-mode" :model-value="settings.reviewMode" @update:model-value="(v) => update('reviewMode', v)" />
      </SettingsRow>
      <div class="flex flex-col gap-2.5 py-3">
        <p class="text-sm font-medium">Diff view</p>
        <ChoiceCards
          :model-value="settings.diffView"
          :options="DIFF_VIEWS"
          name="settings-diff"
          label="Diff view"
          @update:model-value="(v) => update('diffView', v)"
        >
          <template #preview="{ value }"><DiffPreview :mode="value" /></template>
        </ChoiceCards>
      </div>
      <SettingsRow label="Show resolved notes" description="They stay in the diff, dimmed." control-id="settings-show-resolved">
        <Switch id="settings-show-resolved" :model-value="settings.showResolved" @update:model-value="(v) => update('showResolved', v)" />
      </SettingsRow>
    </SettingsSection>

    <SettingsSection
      v-show="tab === 'files'"
      id="files"
      title="Files"
      description="What the list leaves out, and your own filters."
      area="sidebar"
    >
      <SettingsGroup id="hidden" title="Always hidden" :description="hiddenSummary">
        <PatternList
          :model-value="settings.hide"
          label="hidden paths"
          placeholder="**/*.lock"
          @update:model-value="(v) => update('hide', v)"
        />
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span class="text-xs text-muted-foreground">Also hide</span>
          <div v-for="s in STATUSES" :key="s.value" class="flex items-center gap-1.5">
            <Checkbox
              :id="`settings-status-${s.value}`"
              :model-value="settings.hideStatuses.includes(s.value)"
              @update:model-value="(v) => toggleStatus(s.value, v === true)"
            />
            <FieldLabel :for="`settings-status-${s.value}`" class="text-xs font-normal">{{ s.label }}</FieldLabel>
          </div>
        </div>
      </SettingsGroup>
      <SavedFiltersSection :model-value="settings.presets" :files="files" @update:model-value="(v) => update('presets', v)" />
    </SettingsSection>

    <SettingsSection
      v-show="tab === 'appearance'"
      id="appearance"
      title="Appearance"
      description="Applies right away, here and in the review."
      area="all"
    >
      <div class="py-3">
        <ChoiceCards :model-value="theme" :options="THEMES" name="settings-theme" label="Theme" @update:model-value="setTheme">
          <template #preview="{ value }"><ThemePreview :mode="value" /></template>
        </ChoiceCards>
      </div>
      <SettingsGroup id="tree" title="Folder indentation" description="How far each folder is pushed in, in the file tree.">
        <div class="grid grid-cols-[minmax(0,1fr)_11rem] items-center gap-4">
          <TreePreview :indent="treeIndent" :guides="settings.treeGuides" />
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-3">
              <Slider
                :model-value="[treeIndent]"
                :min="0"
                :max="24"
                :step="2"
                aria-label="Folder indentation"
                @update:model-value="(v) => v && (treeIndent = v[0]!)"
                @value-commit="(v) => update('treeIndent', v[0]!)"
              />
              <span class="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{{ treeIndent }} px</span>
            </div>
            <div class="flex items-center gap-2">
              <Switch
                id="settings-tree-guides"
                size="sm"
                :model-value="settings.treeGuides"
                @update:model-value="(v) => update('treeGuides', v)"
              />
              <FieldLabel for="settings-tree-guides" class="text-xs font-normal">Guide lines</FieldLabel>
            </div>
          </div>
        </div>
      </SettingsGroup>
    </SettingsSection>

    <AboutSection v-show="tab === 'about'">
      <SettingsRow label="Reset settings">
        <template #description>
          <span aria-live="polite" class="inline-flex items-center gap-1.5">
            <template v-if="notice"><CircleCheck class="size-3.5 text-success-fg" /> {{ notice }}</template>
            <template v-else>Your token, notes and viewed files stay.</template>
          </span>
        </template>
        <Button :variant="confirmReset ? 'destructive' : 'outline'" size="sm" @click="resetAll">
          <RotateCcw /> {{ confirmReset ? 'Click again to reset' : 'Reset' }}
        </Button>
      </SettingsRow>
    </AboutSection>
  </div>
</template>
