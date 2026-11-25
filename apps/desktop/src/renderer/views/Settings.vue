<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { FolderOpen, FolderPlus, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { getSettings, saveSetting } from '@/lib/settings'
import type { ThemeMode } from '@/lib/types'
import { bridge } from '~/bridge'
import { appInfo } from '~/appInfo'
import { shortPath } from '~/format'
import { useProjectFolders } from '~/useProjectFolders'
import PageHeader from '~/components/PageHeader.vue'

const { settings, add, remove, setDepth } = useProjectFolders()
const theme = shallowRef<ThemeMode>('system')
const DEPTHS = [2, 3, 4, 5, 6]

onMounted(async () => {
  theme.value = (await getSettings()).theme
})

function setTheme(value: unknown) {
  if (value !== 'system' && value !== 'light' && value !== 'dark') return
  theme.value = value
  void saveSetting('theme', value)
}

const short = (path: string) => shortPath(path, appInfo.home)
</script>

<template>
  <PageHeader title="Settings" />
  <div class="flex max-w-2xl flex-col gap-8 p-6">
    <section class="flex flex-col gap-3">
      <div class="flex flex-col gap-0.5">
        <h2 class="font-semibold">Project folders</h2>
        <p class="text-muted-foreground">Worktrees and Cleanup look inside these folders.</p>
      </div>
      <ul v-if="settings?.roots.length" class="divide-y divide-border rounded-lg border border-border">
        <li v-for="root in settings.roots" :key="root" class="flex items-center gap-2 px-4 py-2">
          <span class="min-w-0 flex-1 truncate">{{ short(root) }}</span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Show in folder"
            title="Show in folder"
            @click="bridge.invoke('shell:reveal', root)"
          >
            <FolderOpen />
          </Button>
          <Button size="icon-sm" variant="ghost" :aria-label="`Stop looking in ${short(root)}`" title="Remove" @click="remove(root)">
            <X />
          </Button>
        </li>
      </ul>
      <div>
        <Button variant="outline" @click="add"><FolderPlus /> Add a folder</Button>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <div class="flex flex-col gap-0.5">
        <h2 class="font-semibold">How deep to look for repositories</h2>
        <p class="text-muted-foreground">Folder levels below each project folder. Deeper finds more but takes longer.</p>
      </div>
      <ToggleGroup
        :model-value="String(settings?.depth ?? 4)"
        type="single"
        variant="outline"
        size="sm"
        aria-label="Levels"
        @update:model-value="(v) => v && setDepth(Number(v))"
      >
        <ToggleGroupItem v-for="d in DEPTHS" :key="d" :value="String(d)">{{ d }}</ToggleGroupItem>
      </ToggleGroup>
    </section>

    <section class="flex flex-col gap-3">
      <div class="flex flex-col gap-0.5">
        <h2 class="font-semibold">Appearance</h2>
        <p class="text-muted-foreground">Follows your system unless you pick one.</p>
      </div>
      <ToggleGroup :model-value="theme" type="single" variant="outline" size="sm" aria-label="Theme" @update:model-value="setTheme">
        <ToggleGroupItem value="system">System</ToggleGroupItem>
        <ToggleGroupItem value="light">Light</ToggleGroupItem>
        <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
      </ToggleGroup>
    </section>

    <p class="text-xs text-muted-foreground">PR Sift {{ appInfo.version }}</p>
  </div>
</template>
