<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { CircleAlert, RefreshCw } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { githubProjects, repoKey } from '~/everywhere'
import { useProjects } from '~/useProjects'
import { formatAgo } from '~/format'
import { useAuth } from '~/useAuth'
import { useInbox } from '~/useInbox'
import { isStale } from '~/useLive'
import CountBadge from '~/components/CountBadge.vue'
import PageHeader from '~/components/PageHeader.vue'
import PullTable from '~/components/PullTable.vue'
import PullFilterMenu from '~/components/PullFilterMenu.vue'
import PullViewMenu from '~/components/PullViewMenu.vue'
import PullFoldAll from '~/components/PullFoldAll.vue'
import { NO_FILTERS, matchesFilters, type PullFilters } from '~/pulls/filters'
import SectionLabel from '~/components/SectionLabel.vue'
import PullListSkeleton from '~/components/skeletons/PullListSkeleton.vue'

const { status } = useAuth()
const { inbox, loading, error, loadedAt, load } = useInbox()

const me = computed(() => status.value?.account?.login)
// Your pull requests that need something from you: changes were asked for, checks failed, or there are conflicts.
const needsYou = (p: { decision?: string | null; checks?: string; mergeable?: string }) =>
  p.decision === 'CHANGES_REQUESTED' || p.checks === 'FAILURE' || p.checks === 'ERROR' || p.mergeable === 'CONFLICTING'
// Those come first, so what needs you is at the top of the card.
const filters = shallowRef<PullFilters>({ ...NO_FILTERS })
// Off, the page shows everything GitHub has for you; on, only the repositories of the projects you added. Kept for next time.
const ONLY_KEY = 'ps:inbox-projects-only'
const projectsOnly = shallowRef(readOnly())
function readOnly() {
  try {
    return localStorage.getItem(ONLY_KEY) === '1'
  } catch {
    return false
  }
}
function setProjectsOnly(on: boolean) {
  projectsOnly.value = on
  try {
    localStorage.setItem(ONLY_KEY, on ? '1' : '0')
  } catch {
    // Lasts until the app closes.
  }
}
const { projects } = useProjects()
const yours = computed(() => new Set(githubProjects(projects.value ?? []).map((p) => repoKey(p.github!))))
const inScope = (p: { owner: string; repo: string }) => !projectsOnly.value || yours.value.has(repoKey(p))
const shownReview = computed(() => (inbox.value?.review ?? []).filter(inScope))
const shownMine = computed(() => (inbox.value?.mine ?? []).filter(inScope))
const everything = computed(() => [...shownReview.value, ...shownMine.value])
const review = computed(() => shownReview.value.filter((p) => matchesFilters(p, filters.value)))
const mine = computed(() => {
  const list = shownMine.value.filter((p) => matchesFilters(p, filters.value))
  return [...list.filter(needsYou), ...list.filter((p) => !needsYou(p))]
})
const tags = computed(() => {
  if (!inbox.value) return []
  const n = shownReview.value.length
  const m = mine.value.filter(needsYou).length
  return [
    ...(n ? [{ text: `${n} to review`, tone: 'info' as const }] : []),
    ...(m ? [{ text: `${m} of yours ${m === 1 ? 'needs' : 'need'} you`, tone: 'attention' as const }] : []),
  ]
})

onMounted(() => {
  // The app keeps this list current; opening the page only asks again when the last answer is out of date.
  if (isStale(loadedAt.value)) void load()
})
</script>

<template>
  <PageHeader title="Needs you" :tags="tags">
    <span v-if="loadedAt" class="text-xs text-muted-foreground">Updated {{ formatAgo(loadedAt) }}</span>

    <Button variant="ghost" size="icon" class="text-muted-foreground" aria-label="Refresh" :disabled="loading" @click="load">
      <RefreshCw :class="{ 'animate-spin': loading }" />
    </Button>
  </PageHeader>

  <div class="flex flex-col gap-7 px-8 py-6">
    <Alert v-if="error" variant="destructive"
      ><CircleAlert /><AlertDescription>{{ error }}</AlertDescription></Alert
    >
    <PullListSkeleton v-if="!inbox && loading" />

    <template v-if="inbox">
      <p v-if="!inbox.review.length && !inbox.mine.length" class="text-muted-foreground">You’re all caught up.</p>
      <div v-else class="-mb-3 flex flex-wrap items-center gap-2">
        <PullFilterMenu v-model="filters" :pulls="everything" />
        <label class="flex h-7 cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 text-[0.8rem] select-none">
          <Switch :model-value="projectsOnly" aria-label="Projects only" @update:model-value="(v) => setProjectsOnly(!!v)" />
          Projects only
        </label>
        <span class="ml-auto flex items-center gap-2"><PullFoldAll scope="everywhere" /><PullViewMenu /></span>
      </div>
      <p v-if="everything.length && !review.length && !mine.length" class="text-muted-foreground">No pull requests match.</p>
      <p v-else-if="!everything.length && projectsOnly" class="text-muted-foreground">None of them is in your projects.</p>
      <section v-if="review.length" class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <SectionLabel>Waiting for your review</SectionLabel><CountBadge>{{ review.length }}</CountBadge>
        </div>
        <PullTable :groups="[{ title: 'Waiting for your review', pulls: review }]" show-repo titles :me="me" @changed="load" />
      </section>
      <section v-if="mine.length" class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <SectionLabel>Yours</SectionLabel><CountBadge>{{ mine.length }}</CountBadge>
        </div>
        <PullTable :groups="[{ title: 'Yours', pulls: mine }]" show-repo titles mine :me="me" @changed="load" />
      </section>
    </template>
  </div>
</template>
