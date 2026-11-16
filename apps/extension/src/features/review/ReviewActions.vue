<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Check, GitMerge } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { PrInfo, PrRef } from '../../lib/types'
import ApproveDialog from './ApproveDialog.vue'
import MergeDialog from './MergeDialog.vue'

const { pr, info, headSha, canAct } = defineProps<{ pr: PrRef; info: PrInfo | null; headSha: string; canAct: boolean }>()
const emit = defineEmits<{ approved: []; merged: [sha: string] }>()

const dialog = shallowRef<'approve' | 'merge' | null>(null)
const open = computed(() => info?.state !== 'merged' && info?.state !== 'closed')
</script>

<template>
  <template v-if="open">
    <Button
      variant="outline"
      size="sm"
      class="shrink-0 border-success/50 text-success hover:bg-success/10 hover:text-success dark:border-success/60 dark:hover:bg-success/15"
      title="Approve this pull request on GitHub"
      @click="dialog = 'approve'"
    >
      <Check /><span class="hidden lg:inline">Approve</span>
    </Button>
    <Button variant="success" size="sm" class="shrink-0" title="Merge this pull request" @click="dialog = 'merge'">
      <GitMerge /><span class="hidden lg:inline">Merge</span>
    </Button>
  </template>
  <ApproveDialog
    v-if="dialog === 'approve'"
    :pr="pr"
    :title="info?.title ?? ''"
    :head-sha="headSha"
    :can-act="canAct"
    @close="dialog = null"
    @approved="
      () => {
        dialog = null
        emit('approved')
      }
    "
  />
  <MergeDialog
    v-if="dialog === 'merge'"
    :pr="pr"
    :info="info"
    :can-act="canAct"
    @close="dialog = null"
    @merged="
      (sha) => {
        dialog = null
        emit('merged', sha)
      }
    "
  />
</template>
