<script setup lang="ts">
import { SlidersHorizontal } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PULL_DETAILS, usePullView } from '~/pulls/view'

// Which details the pull request rows show. The choice holds for every list in the app.
const { shown, set, reset, hidden } = usePullView()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button size="sm" variant="outline"
        ><SlidersHorizontal /> View<span v-if="hidden()" class="text-muted-foreground">· {{ hidden() }} hidden</span></Button
      >
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-52">
      <DropdownMenuLabel class="text-xs">Show in each row</DropdownMenuLabel>
      <DropdownMenuCheckboxItem
        v-for="d in PULL_DETAILS"
        :key="d.value"
        :model-value="shown[d.value]"
        @update:model-value="(v) => set(d.value, !!v)"
        @select.prevent
        >{{ d.label }}</DropdownMenuCheckboxItem
      >
      <template v-if="hidden()">
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="reset">Show everything</DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
