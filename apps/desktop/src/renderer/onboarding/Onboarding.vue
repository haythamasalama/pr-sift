<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { ArrowLeft, ArrowRight, Check } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useAuth } from '~/useAuth'
import { useProjects } from '~/useProjects'
import AppLogo from '~/components/AppLogo.vue'
import SignInStep from './SignInStep.vue'
import StyleStep from './StyleStep.vue'
import ProjectsStep from './ProjectsStep.vue'
import { useOnboarding } from './useOnboarding'

// First run: sign in, pick a style, then a short tour of how projects work.
// After it is finished once, signing out leads back to the sign-in step alone.
const { status } = useAuth()
const { done, finish } = useOnboarding()
const { projects } = useProjects()
const none = computed(() => step.value === 'projects' && !projects.value?.length)

const STEPS = [
  { key: 'sign-in', label: 'Sign in' },
  { key: 'style', label: 'Style' },
  { key: 'projects', label: 'Projects' },
] as const
const steps = computed(() => (done.value ? STEPS.slice(0, 1) : STEPS))
const index = shallowRef(0)
const step = computed(() => steps.value[index.value]?.key ?? 'sign-in')
const last = computed(() => index.value === steps.value.length - 1)
const signedIn = computed(() => !!status.value?.signedIn)

// Signing in from the form moves on by itself.
watch(signedIn, (now, before) => {
  if (now && !before && step.value === 'sign-in') next()
})

function next() {
  if (last.value) finish()
  else index.value++
}
const back = () => index.value > 0 && index.value--
</script>

<template>
  <main class="flex h-full flex-col bg-background">
    <header class="flex items-center gap-2.5 px-8 pt-7">
      <AppLogo class="size-7" />
      <span class="text-[15px] font-semibold">PR Sift</span>
      <ol v-if="steps.length > 1" class="ml-auto flex items-center gap-2" aria-label="Steps">
        <li
          v-for="(s, i) in steps"
          :key="s.key"
          class="flex items-center gap-2 text-xs"
          :class="i === index ? 'font-medium text-foreground' : 'text-muted-foreground'"
          :aria-current="i === index ? 'step' : undefined"
        >
          <span
            class="flex size-5 items-center justify-center rounded-full border text-[11px]"
            :class="i < index ? 'border-foreground bg-foreground text-background' : i === index ? 'border-foreground' : 'border-border'"
            ><Check v-if="i < index" class="size-3" /><template v-else>{{ i + 1 }}</template></span
          >
          <span class="max-sm:hidden">{{ s.label }}</span>
          <span v-if="i < steps.length - 1" class="h-px w-6 bg-border" aria-hidden="true" />
        </li>
      </ol>
    </header>

    <div class="flex min-h-0 flex-1 overflow-y-auto">
      <div
        class="m-auto w-full px-8 py-10"
        :class="step === 'sign-in' ? 'max-w-[400px]' : step === 'projects' ? 'max-w-[680px]' : 'max-w-[600px]'"
      >
        <SignInStep v-if="step === 'sign-in'" @next="next" />
        <StyleStep v-else-if="step === 'style'" />
        <ProjectsStep v-else />
      </div>
    </div>

    <footer v-if="step !== 'sign-in'" class="flex items-center gap-2 border-t border-border px-8 py-4">
      <Button variant="ghost" @click="back"><ArrowLeft /> Back</Button>
      <!-- Until a project is added, the step's own buttons are the way on, so the footer only offers to skip. -->
      <Button v-if="none" variant="ghost" class="ml-auto" @click="finish">Skip for now</Button>
      <Button v-else class="ml-auto" @click="next">
        <template v-if="last">Start using PR Sift <Check /></template><template v-else>Continue <ArrowRight /></template>
      </Button>
    </footer>
  </main>
</template>
