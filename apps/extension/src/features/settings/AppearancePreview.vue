<script setup lang="ts">
import { Check } from '@lucide/vue'
import { Button } from '@/components/ui/button'

type Token = [text: string, tone?: string]
const LINES: { sign: string; tone: string; tokens: Token[] }[] = [
  { sign: ' ', tone: '', tokens: [['// Approve when every check passes', 'text-(--hl-comment)']] },
  {
    sign: ' ',
    tone: '',
    tokens: [
      ['export function ', 'text-(--hl-keyword)'],
      ['approve', 'text-(--hl-entity)'],
      ['(pr: '],
      ['PullRequest', 'text-(--hl-entity)'],
      [') {'],
    ],
  },
  {
    sign: ' ',
    tone: '',
    tokens: [['  '], ['const ', 'text-(--hl-keyword)'], ['label', 'text-(--hl-variable)'], [' = '], ["'ready'", 'text-(--hl-string)']],
  },
  {
    sign: '−',
    tone: 'bg-del-bg [&>.sign]:text-del-fg',
    tokens: [
      ['  '],
      ['return ', 'text-(--hl-keyword)'],
      ['pr.checks.'],
      ['length', 'text-(--hl-constant)'],
      [' > '],
      ['0', 'text-(--hl-constant)'],
    ],
  },
  {
    sign: '+',
    tone: 'bg-add-bg [&>.sign]:text-add-fg',
    tokens: [
      ['  '],
      ['return ', 'text-(--hl-keyword)'],
      ['pr.checks.'],
      ['every', 'text-(--hl-entity)'],
      ['((c) => c.'],
      ['ok', 'text-(--hl-variable)'],
      [')'],
    ],
  },
  { sign: ' ', tone: '', tokens: [['}']] },
]
</script>

<template>
  <div class="overflow-hidden rounded-lg border bg-background" aria-label="Preview" role="img">
    <div class="flex h-10 items-center justify-between gap-3 border-b bg-muted pr-1.5 pl-3">
      <span class="truncate font-mono text-xs text-muted-foreground">src/review/approve.ts</span>
      <Button size="sm" tabindex="-1" aria-hidden="true"><Check /> Approve</Button>
    </div>
    <div class="py-1.5 font-mono text-[length:var(--ps-code-size,12px)] leading-[1.6]" aria-hidden="true">
      <div v-for="(line, i) in LINES" :key="i" class="flex px-3 whitespace-pre" :class="line.tone">
        <span class="sign w-4 shrink-0 text-muted-foreground">{{ line.sign }}</span>
        <span
          ><span v-for="(t, j) in line.tokens" :key="j" :class="t[1]">{{ t[0] }}</span></span
        >
      </div>
    </div>
  </div>
</template>
