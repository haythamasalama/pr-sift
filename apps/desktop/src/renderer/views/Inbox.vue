<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { CircleAlert, RefreshCw } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { loadInbox, type Inbox } from '~/github'
import { errorText } from '~/format'
import { openReview } from '~/navigation'
import { useAuth } from '~/useAuth'
import PageHeader from '~/components/PageHeader.vue'
import PullRow from '~/components/PullRow.vue'
import IssueRow from '~/components/IssueRow.vue'

const { status } = useAuth()
const inbox = shallowRef<Inbox | null>(null)
const loading = shallowRef(false)
const error = shallowRef('')

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

async function load() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    inbox.value = await loadInbox()
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <PageHeader title="Needs you" :description="summary">
    <Button variant="outline" :disabled="loading" @click="load">
      <Spinner v-if="loading" />
      <RefreshCw v-else />
      Refresh
    </Button>
  </PageHeader>

  <div class="flex flex-col gap-6 p-6">
    <Alert v-if="error" variant="destructive"
      ><CircleAlert /><AlertDescription>{{ error }}</AlertDescription></Alert
    >
    <div v-if="!inbox && loading" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Asking GitHub…</div>

    <template v-if="inbox">
      <section class="flex flex-col gap-2">
        <h2 class="font-semibold">
          Waiting for your review <span class="font-normal text-muted-foreground">{{ inbox.review.length }}</span>
        </h2>
        <p v-if="!inbox.review.length" class="text-muted-foreground">You’re all caught up.</p>
        <ul v-else class="divide-y divide-border overflow-hidden rounded-lg border border-border">
          <PullRow v-for="p in inbox.review" :key="p.url" :pull="p" show-repo :me="me" @open="openReview(p)" />
        </ul>
      </section>

      <section v-if="mineNeedsYou.length" class="flex flex-col gap-2">
        <h2 class="font-semibold">
          Your pull requests that need you <span class="font-normal text-muted-foreground">{{ mineNeedsYou.length }}</span>
        </h2>
        <p class="text-xs text-muted-foreground">Changes were requested, checks failed, or there are conflicts.</p>
        <ul class="divide-y divide-border overflow-hidden rounded-lg border border-border">
          <PullRow v-for="p in mineNeedsYou" :key="p.url" :pull="p" show-repo @open="openReview(p)" />
        </ul>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="font-semibold">
          Your open pull requests <span class="font-normal text-muted-foreground">{{ mineOther.length }}</span>
        </h2>
        <p v-if="!mineOther.length" class="text-muted-foreground">None.</p>
        <ul v-else class="divide-y divide-border overflow-hidden rounded-lg border border-border">
          <PullRow v-for="p in mineOther" :key="p.url" :pull="p" show-repo @open="openReview(p)" />
        </ul>
      </section>

      <section v-if="inbox.assigned.length" class="flex flex-col gap-2">
        <h2 class="font-semibold">
          Issues assigned to you <span class="font-normal text-muted-foreground">{{ inbox.assigned.length }}</span>
        </h2>
        <ul class="divide-y divide-border overflow-hidden rounded-lg border border-border">
          <IssueRow v-for="i in inbox.assigned" :key="i.url" :issue="i" show-repo />
        </ul>
      </section>
    </template>
  </div>
</template>
