<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { Eye, FolderTree, Palette } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import BrandMark from '../components/BrandMark.vue'
import BrandIcon from '../components/BrandIcon.vue'
import GithubMark from '../components/GithubMark.vue'
import { useAppearance } from '../features/appearance/useAppearance'
import SettingsForm from '../features/settings/SettingsForm.vue'
import { SETTINGS_TABS, TAB_OF, type SettingsSectionId, type SettingsTab } from '../features/settings/sections'

const ICONS = { about: BrandIcon, github: GithubMark, review: Eye, files: FolderTree, appearance: Palette }

const { dark, rootAttrs } = useAppearance()
const section = (location.hash.slice(1) || undefined) as SettingsSectionId | undefined
const form = useTemplateRef<InstanceType<typeof SettingsForm>>('form')
const current = shallowRef<SettingsTab>(section ? TAB_OF[section] : 'about')

let pickedAt = 0

function go(id: SettingsTab) {
  pickedAt = Date.now()
  current.value = id
  void form.value?.scrollToSection(id)
  history.replaceState(null, '', `#${id}`)
}

function track() {
  // Scrolling to a short section near the end lands on the page bottom, which would mark the last section instead.
  if (Date.now() - pickedAt < 800) return
  const sections = [...document.querySelectorAll<HTMLElement>('section[data-section]')]
  const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
  const passed = sections.filter((s) => s.getBoundingClientRect().top <= window.innerHeight / 3)
  const active = atBottom ? sections.at(-1) : passed.at(-1)
  if (active) current.value = active.dataset.section as SettingsTab
}

onMounted(() => window.addEventListener('scroll', track, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', track))
</script>

<template>
  <div class="ps-root min-h-screen bg-background text-foreground" :class="{ dark }" v-bind="rootAttrs">
    <div class="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-primary p-1.5 text-primary-foreground">
          <BrandMark />
        </div>
        <div class="flex flex-col">
          <h1 class="text-lg leading-6 font-semibold">PR Sift settings</h1>
          <p class="text-sm text-muted-foreground">Changes apply right away, here and in open reviews.</p>
        </div>
      </header>

      <div class="grid items-start gap-8 md:grid-cols-[11rem_minmax(0,1fr)]">
        <nav aria-label="Settings" class="flex gap-1 overflow-x-auto md:sticky md:top-10 md:flex-col md:overflow-visible">
          <Button
            v-for="t in SETTINGS_TABS"
            :key="t.id"
            variant="ghost"
            size="sm"
            class="justify-start"
            :class="current === t.id ? 'bg-muted text-foreground' : 'text-muted-foreground'"
            :aria-current="current === t.id ? 'true' : undefined"
            @click="go(t.id)"
          >
            <component :is="ICONS[t.id]" class="size-4" />{{ t.label }}
          </Button>
        </nav>
        <main class="min-w-0">
          <SettingsForm ref="form" layout="page" :section="section" />
        </main>
      </div>
    </div>
  </div>
</template>
