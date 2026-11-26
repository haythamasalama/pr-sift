<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChevronDown } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CODE_THEMES, codeFor } from '../appearance/useAppearance'

const { dark } = defineProps<{ dark: boolean }>()
const model = defineModel<string>({ required: true })
const open = shallowRef(false)
const current = computed(() => CODE_THEMES.find((o) => o.value === model.value)?.label ?? model.value)
const DOTS = ['bg-(--hl-keyword)', 'bg-(--hl-entity)', 'bg-(--hl-string)', 'bg-(--hl-constant)']
</script>

<template>
  <DropdownMenu v-model:open="open">
    <DropdownMenuTrigger as-child>
      <Button variant="outline" class="w-52 justify-start font-normal" aria-label="Code colors">
        <span class="ps-root flex gap-[3px]" :class="{ dark }" :data-code="codeFor(model, dark)" aria-hidden="true">
          <span v-for="d in DOTS" :key="d" class="size-2 rounded-full" :class="d" />
        </span>
        <span class="flex-1 text-left">{{ current }}</span>
        <ChevronDown class="text-muted-foreground" />
      </Button>
    </DropdownMenuTrigger>
    <!-- Mounted only while open: a closed menu would leave its portal anchors in the page. -->
    <DropdownMenuContent v-if="open" align="end" class="w-(--reka-dropdown-menu-trigger-width)">
      <DropdownMenuRadioGroup :model-value="model" @update:model-value="(v) => (model = v as string)">
        <DropdownMenuRadioItem v-for="o in CODE_THEMES" :key="o.value" :value="o.value">
          <span class="ps-root flex gap-[3px]" :class="{ dark }" :data-code="codeFor(o.value, dark)" aria-hidden="true">
            <span v-for="d in DOTS" :key="d" class="size-2 rounded-full" :class="d" />
          </span>
          {{ o.label }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
