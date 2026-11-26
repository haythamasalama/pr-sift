<script setup lang="ts">
import type { Component } from 'vue'
import { Check, Monitor, Moon, Sun } from '@lucide/vue'
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import SegmentedControl from '@/features/settings/SegmentedControl.vue'
import { THEME_STYLES, themeAttrs, useAppearance } from '@/features/appearance/useAppearance'
import type { ThemeMode, ThemeStyle } from '@/lib/types'

const MODES: { value: ThemeMode; label: string; icon: Component }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

// Each choice applies at once, so the whole window shows it while you pick.
const { theme, setTheme, themeStyle, setThemeStyle, dark } = useAppearance()
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-1.5">
      <h1 class="text-2xl font-semibold tracking-tight">Pick your style</h1>
      <p class="text-muted-foreground">It changes as you choose. You can change it later in Settings.</p>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <span class="font-medium">Mode</span>
      <SegmentedControl :model-value="theme" :options="MODES" name="onboarding-mode" label="Mode" @update:model-value="setTheme" />
    </div>

    <div class="flex flex-col gap-3">
      <span class="font-medium">Theme</span>
      <RadioGroupRoot
        :model-value="themeStyle"
        aria-label="Theme"
        class="grid grid-cols-2 gap-3 sm:grid-cols-3"
        @update:model-value="(v) => v && setThemeStyle(v as ThemeStyle)"
      >
        <RadioGroupItem
          v-for="t in THEME_STYLES"
          :id="`onboarding-style-${t.value}`"
          :key="t.value"
          :value="t.value"
          class="group flex cursor-pointer flex-col gap-2 rounded-lg text-left outline-none"
        >
          <!-- A small window drawn in that theme: sidebar, a pull request row and its merge button. -->
          <span
            class="ps-root relative flex h-[84px] overflow-hidden rounded-lg border border-border bg-background text-foreground ring-offset-2 ring-offset-background transition-shadow group-hover:border-muted-foreground group-focus-visible:ring-2 group-focus-visible:ring-ring/50 group-data-[state=checked]:ring-2 group-data-[state=checked]:ring-primary"
            :class="{ dark }"
            v-bind="themeAttrs(t.value)"
            aria-hidden="true"
          >
            <span class="flex w-[30%] flex-col gap-1.5 border-r border-border p-2">
              <span class="h-1.5 w-3/4 rounded-full bg-foreground/80" />
              <span class="h-1.5 w-full rounded-sm bg-muted" />
              <span class="h-1.5 w-2/3 rounded-full bg-muted-foreground/40" />
              <span class="h-1.5 w-1/2 rounded-full bg-muted-foreground/40" />
            </span>
            <span class="flex flex-1 flex-col gap-2 p-2">
              <span class="h-1.5 w-1/2 rounded-full bg-foreground/80" />
              <span class="flex items-center gap-1.5 rounded-md border border-border p-1.5">
                <span class="flex flex-1 flex-col gap-1">
                  <span class="h-1.5 w-4/5 rounded-full bg-foreground/70" />
                  <span class="h-1 w-1/2 rounded-full bg-muted-foreground/40" />
                </span>
                <span class="h-3.5 w-6 rounded-sm bg-success" />
              </span>
              <span class="flex gap-1">
                <span class="h-2.5 w-5 rounded-sm bg-primary" />
                <span class="h-2.5 w-4 rounded-sm border border-border bg-muted" />
              </span>
            </span>
            <span
              class="absolute top-1.5 right-1.5 hidden size-4 items-center justify-center rounded-full bg-primary text-primary-foreground group-data-[state=checked]:flex"
              ><Check class="size-3"
            /></span>
          </span>
          <span class="flex flex-col">
            <span class="text-sm font-medium">{{ t.label }}</span>
            <span class="line-clamp-2 text-xs text-muted-foreground">{{ t.hint }}</span>
          </span>
        </RadioGroupItem>
      </RadioGroupRoot>
    </div>
  </div>
</template>
