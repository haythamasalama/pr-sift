<script setup lang="ts">
import { provide, useTemplateRef } from 'vue'
import { FolderGit2, Settings, Trash2 } from '@lucide/vue'
import { Spinner } from '@/components/ui/spinner'
import BrandMark from '@/components/BrandMark.vue'
import { useAppearance } from '@/features/appearance/useAppearance'
import { portalTargetKey } from '@/lib/portal'
import { useAuth } from './useAuth'
import { view, type View } from './navigation'
import SignIn from './views/SignIn.vue'
import Worktrees from './views/Worktrees.vue'
import Cleanup from './views/Cleanup.vue'
import SettingsView from './views/Settings.vue'
import Account from './views/Account.vue'

const { dark } = useAppearance()
const { status } = useAuth()
const portal = useTemplateRef<HTMLElement>('portal')
provide(portalTargetKey, portal)

const NAV: { id: View; label: string; icon: typeof FolderGit2 }[] = [
  { id: 'worktrees', label: 'Worktrees', icon: FolderGit2 },
  { id: 'cleanup', label: 'Cleanup', icon: Trash2 },
  { id: 'settings', label: 'Settings', icon: Settings },
]
</script>

<template>
  <div class="ps-root h-full bg-background text-foreground" :class="{ dark }">
    <div v-if="!status" class="flex h-full items-center justify-center"><Spinner class="size-5" /></div>
    <SignIn v-else-if="!status.signedIn" />
    <div v-else class="flex h-full">
      <nav class="flex w-[212px] shrink-0 flex-col gap-1 border-r border-border bg-secondary/60 p-3" aria-label="Sections">
        <div class="flex items-center gap-2 px-2 pt-1 pb-4">
          <span class="flex size-6 items-center justify-center rounded-[22%] bg-foreground text-background">
            <BrandMark class="size-3.5" />
          </span>
          <span class="font-semibold">PR Sift</span>
        </div>
        <button
          v-for="item in NAV"
          :key="item.id"
          type="button"
          class="flex h-8 items-center gap-2 rounded-md px-2 text-left hover:bg-accent"
          :class="view === item.id ? 'bg-accent font-medium' : 'text-muted-foreground'"
          :aria-current="view === item.id ? 'page' : undefined"
          @click="view = item.id"
        >
          <component :is="item.icon" class="size-4" />
          {{ item.label }}
        </button>
        <button
          type="button"
          class="mt-auto flex h-10 items-center gap-2 rounded-md px-2 text-left hover:bg-accent"
          :class="view === 'account' ? 'bg-accent' : ''"
          :aria-current="view === 'account' ? 'page' : undefined"
          @click="view = 'account'"
        >
          <img v-if="status.account?.avatarUrl" :src="status.account.avatarUrl" alt="" class="size-6 rounded-full" />
          <span class="truncate">{{ status.account?.login }}</span>
        </button>
      </nav>
      <main class="min-w-0 flex-1 overflow-y-auto">
        <Worktrees v-if="view === 'worktrees'" />
        <Cleanup v-else-if="view === 'cleanup'" />
        <SettingsView v-else-if="view === 'settings'" />
        <Account v-else />
      </main>
    </div>
    <div ref="portal" />
  </div>
</template>
