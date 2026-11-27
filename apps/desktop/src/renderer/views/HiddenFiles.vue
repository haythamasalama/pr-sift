<script setup lang="ts">
import { computed, onMounted, reactive, shallowRef } from 'vue'
import { CircleAlert, FolderOpen, RefreshCw, Trash2 } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import NoticeBar from '@/components/NoticeBar.vue'
import type { Leftover, LeftoverKind } from '#shared/ipc'
import { bridge } from '~/bridge'
import { errorText, formatAgo, formatBytes } from '~/format'
import { usePathText, useProjectFolders } from '~/useProjectFolders'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import NoFolders from '~/components/NoFolders.vue'
import PageHeader from '~/components/PageHeader.vue'
import TableSkeleton from '~/components/skeletons/TableSkeleton.vue'

const FOLDER_MIN = 50 * 1024 * 1024

const KINDS: { id: LeftoverKind | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'build', label: 'Build output' },
  { id: 'cache', label: 'Caches' },
  { id: 'media', label: 'Media' },
]
const KIND_LABEL: Record<LeftoverKind, string> = { dependencies: 'Dependencies', build: 'Build output', cache: 'Cache', media: 'Media' }

// With `root`, only that project's folder is searched.
const { root } = defineProps<{ root?: string }>()
const { settings, ready } = useProjectFolders()
const items = shallowRef<Leftover[]>([])
const sizes = reactive(new Map<string, number>())
const selected = reactive(new Set<string>())
const kind = shallowRef<LeftoverKind | 'all'>('all')
const scanning = shallowRef(false)
const scanned = shallowRef(false)
const measuring = shallowRef(0)
const error = shallowRef('')
const notice = shallowRef('')
const confirming = shallowRef(false)
const trashing = shallowRef(false)

const short = usePathText()
const sizeOf = (item: Leftover) => item.size ?? sizes.get(item.path)

// Folders under 50 MB are not worth the attention; until a folder is measured it stays hidden too.
const big = computed(() =>
  items.value
    .filter((item) => (sizeOf(item) ?? 0) >= (item.kind === 'media' ? 0 : FOLDER_MIN))
    .sort((a, b) => (sizeOf(b) ?? 0) - (sizeOf(a) ?? 0)),
)
const shown = computed(() => (kind.value === 'all' ? big.value : big.value.filter((i) => i.kind === kind.value)))
const total = computed(() => big.value.reduce((sum, i) => sum + (sizeOf(i) ?? 0), 0))
const selectedItems = computed(() => big.value.filter((i) => selected.has(i.path)))
const selectedSize = computed(() => selectedItems.value.reduce((sum, i) => sum + (sizeOf(i) ?? 0), 0))
const selectedMedia = computed(() => selectedItems.value.some((i) => i.kind === 'media'))
const allShownSelected = computed(() => shown.value.length > 0 && shown.value.every((i) => selected.has(i.path)))

const summary = computed(() => {
  if (!scanned.value) return 'Folders and files you can rebuild, biggest first.'
  const parts = [`${big.value.length} ${big.value.length === 1 ? 'item' : 'items'} · ${formatBytes(total.value)}`]
  if (measuring.value) parts.push(`measuring ${measuring.value} more…`)
  return parts.join(' · ')
})

async function scan() {
  if (scanning.value) return
  scanning.value = true
  error.value = ''
  selected.clear()
  sizes.clear()
  try {
    items.value = await bridge.invoke('leftovers:scan', root)
    scanned.value = true
    const folders = items.value.filter((i) => i.size === undefined)
    measuring.value = folders.length
    await Promise.all(
      folders.map(async (item) => {
        try {
          sizes.set(item.path, await bridge.invoke('leftovers:size', item.path))
        } catch {
          sizes.set(item.path, 0)
        } finally {
          measuring.value--
        }
      }),
    )
  } catch (e) {
    error.value = errorText(e)
  } finally {
    scanning.value = false
  }
}

function toggleAll(value: boolean) {
  for (const item of shown.value) {
    if (value) selected.add(item.path)
    else selected.delete(item.path)
  }
}

function toggle(path: string, value: boolean) {
  if (value) selected.add(path)
  else selected.delete(path)
}

async function trash() {
  trashing.value = true
  const freed = selectedSize.value
  try {
    const result = await bridge.invoke(
      'leftovers:trash',
      selectedItems.value.map((i) => i.path),
    )
    const gone = new Set(result.trashed)
    items.value = items.value.filter((i) => !gone.has(i.path))
    for (const path of gone) selected.delete(path)
    notice.value = result.failed.length
      ? `Moved ${result.trashed.length} to the Trash. ${result.failed.length} could not be moved: ${result.failed[0]!.error}`
      : `Moved ${result.trashed.length} to the Trash. Empty the Trash to free ${formatBytes(freed)}.`
  } catch (e) {
    error.value = errorText(e)
  } finally {
    trashing.value = false
    confirming.value = false
  }
}

