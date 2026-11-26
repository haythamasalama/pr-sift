<script setup lang="ts">
import { computed, nextTick, type Component, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { ChevronRight, CircleCheck, Eye, FolderTree, Monitor, Moon, Palette, RotateCcw, Sun } from '@lucide/vue'
import { DEFAULT_REMOVED_CO_AUTHORS } from '@pr-sift/core'
import { matcher } from '@pr-sift/core'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { FieldLabel } from '@/components/ui/field'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import DiffSplitIcon from '@/components/DiffSplitIcon.vue'
import DiffUnifiedIcon from '@/components/DiffUnifiedIcon.vue'
import BrandIcon from '../../components/BrandIcon.vue'
import GithubMark from '../../components/GithubMark.vue'
import type { DiffMode, MergeMethod, PrFile, ThemeMode } from '../../lib/types'
import { THEME_STYLES, useAppearance } from '../appearance/useAppearance'
import AboutSection from './AboutSection.vue'
import ConnectionRow from './ConnectionRow.vue'
import PatternList from './PatternList.vue'
import SavedFiltersSection from './SavedFiltersSection.vue'
import SettingsGroup from './SettingsGroup.vue'
import SettingsRow from './SettingsRow.vue'
import SettingsSection from './SettingsSection.vue'
import AppearancePreview from './AppearancePreview.vue'
import CodeThemeSelect from './CodeThemeSelect.vue'
import SegmentedControl from './SegmentedControl.vue'
import ThemeSwatches from './ThemeSwatches.vue'
import TreePreview from './TreePreview.vue'
import { SHEET_TABS, TAB_OF, sectionElementId, type SettingsSectionId, type SettingsTab } from './sections'
import { useSettingsState } from './useSettingsState'
import { useNewMarks } from './useNewMarks'

const STATUSES = [
  { value: 'added', label: 'Added' },
  { value: 'modified', label: 'Modified' },
  { value: 'removed', label: 'Deleted' },
  { value: 'renamed', label: 'Renamed' },
]

const THEMES: { value: ThemeMode; label: string; icon: Component }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

const MODE_HINTS: Record<ThemeMode, string> = {
  system: 'Follows your computer.',
  light: 'Always light.',
  dark: 'Always dark.',
}

const DIFF_VIEWS: { value: DiffMode; label: string; hint: string; icon: Component }[] = [
  { value: 'unified', label: 'Unified', hint: 'Removed and added lines in one column.', icon: DiffUnifiedIcon },
  { value: 'split', label: 'Split', hint: 'Old on the left, new on the right. Small windows use Unified.', icon: DiffSplitIcon },
]

const MERGE_METHODS: { value: MergeMethod; label: string; hint: string }[] = [
  { value: 'squash', label: 'Squash', hint: 'One commit on the base branch.' },
  { value: 'merge', label: 'Merge commit', hint: 'Every commit, plus a merge commit.' },
  { value: 'rebase', label: 'Rebase', hint: 'Every commit, without a merge commit.' },
]

const TAB_ICONS = { github: GithubMark, review: Eye, files: FolderTree, appearance: Palette, about: BrandIcon }

const hintOf = <T extends string>(options: { value: T; hint: string }[], value: T) => options.find((o) => o.value === value)?.hint ?? ''

const { section, files, layout = 'tabs' } = defineProps<{ section?: SettingsSectionId; files?: PrFile[]; layout?: 'tabs' | 'page' }>()
const tab = shallowRef<SettingsTab>(section ? TAB_OF[section] : SHEET_TABS[0]!.id)
const shows = (id: SettingsTab) => layout === 'page' || tab.value === id

const { theme, setTheme, themeStyle, setThemeStyle, codeTheme, setCodeTheme, dark } = useAppearance()
const themeHint = computed(() => THEME_STYLES.find((t) => t.value === themeStyle.value)?.hint ?? '')
const { settings, load, update, reset } = useSettingsState()
const { isNew, markSeen } = useNewMarks()
const root = useTemplateRef<HTMLElement>('root')
const treeIndent = shallowRef(settings.value.treeIndent)
const confirmReset = shallowRef(false)
const notice = shallowRef('')
let resetTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => settings.value.treeIndent,
  (value) => (treeIndent.value = value),
)

