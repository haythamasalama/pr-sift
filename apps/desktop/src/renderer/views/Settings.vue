<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { FolderOpen, FolderPlus, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import SettingsForm from '@/features/settings/SettingsForm.vue'
import SettingsRow from '@/features/settings/SettingsRow.vue'
import { bridge } from '~/bridge'
import { appInfo } from '~/appInfo'
import { shortPath } from '~/format'
import { useProjectFolders } from '~/useProjectFolders'
import PageHeader from '~/components/PageHeader.vue'

// One settings page for the whole app: the desktop's own folders first, then everything the extension's review uses.
const NAV: { id: string; label: string }[] = [
  { id: 'projects', label: 'Projects' },
  { id: 'github', label: 'Merging' },
  { id: 'review', label: 'Reviewing' },
  { id: 'files', label: 'Files' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'app', label: 'About' },
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
  <PageHeader title="Settings" description="Changes apply right away, in the app and in reviews." />
  <div ref="root" class="@container flex w-full flex-col px-8 py-6">
    <div class="grid items-start gap-8 @3xl:grid-cols-[176px_minmax(0,760px)]">
      <nav aria-label="Settings" class="flex gap-0.5 overflow-x-auto [scrollbar-width:none] @3xl:sticky @3xl:top-24 @3xl:flex-col">
        <button
          v-for="t in NAV"
          :key="t.id"
          type="button"
          class="flex h-[30px] shrink-0 items-center rounded-md px-2.5 text-left whitespace-nowrap transition-colors"
          :class="
            current === t.id ? 'bg-accent font-semibold text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
          "
          :aria-current="current === t.id ? 'true' : undefined"
          @click="go(t.id)"
        >
          {{ t.label }}
        </button>
      </nav>

      <SettingsForm layout="flat" surface="desktop" class="min-w-0">
        <template #before>
          <section data-section="projects" aria-labelledby="settings-projects" class="flex scroll-mt-24 flex-col">
            <h2 id="settings-projects" class="mb-2 text-sm font-semibold">Projects</h2>
            <div class="flex flex-col border-t border-accent">
              <SettingsRow label="Project folders" description="Add projects, All worktrees and Cleanup look here.">
                <Button variant="outline" size="sm" @click="add"><FolderPlus /> Add a folder</Button>
              </SettingsRow>
              <ul v-if="settings?.roots.length" class="flex flex-col gap-1 pb-2">
                <li v-for="r in settings.roots" :key="r" class="flex items-center gap-2 rounded-md bg-muted py-1 pr-1 pl-3 text-xs">
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
              <div class="border-t border-accent">
                <SettingsRow label="How deep to look" description="Folder levels below each project folder.">
                  <ToggleGroup
                    :model-value="String(settings?.depth ?? 4)"
                    type="single"
                    size="sm"
                    :spacing="0.5"
                    aria-label="Levels"
                    @update:model-value="(v) => v && setDepth(Number(v))"
                  >
                    <ToggleGroupItem v-for="d in DEPTHS" :key="d" :value="String(d)" class="w-7 px-0 text-xs">{{ d }}</ToggleGroupItem>
                  </ToggleGroup>
                </SettingsRow>
              </div>
            </div>
          </section>
        </template>
        <template #after>
          <section data-section="app" aria-labelledby="settings-about" class="flex scroll-mt-24 flex-col">
            <h2 id="settings-about" class="mb-2 text-sm font-semibold">About</h2>
            <div class="border-t border-accent">
              <SettingsRow label="PR Sift for desktop" :description="`Version ${appInfo.version}`" />
            </div>
          </section>
        </template>
      </SettingsForm>
    </div>
  </div>
</template>
