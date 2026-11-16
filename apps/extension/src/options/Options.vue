<script setup lang="ts">
import BrandMark from '../components/BrandMark.vue'
import { useAppearance } from '../features/appearance/useAppearance'
import SettingsForm from '../features/settings/SettingsForm.vue'
import type { SettingsSectionId } from '../features/settings/sections'

const { dark } = useAppearance()
const section = (location.hash.slice(1) || undefined) as SettingsSectionId | undefined
</script>

<template>
  <div class="ps-root min-h-screen bg-background text-foreground" :class="{ dark }">
    <main class="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
      <header class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-primary p-1.5 text-primary-foreground">
          <BrandMark />
        </div>
        <div class="flex flex-col">
          <h1 class="text-lg leading-6 font-semibold">PR Sift settings</h1>
          <p class="text-sm text-muted-foreground">Changes apply right away, here and in open reviews.</p>
        </div>
      </header>
      <SettingsForm :section="section" />
    </main>
  </div>
</template>