const coAuthorSummary = computed(() => {
  const list = settings.value.removedCoAuthors
  const isDefault = list.length === DEFAULT_REMOVED_CO_AUTHORS.length && list.every((p, i) => p === DEFAULT_REMOVED_CO_AUTHORS[i])
  if (isDefault) return 'Claude, ChatGPT, Gemini, Copilot and other AI tools start unchecked when you squash.'
  return `${list.length} name${list.length === 1 ? '' : 's'} or email${list.length === 1 ? '' : 's'} on your list start unchecked when you squash.`
})

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
  <div ref="root" class="flex flex-col" :class="layout === 'page' ? 'gap-6' : 'gap-3'">
    <nav
      v-if="layout === 'tabs'"
      aria-label="Settings"
      role="tablist"
      class="sticky top-0 z-10 -mx-4 -mb-2 flex gap-5 overflow-x-auto border-b bg-background px-4"
    >
      <button
        v-for="t in SHEET_TABS"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="tab === t.id"
        class="-mb-px flex items-center gap-1.5 border-b-2 py-2.5 text-sm whitespace-nowrap outline-none focus-visible:text-foreground [&_svg]:size-4 [&_svg]:shrink-0"
        :class="
          tab === t.id ? 'border-foreground font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
        "
        @click="openTab(t.id)"
      >
        <component :is="TAB_ICONS[t.id]" />{{ t.label }}
      </button>
    </nav>

    <AboutSection v-show="shows('about')" :framed="layout === 'page'" />

    <SettingsSection
      v-show="shows('github')"
      id="github"
      :framed="layout === 'page'"
      :headless="layout === 'tabs'"
      title="GitHub"
      description="Comment, review and merge without leaving the review."
    >
      <template #icon><GithubMark class="size-6" /></template>
      <SettingsGroup id="token" title="Connection">
        <ConnectionRow :token-entry="layout === 'page'" />
      </SettingsGroup>
      <SettingsGroup id="merging" title="Merging" hide-title>
        <SettingsRow label="Merge method" description="Your last choice in the review becomes the default." class="border-b">
          <SegmentedControl
            :model-value="settings.mergeMethod"
            :options="MERGE_METHODS"
            name="settings-merge"
            label="Merge method"
            @update:model-value="(v) => update('mergeMethod', v)"
          />
        </SettingsRow>
        <SettingsRow
          label="Leave out AI co-authors"
          :description="coAuthorSummary"
          control-id="settings-leave-out"
          :is-new="isNew('co-authors')"
        >
          <Switch
            id="settings-leave-out"
            :model-value="settings.leaveOutCoAuthors"
            @update:model-value="
              (v) => {
                update('leaveOutCoAuthors', v)
                markSeen('co-authors')
              }
            "
          />
        </SettingsRow>
        <Collapsible v-if="settings.leaveOutCoAuthors" :default-open="section === 'merging'" class="-mt-1 pb-3">
          <CollapsibleTrigger as-child>
            <Button variant="ghost" size="xs" class="group w-fit px-1 text-muted-foreground">
              <ChevronRight class="transition-transform group-data-[state=open]:rotate-90" /> Edit the list
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent class="pt-2">
            <PatternList
              :model-value="settings.removedCoAuthors"
              label="co-authors to leave out"
              placeholder="Name or email, such as bot@example.com"
              @update:model-value="(v) => update('removedCoAuthors', v)"
            />
          </CollapsibleContent>
        </Collapsible>
      </SettingsGroup>
    </SettingsSection>

    <SettingsSection
      v-show="shows('review')"
      id="review"
      :framed="layout === 'page'"
      :headless="layout === 'tabs'"
      title="Reviewing"
      description="How each review starts."
      area="files"
    >
      <SettingsRow
        label="Open PR Sift automatically"
        description="Pull requests open straight in PR Sift. Close it to see GitHub's page."
        control-id="settings-auto-open"
        :is-new="isNew('auto-open')"
      >
        <Switch
          id="settings-auto-open"
          :model-value="settings.autoOpen"
          @update:model-value="
            (v) => {
              update('autoOpen', v)
              markSeen('auto-open')
            }
          "
        />
      </SettingsRow>
      <SettingsRow label="Hide files once viewed" description="The list gets shorter as you go." control-id="settings-review-mode">
        <Switch id="settings-review-mode" :model-value="settings.reviewMode" @update:model-value="(v) => update('reviewMode', v)" />
      </SettingsRow>
      <SettingsRow label="Diff view" :description="hintOf(DIFF_VIEWS, settings.diffView)">
        <SegmentedControl
          :model-value="settings.diffView"
          :options="DIFF_VIEWS"
          name="settings-diff"
          label="Diff view"
          @update:model-value="(v) => update('diffView', v)"
        />
      </SettingsRow>
      <SettingsRow label="Show resolved notes" description="They stay in the diff, dimmed." control-id="settings-show-resolved">
        <Switch id="settings-show-resolved" :model-value="settings.showResolved" @update:model-value="(v) => update('showResolved', v)" />
      </SettingsRow>
    </SettingsSection>

    <SettingsSection
      v-show="shows('files')"
      id="files"
      :framed="layout === 'page'"
      :headless="layout === 'tabs'"
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
      v-show="shows('appearance')"
      id="appearance"
      :framed="layout === 'page'"
      :headless="layout === 'tabs'"
      title="Appearance"
      description="Applies right away, here and in the review."
      area="all"
    >
      <div class="pb-5" :class="layout === 'page' ? 'pt-4' : 'pt-3'"><AppearancePreview /></div>
      <SettingsRow label="Mode" :description="MODE_HINTS[theme]">
        <SegmentedControl :model-value="theme" :options="THEMES" name="settings-theme" label="Mode" @update:model-value="setTheme" />
      </SettingsRow>
      <SettingsRow id="settings-section-style" data-section="style" label="Theme" :description="themeHint">
        <ThemeSwatches :model-value="themeStyle" :dark="dark" @update:model-value="setThemeStyle" />
      </SettingsRow>
      <SettingsRow
        id="settings-section-code-colors"
        data-section="code-colors"
        label="Code colors"
        description="How code is coloured in the diff."
      >
        <CodeThemeSelect :model-value="codeTheme" :dark="dark" @update:model-value="setCodeTheme" />
      </SettingsRow>
      <SettingsRow
        id="settings-section-tree"
        data-section="tree"
        label="Folder indentation"
        description="How far each folder is pushed in."
      >
        <div class="flex flex-col items-end gap-2">
          <div class="flex items-center gap-4">
            <div class="flex w-36 items-center gap-2">
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
          <TreePreview :indent="treeIndent" :guides="settings.treeGuides" />
        </div>
      </SettingsRow>
    </SettingsSection>

    <div v-show="shows('about')" data-reset :class="layout === 'page' ? 'rounded-lg border px-4' : 'border-t'">
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
    </div>
  </div>
</template>
