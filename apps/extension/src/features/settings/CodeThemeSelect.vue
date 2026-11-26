<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChevronDown, Moon, Sun } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CODE_THEMES } from '../appearance/useAppearance'

const { mode } = defineProps<{ mode: 'light' | 'dark' }>()
const model = defineModel<string>({ required: true })
const options = computed(() => CODE_THEMES[mode])
const open = shallowRef(false)
const current = computed(() => options.value.find((o) => o.value === model.value)?.label ?? model.value)
</script>

<template>
  <div class="flex min-w-0 flex-1 flex-col gap-1.5">
    <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
      <component :is="mode === 'light' ? Sun : Moon" class="size-3.5" />{{ mode === 'light' ? 'Light mode' : 'Dark mode' }}
    </span>
    <DropdownMenu v-model:open="open">
      <DropdownMenuTrigger as-child>
        <Button variant="outline" class="w-full justify-between font-normal" :aria-label="`Code colours in ${mode} mode`">
          {{ current }}<ChevronDown class="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <!-- Mounted only while open: a closed menu would leave its portal anchors in the page. -->
      <DropdownMenuContent v-if="open" align="start" class="w-(--reka-dropdown-menu-trigger-width)">
        <DropdownMenuRadioGroup :model-value="model" @update:model-value="(v) => (model = v as string)">
          <DropdownMenuRadioItem v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
