<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { highlighterReady, loadHighlighter, plainSnippet } from '../diff/highlight'

const { code, filename } = defineProps<{ code: string; filename: string }>()

const highlighter = shallowRef(highlighterReady())
if (!highlighter.value)
  void loadHighlighter()
    .then((loaded) => (highlighter.value = loaded))
    .catch(() => undefined)

const html = computed(() => highlighter.value?.highlightSnippet(code, filename) ?? plainSnippet(code))
</script>

<template>
  <code class="block font-mono text-xs leading-5 whitespace-pre-wrap text-foreground" :title="code" v-html="html" />
</template>
