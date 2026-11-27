<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, shallowRef, useTemplateRef, watch } from 'vue'
import {
  ArrowDownUp,
  BadgeCheck,
  ChevronRight,
  FolderGit2,
  GripVertical,
  Inbox,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Trash2,
} from '@lucide/vue'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useMediaQuery } from '@vueuse/core'
import ReviewPanel from '@/features/review/ReviewPanel.vue'
import { useAppearance } from '@/features/appearance/useAppearance'
import { portalTargetKey } from '@/lib/portal'
import { prKey } from '@/lib/types'
import { useAuth } from './useAuth'
import { useProjects } from './useProjects'
import { PROJECT_SORTS, useProjectOrder, type ProjectSort } from './useProjectOrder'
import { useInbox } from './useInbox'
import { useLive } from './useLive'
import { useDragSort } from './useDragSort'
import { bridge } from './bridge'
import type { AutoApproveStatus } from '#shared/ipc'
import { goBack, openProject, openReview, project, review, reviewFocus, stepReview, view, worktree, type View } from './navigation'
import { refreshNow } from './useLive'
import ReviewNav from './components/ReviewNav.vue'
import OpenLinkDialog from './components/OpenLinkDialog.vue'
import ShortcutsDialog from './shortcuts/ShortcutsDialog.vue'
import type { MenuCommand } from '#shared/ipc'
import { parsePullLink } from '#shared/links'
import ShareMenu from './components/ShareMenu.vue'
import Onboarding from './onboarding/Onboarding.vue'
import { useOnboarding } from './onboarding/useOnboarding'
import AppLogo from './components/AppLogo.vue'
import InboxView from './views/Inbox.vue'
import ProjectView from './views/Project.vue'
import WorktreeChanges from './views/WorktreeChanges.vue'
import AutoApprove from './views/AutoApprove.vue'
import Worktrees from './views/Worktrees.vue'
import Cleanup from './views/Cleanup.vue'
import SettingsView from './views/Settings.vue'
import Account from './views/Account.vue'
import AddProjectDialog from './components/AddProjectDialog.vue'
import ProjectIcon from './components/ProjectIcon.vue'
import SectionLabel from './components/SectionLabel.vue'
import CountBadge from './components/CountBadge.vue'
import Hint from './components/Hint.vue'
import { anyColorHex } from './color'

const { theme, dark, rootAttrs } = useAppearance()
// The title bar and window frame follow the theme chosen here, not only the system's.
const rootEl = useTemplateRef<HTMLElement>('appRoot')
watch(
  [theme, dark, rootAttrs, rootEl],
  async () => {
    await nextTick()
    const bg = rootEl.value ? anyColorHex(getComputedStyle(rootEl.value).backgroundColor) : ''
    void bridge.invoke('window:appearance', theme.value, bg)
  },
  { immediate: true },
)
const { status } = useAuth()
const { done: onboarded, adopt } = useOnboarding()
// The first answer about the sign-in tells whether this is someone who used the app before the walk-through.
let adopted = false
watch(
  status,
  (s) => {
    if (!s || adopted) return
    adopted = true
    adopt(s.signedIn)
  },
  { immediate: true },
)
const { projects } = useProjects()
const { sort, groups, byRepo, folded, setSort, setByRepo, toggleFolded, markOpened, place: placeProjects } = useProjectOrder(projects)
watch(project, (path) => path && markOpened(path))
// Drag any project to put it where you want; the others slide out of the way, and the order switches to Custom.
const projectList = useTemplateRef<HTMLElement>('projectList')
// A repository with several folders moves as one block.
const groupByKey = computed(() => new Map(groups.value.map((g) => [g.key, g])))
const drag = useDragSort({
  items: () => groups.value.map((g) => g.key),
  list: () => projectList.value,
  onDrop: (keys) => placeProjects(keys.flatMap((k) => groupByKey.value.get(k)?.projects.map((p) => p.path) ?? [])),
})
const shownGroups = computed(() =>
  drag.preview.value ? drag.preview.value.flatMap((key) => groupByKey.value.get(key) ?? []) : groups.value,
)
// With a review open beside the sidebar, the sidebar marks the project the pull request belongs to.
const reviewProject = computed(() => {
  const pr = review.value
  if (!pr) return null
  const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase()
  return projects.value?.find((p) => same(p.github?.owner, pr.owner) && same(p.github?.repo, pr.repo))?.path ?? null
})
const isOpenProject = (path: string) =>
  reviewProject.value ? reviewProject.value === path : (view.value === 'project' || view.value === 'worktree') && project.value === path
