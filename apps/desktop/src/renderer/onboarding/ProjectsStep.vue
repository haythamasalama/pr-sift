<script setup lang="ts">
import { computed, reactive, shallowRef, watch } from 'vue'
import { FolderGit2, FolderPlus, Plus, Search, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { appInfo } from '~/appInfo'
import { bridge } from '~/bridge'
import { errorText, shortPath } from '~/format'
import { usePathText, useProjectFolders } from '~/useProjectFolders'
import { useProjects } from '~/useProjects'
import ProjectIcon from '~/components/ProjectIcon.vue'
import Hint from '~/components/Hint.vue'
import LinesSkeleton from '~/components/skeletons/LinesSkeleton.vue'

// Projects are the repositories you choose; the folders only say where to look for them.
const { settings, ready, add: addRoot, remove: removeRoot } = useProjectFolders()
const { projects, refresh } = useProjects()
const short = usePathText()

const roots = computed(() => settings.value?.roots ?? [])
const added = computed(() => projects.value ?? [])
const shown = computed(() => added.value.slice(0, 7))
const tilde = (path: string) => shortPath(path, appInfo.home)
const name = (p: string) => p.split(/[\\/]/).pop() ?? p

const found = shallowRef<string[]>([])
const selected = reactive(new Set<string>())
const query = shallowRef('')
const looking = shallowRef(false)
const adding = shallowRef(false)
const error = shallowRef('')
const listed = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? found.value.filter((p) => p.toLowerCase().includes(q)) : found.value
})
const allPicked = computed(() => listed.value.length > 0 && listed.value.every((p) => selected.has(p)))

async function look() {
  looking.value = true
  error.value = ''
  try {
    found.value = await bridge.invoke('projects:candidates')
    for (const p of [...selected]) if (!found.value.includes(p)) selected.delete(p)
  } catch (e) {
    error.value = errorText(e)
  } finally {
    looking.value = false
  }
}
void ready.then(look)
watch(() => roots.value.join('\n'), look)

const chooseFolder = () => addRoot()
const toggle = (p: string, on: boolean) => (on ? selected.add(p) : selected.delete(p))
function toggleAll() {
  const on = !allPicked.value
  for (const p of listed.value) toggle(p, on)
}

async function addPicked() {
  if (!selected.size) return
  adding.value = true
  try {
    await bridge.invoke('projects:add', [...selected])
    selected.clear()
    await refresh()
    await look()
  } catch (e) {
    error.value = errorText(e)
  } finally {
    adding.value = false
  }
}

