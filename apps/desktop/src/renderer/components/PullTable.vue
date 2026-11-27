<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { PullItem } from '~/github'
import { openReview } from '~/navigation'
import PullRow from './PullRow.vue'
import ProjectIcon from './ProjectIcon.vue'
import { groupPulls, usePullFolds, usePullView, type PullScope } from '~/pulls/view'

// Groups of pull requests in one quiet card. With `columns`, the first group's header names the columns;
// later groups get a muted band. With `titles`, a page that names the card itself still gets the column titles.
// The View menu's Group by splits each of those into folding groups: by owner or repository, or by author in a project.
const props = defineProps<{
  groups: { title: string; pulls: PullItem[] }[]
  showRepo?: boolean
  me?: string
  mine?: boolean
  columns?: boolean
  titles?: boolean
  scope?: PullScope
}>()
const emit = defineEmits<{ changed: [] }>()
const { shown, grouping } = usePullView()
const { folded, toggle } = usePullFolds()

const scope = computed<PullScope>(() => props.scope ?? (props.showRepo ? 'everywhere' : 'project'))
const how = computed(() => grouping.value[scope.value])
const where = computed(() => (how.value === 'repo' ? 'number' : how.value === 'owner' ? 'repo' : 'full'))

const sections = computed(() =>
  props.groups
    .filter((g) => g.pulls.length)
    .map((g) => ({
      ...g,
      parts: groupPulls(g.pulls, how.value).map((part) => {
        const key = `${scope.value}:${how.value}:${g.title}:${part.key}`
        const first = part.items[0]!
        return {
          ...part,
          foldKey: key,
          open: !folded.value.includes(key),
          project: { name: first.repo, github: { owner: first.owner, repo: first.repo } },
          author: first.author,
        }
      }),
    })),
)
// Previous and Next in the review walk through this table, in the order it shows.
const order = computed(() => sections.value.flatMap((s) => s.parts.flatMap((p) => p.items)))
const open = (p: PullItem) => openReview(p, order.value)
</script>

<template>
  <div class="@container overflow-hidden rounded-lg border border-border">
    <template v-for="(g, i) in sections" :key="g.title">
      <!-- Column titles: with `columns` the first group's title leads them; with `titles` alone the page names the group above. -->
      <div
        v-if="columns || (titles && !i)"
        class="flex items-center gap-4 px-4 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase"
        :class="i ? 'h-8 border-t border-accent bg-muted' : 'h-9 border-b border-border'"
      >
        <span class="flex-1">{{ columns ? `${g.title} · ${g.pulls.length}` : 'Pull request' }}</span>
        <template v-if="!i"
          ><span v-if="shown.review || shown.ci" class="w-[calc(18ch+2.5rem)] text-xs @max-3xl:hidden"
            ><span class="text-[11px]">Status</span></span
          ><span class="w-[256px] text-right @max-3xl:hidden @5xl:w-[332px]">Actions</span></template
        >
      </div>
      <template v-for="(part, j) in g.parts" :key="part.foldKey">
        <button
          v-if="how !== 'none'"
          type="button"
          class="flex h-9 w-full items-center gap-2.5 bg-muted/40 px-4 text-left hover:bg-muted"
          :class="i || j || columns || titles ? 'border-t border-border' : ''"
          :aria-expanded="part.open"
          @click="toggle(part.foldKey)"
        >
          <ChevronRight class="size-3.5 shrink-0 text-muted-foreground transition-transform" :class="part.open ? 'rotate-90' : ''" />
          <Avatar v-if="how === 'author'" class="size-[18px]"
            ><AvatarImage v-if="part.author?.avatarUrl" :src="part.author.avatarUrl" alt="" /><AvatarFallback
              class="text-[10px] uppercase"
              >{{ part.name.slice(0, 1) }}</AvatarFallback
            ></Avatar
          >
          <ProjectIcon v-else :project="part.project" :size="18" />
          <span class="min-w-0 truncate text-[13px] font-semibold">{{ part.name }}</span>
          <span class="text-xs text-muted-foreground tabular-nums">{{ part.items.length }}</span>
        </button>
        <ul v-if="part.open" :class="(i && !columns) || how !== 'none' ? 'border-t border-accent' : ''">
          <PullRow
            v-for="p in part.items"
            :key="p.url"
            :pull="p"
            :show-repo="showRepo"
            :where="where"
            :indent="how !== 'none'"
            :me="me"
            :mine="mine"
            @open="open(p)"
            @changed="emit('changed')"
          />
        </ul>
      </template>
    </template>
  </div>
</template>
