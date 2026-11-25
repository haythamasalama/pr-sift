<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { CircleAlert, GitBranch, Trash2 } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Branch } from '#shared/ipc'
import type { PullItem } from '~/github'
import { bridge } from '~/bridge'
import { appInfo } from '~/appInfo'
import { errorText, formatAgo, shortPath } from '~/format'
import { openReview } from '~/navigation'
import ConfirmDialog from './ConfirmDialog.vue'

const { repo, pulls = [] } = defineProps<{ repo: string; pulls?: PullItem[] }>()

const branches = shallowRef<Branch[] | null>(null)
const error = shallowRef('')
const filter = shallowRef<'all' | 'cleanup'>('all')
const target = shallowRef<Branch | null>(null)
const force = shallowRef(false)
const busy = shallowRef(false)

const STALE = 60 * 24 * 60 * 60 * 1000
const byBranch = computed(() => new Map(pulls.map((p) => [p.branch, p])))
// Safe to delete: merged, or its remote branch is gone, and not checked out anywhere.
const removable = (b: Branch) => !b.current && !b.worktree && (b.merged || b.gone)
const stale = (b: Branch) => Date.now() - b.lastCommit > STALE
const shown = computed(() => {
  const list = branches.value ?? []
  return filter.value === 'cleanup'
    ? list.filter((b) => removable(b) || (stale(b) && !b.current && !b.worktree && !byBranch.value.has(b.name)))
    : list
})
const cleanupCount = computed(() => (branches.value ?? []).filter((b) => removable(b)).length)

async function load() {
  error.value = ''
  try {
    branches.value = await bridge.invoke('branches:list', repo)
  } catch (e) {
    error.value = errorText(e)
    branches.value = []
  }
}

function askDelete(b: Branch) {
  force.value = !b.merged
  target.value = b
}

async function confirmDelete() {
  const b = target.value
  if (!b) return
  busy.value = true
  const res = await bridge.invoke('branches:delete', repo, b.name, force.value)
  busy.value = false
  target.value = null
  if (!res.ok) error.value = res.error ?? 'Could not delete the branch.'
  await load()
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-3">
      <ToggleGroup v-model="filter" type="single" variant="outline" size="sm" aria-label="Show">
        <ToggleGroupItem value="all">All {{ branches?.length ?? '' }}</ToggleGroupItem>
        <ToggleGroupItem value="cleanup">Can be cleaned up {{ cleanupCount || '' }}</ToggleGroupItem>
      </ToggleGroup>
      <span class="text-xs text-muted-foreground">Local branches, newest first.</span>
    </div>
    <Alert v-if="error" variant="destructive"
      ><CircleAlert /><AlertDescription>{{ error }}</AlertDescription></Alert
    >
    <div v-if="!branches" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Reading branches…</div>
    <p v-else-if="!shown.length" class="text-muted-foreground">Nothing to clean up.</p>
    <ul v-else class="divide-y divide-border overflow-hidden rounded-lg border border-border">
      <li v-for="b in shown" :key="b.name" class="flex items-center gap-3 px-4 py-2">
        <GitBranch class="size-4 shrink-0 text-muted-foreground" />
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="truncate font-medium">{{ b.name }}</span>
            <Badge v-if="b.current" variant="outline">Checked out</Badge>
            <Badge v-if="b.worktree && !b.current" variant="outline" :title="b.worktree">In a worktree</Badge>
            <Badge v-if="b.merged" variant="outline" class="border-success/50 text-success">Merged</Badge>
            <Badge v-if="b.gone" variant="outline" class="border-attention/50 text-attention" title="The branch was deleted on GitHub"
              >Deleted on remote</Badge
            >
            <Badge v-if="!b.upstream && !b.merged" variant="outline">Local only</Badge>
            <Badge v-if="b.ahead" variant="outline">{{ b.ahead }} ahead</Badge>
            <Badge v-if="b.behind" variant="outline">{{ b.behind }} behind</Badge>
            <button
              v-if="byBranch.get(b.name)"
              type="button"
              class="rounded-full border border-emphasis/40 px-2 text-xs text-emphasis hover:bg-emphasis/10"
              @click="
                openReview({ owner: byBranch.get(b.name)!.owner, repo: byBranch.get(b.name)!.repo, number: byBranch.get(b.name)!.number })
              "
            >
              PR #{{ byBranch.get(b.name)!.number }}
            </button>
          </div>
          <span class="truncate text-xs text-muted-foreground"
            >{{ b.subject }} · {{ formatAgo(b.lastCommit)
            }}<template v-if="b.worktree && !b.current"> · {{ shortPath(b.worktree, appInfo.home) }}</template></span
          >
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          :disabled="b.current || !!b.worktree"
          :title="b.current || b.worktree ? 'Checked out, so it can’t be deleted' : 'Delete branch'"
          aria-label="Delete branch"
          @click="askDelete(b)"
        >
          <Trash2 />
        </Button>
      </li>
    </ul>
  </div>

  <ConfirmDialog
    :open="target !== null"
    :title="`Delete ${target?.name ?? ''}?`"
    :description="
      target?.merged
        ? 'It is merged, so no work is lost. The branch on GitHub is not touched.'
        : 'This branch has commits that are not merged into the default branch. They will be lost unless they exist somewhere else.'
    "
    confirm="Delete branch"
    :busy="busy"
    @update:open="(v) => !v && (target = null)"
    @confirm="confirmDelete"
  />
</template>
