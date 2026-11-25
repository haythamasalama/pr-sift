<script setup lang="ts">
import { computed, onMounted, reactive, shallowRef } from 'vue'
import { CircleAlert, Ellipsis, ExternalLink, FolderOpen, RefreshCw, Trash2, X } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import NoticeBar from '@/components/NoticeBar.vue'
import type { Branch, Project, WorktreeDetails } from '#shared/ipc'
import { bridge } from '~/bridge'
import { readCache, writeCache } from '~/cache'
import { appInfo } from '~/appInfo'
import { errorText, formatBytes, projectPath } from '~/format'
import { openProject, openWorktree } from '~/navigation'
import { usePathText, useProjectFolders } from '~/useProjectFolders'
import { useProjects } from '~/useProjects'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import Hint from '~/components/Hint.vue'
import PageHeader from '~/components/PageHeader.vue'
import Segmented from '~/components/Segmented.vue'
import SectionLabel from '~/components/SectionLabel.vue'

const short = usePathText()

// Worktrees and branches that can go without losing work, across every project.
type Kind = 'worktree' | 'branch'
type Why = 'merged' | 'gone' | 'stale'
interface Item {
  key: string
  kind: Kind
  name: string
  // The worktree folder, or the repository the branch is in.
  path: string
  project: Project
  why: Why
  idleDays: number
  size?: number
  url?: string
}

const DAY = 24 * 60 * 60 * 1000
const STALE_DAYS = 60
const { projects } = useProjects()
const { settings } = useProjectFolders()
const items = shallowRef<Item[]>(readCache<Item[]>('cleanup')?.value ?? [])
const selected = reactive(new Set<string>())
const filter = shallowRef<'all' | Kind>('all')
const scanning = shallowRef(false)
const scanned = shallowRef(items.value.length > 0)
const error = shallowRef('')
const notice = shallowRef('')
const confirming = shallowRef(false)
const deleting = shallowRef(false)

const shown = computed(() => (filter.value === 'all' ? items.value : items.value.filter((i) => i.kind === filter.value)))
const worktrees = computed(() => items.value.filter((i) => i.kind === 'worktree'))
const branches = computed(() => items.value.filter((i) => i.kind === 'branch'))
const freeable = computed(() => worktrees.value.reduce((sum, i) => sum + (i.size ?? 0), 0))
const picked = computed(() => items.value.filter((i) => selected.has(i.key)))
const pickedSize = computed(() => picked.value.reduce((sum, i) => sum + (i.size ?? 0), 0))
const allState = computed(() => {
  const n = shown.value.filter((i) => selected.has(i.key)).length
  return n === 0 ? false : n === shown.value.length ? true : 'indeterminate'
})
const FILTERS = computed(() => [
  { value: 'all' as const, label: 'All', count: items.value.length },
  { value: 'worktree' as const, label: 'Worktrees', count: worktrees.value.length },
  { value: 'branch' as const, label: 'Branches', count: branches.value.length },
])
const STATS = computed(() => [
  { label: 'Can be freed', value: freeable.value ? formatBytes(freeable.value) : '—' },
  { label: 'Worktrees to remove', value: String(worktrees.value.length) },
  { label: 'Branches to remove', value: String(branches.value.length) },
])

const WHY: Record<Why, { text: (i: Item) => string; tone: string; hint: string }> = {
  merged: { text: () => 'Merged', tone: 'text-merged', hint: 'Its commits are already in the main branch, so nothing is lost.' },
  gone: {
    text: () => 'Gone on GitHub',
    tone: 'text-destructive',
    hint: 'The branch was deleted on GitHub, usually after its pull request closed.',
  },
  stale: {
    text: (i) => `Untouched for ${i.idleDays >= 60 ? `${Math.floor(i.idleDays / 30)} months` : `${i.idleDays} days`}`,
    tone: 'text-muted-foreground',
    hint: 'Pushed to GitHub and not changed in a long time.',
  },
}
const where = (p: Project) => projectPath(p.path, settings.value?.roots ?? [], appInfo.home)
const ghUrl = (p: Project, branch: string) =>
  p.github ? `https://github.com/${p.github.owner}/${p.github.repo}/tree/${branch.split('/').map(encodeURIComponent).join('/')}` : undefined