const at = (v: View) => !reviewProject.value && view.value === v
// Choosing a place in the sidebar leaves the review for it.
function onNavClick(e: MouseEvent) {
  if (review.value && (e.target as Element | null)?.closest('[data-nav]')) review.value = null
}
// The grip says a row can be dragged: always faint in Custom, on hover otherwise, solid while it is carried.
// The grip stays out of the way: it fades in on the row under the pointer (or with keyboard focus),
// stays while that row is dragged, and every other grip hides during a drag.
const gripClass = (key: string) =>
  drag.dragging.value === key
    ? 'opacity-100 translate-x-0'
    : drag.dragging.value
      ? 'opacity-0 translate-x-1'
      : 'opacity-0 translate-x-1 group-hover/grip:translate-x-0 group-hover/grip:opacity-100 group-focus-visible/grip:translate-x-0 group-focus-visible/grip:opacity-100'
function clickProject(path: string) {
  if (!drag.wasDrag()) openProject(path)
}

// The sidebar is as wide as you drag it, and remembers that between launches.
const WIDTH_KEY = 'ps:sidebar-width'
const WIDTH = { min: 180, max: 420, normal: 232 }
const readWidth = () => {
  try {
    const n = Number(localStorage.getItem(WIDTH_KEY))
    return n >= WIDTH.min && n <= WIDTH.max ? n : WIDTH.normal
  } catch {
    return WIDTH.normal
  }
}
const sidebarWidth = shallowRef(readWidth())
const resizing = shallowRef(false)
function setWidth(n: number) {
  sidebarWidth.value = Math.round(Math.max(WIDTH.min, Math.min(WIDTH.max, n)))
  try {
    localStorage.setItem(WIDTH_KEY, String(sidebarWidth.value))
  } catch {
    // Nothing to remember without storage.
  }
}
function startResize(e: PointerEvent) {
  if (e.button !== 0) return
  e.preventDefault()
  const handle = e.currentTarget as HTMLElement
  handle.setPointerCapture(e.pointerId)
  const from = e.clientX - sidebarWidth.value
  resizing.value = true
  const move = (ev: PointerEvent) => {
    // Dragging well past the narrowest width folds it into the rail.
    if (ev.clientX - from < WIDTH.min - 80) {
      collapsed.value = true
      stop()
      return
    }
    setWidth(ev.clientX - from)
  }
  const stop = () => {
    resizing.value = false
    handle.removeEventListener('pointermove', move)
    handle.removeEventListener('pointerup', stop)
  }
  handle.addEventListener('pointermove', move)
  handle.addEventListener('pointerup', stop)
}
function resizeKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') setWidth(sidebarWidth.value - 16)
  else if (e.key === 'ArrowRight') setWidth(sidebarWidth.value + 16)
  else return
  e.preventDefault()
}
const portal = useTemplateRef<HTMLElement>('portal')
provide(portalTargetKey, portal)
const adding = shallowRef(false)
const { inbox, loadedAt: inboxAt, load: loadInbox } = useInbox()
// The count in the sidebar and the Needs you page stay current on their own.
useLive(
  () => status.value?.signedIn && loadInbox(),
  () => inboxAt.value,
)
const waitingCount = computed(() => inbox.value?.review.length ?? 0)
const autoApprove = shallowRef<AutoApproveStatus | null>(null)
const autoMode = computed(() => {
  const c = autoApprove.value?.config
  if (!c?.enabled || !c.rules.some((r) => r.enabled)) return null
  return c.dryRun ? { text: 'Dry run', cls: 'text-attention' } : { text: 'On', cls: 'text-success-fg' }
})
let offAuto: (() => void) | undefined
watch(
  () => status.value?.signedIn,
  async (signedIn) => {
    if (!signedIn) return
    void loadInbox()
    try {
      autoApprove.value = await bridge.invoke('autoapprove:status')
    } catch {
      autoApprove.value = null
    }
  },
  { immediate: true },
)

