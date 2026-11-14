<script setup lang="ts">
import { ArrowDownFromLine, ArrowUpFromLine, UnfoldVertical } from '@lucide/vue'
import { EXPAND_STEP, type GapControl } from '@pr-sift/core'
import { Button } from '@/components/ui/button'

const { control, busy = false } = defineProps<{ control: GapControl; busy?: boolean }>()
const emit = defineEmits<{ expand: [direction: 'up' | 'down' | 'all'] }>()
</script>

<template>
  <div class="flex items-center justify-center gap-0.5">
    <Button
      v-if="control.hidden !== null && control.hidden <= EXPAND_STEP"
      variant="ghost"
      size="icon-xs"
      class="size-5 text-muted-foreground hover:text-foreground"
      :disabled="busy"
      :title="`Show ${control.hidden} hidden lines`"
      :aria-label="`Show ${control.hidden} hidden lines`"
      @click="emit('expand', 'all')"
    >
      <UnfoldVertical />
    </Button>
    <template v-else>
      <Button
        v-if="control.down"
        variant="ghost"
        size="icon-xs"
        class="size-5 text-muted-foreground hover:text-foreground"
        :disabled="busy"
        title="Show more lines below"
        aria-label="Show more lines below"
        @click="emit('expand', 'down')"
      >
        <ArrowDownFromLine />
      </Button>
      <Button
        v-if="control.up"
        variant="ghost"
        size="icon-xs"
        class="size-5 text-muted-foreground hover:text-foreground"
        :disabled="busy"
        title="Show more lines above"
        aria-label="Show more lines above"
        @click="emit('expand', 'up')"
      >
        <ArrowUpFromLine />
      </Button>
    </template>
  </div>
</template>
