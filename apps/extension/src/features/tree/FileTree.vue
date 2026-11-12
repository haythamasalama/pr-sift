<script setup lang="ts">
import { computed, provide, shallowRef, watch } from 'vue'
import { ChevronsDownUp, ChevronsUpDown, Layers } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { treeExpandKey, type ExpandCommand } from './expandContext'
import { collectFiles } from '@pr-sift/core'
import type { PrFile, TreeNode } from '../../lib/types'
import TreeFile from './TreeFile.vue'
import TreeNodeView from './TreeNode.vue'

const {
  tree,
  selected,
  isViewed,
  search = '',
} = defineProps<{
  tree: TreeNode
  search?: string
  selected: string
  isViewed: (f: PrFile) => boolean
}>()

const emit = defineEmits<{
  selectFolder: [path: string]
  jumpFolder: [path: string]
  selectFile: [name: string]
  toggleViewed: [path: string, value: boolean]
  toggleFile: [file: PrFile, value: boolean]
}>()

const expand = shallowRef<ExpandCommand>({ open: true, n: 0 })
provide(treeExpandKey, expand)
const setAll = (open: boolean) => (expand.value = { open, n: expand.value.n + 1 })

watch(
  () => search.trim(),
  (query) => {
    if (query) setAll(true)
  },
)

function showAll() {
  emit('selectFolder', '')
  emit('jumpFolder', '')
}

const rootState = computed(() => {
  const all = collectFiles(tree)
  const done = all.filter(isViewed).length
  return done === 0 ? 'none' : done === all.length ? 'all' : 'some'
})
</script>

<template>
  <nav class="h-full overflow-auto p-2 text-[13px]">
    <div
      class="group mb-1 flex items-center gap-1.5 rounded px-1.5 py-1 hover:bg-border/40"
      :class="selected === '' ? 'bg-primary/15 text-primary' : ''"
    >
      <Checkbox
        title="Mark everything in the tree as viewed"
        class="after:inset-0"
        :model-value="rootState === 'all' ? true : rootState === 'some' ? 'indeterminate' : false"
        @update:model-value="(value) => emit('toggleViewed', '', value === true)"
      />
      <button type="button" class="flex flex-1 items-center gap-1.5 text-left font-medium" @click="showAll">
        <Layers :size="14" /> All folders
        <span class="ml-auto text-[11px] text-muted-foreground">{{ tree.count }}</span>
      </button>
      <Button variant="ghost" size="icon-xs" title="Expand all folders" aria-label="Expand all folders" @click="setAll(true)"
        ><ChevronsUpDown
      /></Button>
      <Button variant="ghost" size="icon-xs" title="Collapse all folders" aria-label="Collapse all folders" @click="setAll(false)"
        ><ChevronsDownUp
      /></Button>
    </div>

    <TreeNodeView
      v-for="d in tree.dirs"
      :key="d.path"
      :node="d"
      :depth="0"
      :selected="selected"
      :is-viewed="isViewed"
      @jump-folder="emit('jumpFolder', $event)"
      @select-file="emit('selectFile', $event)"
      @toggle-viewed="(path, value) => emit('toggleViewed', path, value)"
      @toggle-file="(file, value) => emit('toggleFile', file, value)"
    />
    <TreeFile
      v-for="f in tree.files"
      :key="f.filename"
      :file="f"
      :viewed="isViewed(f)"
      class="pl-5"
      @select="emit('selectFile', f.filename)"
      @toggle="(value) => emit('toggleFile', f, value)"
    />
  </nav>
</template>
