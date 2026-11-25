<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, shallowRef, useTemplateRef, watch } from 'vue'
import { BadgeCheck, FolderGit2, Inbox, PanelLeftClose, PanelLeftOpen, Plus, Settings, Trash2 } from '@lucide/vue'
import { Spinner } from '@/components/ui/spinner'
import { TooltipProvider } from '@/components/ui/tooltip'
import BrandMark from '@/components/BrandMark.vue'
import ReviewPanel from '@/features/review/ReviewPanel.vue'
import { useAppearance } from '@/features/appearance/useAppearance'
import { portalTargetKey } from '@/lib/portal'
import { prKey } from '@/lib/types'
import { useAuth } from './useAuth'
import { useProjects } from './useProjects'
import { useInbox } from './useInbox'
import { bridge } from './bridge'
import type { AutoApproveStatus } from '#shared/ipc'
import { openProject, project, review, view, worktree, type View } from './navigation'
import SignIn from './views/SignIn.vue'
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

const { dark } = useAppearance()
const { status } = useAuth()
const { projects } = useProjects()
const portal = useTemplateRef<HTMLElement>('portal')
provide(portalTargetKey, portal)
const adding = shallowRef(false)
const { inbox, load: loadInbox } = useInbox()
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
onMounted(() => {
  document.addEventListener('keydown', onKey)
  offAuto = bridge.on('autoapprove:changed', (next) => (autoApprove.value = next))
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  offAuto?.()
})

function onAdded(paths: string[]) {
  if (paths.length === 1) openProject(paths[0]!, 'pulls')
}
</script>

<template>
  <TooltipProvider :delay-duration="250">
    <div class="ps-root h-full bg-background text-foreground" :class="{ dark }">
      <div v-if="!status" class="flex h-full items-center justify-center"><Spinner class="size-5" /></div>
      <SignIn v-else-if="!status.signedIn" />
      <div v-else class="flex h-full">
        <nav
          class="flex shrink-0 flex-col gap-0.5 border-r border-border bg-background py-4 transition-[width] duration-150"
          :class="collapsed ? 'w-[56px] px-2' : 'w-[232px] px-3'"
          aria-label="Sections"
        >
          <div class="flex items-center gap-2.5 pt-1 pb-[18px]" :class="collapsed ? 'justify-center' : 'pl-2.5'">
            <template v-if="!collapsed">
              <span class="flex size-[22px] items-center justify-center rounded-md bg-foreground text-background">
                <BrandMark class="size-3.5" />
              </span>
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
            <button type="button" :class="[item, rail, active(view === 'inbox')]" aria-label="Needs you" @click="view = 'inbox'">
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
              :class="[item, rail, active(view === 'autoapprove')]"
              aria-label="Auto-approve"
              @click="view = 'autoapprove'"
            >
              <BadgeCheck class="size-4" />
              <template v-if="!collapsed">
                Auto-approve
                <span v-if="autoMode" class="ml-auto text-[11px]" :class="autoMode.cls">{{ autoMode.text }}</span>
              </template>
            </button>
          </Hint>

          <div v-if="!collapsed" class="flex items-center justify-between px-2.5 pt-5 pb-2">
            <SectionLabel>Projects</SectionLabel>
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
          <div class="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1">
            <Hint v-for="p in projects ?? []" :key="p.path" :text="p.name" side="right" :disabled="!collapsed">
              <button
                type="button"
                :class="[item, rail, 'text-foreground', active((view === 'project' || view === 'worktree') && project === p.path)]"
                :aria-label="p.name"
                @click="openProject(p.path)"
              >
                <ProjectIcon :project="p" :size="18" />
                <span v-if="!collapsed" class="truncate">{{ p.name }}</span>
              </button>
            </Hint>
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
              <button type="button" :class="[item, rail, active(view === t.id)]" :aria-label="t.label" @click="view = t.id">
                <component :is="t.icon" class="size-4" /><template v-if="!collapsed">{{ t.label }}</template>
              </button>
            </Hint>
            <div role="separator" class="my-1.5 h-px bg-border" :class="collapsed ? 'mx-1' : 'mx-2.5'" />
            <Hint :text="status.account?.login ?? 'Account'" side="right" :disabled="!collapsed">
              <button
                type="button"
                :class="[item, rail, 'h-10 text-foreground', active(view === 'account')]"
                aria-label="Account"
                @click="view = 'account'"
              >
                <img v-if="status.account?.avatarUrl" :src="status.account.avatarUrl" alt="" class="size-6 shrink-0 rounded-full" />
                <span v-else class="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] uppercase">{{
                  status.account?.login.slice(0, 1)
                }}</span>
                <span v-if="!collapsed" class="flex min-w-0 flex-col leading-4 font-normal">
                  <span class="truncate">{{ status.account?.login }}</span>
                  <span class="truncate text-[11px] text-muted-foreground">{{
                    status.source === 'gh' ? 'Signed in with GitHub CLI' : 'Signed in with a token'
                  }}</span>
                </span>
              </button>
            </Hint>
          </div>
        </nav>
        <main class="@container min-w-0 flex-1 overflow-y-auto">
          <InboxView v-if="view === 'inbox'" />
          <ProjectView v-else-if="view === 'project'" />
          <WorktreeChanges v-else-if="view === 'worktree' && worktree" :key="worktree" :path="worktree" />
          <AutoApprove v-else-if="view === 'autoapprove'" />
          <Worktrees v-else-if="view === 'worktrees'" />
          <Cleanup v-else-if="view === 'cleanup'" />
          <SettingsView v-else-if="view === 'settings'" />
          <Account v-else />
        </main>
      </div>
      <ReviewPanel v-if="review && status?.signedIn" :key="prKey(review)" :pr="review" back @close="review = null" />
      <AddProjectDialog v-model:open="adding" @added="onAdded" />
      <div ref="portal" />
    </div>
  </TooltipProvider>
</template>
