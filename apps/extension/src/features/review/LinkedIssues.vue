<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { CircleCheck, CircleDot, ExternalLink } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { PrRef } from '../../lib/types'
import { fetchLinkedIssues, type LinkedIssue } from './linkedIssues'

const { pr } = defineProps<{ pr: PrRef }>()
const issues = shallowRef<LinkedIssue[]>([])
const single = computed(() => (issues.value.length === 1 ? issues.value[0]! : null))
const allClosed = computed(() => issues.value.every((i) => i.state === 'CLOSED'))
const label = computed(() => {
  const n = issues.value.length
  const closed = issues.value.filter((i) => i.state === 'CLOSED').length
  const who = [...new Set(issues.value.flatMap((i) => i.assignees.map((a) => a.login)))]
  return [
    `${n} linked ${n === 1 ? 'issue' : 'issues'}`,
    closed ? `${closed} already closed` : '',
    who.length ? `assigned to ${who.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
})

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
        class="inline-flex h-4 shrink-0 items-center gap-1 rounded-sm border px-1.5 text-[11px] text-foreground hover:bg-accent"
        :title="label"
        :aria-label="label"
      >
        <CircleCheck v-if="allClosed" class="size-[11px] text-merged" />
        <CircleDot v-else class="size-[11px] text-success-fg" />
        <template v-if="single"
          ><span class="hidden text-muted-foreground xl:inline">{{ single.state === 'CLOSED' ? 'Closed' : 'Closes' }}</span
          >#{{ single.number }}</template
        >
        <template v-else>{{ issues.length }} issues</template>
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
          <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
            {{ i.external ? i.repo : '' }}#{{ i.number }}
            <span v-if="i.state === 'CLOSED'">· Closed</span>
            <template v-if="i.assignees.length">
              · Assigned to
              <Avatar v-for="a in i.assignees" :key="a.login" class="size-4" :title="a.login">
                <AvatarImage :src="a.avatar" :alt="a.login" />
                <AvatarFallback class="text-[8px] uppercase">{{ a.login.slice(0, 1) }}</AvatarFallback>
              </Avatar>
            </template>
          </span>
        </span>
        <ExternalLink class="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </a>
    </PopoverContent>
  </Popover>
</template>
