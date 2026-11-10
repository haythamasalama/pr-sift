<script setup lang="ts">
import type { Palette } from '../lib/types'

defineProps<{ palette: Palette; dark: boolean }>()
</script>

<template>
  <div class="rl-root w-full overflow-hidden rounded-md border bg-background" :class="[{ dark }, `palette-${palette}`]">
    <div class="bg-hunk px-2 py-0.5 font-mono text-xs text-muted-foreground">@@ -1,4 +1,4 @@</div>
    <div class="flex px-2 font-mono text-xs whitespace-pre">
      <span class="w-4 shrink-0 select-none"> </span
      ><span><span class="hljs-keyword">function</span> <span class="hljs-title function_">total</span>(items) {</span>
    </div>
    <div class="flex bg-del-bg px-2 font-mono text-xs whitespace-pre">
      <span class="w-4 shrink-0 text-del-fg select-none">−</span
      ><span> <span class="hljs-keyword">return</span> items.<span class="hljs-title function_">count</span>()</span>
    </div>
    <div class="flex bg-add-bg px-2 font-mono text-xs whitespace-pre">
      <span class="w-4 shrink-0 text-add-fg select-none">+</span
      ><span>
        <span class="hljs-keyword">return</span> items.<span class="hljs-title function_">sum</span>(<span class="hljs-string">'price'</span
        >)</span
      >
    </div>
    <div class="flex px-2 font-mono text-xs whitespace-pre"><span class="w-4 shrink-0 select-none"> </span><span>}</span></div>
  </div>
</template>
