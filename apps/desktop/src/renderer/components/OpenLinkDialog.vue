<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { parsePullLink } from '#shared/links'
import { openReview } from '~/navigation'

// Opens a pull request from its link, the way an address bar does. A link already on the clipboard is filled in.
const open = defineModel<boolean>('open', { required: true })
const text = shallowRef('')
const pull = computed(() => parsePullLink(text.value.trim()))
const wrong = computed(() => text.value.trim() !== '' && !pull.value)

watch(open, async (on) => {
  if (!on) return
  text.value = ''
  try {
    const copied = (await navigator.clipboard.readText()).trim()
    if (parsePullLink(copied)) text.value = copied
  } catch {
    // The clipboard is not readable here; the field stays empty.
  }
})

function go() {
  if (!pull.value) return
  openReview(pull.value)
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Open a pull request</DialogTitle>
        <DialogDescription>Paste its GitHub link.</DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-1.5" @submit.prevent="go">
        <Input
          v-model="text"
          autofocus
          spellcheck="false"
          autocomplete="off"
          placeholder="https://github.com/owner/repo/pull/123"
          aria-label="Pull request link"
          :aria-invalid="wrong || undefined"
        />
        <p v-if="wrong" class="text-xs text-destructive">That is not a pull request link.</p>
      </form>
      <DialogFooter>
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button :disabled="!pull" @click="go">Open</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