const reveal = (path: string) => bridge.invoke('shell:reveal', path)

onMounted(async () => {
  if (root) return scan()
  await ready
  if (settings.value?.roots.length) await scan()
})
</script>

<template>
  <PageHeader v-if="!root" title="Cleanup" :description="summary">
    <Button v-if="settings?.roots.length" variant="outline" :disabled="scanning" @click="scan">
      <Spinner v-if="scanning" />
      <RefreshCw v-else />
      Rescan
    </Button>
    <Button v-if="selectedItems.length" variant="destructive" @click="confirming = true">
      <Trash2 /> Move {{ selectedItems.length }} to Trash · {{ formatBytes(selectedSize) }}
    </Button>
  </PageHeader>

  <NoticeBar v-if="notice">
    <template #icon><Trash2 /></template>
    {{ notice }}
    <template #actions><Button size="xs" variant="ghost" @click="notice = ''">Dismiss</Button></template>
  </NoticeBar>

  <NoFolders v-if="!root && settings && !settings.roots.length" @added="scan" />

  <div v-else class="flex flex-col gap-4" :class="root ? '' : 'p-6'">
    <div v-if="root" class="flex flex-wrap items-center gap-3">
      <p class="flex-1 text-muted-foreground">{{ summary }}</p>
      <Button size="sm" variant="outline" :disabled="scanning" @click="scan">
        <Spinner v-if="scanning" />
        <RefreshCw v-else />
        Rescan
      </Button>
      <Button v-if="selectedItems.length" size="sm" variant="destructive" @click="confirming = true">
        <Trash2 /> Move {{ selectedItems.length }} to Trash · {{ formatBytes(selectedSize) }}
      </Button>
    </div>
    <Alert v-if="error" variant="destructive">
      <CircleAlert />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <p class="text-xs text-muted-foreground">
      Only things git does not track are listed, and each can be rebuilt with the command shown. Items go to the Trash, so you can still put
      them back.
    </p>

    <div class="flex flex-wrap items-center gap-3">
      <ToggleGroup v-model="kind" type="single" variant="outline" size="sm" aria-label="Show">
        <ToggleGroupItem v-for="k in KINDS" :key="k.id" :value="k.id">{{ k.label }}</ToggleGroupItem>
      </ToggleGroup>
    </div>

    <TableSkeleton v-if="scanning && !scanned" label="Looking through your folders" />

    <p v-else-if="scanned && !shown.length && !measuring" class="text-muted-foreground">Nothing over 50 MB to clean up here.</p>

    <div v-if="shown.length" class="overflow-hidden rounded-lg border border-border">
      <div class="flex items-center gap-3 border-b border-border bg-secondary px-4 py-2 text-xs text-muted-foreground">
        <Checkbox :model-value="allShownSelected" aria-label="Select all shown" @update:model-value="(v) => toggleAll(v === true)" />
        <span class="flex-1">Path</span>
        <span class="w-24 text-right">Size</span>
        <span class="w-8" />
      </div>
      <ul class="divide-y divide-border">
        <li v-for="item in shown" :key="item.path" class="flex items-center gap-3 px-4 py-2.5">
          <Checkbox
            :model-value="selected.has(item.path)"
            :aria-label="`Select ${short(item.path)}`"
            @update:model-value="(v) => toggle(item.path, v === true)"
          />
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <div class="flex items-center gap-1.5">
              <span class="truncate">{{ short(item.path) }}</span>
              <Badge variant="outline" :class="{ 'border-attention/50 text-attention': item.kind === 'media' }">{{
                KIND_LABEL[item.kind]
              }}</Badge>
            </div>
            <span class="truncate text-xs text-muted-foreground">
              {{ item.label }} · <template v-if="item.kind === 'media'">can’t be rebuilt</template
              ><template v-else>rebuild with {{ item.rebuild }}</template
              ><template v-if="item.modified"> · changed {{ formatAgo(item.modified) }}</template>
            </span>
          </div>
          <span class="w-24 text-right font-medium tabular-nums">{{ formatBytes(sizeOf(item)) }}</span>
          <Button size="icon-sm" variant="ghost" aria-label="Show in folder" title="Show in folder" @click="reveal(item.path)"
            ><FolderOpen
          /></Button>
        </li>
      </ul>
    </div>
  </div>

  <ConfirmDialog
    v-model:open="confirming"
    :title="`Move ${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'} to the Trash?`"
    :description="`This frees ${formatBytes(selectedSize)} once you empty the Trash. Rebuild them later with the command shown on each row.`"
    confirm="Move to Trash"
    :busy="trashing"
    @confirm="trash"
  >
    <Alert v-if="selectedMedia" class="border-attention/50">
      <CircleAlert class="text-attention" />
      <AlertDescription>Media files can’t be rebuilt. Make sure you have a copy before you empty the Trash.</AlertDescription>
    </Alert>
  </ConfirmDialog>
</template>
