<script setup lang="ts">
import { Lock } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { STORE_URL } from '../../lib/updates'

const TABS = ['w-16', 'w-20', 'w-14', 'w-24', 'w-14']
const ROWS = ['w-2/5', 'w-1/3', 'w-1/2', 'w-2/5', 'w-1/3', 'w-1/2', 'w-2/5']
</script>

<template>
  <div class="relative min-h-[560px] pt-4">
    <div class="flex flex-col gap-5" aria-hidden="true">
      <div class="flex gap-2 border-b pb-3">
        <Skeleton v-for="(width, i) in TABS" :key="i" class="h-7 animate-none" :class="width" />
      </div>
      <div class="flex items-center gap-3">
        <Skeleton class="size-9 animate-none" />
        <div class="flex flex-1 flex-col gap-2">
          <Skeleton class="h-3.5 w-1/4 animate-none" />
          <Skeleton class="h-3 w-1/2 animate-none" />
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <Skeleton v-for="i in 3" :key="i" class="h-9 animate-none" />
      </div>
      <div class="flex flex-col divide-y">
        <div v-for="(width, i) in ROWS" :key="i" class="flex items-center gap-4 py-3">
          <div class="flex flex-1 flex-col gap-2">
            <Skeleton class="h-3.5 animate-none" :class="width" />
            <Skeleton class="h-3 w-4/5 animate-none" />
          </div>
          <Skeleton class="h-5 w-9 shrink-0 animate-none rounded-full" />
        </div>
      </div>
    </div>
    <div class="absolute inset-0 bg-linear-to-b from-background/30 via-background/70 to-background" />
    <div class="absolute inset-x-0 top-28 flex justify-center">
      <Empty class="max-w-sm flex-none border border-solid bg-background shadow-lg">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Lock /></EmptyMedia>
          <EmptyTitle>Settings come with the extension</EmptyTitle>
          <EmptyDescription>Install PR Sift to choose your theme, hidden paths, merge method and more.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button as-child size="sm">
            <a :href="STORE_URL" target="_blank" rel="noopener noreferrer">Add to Chrome</a>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  </div>
</template>
