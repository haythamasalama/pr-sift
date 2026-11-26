<script setup lang="ts">
import type { ThemeStyle } from '../../lib/types'
import { themeAttrs } from '../appearance/useAppearance'

const { code, dark, themeStyle } = defineProps<{ code: string; dark: boolean; themeStyle: ThemeStyle }>()

// Each line is a list of [highlight class, text] pairs, the same classes the diff uses.
const LINES: [string, string][][] = [
  [['hljs-comment', '// Approve when every check passes']],
  [
    ['hljs-keyword', 'export function '],
    ['hljs-title function_', 'approve'],
    ['', '(pr: '],
    ['hljs-type', 'PullRequest'],
    ['', ') {'],
  ],
  [
    ['', '  '],
    ['hljs-keyword', 'const '],
    ['hljs-variable', 'label'],
    ['', ' = '],
    ['hljs-string', "'ready'"],
  ],
  [
    ['', '  '],
    ['hljs-keyword', 'return '],
    ['', 'pr.checks.'],
    ['hljs-property', 'length'],
    ['', ' > '],
    ['hljs-number', '0'],
  ],
  [['', '}']],
]
</script>

<template>
  <span class="block overflow-hidden rounded-md border" aria-hidden="true">
    <span
      class="ps-root block overflow-x-auto bg-background px-2.5 py-2 font-mono text-[11px] leading-[1.6] text-foreground"
      :class="{ dark }"
      v-bind="themeAttrs(themeStyle, code)"
    >
      <span v-for="(line, i) in LINES" :key="i" class="block whitespace-pre">
        <span v-for="([cls, text], j) in line" :key="j" :class="cls">{{ text }}</span>
      </span>
    </span>
  </span>
</template>
