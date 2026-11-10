<script setup lang="ts">
import { computed, provide, shallowRef, watch } from 'vue'
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, Folder } from '@lucide/vue'
import { Checkbox } from '@/components/ui/checkbox'
import { treeExpandKey, useExpandCommand, type ExpandCommand } from './expandContext'
import { collectFiles } from '@pr-sift/core'
import type { PrFile, TreeNode } from '../../lib/types'
import TreeFile from './TreeFile.vue'

const { node, depth, selected, isViewed } = defineProps<{
  node: TreeNode
  depth: number
  selected: string
  isViewed: (f: PrFile) => boolean
}>()

const emit = defineEmits<{
  jumpFolder: [path: string]
  selectFile: [name: string]
  toggleViewed: [path: string, value: boolean]
  toggleFile: [file: PrFile, value: boolean]
}>()

const expand = useExpandCommand(treeExpandKey)

const viewedState = computed(() => {
  const all = collectFiles(node)
  const done = all.filter(isViewed).length
  return done === 0 ? 'none' : done === all.length ? 'all' : 'some'
})

const initiallyOpen = () =>
  expand && expand.value.n > 0 ? expand.value.open : depth < 2 || selected === node.path || selected.startsWith(node.path + '/')
const open = shallowRef(initiallyOpen())

const subtree = shallowRef<ExpandCommand>({ open: expand?.value.open ?? false, n: expand && expand.value.n > 0 ? 1 : 0 })
provide(treeExpandKey, subtree)

function setSubtree(value: boolean) {
  open.value = value
  subtree.value = { open: value, n: subtree.value.n + 1 }
}

watch(
  () => expand?.value.n,
  () => {
    if (expand) setSubtree(expand.value.open)
  },
)

function jump() {
  open.value = true
  emit('jumpFolder', node.path)
}
</script>

<template>
  <div>
    <div
      class="group flex cursor-pointer items-center gap-1 rounded px-1 py-[3px] hover:bg-border/40"
      :class="selected === node.path ? 'bg-primary/15 text-primary' : ''"
    >
      <button
        type="button"
        class="flex size-4 items-center justify-center text-muted-foreground"
        :aria-label="open ? 'Collapse' : 'Expand'"
        @click="open = !open"
      >
        <ChevronRight :size="14" class="transition-transform" :class="open ? 'rotate-90' : ''" />
      </button>
      <Checkbox
        class="transition-opacity data-[state=unchecked]:opacity-0 group-hover:data-[state=unchecked]:opacity-100"
        title="Mark the whole folder as viewed"
        :model-value="viewedState === 'all' ? true : viewedState === 'some' ? 'indeterminate' : false"
        @click.stop
        @update:model-value="(value) => emit('toggleViewed', node.path, value === true)"
      />
      <button type="button" class="flex min-w-0 flex-1 items-center gap-1.5 text-left" @click="jump">
        <Folder :size="14" class="shrink-0 text-muted-foreground" />
        <span class="truncate">{{ node.name }}</span>
        <span class="ml-auto shrink-0 text-[11px] text-muted-foreground">{{ node.count }}</span>
      </button>
      <span class="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          class="flex size-4 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          title="Expand this folder and everything inside"
          aria-label="Expand folder tree"
          @click="setSubtree(true)"
        >
          <ChevronsUpDown :size="13" />
        </button>
        <button
          type="button"
          class="flex size-4 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          title="Collapse this folder and everything inside"
          aria-label="Collapse folder tree"
          @click="setSubtree(false)"
        >
          <ChevronsDownUp :size="13" />
        </button>
      </span>
    </div>

    <div v-if="open" class="ml-3 border-l pl-1.5">
      <TreeNode
        v-for="d in node.dirs"
        :key="d.path"
        :node="d"
        :depth="depth + 1"
        :selected="selected"
        :is-viewed="isViewed"
        @jump-folder="emit('jumpFolder', $event)"
        @select-file="emit('selectFile', $event)"
        @toggle-viewed="(path, value) => emit('toggleViewed', path, value)"
        @toggle-file="(file, value) => emit('toggleFile', file, value)"
      />
      <TreeFile
        v-for="f in node.files"
        :key="f.filename"
        :file="f"
        :viewed="isViewed(f)"
        @select="emit('selectFile', f.filename)"
        @toggle="(value) => emit('toggleFile', f, value)"
      />
    </div>
  </div>
</template>
