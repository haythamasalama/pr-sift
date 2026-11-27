<script setup lang="ts">
import { FolderGit2, FolderOpen, FolderPlus, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import SettingsForm from '@/features/settings/SettingsForm.vue'
import SettingsRow from '@/features/settings/SettingsRow.vue'
import SegmentedControl from '@/features/settings/SegmentedControl.vue'
import { bridge } from '~/bridge'
import { appInfo } from '~/appInfo'
import { usePathText, useProjectFolders } from '~/useProjectFolders'
import PageHeader from '~/components/PageHeader.vue'

// The same settings, tabs and controls as the extension's sheet, with the desktop's own Projects tab first.
const EXTRA_TABS = [{ id: 'projects', label: 'Projects', icon: FolderGit2 }]

const { settings, add, remove, setDepth, setFullPaths } = useProjectFolders()
const DEPTHS = [2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: String(d) }))
const PATHS = [
  { value: 'short', label: 'Short', hint: 'Start at your project folder.' },
  { value: 'full', label: 'Full', hint: 'The whole path on this computer.' },
]
const short = usePathText()
</script>

<template>
  <PageHeader title="Settings" />
  <div class="flex w-full justify-center px-8 py-4">
    <SettingsForm surface="desktop" :extra-tabs="EXTRA_TABS" class="w-full max-w-[720px] min-w-0 px-4">
      <template #projects>
        <div class="flex flex-col divide-y divide-border">
          <SettingsRow label="Project folders" description="Add projects, All worktrees and Cleanup look here.">
            <Button variant="outline" size="sm" @click="add"><FolderPlus /> Add a folder</Button>
          </SettingsRow>
          <ul v-if="settings?.roots.length" class="flex flex-col gap-1 py-3">
            <li v-for="r in settings.roots" :key="r" class="flex items-center gap-2 rounded-md border bg-muted/40 py-1 pr-1 pl-3 text-xs">
              <span class="min-w-0 flex-1 truncate">{{ short(r) }}</span>
              <Button
                size="icon-xs"
                variant="ghost"
                class="text-muted-foreground"
                aria-label="Show the folder"
                @click="bridge.invoke('shell:reveal', r)"
              >
                <FolderOpen />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                class="text-muted-foreground"
                :aria-label="`Stop looking in ${short(r)}`"
                @click="remove(r)"
              >
                <X />
              </Button>
            </li>
          </ul>
          <SettingsRow label="How deep to look" description="Folder levels below each project folder.">
            <SegmentedControl
              :model-value="String(settings?.depth ?? 4)"
              :options="DEPTHS"
              name="settings-depth"
              label="Levels"
              @update:model-value="(v) => setDepth(Number(v))"
            />
          </SettingsRow>
          <SettingsRow
            label="Paths"
            :description="`${PATHS.find((p) => p.value === (settings?.fullPaths ? 'full' : 'short'))?.hint} Copying always copies the full path.`"
          >
            <SegmentedControl
              :model-value="settings?.fullPaths ? 'full' : 'short'"
              :options="PATHS"
              name="settings-paths"
              label="Paths"
              @update:model-value="(v) => setFullPaths(v === 'full')"
            />
          </SettingsRow>
        </div>
      </template>
      <template #about>
        <SettingsRow label="PR Sift for desktop" :description="`Version ${appInfo.version}`" />
      </template>
    </SettingsForm>
  </div>
</template>
