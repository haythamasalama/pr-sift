<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import type { Repo, Worktree } from '#shared/ipc'
import { bridge } from '~/bridge'
import { errorText } from '~/format'

// Makes a new worktree for a branch, or renames a worktree's folder and branch.
const open = defineModel<boolean>('open', { required: true })
const { repo, worktree = null } = defineProps<{ repo: string; worktree?: Worktree | null }>()
const emit = defineEmits<{ done: [repo: Repo, path: string] }>()

const branch = shallowRef('')
const folder = shallowRef('')
const error = shallowRef('')
const saving = shallowRef(false)
const folderOf = (path: string) => path.split(/[\\/]/).pop() ?? path
const renaming = computed(() => worktree !== null)

watch(open, (on) => {
  if (!on) return
  error.value = ''
  branch.value = worktree?.branch ?? ''
  folder.value = worktree ? folderOf(worktree.path) : ''
})

async function save() {
  error.value = ''
  saving.value = true
  try {
    if (!worktree) {
      const name = branch.value.trim()
      if (!name) throw new Error('Type a branch name.')
      const next = await bridge.invoke('worktrees:add', repo, name)
      const made = next.worktrees.find((w) => w.branch === name)
      emit('done', next, made?.path ?? '')
    } else {
      let path = worktree.path
      let next: Repo | null = null
      const nextBranch = branch.value.trim()
      if (nextBranch && nextBranch !== (worktree.branch ?? '')) next = await bridge.invoke('worktrees:rename-branch', path, nextBranch)
      const nextFolder = folder.value.trim()
      const current = folderOf(path)
      if (nextFolder && nextFolder !== current) {
        next = await bridge.invoke('worktrees:rename', path, nextFolder)
        path = path.slice(0, path.length - current.length) + nextFolder
      }
      if (next) emit('done', next, path)
    }
    open.value = false
  } catch (e) {
    error.value = errorText(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ renaming ? 'Rename worktree' : 'New worktree' }}</DialogTitle>
        <DialogDescription>{{
          renaming
            ? 'Changes the folder name, the branch name, or both. Uncommitted work stays as it is.'
            : 'Checks out a branch in its own folder next to the project, so you can work on it without switching.'
        }}</DialogDescription>
      </DialogHeader>
      <form class="contents" @submit.prevent="save">
        <FieldGroup>
          <Field>
            <FieldLabel for="wt-branch">Branch</FieldLabel>
            <Input id="wt-branch" v-model="branch" class="font-mono" placeholder="feature/cart" autocomplete="off" spellcheck="false" />
            <FieldDescription v-if="!renaming"
              >An existing branch is checked out; a new name starts a branch from the current commit.</FieldDescription
            >
          </Field>
          <Field v-if="renaming">
            <FieldLabel for="wt-folder">Folder</FieldLabel>
            <Input id="wt-folder" v-model="folder" class="font-mono" autocomplete="off" spellcheck="false" />
          </Field>
          <FieldError v-if="error">{{ error }}</FieldError>
        </FieldGroup>
        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">Cancel</Button>
          <Button type="submit" :disabled="saving"><Spinner v-if="saving" />{{ renaming ? 'Save' : 'Create worktree' }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
