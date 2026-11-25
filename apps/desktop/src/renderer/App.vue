<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, shallowRef, useTemplateRef, watch } from 'vue'
import { BadgeCheck, FolderGit2, Inbox, Plus, Settings, Trash2 } from '@lucide/vue'
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
import { openProject, project, review, view, type View } from './navigation'
import SignIn from './views/SignIn.vue'
import InboxView from './views/Inbox.vue'
import ProjectView from './views/Project.vue'
import AutoApprove from './views/AutoApprove.vue'
import Worktrees from './views/Worktrees.vue'
import Cleanup from './views/Cleanup.vue'
import SettingsView from './views/Settings.vue'
import Account from './views/Account.vue'
import AddProjectDialog from './components/AddProjectDialog.vue'
import ProjectIcon from './components/ProjectIcon.vue'
import SectionLabel from './components/SectionLabel.vue'

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
  return c.dryRun ? { text: 'Dry run', cls: 'text-attention' } : { text: 'Live', cls: 'text-success-fg' }
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

const item = 'flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left transition-colors'
const active = (on: boolean) => (on ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground')

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
        <nav class="flex w-[232px] shrink-0 flex-col gap-0.5 border-r border-border bg-sidebar px-3 py-4" aria-label="Sections">
          <div class="flex items-center gap-2.5 px-2.5 pt-1 pb-[18px]">
            <span class="flex size-[22px] items-center justify-center rounded-md bg-foreground text-background">
              <BrandMark class="size-3.5" />
            </span>
            <span class="text-sm font-semibold">PR Sift</span>
          </div>
          <button type="button" :class="[item, active(view === 'inbox')]" @click="view = 'inbox'">
            <Inbox class="size-4" /> Needs you
            <span
              v-if="waitingCount"
              class="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emphasis/16 px-1.5 text-[11px] font-semibold text-emphasis tabular-nums"
              >{{ waitingCount }}</span
            >
          </button>
          <button type="button" :class="[item, active(view === 'autoapprove')]" @click="view = 'autoapprove'">
            <BadgeCheck class="size-4" /> Auto-approve
            <span v-if="autoMode" class="ml-auto text-[11px]" :class="autoMode.cls">{{ autoMode.text }}</span>
          </button>

          <div class="flex items-center justify-between px-2.5 pt-5 pb-2">
            <SectionLabel>Projects</SectionLabel>
            <button
              type="button"
              class="rounded p-0.5 text-faint hover:bg-accent hover:text-foreground"
              title="Add projects"
              aria-label="Add projects"
              @click="adding = true"
            >
              <Plus class="size-4" />
            </button>
          </div>
          <div class="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1">
            <button
              v-for="p in projects ?? []"
              :key="p.path"
              type="button"
              :class="[item, active(view === 'project' && project === p.path)]"
              :title="p.path"
              @click="openProject(p.path)"
            >
              <ProjectIcon :project="p" :size="18" />
              <span class="truncate">{{ p.name }}</span>
            </button>
            <button v-if="projects && !projects.length" type="button" :class="[item, 'text-muted-foreground']" @click="adding = true">
              <Plus class="size-4" /> Add your first project
            </button>
          </div>

          <div class="mt-2 flex flex-col gap-0.5 border-t border-border pt-2">
            <button v-for="t in TOOLS" :key="t.id" type="button" :class="[item, active(view === t.id)]" @click="view = t.id">
              <component :is="t.icon" class="size-4" /> {{ t.label }}
            </button>
            <button type="button" :class="[item, 'h-10', active(view === 'account')]" @click="view = 'account'">
              <img v-if="status.account?.avatarUrl" :src="status.account.avatarUrl" alt="" class="size-6 rounded-full" />
              <span class="truncate">{{ status.account?.login }}</span>
            </button>
          </div>
        </nav>
        <main class="min-w-0 flex-1 overflow-y-auto">
          <InboxView v-if="view === 'inbox'" />
          <ProjectView v-else-if="view === 'project'" />
          <AutoApprove v-else-if="view === 'autoapprove'" />
          <Worktrees v-else-if="view === 'worktrees'" />
          <Cleanup v-else-if="view === 'cleanup'" />
          <SettingsView v-else-if="view === 'settings'" />
          <Account v-else />
        </main>
      </div>
      <ReviewPanel v-if="review && status?.signedIn" :key="prKey(review)" :pr="review" @close="review = null" />
      <AddProjectDialog v-model:open="adding" @added="onAdded" />
      <div ref="portal" />
    </div>
  </TooltipProvider>
</template>
