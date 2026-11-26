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
import { CODE_THEMES } from '../appearance/useAppearance'

const model = defineModel<string>({ required: true })
const open = shallowRef(false)
const current = computed(() => CODE_THEMES.find((o) => o.value === model.value)?.label ?? model.value)
</script>

<template>
  <div class="flex">
    <DropdownMenu v-model:open="open">
      <DropdownMenuTrigger as-child>
        <Button variant="outline" class="w-56 justify-between font-normal" aria-label="Code colors">
          {{ current }}<ChevronDown class="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <!-- Mounted only while open: a closed menu would leave its portal anchors in the page. -->
      <DropdownMenuContent v-if="open" align="start" class="w-(--reka-dropdown-menu-trigger-width)">
        <DropdownMenuRadioGroup :model-value="model" @update:model-value="(v) => (model = v as string)">
          <DropdownMenuRadioItem v-for="o in CODE_THEMES" :key="o.value" :value="o.value">{{ o.label }}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
