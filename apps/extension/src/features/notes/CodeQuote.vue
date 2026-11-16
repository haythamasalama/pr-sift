<script setup lang="ts">
import { computed } from 'vue'
import { highlightSnippet } from '../diff/highlight'

const { code, filename } = defineProps<{ code: string; filename: string }>()

const html = computed(() => highlightSnippet(code, filename))
</script>

<template>
  <code class="block font-mono text-xs leading-5 whitespace-pre-wrap text-foreground" :title="code" v-html="html" />
</template>
