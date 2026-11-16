<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import {
  Bug,
  CircleCheck,
  Columns2,
  GitCommitHorizontal,
  GitMerge,
  Layers,
  Lightbulb,
  LifeBuoy,
  Monitor,
  Moon,
  RotateCcw,
  Rows2,
  Sun,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldLabel } from '@/components/ui/field'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { openReport } from '../../lib/report'
import type { DiffMode, MergeMethod, ThemeMode } from '../../lib/types'
import { useAppearance } from '../appearance/useAppearance'
import AboutSection from './AboutSection.vue'
import LinesTextarea from './LinesTextarea.vue'
import SavedFiltersSection from './SavedFiltersSection.vue'
import SettingsRow from './SettingsRow.vue'
import SettingsSection from './SettingsSection.vue'
import TokenSection from './TokenSection.vue'
import { sectionElementId, type SettingsSectionId } from './sections'
import { useSettingsState } from './useSettingsState'

const STATUSES = [
  { value: 'added', label: 'Added' },
  { value: 'modified', label: 'Modified' },
  { value: 'removed', label: 'Deleted' },
  { value: 'renamed', label: 'Renamed' },
]

const { section } = defineProps<{ section?: SettingsSectionId }>()

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

function scrollToSection(id: SettingsSectionId) {
  const target = root.value?.querySelector<HTMLElement>(`#${sectionElementId(id)}`)
  if (!target) return
  target.scrollIntoView({ block: 'start' })
  target.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
}

watch(
  () => section,
  (id) => id && scrollToSection(id),
)

onMounted(async () => {
  await load()
  await nextTick()
  if (section) scrollToSection(section)
})
onBeforeUnmount(() => clearTimeout(resetTimer))

defineExpose({ scrollToSection })
</script>

