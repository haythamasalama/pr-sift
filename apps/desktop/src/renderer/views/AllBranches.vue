<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from 'vue'
import type { Repo } from '#shared/ipc'
import { bridge } from '~/bridge'
import { readCache, writeCache } from '~/cache'
import { branchProjects, inProjects, useEverywhere, repoKey } from '~/everywhere'
import { useSavedFlag } from '~/savedFlag'
import ProjectsOnlySwitch from '~/components/ProjectsOnlySwitch.vue'
import { useProjects } from '~/useProjects'
import BranchList, { type BranchSource } from '~/components/BranchList.vue'
import PageHeader from '~/components/PageHeader.vue'
import TableSkeleton from '~/components/skeletons/TableSkeleton.vue'

// Every branch in every project, one heading per repository.
const { projects } = useProjects()
const { activity, loadPulls, seedBranches } = useEverywhere()
const total = shallowRef<{ n: number; merged: number } | null>(null)

// Off, every repository in your project folders on this computer; on, only the projects you added. Remembered.
const { on: projectsOnly, set: setProjectsOnly } = useSavedFlag('ps:branches-projects-only')
const scanned = shallowRef<Repo[]>(readCache<Repo[]>('worktrees:all')?.value ?? [])
onMounted(async () => {
  try {
    scanned.value = writeCache('worktrees:all', await bridge.invoke('worktrees:scan')).value
  } catch {
    // The saved list stays.
  }
})
const source = (x: { path: string; name: string; github?: { owner: string; repo: string } }): BranchSource => {
  const a = x.github ? activity.value[repoKey(x.github)] : undefined
  return { path: x.path, name: x.name, github: x.github, pulls: a?.pulls, canPush: a?.info.canPush === true }
}
const sources = computed<BranchSource[]>(() => {
  // Folders of the same repository share its branches, so each repository comes once.
  const mine = branchProjects(projects.value ?? []).map(source)
  if (projectsOnly.value) return mine
  const seen = new Set(mine.map((s) => (s.github ? repoKey(s.github) : s.path)))
  const others = scanned.value.filter((r) => {
    const key = r.github ? repoKey(r.github) : r.path
    if (r.error || seen.has(key) || inProjects(r, projects.value ?? [])) return false
    seen.add(key)
    return true
  })
  return [...mine, ...others.map(source)]
})
const tags = computed(() => {
  if (!total.value) return []
  const { n, merged } = total.value
  const count = sources.value.length
  return [
    `${n} ${n === 1 ? 'branch' : 'branches'}`,
    `${count} ${count === 1 ? 'repository' : 'repositories'}`,
    ...(merged ? [{ text: `${merged} merged`, tone: 'merged' as const }] : []),
  ]
})

function counted(n: number, merged: number) {
  total.value = { n, merged }
  // The sidebar's count follows what this page just found.
  if (projects.value) seedBranches(projects.value)
}
watch(
  projects,
  (list) => {
    if (list) void loadPulls(list)
  },
  { immediate: true },
)
</script>

<template>
  <PageHeader title="All branches" :tags="tags" />
  <div class="px-8 py-6">
    <TableSkeleton v-if="!projects" :columns="['w-[86px]', 'w-12', 'w-14']" label="Loading branches" />
    <p v-else-if="!sources.length" class="text-muted-foreground">Add a project to see its branches here.</p>
    <BranchList v-else :sources="sources" @count="counted">
      <template #toolbar><ProjectsOnlySwitch :model-value="projectsOnly" @update:model-value="setProjectsOnly" /></template>
    </BranchList>
  </div>
</template>