const TIPS = [
  {
    icon: FolderGit2,
    title: 'Choose the folder your code lives in',
    text: 'Such as ~/Projects. PR Sift lists every Git repository inside it.',
  },
  { title: 'Tick the ones you work on', text: 'They become projects, with their pull requests, branches and worktrees.' },
  { title: 'Add more any time', text: 'With + next to Projects in the sidebar.' },
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-1.5">
      <h1 class="text-2xl font-semibold tracking-tight">Add your projects</h1>
      <p class="text-muted-foreground">Projects are the repositories on this computer that you work on.</p>
    </div>

    <div class="grid items-start gap-6 sm:grid-cols-[minmax(0,1fr)_220px]">
      <!-- Before a folder is chosen, how it works; after, the repositories found in it. -->
      <ol v-if="!roots.length" class="flex flex-col gap-4">
        <li v-for="(tip, i) in TIPS" :key="tip.title" class="flex gap-3">
          <span class="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-xs font-semibold">{{
            i + 1
          }}</span>
          <span class="flex flex-col gap-0.5">
            <span class="font-medium">{{ tip.title }}</span>
            <span class="text-xs text-muted-foreground">{{ tip.text }}</span>
          </span>
        </li>
      </ol>
      <div v-if="roots.length" class="flex min-w-0 flex-col gap-2">
        <div v-for="(root, i) in roots" :key="root" class="flex items-center gap-1 rounded-lg border border-border py-1.5 pr-1.5 pl-3">
          <FolderGit2 class="mr-1 size-4 shrink-0 text-muted-foreground" />
          <span class="min-w-0 flex-1 truncate font-mono text-xs" :title="root">{{ tilde(root) }}</span>
          <Hint v-if="i === roots.length - 1" text="Add another folder"
            ><Button variant="ghost" size="icon-xs" aria-label="Add another folder" @click="chooseFolder"><FolderPlus /></Button
          ></Hint>
          <Button variant="ghost" size="icon-xs" :aria-label="`Remove ${tilde(root)}`" @click="removeRoot(root)"><X /></Button>
        </div>

        <div class="flex flex-col overflow-hidden rounded-lg border border-border">
          <div class="flex items-center gap-2 border-b border-border px-3 py-2">
            <span class="flex-1 text-xs text-muted-foreground">
              <Skeleton v-if="looking && !found.length" class="h-2.5 w-40" />
              <template v-else-if="found.length">{{ found.length }} repositories not added yet</template>
              <template v-else-if="added.length">Every repository here is added.</template>
              <template v-else>No Git repositories were found here.</template>
            </span>
            <button v-if="listed.length" type="button" class="text-xs text-muted-foreground hover:text-foreground" @click="toggleAll">
              {{ allPicked ? 'Clear' : 'Select all' }}
            </button>
          </div>
          <div v-if="found.length > 8" class="relative border-b border-border">
            <Search class="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="query" placeholder="Filter by name" class="h-8 rounded-none border-0 bg-transparent pl-8 shadow-none" />
          </div>
          <div v-if="looking && !found.length" class="px-3 py-2">
            <LinesSkeleton :rows="4" mark="box" label="Looking for repositories" />
          </div>
          <ul v-else-if="listed.length" class="max-h-64 overflow-y-auto">
            <li v-for="p in listed" :key="p">
              <label class="flex cursor-pointer items-center gap-3 px-3 py-1.5 hover:bg-muted/60">
                <Checkbox :aria-label="name(p)" :model-value="selected.has(p)" @update:model-value="(v) => toggle(p, v === true)" />
                <span class="min-w-0 flex-1 truncate text-sm">{{ name(p) }}</span>
                <span v-if="short(p) !== name(p)" class="max-w-[45%] truncate font-mono text-[11px] text-muted-foreground">{{
                  short(p)
                }}</span>
              </label>
            </li>
          </ul>
        </div>

        <p v-if="error" class="text-xs text-destructive">{{ error }}</p>

        <Button size="lg" class="w-full" :disabled="!selected.size || adding" @click="addPicked">
          <Spinner v-if="adding" /><Plus v-else />
          {{ selected.size ? `Add ${selected.size} ${selected.size === 1 ? 'project' : 'projects'}` : 'Tick the projects to add' }}
        </Button>
      </div>
      <!-- The sidebar as it will look, with the projects added so far. -->
      <div class="flex flex-col gap-0.5 rounded-lg border border-border bg-muted/40 p-2" aria-label="Sidebar preview">
        <span class="px-2 pt-1 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase"
          >Projects<span v-if="added.length"> · {{ added.length }}</span></span
        >
        <template v-if="added.length">
          <span v-for="p in shown" :key="p.path" class="flex items-center gap-2 rounded-md px-2 py-1 text-sm">
            <ProjectIcon :project="p" :size="16" /><span class="truncate">{{ p.name }}</span>
          </span>
          <span v-if="added.length > shown.length" class="px-2 py-1 text-xs text-muted-foreground"
            >and {{ added.length - shown.length }} more</span
          >
        </template>
        <template v-else>
          <span v-for="w in ['w-20', 'w-28', 'w-16']" :key="w" class="flex items-center gap-2 px-2 py-1.5">
            <span class="size-4 rounded-sm bg-muted-foreground/20" /><span class="h-2 rounded-full bg-muted-foreground/20" :class="w" />
          </span>
        </template>
      </div>
    </div>

    <Button v-if="!roots.length" size="lg" class="w-full" @click="chooseFolder"><FolderPlus /> Choose a folder</Button>
  </div>
</template>
