<script setup lang="ts">
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { reviewFocus, reviewPlace, stepReview } from '~/navigation'
import { keyText } from '~/shortcuts/keys'
import Hint from './Hint.vue'

// Beside the review's own tools: step to the previous or next pull request of the list it came from,
// and Focus, which hides the app's sidebar so the review has the whole window.
</script>

<template>
  <div class="flex shrink-0 items-center">
    <template v-if="reviewPlace.at >= 0 && reviewPlace.total > 1">
      <Hint :text="`Previous pull request · ${keyText('Alt+Mod+Up')}`" side="bottom">
        <Button
          variant="ghost"
          size="icon"
          class="text-muted-foreground"
          aria-label="Previous pull request"
          :disabled="!reviewPlace.previous"
          @click="stepReview(-1)"
          ><ChevronUp
        /></Button>
      </Hint>
      <span class="px-0.5 text-xs text-muted-foreground tabular-nums">{{ reviewPlace.at + 1 }}/{{ reviewPlace.total }}</span>
      <Hint :text="`Next pull request · ${keyText('Alt+Mod+Down')}`" side="bottom">
        <Button
          variant="ghost"
          size="icon"
          class="text-muted-foreground"
          aria-label="Next pull request"
          :disabled="!reviewPlace.next"
          @click="stepReview(1)"
          ><ChevronDown
        /></Button>
      </Hint>
    </template>
    <Hint :text="`${reviewFocus ? 'Show the sidebar' : 'Focus: hide the sidebar'} · ${keyText('Mod+.')}`" side="bottom">
      <Button
        variant="ghost"
        size="icon"
        class="text-muted-foreground"
        :aria-label="reviewFocus ? 'Show the sidebar' : 'Focus'"
        :aria-pressed="reviewFocus"
        @click="reviewFocus = !reviewFocus"
        ><Minimize2 v-if="reviewFocus" /><Maximize2 v-else
      /></Button>
    </Hint>
  </div>
</template>
