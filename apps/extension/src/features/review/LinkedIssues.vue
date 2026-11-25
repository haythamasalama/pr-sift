<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { CircleCheck, CircleDot, ExternalLink } from '@lucide/vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { PrRef } from '../../lib/types'
import { fetchLinkedIssues, type LinkedIssue } from './linkedIssues'

const { pr } = defineProps<{ pr: PrRef }>()
const issues = shallowRef<LinkedIssue[]>([])

onMounted(async () => {
  try {
    issues.value = await fetchLinkedIssues(pr)
  } catch {
    // Without a token or access, the button simply doesn't show.
    issues.value = []
  }
})
</script>

<template>
  <Popover v-if="issues.length">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-1 hover:text-foreground"
        :title="`${issues.length} linked ${issues.length === 1 ? 'issue' : 'issues'}`"
        :aria-label="`${issues.length} linked ${issues.length === 1 ? 'issue' : 'issues'}`"
      >
        <CircleDot class="size-3" />{{ issues.length }}
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-96 gap-1 p-2">
      <p class="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">
        Linked {{ issues.length === 1 ? 'issue' : 'issues' }} · closed when this merges
      </p>
      <a
        v-for="i in issues"
        :key="i.url"
        :href="i.url"
        target="_blank"
        rel="noreferrer"
        class="group flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
      >
        <CircleCheck v-if="i.state === 'CLOSED'" class="mt-0.5 size-4 shrink-0 text-merged" />
        <CircleDot v-else class="mt-0.5 size-4 shrink-0 text-success-fg" />
        <span class="min-w-0 flex-1">
          <span class="line-clamp-2">{{ i.title }}</span>
          <span class="text-xs text-muted-foreground">{{ i.external ? i.repo : '' }}#{{ i.number }}</span>
        </span>
        <ExternalLink class="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </a>
    </PopoverContent>
  </Popover>
</template>
