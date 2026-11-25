<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
</script>

<template>
  <!-- The kit's secondary badge, used for every count in the app. -->
  <Badge variant="secondary" class="min-w-5 px-1.5 tabular-nums"><slot /></Badge>
</template>
