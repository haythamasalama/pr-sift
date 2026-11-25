<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, type Component } from 'vue'
import { Eye, FolderGit2, FolderOpen, FolderPlus, FolderTree, Info, Palette, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import GithubMark from '@/components/GithubMark.vue'
import BrandMark from '@/components/BrandMark.vue'
import SettingsForm from '@/features/settings/SettingsForm.vue'
import SettingsRow from '@/features/settings/SettingsRow.vue'
import { bridge } from '~/bridge'
import { appInfo } from '~/appInfo'
import { shortPath } from '~/format'
import { useProjectFolders } from '~/useProjectFolders'
import PageHeader from '~/components/PageHeader.vue'

// One settings page for the whole app: the desktop's own folders first, then everything the extension's review uses.
const NAV: { id: string; label: string; icon: Component }[] = [
  { id: 'projects', label: 'Projects', icon: FolderGit2 },
  { id: 'github', label: 'Merging', icon: GithubMark },
  { id: 'review', label: 'Reviewing', icon: Eye },
  { id: 'files', label: 'Files', icon: FolderTree },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'app', label: 'About', icon: Info },
]

const { settings, add, remove, setDepth } = useProjectFolders()
const DEPTHS = [2, 3, 4, 5, 6]
const short = (path: string) => shortPath(path, appInfo.home)

const root = useTemplateRef<HTMLElement>('root')
const current = shallowRef('projects')
let pickedAt = 0

const scroller = () => root.value?.closest('main') ?? null

async function go(id: string) {
  pickedAt = Date.now()
  current.value = id
  await nextTick()
  const el = root.value?.querySelector<HTMLElement>(`section[data-section="${id}"]`)
  const box = scroller()
  if (!el || !box) return
  // Leaves room for the sticky page header.
  const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 96
  box.scrollTo({ top, behavior: 'smooth' })
}

function track() {
  if (Date.now() - pickedAt < 800) return
  const box = scroller()
  if (!box) return
  const sections = [...(root.value?.querySelectorAll<HTMLElement>('section[data-section]') ?? [])]
  const top = box.getBoundingClientRect().top
  const atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 2
  const passed = sections.filter((s) => s.getBoundingClientRect().top - top <= box.clientHeight / 3)
  const active = atBottom ? sections.at(-1) : passed.at(-1)
  if (active?.dataset.section) current.value = active.dataset.section
}

onMounted(() => scroller()?.addEventListener('scroll', track, { passive: true }))
onBeforeUnmount(() => scroller()?.removeEventListener('scroll', track))
</script>

<template>
  <PageHeader title="Settings" description="Changes apply right away, everywhere in PR Sift." />
  <div ref="root" class="@container mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-6">
    <div class="grid items-start gap-8 @3xl:grid-cols-[11rem_minmax(0,1fr)]">
      <nav aria-label="Settings" class="flex gap-1 overflow-x-auto [scrollbar-width:none] @3xl:sticky @3xl:top-24 @3xl:flex-col">
        <Button
          v-for="t in NAV"
          :key="t.id"
          variant="ghost"
          size="sm"
          class="justify-start"
          :class="current === t.id ? 'bg-muted text-foreground' : 'text-muted-foreground'"
          :aria-current="current === t.id ? 'true' : undefined"
          @click="go(t.id)"
        >
          <component :is="t.icon" class="size-4" />{{ t.label }}
        </Button>
      </nav>

      <SettingsForm layout="page" surface="desktop" class="min-w-0">
        <template #before>
          <section data-section="projects" class="flex scroll-mt-24 flex-col overflow-hidden rounded-lg border bg-card">
            <header class="flex items-center gap-3 bg-muted/40 px-4 py-3">
              <span class="flex h-7.5 w-11 shrink-0 items-center justify-center"><FolderGit2 class="size-5" /></span>
              <div class="flex min-w-0 flex-col gap-0.5">
                <h2 class="text-sm leading-5 font-semibold">Projects</h2>
                <p class="text-xs leading-4 text-muted-foreground">
                  Where Add projects, All worktrees and Cleanup look for repositories.
                </p>
              </div>
            </header>
            <div class="flex flex-col divide-y divide-border border-t px-4">
              <div class="flex flex-col gap-2.5 py-3">
                <p class="text-sm font-medium">Project folders</p>
                <ul v-if="settings?.roots.length" class="divide-y divide-border rounded-lg border">
                  <li v-for="r in settings.roots" :key="r" class="flex items-center gap-2 py-1.5 pr-1.5 pl-3">
                    <span class="min-w-0 flex-1 truncate text-sm">{{ short(r) }}</span>
                    <Button size="icon-sm" variant="ghost" aria-label="Show in folder" title="Show in folder" @click="bridge.invoke('shell:reveal', r)">
                      <FolderOpen />
                    </Button>
                    <Button size="icon-sm" variant="ghost" :aria-label="`Stop looking in ${short(r)}`" title="Remove" @click="remove(r)">
                      <X />
                    </Button>
                  </li>
                </ul>
                <div><Button variant="outline" size="sm" @click="add"><FolderPlus /> Add a folder</Button></div>
              </div>
              <SettingsRow label="How deep to look" description="Folder levels below each project folder. Deeper finds more but takes longer.">
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
              </SettingsRow>
            </div>
          </section>
        </template>
        <template #after>
          <section data-section="app" class="flex scroll-mt-24 flex-col overflow-hidden rounded-lg border bg-card">
            <header class="flex items-center gap-3 bg-muted/40 px-4 py-3">
              <span class="flex h-7.5 w-11 shrink-0 items-center justify-center">
                <span class="flex size-7 items-center justify-center rounded-md bg-primary p-1 text-primary-foreground"><BrandMark /></span>
              </span>
              <div class="flex min-w-0 flex-col gap-0.5">
                <h2 class="text-sm leading-5 font-semibold">About</h2>
                <p class="text-xs leading-4 text-muted-foreground">PR Sift {{ appInfo.version }} for desktop.</p>
              </div>
            </header>
          </section>
        </template>
      </SettingsForm>
    </div>
  </div>
</template>
