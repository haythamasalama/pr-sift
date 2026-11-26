<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { CircleAlert, RefreshCw } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatAgo } from '~/format'
import { useAuth } from '~/useAuth'
import { useInbox } from '~/useInbox'
import { isStale } from '~/useLive'
import CountBadge from '~/components/CountBadge.vue'
import PageHeader from '~/components/PageHeader.vue'
import PullTable from '~/components/PullTable.vue'
import PullFilterMenu from '~/components/PullFilterMenu.vue'
import PullViewMenu from '~/components/PullViewMenu.vue'
import { NO_FILTERS, matchesFilters, type PullFilters } from '~/pulls/filters'
import SectionLabel from '~/components/SectionLabel.vue'

const { status } = useAuth()
const { inbox, loading, error, loadedAt, load } = useInbox()

const me = computed(() => status.value?.account?.login)
// Your pull requests that need something from you: changes were asked for, checks failed, or there are conflicts.
const needsYou = (p: { decision?: string | null; checks?: string; mergeable?: string }) =>
  p.decision === 'CHANGES_REQUESTED' || p.checks === 'FAILURE' || p.checks === 'ERROR' || p.mergeable === 'CONFLICTING'
// Those come first, so what needs you is at the top of the card.
const filters = shallowRef<PullFilters>({ ...NO_FILTERS })
const everything = computed(() => [...(inbox.value?.review ?? []), ...(inbox.value?.mine ?? [])])
const review = computed(() => (inbox.value?.review ?? []).filter((p) => matchesFilters(p, filters.value)))
const mine = computed(() => {
  const list = (inbox.value?.mine ?? []).filter((p) => matchesFilters(p, filters.value))
  return [...list.filter(needsYou), ...list.filter((p) => !needsYou(p))]
})
const summary = computed(() => {
  if (!inbox.value) return 'What is waiting for you on GitHub.'
  const n = inbox.value.review.length
  const waiting = n
    ? `${n} ${n === 1 ? 'pull request waits' : 'pull requests wait'} for your review.`
    : 'Nobody is waiting for your review.'
  const m = mine.value.filter(needsYou).length
  return m ? `${waiting} ${m} of yours ${m === 1 ? 'needs' : 'need'} something from you.` : waiting
})

onMounted(() => {
  // The app keeps this list current; opening the page only asks again when the last answer is out of date.
  if (isStale(loadedAt.value)) void load()
})
</script>

<template>
  <PageHeader title="Needs you" :description="summary">
    <span v-if="loadedAt" class="text-xs text-muted-foreground">Updated {{ formatAgo(loadedAt) }}</span>

    <Button variant="ghost" size="icon" class="text-muted-foreground" aria-label="Refresh" :disabled="loading" @click="load">
      <Spinner v-if="loading" /><RefreshCw v-else />
    </Button>
  </PageHeader>

  <div class="flex flex-col gap-7 px-8 py-6">
    <Alert v-if="error" variant="destructive"
      ><CircleAlert /><AlertDescription>{{ error }}</AlertDescription></Alert
    >
    <div v-if="!inbox && loading" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Asking GitHub…</div>

    <template v-if="inbox">
      <p v-if="!inbox.review.length && !inbox.mine.length" class="text-muted-foreground">You’re all caught up.</p>
      <div v-else class="-mb-3 flex flex-wrap items-center gap-2">
        <PullFilterMenu v-model="filters" :pulls="everything" />
        <span class="ml-auto"><PullViewMenu /></span>
      </div>
      <p v-if="everything.length && !review.length && !mine.length" class="text-muted-foreground">No pull requests match.</p>
      <section v-if="review.length" class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <SectionLabel>Waiting for your review</SectionLabel><CountBadge>{{ review.length }}</CountBadge>
        </div>
        <PullTable :groups="[{ title: 'Waiting for your review', pulls: review }]" show-repo :me="me" @changed="load" />
      </section>
      <section v-if="mine.length" class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <SectionLabel>Yours</SectionLabel><CountBadge>{{ mine.length }}</CountBadge>
        </div>
        <PullTable :groups="[{ title: 'Yours', pulls: mine }]" show-repo mine :me="me" @changed="load" />
      </section>
    </template>
  </div>
</template>