const TOOLS: { id: View; label: string; icon: typeof FolderGit2 }[] = [
  { id: 'worktrees', label: 'All worktrees', icon: FolderGit2 },
  { id: 'cleanup', label: 'Cleanup', icon: Trash2 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

// The sidebar folds into a rail of icons, and remembers that between launches.
const COLLAPSED_KEY = 'ps:sidebar-collapsed'
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}
const collapsed = shallowRef(readCollapsed())
watch(collapsed, (value) => {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0')
  } catch {
    // Nothing to remember without storage.
  }
})

const item = 'flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left transition-colors'
const rail = computed(() => (collapsed.value ? 'justify-center px-0' : ''))
const active = (on: boolean) =>
  on ? 'bg-accent font-semibold text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'

// Escape closes the review, unless a dialog or menu inside it is open and takes the key.
function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !review.value) return
  if (document.querySelector('[role="dialog"], [role="menu"]')) return
  review.value = null
}
// Pasting a pull request link anywhere outside a text field opens it, like typing it into an address bar.
function onPaste(e: ClipboardEvent) {
  const target = e.target as HTMLElement | null
  if (target?.closest('input, textarea, [contenteditable="true"]')) return
  const pull = parsePullLink(e.clipboardData?.getData('text/plain') ?? '')
  if (!pull) return
  e.preventDefault()
  openReview(pull)
}
// A small window gives the review all of it; the sidebar stays beside it only when there is room for both.
const roomy = useMediaQuery('(min-width: 1000px)')
const linkOpen = shallowRef(false)
const shortcutsOpen = shallowRef(false)
const typing = () => !!document.activeElement?.closest('input, textarea, [contenteditable="true"]')
// What the menu bar's items do here. Each has its shortcut there: ⌘, for Settings, ⌘1 to ⌘4 for the views, and so on.
let waitingCommand: MenuCommand | null = null
watch(status, () => {
  if (status.value && waitingCommand) onMenu(waitingCommand)
  waitingCommand = null
})
function onMenu(command: MenuCommand) {
  // A command that arrives with a new window waits for the sign-in check.
  if (!status.value) {
    waitingCommand = command
    return
  }
  if (!status.value.signedIn || !onboarded.value) return
  const go = (v: View) => {
    review.value = null
    view.value = v
  }
  switch (command) {
    case 'settings':
    case 'account':
      return go(command)
    case 'view:inbox':
    case 'view:autoapprove':
    case 'view:worktrees':
    case 'view:cleanup':
      return go(command.slice(5) as View)
    case 'add-project':
      adding.value = true
      return
    case 'open-link':
      linkOpen.value = true
      return
    case 'shortcuts':
      shortcutsOpen.value = true
      return
    case 'refresh':
      return refreshNow()
    case 'toggle-sidebar':
      if (review.value && reviewFocus.value) reviewFocus.value = false
      else collapsed.value = !collapsed.value
      return
    case 'focus':
      if (review.value) reviewFocus.value = !reviewFocus.value
      return
    case 'back':
      if (typing()) return
      if (review.value) review.value = null
      else goBack()
      return
    case 'pull:previous':
    case 'pull:next':
      // Not while writing: leaving would drop the comment being typed.
      if (!typing()) stepReview(command === 'pull:next' ? 1 : -1)
      return
    case 'find': {
      // The review's file search when a review is open, otherwise the page's filter.
      const scope = review.value ? document.querySelector('[data-review]') : document.querySelector('.ps-root main')
      const field = scope?.querySelector<HTMLInputElement>(
        'input[aria-label^="Filter"], input[placeholder^="Search"], input[placeholder^="Filter"]',
      )
      field?.focus()
      field?.select()
    }
  }
}
let offPull: (() => void) | undefined
let offMenu: (() => void) | undefined
onMounted(() => {
  offMenu = bridge.on('menu:command', onMenu)
  document.addEventListener('keydown', onKey)
  document.addEventListener('paste', onPaste)
  offAuto = bridge.on('autoapprove:changed', (next) => (autoApprove.value = next))
  // A prsift:// link, from the browser or a teammate, opens its pull request here.
  offPull = bridge.on('pull:open', (pull) => openReview(pull))
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('paste', onPaste)
  offAuto?.()
  offPull?.()
  offMenu?.()
})

