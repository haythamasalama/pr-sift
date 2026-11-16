<script setup lang="ts">
import { shallowRef } from 'vue'
import { Check, CircleAlert, KeyRound } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import Modal from '../../components/Modal.vue'
import { openOptions } from '../../lib/extension'
import type { PrRef } from '../../lib/types'
import { approve, explain } from './actions'

const { pr, title, headSha, canAct } = defineProps<{ pr: PrRef; title: string; headSha: string; canAct: boolean }>()
const emit = defineEmits<{ close: []; approved: [] }>()

const comment = shallowRef('')
const busy = shallowRef(false)
const error = shallowRef('')

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await approve(pr, headSha, comment.value)
    emit('approved')
  } catch (e) {
    error.value = explain(e, 'approve')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Modal title="Approve pull request" :description="`#${pr.number} ${title}`" @close="emit('close')">
    <Alert v-if="!canAct">
      <KeyRound />
      <AlertDescription class="flex flex-col items-start gap-2">
        Approving from the review needs a GitHub token with Pull requests set to read and write.
        <Button size="sm" variant="outline" @click="openOptions">Open settings</Button>
      </AlertDescription>
    </Alert>
    <div v-else class="flex flex-col gap-4">
      <Field>
        <FieldLabel for="approve-comment">Comment</FieldLabel>
        <Textarea
          id="approve-comment"
          v-model="comment"
          rows="4"
          placeholder="Optional"
          @keydown.enter.ctrl.prevent="submit"
          @keydown.enter.meta.prevent="submit"
        />
        <FieldDescription>Posted on GitHub with your approval.</FieldDescription>
      </Field>
      <Alert v-if="error" variant="destructive">
        <CircleAlert />
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" size="sm" @click="emit('close')">Cancel</Button>
        <Button size="sm" :disabled="!canAct || busy" @click="submit">
          <Spinner v-if="busy" />
          <Check v-else />
          Approve
        </Button>
      </div>
    </template>
  </Modal>
</template>
