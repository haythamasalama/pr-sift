<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { branchProjects, useEverywhere, repoKey } from '~/everywhere'
import { useProjects } from '~/useProjects'
import BranchList, { type BranchSource } from '~/components/BranchList.vue'
import PageHeader from '~/components/PageHeader.vue'
import TableSkeleton from '~/components/skeletons/TableSkeleton.vue'

// Every branch in every project, one heading per repository.
const { projects } = useProjects()
const { activity, loadPulls, seedBranches } = useEverywhere()
const total = shallowRef<{ n: number; merged: number } | null>(null)

const sources = computed<BranchSource[]>(() =>
  // Folders of the same repository share its branches, so each repository comes once.
  branchProjects(projects.value ?? []).map((p) => {
    const a = p.github ? activity.value[repoKey(p.github)] : undefined
    return { path: p.path, name: p.name, github: p.github, pulls: a?.pulls, canPush: a?.info.canPush === true }
  }),
)
const tags = computed(() => {
  if (!total.value) return []
  const { n, merged } = total.value
  const count = sources.value.length
  return [
    `${n} ${n === 1 ? 'branch' : 'branches'}`,
    `${count} ${count === 1 ? 'project' : 'projects'}`,
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
    <BranchList v-else :sources="sources" @count="counted" />
  </div>
</template>
