<script setup lang="ts">
import { Sparkles } from '@lucide/vue'
import type { SmartScopes } from '@pr-sift/core'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import ScopePanel from './ScopePanel.vue'

const { smart, selected } = defineProps<{ smart: SmartScopes; selected: string[] }>()
const emit = defineEmits<{ toggle: [key: string]; clear: [] }>()
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        size="icon-sm"
        class="relative size-7 shrink-0"
        :class="selected.length ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'"
        :title="selected.length ? `Smart filters: ${selected.length} on` : 'Smart filters'"
        :aria-label="selected.length ? `Smart filters, ${selected.length} on` : 'Smart filters'"
      >
        <Sparkles />
        <span v-if="selected.length" class="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emphasis ring-2 ring-sidebar" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-80 overflow-hidden p-0">
      <ScopePanel
        :smart="smart"
        :selected="selected"
        class="max-h-[min(32rem,70vh)]"
        @toggle="emit('toggle', $event)"
        @clear="emit('clear')"
      />
    </PopoverContent>
  </Popover>
</template>