function branchReason(b: Branch): Why | null {
  if (b.current || b.worktree) return null
  if (b.merged) return 'merged'
  if (b.gone) return 'gone'
  // An old branch is only offered when GitHub has every commit, so deleting the local copy loses nothing.
  if (b.upstream && !b.ahead && Date.now() - b.lastCommit > STALE_DAYS * DAY) return 'stale'
  return null
}

async function look(p: Project): Promise<Item[]> {
  const found: Item[] = []
  const [repo, list] = await Promise.all([bridge.invoke('worktrees:list', p.path), bridge.invoke('branches:list', p.path)])
  for (const b of list) {
    const why = branchReason(b)
    if (why)
      found.push({
        key: `branch:${p.path}:${b.name}`,
        kind: 'branch',
        name: b.name,
        path: p.path,
        project: p,
        why,
        idleDays: Math.floor((Date.now() - b.lastCommit) / DAY),
        url: b.upstream && !b.gone ? ghUrl(p, b.upstream.replace(/^origin\//, '')) : undefined,
      })
  }
  const linked = repo.worktrees.filter((w) => !w.main && !w.prunable && !w.locked)
  const details = await Promise.all(
    linked.map((w) => bridge.invoke('worktrees:details', w.path).catch(() => null as WorktreeDetails | null)),
  )
  linked.forEach((w, n) => {
    const d = details[n]
    // Uncommitted or unpushed work is never offered.
    if (!d || d.changed || d.unpushed || (!d.upstream && !d.merged)) return
    const idleDays = d.lastUsed ? Math.floor((Date.now() - d.lastUsed) / DAY) : 0
    const why: Why | null = d.merged ? 'merged' : idleDays > STALE_DAYS ? 'stale' : null
    if (!why) return
    found.push({
      key: `worktree:${w.path}`,
      kind: 'worktree',
      name: w.branch ?? w.path.split(/[\\/]/).pop() ?? w.path,
      path: w.path,
      project: p,
      why,
      idleDays,
      size: d.size,
      url: w.branch ? ghUrl(p, w.branch) : undefined,
    })
  })
  return found
}

async function scan() {
  if (scanning.value) return
  scanning.value = true
  error.value = ''
  try {
    const list = (projects.value ?? (await bridge.invoke('projects:list'))).filter((p) => !p.missing)
    const results = await Promise.all(list.map((p) => look(p).catch(() => [] as Item[])))
    items.value = writeCache(
      'cleanup',
      results
        .flat()
        .sort((a, b) => (a.kind === b.kind ? (b.size ?? 0) - (a.size ?? 0) || b.idleDays - a.idleDays : a.kind === 'worktree' ? -1 : 1)),
    ).value
    const keys = new Set(items.value.map((i) => i.key))
    for (const k of [...selected]) if (!keys.has(k)) selected.delete(k)
    scanned.value = true
  } catch (e) {
    error.value = errorText(e)
  } finally {
    scanning.value = false
  }
}

function toggle(key: string, on: boolean) {
  if (on) selected.add(key)
  else selected.delete(key)
}
function toggleAll(on: boolean) {
  for (const i of shown.value) toggle(i.key, on)
}

async function confirmDelete() {
  deleting.value = true
  const failed: string[] = []
  let worktreesDone = 0
  let branchesDone = 0
  for (const i of picked.value.filter((x) => x.kind === 'worktree')) {
    try {
      await bridge.invoke('worktrees:remove', i.path)
      worktreesDone++
    } catch (e) {
      failed.push(`${i.name}: ${errorText(e)}`)
    }
  }
  const byRepo = new Map<string, string[]>()
  for (const i of picked.value.filter((x) => x.kind === 'branch')) byRepo.set(i.path, [...(byRepo.get(i.path) ?? []), i.name])
  for (const [repo, names] of byRepo) {
    try {
      const res = await bridge.invoke('branches:delete-many', repo, names, { force: true, remote: false })
      branchesDone += res.deleted.length
      failed.push(...res.failed.map((f) => `${f.name}: ${f.error}`))
    } catch (e) {
      failed.push(errorText(e))
    }
  }
  const parts: string[] = []
  if (worktreesDone) parts.push(`deleted ${worktreesDone} ${worktreesDone === 1 ? 'worktree' : 'worktrees'}`)
  if (branchesDone) parts.push(`deleted ${branchesDone} ${branchesDone === 1 ? 'branch' : 'branches'}`)
  notice.value = parts.length ? `${parts.join(' and ').replace(/^./, (c) => c.toUpperCase())}.` : ''
  error.value = failed.join('\n')
  selected.clear()
  deleting.value = false
  confirming.value = false
  await scan()
}

onMounted(scan)
</script>

<template>
  <PageHeader title="Cleanup" description="Worktrees and branches you can safely remove, across all projects.">
    <Button size="icon-sm" variant="ghost" class="text-muted-foreground" aria-label="Look again" :disabled="scanning" @click="scan"
      ><Spinner v-if="scanning" /><RefreshCw v-else
    /></Button>
  </PageHeader>

  <NoticeBar v-if="notice">
    <template #icon><Trash2 /></template>
    {{ notice }}
    <template #actions><Button size="xs" variant="ghost" @click="notice = ''">Dismiss</Button></template>
  </NoticeBar>

  <div class="@container flex flex-col gap-4 px-8 py-5">
    <div class="grid grid-cols-3 gap-3 @max-xl:grid-cols-1">
      <div v-for="s in STATS" :key="s.label" class="flex flex-col gap-1 rounded-lg bg-muted px-4 py-3.5">
        <span class="text-xs text-muted-foreground">{{ s.label }}</span>
        <span class="text-xl font-semibold tabular-nums">{{ scanned ? s.value : '…' }}</span>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <Segmented v-model="filter" :options="FILTERS" label="Show" />
      <span class="flex-1" />
      <span class="text-xs text-muted-foreground">Only merged or long-idle work is listed. Uncommitted changes are never deleted.</span>
    </div>

    <Alert v-if="error" variant="destructive"
      ><CircleAlert /><AlertDescription class="whitespace-pre-line">{{ error }}</AlertDescription></Alert
    >

    <div v-if="scanning && !scanned" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Looking through your projects…</div>
    <p v-else-if="scanned && !shown.length" class="text-muted-foreground">
      Nothing to clean up. Every worktree and branch is still in use.
    </p>
    <div v-else-if="shown.length" class="overflow-hidden rounded-lg border border-border">
      <div class="flex h-9 items-center gap-4 border-b border-border px-4">
        <Checkbox :model-value="allState" aria-label="Select all" @update:model-value="(v) => toggleAll(v === true)" />
        <SectionLabel class="flex-1">Item</SectionLabel>
        <SectionLabel class="w-40 @max-3xl:hidden">Project</SectionLabel>
        <SectionLabel class="w-40 @max-xl:hidden">Why</SectionLabel>
        <SectionLabel class="w-[90px] text-right">Frees</SectionLabel>
        <span class="w-7" />
      </div>
      <ul>
        <li
          v-for="i in shown"
          :key="i.key"
          class="flex h-12 cursor-pointer items-center gap-4 border-t border-accent px-4 transition-colors first:border-t-0"
          :class="selected.has(i.key) ? 'bg-emphasis/8' : 'hover:bg-muted/60'"
          @click="toggle(i.key, !selected.has(i.key))"
        >
          <Checkbox
            :model-value="selected.has(i.key)"
            :aria-label="`Select ${i.name}`"
            @click.stop
            @update:model-value="(v) => toggle(i.key, v === true)"
          />
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <Badge variant="secondary" class="w-16 shrink-0 bg-muted text-[11px] font-normal text-muted-foreground">{{
              i.kind === 'worktree' ? 'Worktree' : 'Branch'
            }}</Badge>
            <span class="truncate font-mono text-[12.5px]" :title="i.kind === 'worktree' ? short(i.path) : i.name">{{ i.name }}</span>
          </div>
          <button
            type="button"
            class="w-40 shrink-0 truncate text-left text-xs text-muted-foreground hover:text-foreground @max-3xl:hidden"
            @click.stop="openProject(i.project.path, i.kind === 'worktree' ? 'worktrees' : 'branches')"
          >
            {{ where(i.project) }}
          </button>
          <Hint :text="WHY[i.why].hint">
            <span class="w-40 shrink-0 truncate text-xs @max-xl:hidden" :class="WHY[i.why].tone">{{ WHY[i.why].text(i) }}</span>
          </Hint>
          <span class="w-[90px] shrink-0 text-right text-xs text-muted-foreground tabular-nums">{{
            i.size !== undefined ? formatBytes(i.size) : '—'
          }}</span>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button size="icon-sm" variant="ghost" class="text-muted-foreground" :aria-label="`More for ${i.name}`" @click.stop
                ><Ellipsis
              /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-52">
              <DropdownMenuItem v-if="i.kind === 'worktree'" @select="openWorktree(i.path)"
                ><FolderOpen /> See the changes</DropdownMenuItem
              >
              <DropdownMenuItem v-if="i.kind === 'worktree'" @select="bridge.invoke('shell:reveal', i.path)"
                ><FolderOpen /> Show the folder</DropdownMenuItem
              >
              <DropdownMenuItem v-if="i.url" as-child
                ><a :href="i.url" target="_blank" rel="noreferrer"><ExternalLink /> Open on GitHub</a></DropdownMenuItem
              >
              <DropdownMenuItem @select="openProject(i.project.path, i.kind === 'worktree' ? 'worktrees' : 'branches')"
                >Show in {{ i.project.name }}</DropdownMenuItem
              >
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      </ul>
    </div>

    <div
      v-if="selected.size"
      role="region"
      aria-label="Selected items"
      class="sticky bottom-6 z-10 mx-auto flex h-12 max-w-full items-center gap-3 rounded-lg border border-border bg-popover pr-2 pl-4 shadow-lg"
    >
      <span class="font-semibold whitespace-nowrap tabular-nums">{{ selected.size }} selected</span>
      <span v-if="pickedSize" class="text-xs whitespace-nowrap text-muted-foreground">Frees {{ formatBytes(pickedSize) }}</span>
      <span class="h-5 w-px shrink-0 bg-border" aria-hidden="true" />
      <Button size="sm" variant="destructive" @click="confirming = true"
        ><Trash2 /> Delete {{ selected.size === 1 ? 'it' : `${selected.size} items` }}</Button
      >

      <Button size="icon-sm" variant="ghost" class="text-muted-foreground" aria-label="Clear the selection" @click="selected.clear()"
        ><X
      /></Button>
    </div>
  </div>

  <ConfirmDialog
    :open="confirming"
    :title="selected.size === 1 ? `Delete ${picked[0]?.name}?` : `Delete ${selected.size} items?`"
    description="Worktree folders are deleted for good, uncommitted changes included, and can’t be brought back. Branches are deleted on this computer only; their copies on GitHub stay."
    :confirm="selected.size === 1 ? 'Delete' : `Delete ${selected.size} items`"
    :busy="deleting"
    @update:open="(v) => (confirming = v)"
    @confirm="confirmDelete"
  >
    <ul class="max-h-40 overflow-auto text-xs text-muted-foreground">
      <li v-for="i in picked" :key="i.key" class="truncate">
        {{ i.kind === 'worktree' ? 'Worktree' : 'Branch' }} · {{ i.name }} · {{ i.project.name }}
      </li>
    </ul>
  </ConfirmDialog>
</template>
