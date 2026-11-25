<script setup lang="ts">
import { computed, inject, provide, shallowRef, watch } from 'vue'
import { Check, ChevronRight, ChevronsDownUp, ChevronsUpDown, EyeOff, Folder, Circle } from '@lucide/vue'
import { treeExpandKey, treeLayoutKey, useExpandCommand, type ExpandCommand } from './expandContext'
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
  hideFolder: [path: string]
}>()

const expand = useExpandCommand(treeExpandKey)
const layout = inject(treeLayoutKey, null)

const viewedCount = computed(() => collectFiles(node).filter(isViewed).length)
const viewedState = computed(() => (viewedCount.value === 0 ? 'none' : viewedCount.value === node.count ? 'all' : 'some'))

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
      class="group relative flex h-7 cursor-pointer items-center gap-1.5 rounded-sm px-1.5 hover:bg-accent"
      :class="selected === node.path ? 'bg-accent hover:bg-accent' : ''"
      @contextmenu.prevent="emit('hideFolder', node.path)"
    >
      <button
        type="button"
        class="-mx-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground"
        :aria-label="open ? 'Collapse' : 'Expand'"
        @click="open = !open"
      >
        <ChevronRight :size="12" class="transition-transform" :class="open ? 'rotate-90' : ''" />
      </button>
      <button type="button" class="flex min-w-0 flex-1 items-center gap-1.5 text-left" @click="jump">
        <Folder :size="14" class="shrink-0 text-muted-foreground" />
        <span class="truncate font-medium" :class="viewedState === 'all' ? 'text-muted-foreground' : ''">{{ node.name }}</span>
      </button>
      <span class="flex shrink-0 items-center">
        <button
          type="button"
          class="flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
          title="Expand this folder and everything inside"
          aria-label="Expand folder tree"
          @click="setSubtree(true)"
        >
          <ChevronsUpDown :size="13" />
        </button>
        <button
          type="button"
          class="flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
          title="Collapse this folder and everything inside"
          aria-label="Collapse folder tree"
          @click="setSubtree(false)"
        >
          <ChevronsDownUp :size="13" />
        </button>
        <button
          type="button"
          class="flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
          title="Always hide this folder. Right-click the folder does the same"
          aria-label="Hide folder"
          @click="emit('hideFolder', node.path)"
        >
          <EyeOff :size="13" />
        </button>
      </span>
      <button
        type="button"
        class="flex size-4 shrink-0 items-center justify-center rounded-sm"
        :class="viewedState === 'all' ? 'text-success-fg' : 'text-muted-foreground hover:text-foreground'"
        :title="viewedState === 'all' ? 'Mark the whole folder as not viewed' : 'Mark the whole folder as viewed'"
        :aria-label="viewedState === 'all' ? 'Mark the whole folder as not viewed' : 'Mark the whole folder as viewed'"
        :aria-pressed="viewedState === 'all'"
        @click="emit('toggleViewed', node.path, viewedState !== 'all')"
      >
        <Check v-if="viewedState === 'all'" :size="13" :stroke-width="2.5" aria-label="All viewed" />
        <Circle v-else :size="12" />
      </button>
    </div>

    <div
      v-if="open"
      class="ml-[9px] border-l"
      :class="layout?.guides === false ? 'border-transparent' : ''"
      :style="{ paddingLeft: `${layout?.indent ?? 6}px` }"
    >
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
        @hide-folder="emit('hideFolder', $event)"
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
