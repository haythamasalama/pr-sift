<script setup lang="ts">
import { usePathText } from '~/useProjectFolders'
import { computed, reactive, shallowRef, watch } from 'vue'
import { FolderSearch, Search } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { bridge } from '~/bridge'
import { errorText } from '~/format'

const short = usePathText()

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ added: [paths: string[]] }>()

const found = shallowRef<string[]>([])
const selected = reactive(new Set<string>())
const query = shallowRef('')
const loading = shallowRef(false)
const adding = shallowRef(false)
const error = shallowRef('')

const name = (p: string) => p.split(/[\\/]/).pop() ?? p
const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? found.value.filter((p) => p.toLowerCase().includes(q)) : found.value
})

watch(open, async (isOpen) => {
  if (!isOpen) return
  selected.clear()
  query.value = ''
  error.value = ''
  loading.value = true
  try {
    found.value = await bridge.invoke('projects:candidates')
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
})

async function browse() {
  const picked = await bridge.invoke('projects:browse')
  if (!picked) return
  if (picked.length === 0) {
    error.value = 'No git repositories were found in that folder.'
    return
  }
  if (picked.length === 1) return add(picked)
  found.value = [...new Set([...picked, ...found.value])]
  for (const p of picked) selected.add(p)
}

async function add(paths = [...selected]) {
  if (!paths.length) return
  adding.value = true
  try {
    await bridge.invoke('projects:add', paths)
    emit('added', paths)
    open.value = false
  } catch (e) {
    error.value = errorText(e)
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex max-h-[80vh] flex-col sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Add projects</DialogTitle>
        <DialogDescription>Pick repositories from your folders, or browse to one anywhere on this computer.</DialogDescription>
      </DialogHeader>
      <div class="relative">
        <Search class="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="query" class="pl-8" placeholder="Filter repositories" />
      </div>
      <div class="min-h-40 flex-1 overflow-y-auto rounded-md border border-border">
        <div v-if="loading" class="flex items-center gap-2 p-4 text-muted-foreground"><Spinner /> Looking in your folders…</div>
        <p v-else-if="!shown.length" class="p-4 text-muted-foreground">
          {{ found.length ? 'Nothing matches.' : 'No repositories found yet. Browse to a folder to add one.' }}
        </p>
        <ul v-else class="divide-y divide-border">
          <li v-for="p in shown" :key="p">
            <label class="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-accent/60">
              <Checkbox :model-value="selected.has(p)" @update:model-value="(v) => (v ? selected.add(p) : selected.delete(p))" />
              <span class="flex min-w-0 flex-col">
                <span class="font-medium">{{ name(p) }}</span>
                <span class="truncate text-xs text-muted-foreground">{{ short(p) }}</span>
              </span>
            </label>
          </li>
        </ul>
      </div>
      <p v-if="error" class="text-destructive">{{ error }}</p>
      <DialogFooter class="sm:justify-between">
        <Button variant="outline" @click="browse"><FolderSearch /> Browse…</Button>
        <Button :disabled="!selected.size || adding" @click="add()">
          <Spinner v-if="adding" />
          Add {{ selected.size || '' }} {{ selected.size === 1 ? 'project' : 'projects' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
