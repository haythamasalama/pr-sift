<script setup lang="ts">
import { ChevronsDownUp, ChevronsUpDown } from '@lucide/vue'
import { Button } from '@/components/ui/button'

// One button that folds every group on the page, or opens them all again when they are all folded.
const props = defineProps<{ allFolded: boolean }>()
const emit = defineEmits<{ fold: [fold: boolean] }>()
const label = () => (props.allFolded ? 'Expand all' : 'Collapse all')
</script>

<template>
  <Button size="icon-sm" variant="outline" :title="label()" :aria-label="label()" @click="emit('fold', !allFolded)">
    <ChevronsUpDown v-if="allFolded" />
    <ChevronsDownUp v-else />
  </Button>
</template>
