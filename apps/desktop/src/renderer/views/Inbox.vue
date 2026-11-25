<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { CircleAlert, RefreshCw } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatAgo } from '~/format'
import { useAuth } from '~/useAuth'
import { useInbox } from '~/useInbox'
import PageHeader from '~/components/PageHeader.vue'
import PullTable from '~/components/PullTable.vue'

const { status } = useAuth()
const { inbox, loading, error, loadedAt, load } = useInbox()

const me = computed(() => status.value?.account?.login)
const summary = computed(() => {
  if (!inbox.value) return 'What is waiting for you on GitHub.'
  const n = inbox.value.review.length
  return n ? `${n} ${n === 1 ? 'pull request is' : 'pull requests are'} waiting for your review.` : 'Nobody is waiting for your review.'
})
// Your pull requests that need something from you: changes were asked for, or checks failed.
const mineNeedsYou = computed(
  () =>
    inbox.value?.mine.filter((p) => p.decision === 'CHANGES_REQUESTED' || p.checks === 'FAILURE' || p.mergeable === 'CONFLICTING') ?? [],
)
const mineOther = computed(() => inbox.value?.mine.filter((p) => !mineNeedsYou.value.includes(p)) ?? [])

onMounted(() => {
  // The sidebar already asked when the app opened; only ask again when that answer is getting old.
  if (!loadedAt.value || Date.now() - loadedAt.value > 60_000) void load()
})
</script>

<template>
  <PageHeader title="Needs you" :description="summary">
    <span v-if="loadedAt" class="text-xs text-faint">Updated {{ formatAgo(loadedAt) }}</span>
    <Button variant="outline" size="sm" :disabled="loading" @click="load">
      <Spinner v-if="loading" />
      <RefreshCw v-else />
      Refresh
    </Button>
  </PageHeader>

  <div class="flex flex-col gap-5 px-8 py-5">
    <Alert v-if="error" variant="destructive"
      ><CircleAlert /><AlertDescription>{{ error }}</AlertDescription></Alert
    >
    <div v-if="!inbox && loading" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Asking GitHub…</div>

    <template v-if="inbox">
      <p v-if="!inbox.review.length && !inbox.mine.length" class="text-muted-foreground">You’re all caught up.</p>
      <PullTable v-if="inbox.review.length" :groups="[{ title: 'Waiting for your review', pulls: inbox.review }]" show-repo :me="me" />
      <div v-if="inbox.mine.length" class="flex flex-col gap-2">
        <PullTable
          :groups="[
            { title: 'Yours, needs you', pulls: mineNeedsYou },
            { title: 'Your open pull requests', pulls: mineOther },
          ]"
          show-repo
        />
        <p v-if="mineNeedsYou.length" class="px-1 text-xs text-faint">
          “Needs you” means changes were asked for, checks failed, or there are conflicts.
        </p>
      </div>
    </template>
  </div>
</template>