<template>
  <div ref="root" class="flex flex-col gap-8">
    <AboutSection />

    <TokenSection />

    <SettingsSection id="theme" title="Theme" description="Applies right away, here and in the review." area="all">
      <SettingsRow label="Mode" description="System follows your device.">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          :model-value="theme"
          aria-label="Theme"
          @update:model-value="(v) => v && setTheme(v as ThemeMode)"
        >
          <ToggleGroupItem value="system"><Monitor /> System</ToggleGroupItem>
          <ToggleGroupItem value="light"><Sun /> Light</ToggleGroupItem>
          <ToggleGroupItem value="dark"><Moon /> Dark</ToggleGroupItem>
        </ToggleGroup>
      </SettingsRow>
    </SettingsSection>

    <SettingsSection
      id="hidden"
      title="Hidden files"
      description="Kept out of the list until you turn on Hidden in the review."
      area="files"
    >
      <SettingsRow
        label="Path patterns"
        description="One per line. * stays inside a folder, ** crosses folders."
        control-id="settings-hide"
        stacked
      >
        <LinesTextarea
          id="settings-hide"
          :model-value="settings.hide"
          rows="6"
          placeholder="**/*.lock"
          @update:model-value="(v) => update('hide', v)"
        />
      </SettingsRow>
      <SettingsRow label="Hide by change type" description="Files with these changes are hidden too." stacked>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
          <div v-for="s in STATUSES" :key="s.value" class="flex items-center gap-2">
            <Checkbox
              :id="`settings-status-${s.value}`"
              :model-value="settings.hideStatuses.includes(s.value)"
              @update:model-value="(v) => toggleStatus(s.value, v === true)"
            />
            <FieldLabel :for="`settings-status-${s.value}`" class="font-normal">{{ s.label }}</FieldLabel>
          </div>
        </div>
      </SettingsRow>
    </SettingsSection>

    <SettingsSection id="defaults" title="Defaults" description="How each review starts." area="filters">
      <SettingsRow
        label="Hide viewed files"
        description="Files leave the list once you mark them viewed."
        control-id="settings-review-mode"
      >
        <Switch id="settings-review-mode" :model-value="settings.reviewMode" @update:model-value="(v) => update('reviewMode', v)" />
      </SettingsRow>
      <SettingsRow label="Diff view" description="Small windows always use Unified.">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          :model-value="settings.diffView"
          aria-label="Diff view"
          @update:model-value="(v) => v && update('diffView', v as DiffMode)"
        >
          <ToggleGroupItem value="unified"><Rows2 /> Unified</ToggleGroupItem>
          <ToggleGroupItem value="split"><Columns2 /> Split</ToggleGroupItem>
        </ToggleGroup>
      </SettingsRow>
    </SettingsSection>

    <SettingsSection
      id="merging"
      title="Merging"
      description="Used by Merge in the review. Your last choice there becomes the default."
      area="actions"
    >
      <SettingsRow label="Merge method" description="Used when the repository allows it.">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          :model-value="settings.mergeMethod"
          aria-label="Merge method"
          @update:model-value="(v) => v && update('mergeMethod', v as MergeMethod)"
        >
          <ToggleGroupItem value="squash"><GitCommitHorizontal /> Squash</ToggleGroupItem>
          <ToggleGroupItem value="merge"><GitMerge /> Merge</ToggleGroupItem>
          <ToggleGroupItem value="rebase"><Layers /> Rebase</ToggleGroupItem>
        </ToggleGroup>
      </SettingsRow>
      <SettingsRow
        label="Leave out these co-authors"
        description="One per line. A co-author whose name or email contains one of these starts unchecked when you squash and merge. The defaults cover AI assistants such as Claude, ChatGPT, Gemini and Copilot."
        control-id="settings-removed-co-authors"
        stacked
      >
        <LinesTextarea
          id="settings-removed-co-authors"
          :model-value="settings.removedCoAuthors"
          rows="6"
          placeholder="anthropic.com"
          @update:model-value="(v) => update('removedCoAuthors', v)"
        />
      </SettingsRow>
    </SettingsSection>

    <SettingsSection id="tree" title="File tree" description="How folders are drawn in the sidebar." area="sidebar">
      <SettingsRow label="Indent" description="How far each folder’s contents are pushed in. 6 px is the original.">
        <div class="flex w-44 items-center gap-3">
          <Slider
            :model-value="[treeIndent]"
            :min="0"
            :max="24"
            :step="2"
            aria-label="Indent"
            @update:model-value="(v) => v && (treeIndent = v[0]!)"
            @value-commit="(v) => update('treeIndent', v[0]!)"
          />
          <span class="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{{ treeIndent }} px</span>
        </div>
      </SettingsRow>
      <SettingsRow label="Guide lines" description="A line under each open folder." control-id="settings-tree-guides">
        <Switch id="settings-tree-guides" :model-value="settings.treeGuides" @update:model-value="(v) => update('treeGuides', v)" />
      </SettingsRow>
    </SettingsSection>

    <SavedFiltersSection :model-value="settings.presets" @update:model-value="(v) => update('presets', v)" />

    <SettingsSection id="help" title="Help" description="Opens a GitHub issue. Nothing from your pull requests is sent.">
      <template #icon><LifeBuoy class="size-4" /></template>
      <SettingsRow label="Report a problem" description="Your PR Sift and Chrome versions are filled in for you.">
        <Button variant="outline" size="sm" @click="openReport('bug')"><Bug /> Report</Button>
      </SettingsRow>
      <SettingsRow label="Suggest an idea" description="Tell us what would make large reviews easier.">
        <Button variant="outline" size="sm" @click="openReport('idea')"><Lightbulb /> Suggest</Button>
      </SettingsRow>
    </SettingsSection>

    <div class="border-t">
      <SettingsRow label="Reset settings">
        <template #description>
          <span aria-live="polite" class="inline-flex items-center gap-1.5">
            <template v-if="notice"><CircleCheck class="size-3.5 text-success-fg" /> {{ notice }}</template>
            <template v-else>Puts every setting back to its default. Your token, notes and viewed files stay.</template>
          </span>
        </template>
        <Button :variant="confirmReset ? 'destructive' : 'outline'" size="sm" @click="resetAll">
          <RotateCcw /> {{ confirmReset ? 'Click again to reset' : 'Reset to defaults' }}
        </Button>
      </SettingsRow>
    </div>
  </div>
</template>