function onAdded(paths: string[]) {
  if (paths.length === 1) openProject(paths[0]!, 'pulls')
}
</script>

<template>
  <TooltipProvider :delay-duration="250">
    <div ref="appRoot" class="ps-root h-full bg-background text-foreground" :class="{ dark }" v-bind="rootAttrs">
      <div v-if="!status" class="flex h-full items-center justify-center"><Spinner class="size-5" /></div>
      <Onboarding v-else-if="!status.signedIn || !onboarded" />
      <div v-else class="flex h-full">
        <nav
          class="relative flex shrink-0 flex-col gap-0.5 border-r border-border bg-background py-4"
          :class="[collapsed ? 'w-[56px] px-2' : 'px-3', resizing ? '' : 'transition-[width] duration-150']"
          :style="collapsed ? undefined : { width: `${sidebarWidth}px` }"
          aria-label="Sections"
          @click.capture="onNavClick"
        >
          <div
            v-if="!collapsed"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize the sidebar"
            :aria-valuenow="sidebarWidth"
            :aria-valuemin="WIDTH.min"
            :aria-valuemax="WIDTH.max"
            tabindex="0"
            title="Drag to resize · double-click to reset"
            class="group absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize outline-none"
            @pointerdown="startResize"
            @dblclick="setWidth(WIDTH.normal)"
            @keydown="resizeKey"
          >
            <span
              class="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              :class="resizing ? 'opacity-100' : ''"
            />
          </div>
          <div class="flex items-center gap-2.5 pt-1 pb-[18px]" :class="collapsed ? 'justify-center' : 'pl-2.5'">
            <template v-if="!collapsed">
              <AppLogo class="size-[22px]" />
              <span class="text-sm font-semibold">PR Sift</span>
            </template>
            <button
              type="button"
              class="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              :class="collapsed ? '' : 'ml-auto'"
              :aria-label="collapsed ? 'Show the sidebar' : 'Hide the sidebar'"
              :aria-expanded="!collapsed"
              @click="collapsed = !collapsed"
            >
              <PanelLeftOpen v-if="collapsed" class="size-4" /><PanelLeftClose v-else class="size-4" />
            </button>
          </div>
          <Hint text="Needs you" side="right" :disabled="!collapsed">
            <button type="button" :class="[item, rail, active(at('inbox'))]" aria-label="Needs you" data-nav @click="view = 'inbox'">
              <span class="relative flex"
                ><Inbox class="size-4" /><span
                  v-if="collapsed && waitingCount"
                  class="absolute -top-1 -right-1 size-2 rounded-full bg-attention"
                  aria-hidden="true"
              /></span>
              <template v-if="!collapsed">
                Needs you
                <CountBadge v-if="waitingCount" class="ml-auto">{{ waitingCount }}</CountBadge>
              </template>
            </button>
          </Hint>
          <Hint text="Auto-approve" side="right" :disabled="!collapsed">
            <button
              type="button"
              :class="[item, rail, active(at('autoapprove'))]"
              aria-label="Auto-approve"
              data-nav
              @click="view = 'autoapprove'"
            >
              <BadgeCheck class="size-4" />
              <template v-if="!collapsed">
                Auto-approve
                <span v-if="autoMode" class="ml-auto text-[11px]" :class="autoMode.cls">{{ autoMode.text }}</span>
              </template>
            </button>
          </Hint>

          <div v-if="!collapsed" class="flex items-center gap-0.5 px-2.5 pt-5 pb-2">
            <SectionLabel>Projects</SectionLabel>
            <span class="flex-1" />
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <button
                  type="button"
                  class="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
                  aria-label="Sort projects"
                >
                  <ArrowDownUp class="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-60">
                <DropdownMenuLabel class="text-xs">Sort projects by</DropdownMenuLabel>
                <DropdownMenuRadioGroup :model-value="sort" @update:model-value="(v) => setSort(v as ProjectSort)">
                  <DropdownMenuRadioItem v-for="o in PROJECT_SORTS" :key="o.value" :value="o.value" class="items-start">
                    <span class="flex flex-col">
                      <span>{{ o.label }}</span>
                      <span class="text-[11px] text-muted-foreground">{{ o.hint }}</span>
                    </span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem :model-value="byRepo" class="items-start" @update:model-value="(v) => setByRepo(!!v)">
                  <span class="flex flex-col">
                    <span>Group by repository</span>
                    <span class="text-[11px] text-muted-foreground">Folders of the same repository sit together</span>
                  </span>
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              class="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Add projects"
              aria-label="Add projects"
              @click="adding = true"
            >
              <Plus class="size-3.5" />
            </button>
          </div>
          <div v-else role="separator" class="mx-1 my-3 h-px bg-border" />
          <div ref="projectList" class="relative -mx-1 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-1">
            <TransitionGroup tag="div" class="flex flex-col gap-0.5" move-class="transition-transform duration-200 ease-out">
              <div
                v-for="g in shownGroups"
                :key="g.key"
                :data-sort-id="g.key"
                class="relative flex flex-col gap-0.5 rounded-md"
                :class="drag.dragging.value === g.key ? 'z-10 bg-accent shadow-md ring-1 ring-border' : ''"
              >
                <!-- A repository with several folders: its name, then its folders, which fold away. Folded or in the rail, they show flat. -->
                <template v-if="g.projects.length > 1 && !collapsed">
                  <button
                    type="button"
                    :class="[item, 'group/grip text-foreground']"
                    :aria-expanded="!folded.includes(g.key)"
                    :title="g.key"
                    @pointerdown="drag.down($event, g.key)"
                    @click="!drag.wasDrag() && toggleFolded(g.key)"
                  >
                    <ProjectIcon :project="g.projects[0]!" :size="18" />
                    <span class="min-w-0 truncate">{{ g.title }}</span>
                    <span class="text-[11px] text-muted-foreground tabular-nums">{{ g.projects.length }}</span>
                    <ChevronRight
                      class="size-3.5 shrink-0 text-muted-foreground transition-transform"
                      :class="folded.includes(g.key) ? '' : 'rotate-90'"
                    />
                    <span class="flex-1" />
                    <GripVertical
                      class="size-3.5 shrink-0 cursor-grab text-muted-foreground transition-[opacity,translate] duration-150 ease-out"
                      :class="gripClass(g.key)"
                      aria-hidden="true"
                    />
                  </button>
                  <template v-if="!folded.includes(g.key)">
                    <button
                      v-for="p in g.projects"
                      :key="p.path"
                      type="button"
                      :class="[item, 'h-7 pl-[34px] text-[13px] text-foreground', active(isOpenProject(p.path))]"
                      :title="p.path"
                      :aria-label="p.name"
                      data-nav
                      @click="openProject(p.path)"
                    >
                      <span class="min-w-0 truncate">{{ p.name }}</span>
                      <span v-if="p.branch" class="ml-auto min-w-0 truncate font-mono text-[10px] text-muted-foreground">{{
                        p.branch
                      }}</span>
                    </button>
                  </template>
                </template>
                <template v-else>
                  <Hint v-for="p in g.projects" :key="p.path" :text="p.name" side="right" :disabled="!collapsed || !!drag.dragging.value">
                    <button
                      type="button"
                      :class="[item, rail, 'group/grip text-foreground', active(isOpenProject(p.path))]"
                      :aria-label="p.name"
                      data-nav
                      @pointerdown="drag.down($event, g.key)"
                      @click="clickProject(p.path)"
                    >
                      <ProjectIcon :project="p" :size="18" />
                      <template v-if="!collapsed">
                        <span class="min-w-0 flex-1 truncate">{{ p.name }}</span>
                        <GripVertical
                          class="size-3.5 shrink-0 cursor-grab text-muted-foreground transition-[opacity,translate] duration-150 ease-out"
                          :class="gripClass(g.key)"
                          aria-hidden="true"
                        />
                      </template>
                    </button>
                  </Hint>
                </template>
              </div>
            </TransitionGroup>
            <button
              v-if="projects && !projects.length && !collapsed"
              type="button"
              :class="[item, 'text-muted-foreground']"
              @click="adding = true"
            >
              <Plus class="size-4" /> Add your first project
            </button>
          </div>

          <div class="mt-2 flex flex-col gap-0.5 border-t border-border pt-2">
            <Hint v-for="t in TOOLS" :key="t.id" :text="t.label" side="right" :disabled="!collapsed">
              <button type="button" :class="[item, rail, active(at(t.id))]" :aria-label="t.label" data-nav @click="view = t.id">
                <component :is="t.icon" class="size-4" /><template v-if="!collapsed">{{ t.label }}</template>
              </button>
            </Hint>
            <div role="separator" class="my-1.5 h-px bg-border" :class="collapsed ? 'mx-1' : 'mx-2.5'" />
            <Hint :text="status.account?.login ?? 'Account'" side="right" :disabled="!collapsed">
              <button
                type="button"
                :class="[item, rail, 'h-10 text-foreground', active(at('account'))]"
                aria-label="Account"
                data-nav
                @click="view = 'account'"
              >
                <img v-if="status.account?.avatarUrl" :src="status.account.avatarUrl" alt="" class="size-6 shrink-0 rounded-full" />
                <span v-else class="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] uppercase">{{
                  status.account?.login.slice(0, 1)
                }}</span>
                <span v-if="!collapsed" class="flex min-w-0 flex-col leading-4 font-normal">
                  <span class="truncate font-medium">{{ status.account?.name || status.account?.login }}</span>
                  <span v-if="status.account?.name" class="truncate text-[11px] text-muted-foreground">{{ status.account.login }}</span>
                </span>
              </button>
            </Hint>
          </div>
        </nav>
        <div class="relative min-w-0 flex-1">
          <main class="@container h-full overflow-y-auto" :inert="!!review || undefined">
            <InboxView v-if="view === 'inbox'" />
            <ProjectView v-else-if="view === 'project'" />
            <WorktreeChanges v-else-if="view === 'worktree' && worktree" :key="worktree" :path="worktree" />
            <AutoApprove v-else-if="view === 'autoapprove'" />
            <Worktrees v-else-if="view === 'worktrees'" />
            <Cleanup v-else-if="view === 'cleanup'" />
            <SettingsView v-else-if="view === 'settings'" />
            <Account v-else />
          </main>
          <!-- One panel either way, so switching Focus keeps the review where it is: inline beside the sidebar, or over the window. -->
          <ReviewPanel
            v-if="review && status?.signedIn"
            :key="prKey(review)"
            :pr="review"
            back
            data-review
            :inline="!reviewFocus && roomy"
            @close="review = null"
          >
            <template #tools="{ title }"><ReviewNav /><ShareMenu :pr="review" :title="title" /></template>
          </ReviewPanel>
        </div>
      </div>
      <AddProjectDialog v-model:open="adding" @added="onAdded" />
      <OpenLinkDialog v-model:open="linkOpen" />
      <ShortcutsDialog v-model:open="shortcutsOpen" />
      <div ref="portal" />
    </div>
  </TooltipProvider>
</template>
