<script setup lang="ts">
import { computed } from 'vue'
import { foldKeysOf, usePullFolds, type PullScope } from '~/pulls/view'
import FoldAllButton from '~/components/FoldAllButton.vue'

// Folds or opens every pull request group the tables of this scope show. Hidden while nothing is grouped.
const props = defineProps<{ scope: PullScope }>()
const { folded, setFolded } = usePullFolds()
const keys = computed(() => foldKeysOf(props.scope))
const allFolded = computed(() => keys.value.every((k) => folded.value.includes(k)))
</script>

<template>
  <FoldAllButton v-if="keys.length" :all-folded="allFolded" @fold="(f) => setFolded(keys, f)" />
</template>
