<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { STORE_URL } from '../../lib/updates'

const ROWS = ['w-2/5', 'w-1/3', 'w-1/2', 'w-2/5', 'w-1/3']
</script>

<template>
  <div class="flex flex-col gap-4 pt-4">
    <Empty class="border">
      <EmptyHeader>
        <EmptyTitle>Settings come with the extension</EmptyTitle>
        <EmptyDescription>Install PR Sift to choose your theme, hidden paths, merge method and more.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button as-child size="sm">
          <a :href="STORE_URL" target="_blank" rel="noopener noreferrer">Add to Chrome</a>
        </Button>
      </EmptyContent>
    </Empty>
    <div class="flex flex-col divide-y" aria-hidden="true">
      <div v-for="(width, i) in ROWS" :key="i" class="flex items-center gap-4 py-3">
        <div class="flex flex-1 flex-col gap-2">
          <Skeleton class="h-3.5 animate-none" :class="width" />
          <Skeleton class="h-3 w-4/5 animate-none" />
        </div>
        <Skeleton class="h-5 w-9 shrink-0 animate-none rounded-full" />
      </div>
    </div>
  </div>
</template>
