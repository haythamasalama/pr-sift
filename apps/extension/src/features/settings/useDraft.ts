import { onScopeDispose, ref, watch, type Ref } from 'vue'

export const SAVE_DELAY = 400

export interface DraftOptions<T, D> {
  source: () => T
  commit: (value: T) => void
  toDraft: (value: T) => D
  fromDraft: (draft: D) => T
  delay?: number
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// Text is edited as a draft and committed after a pause, so a stored value never rewrites what is being typed.
export function useDraft<T, D>({ source, commit, toDraft, fromDraft, delay = SAVE_DELAY }: DraftOptions<T, D>) {
  const draft = ref(toDraft(source())) as Ref<D>
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(source, (value) => {
    if (timer === undefined && !same(value, fromDraft(draft.value))) draft.value = toDraft(value)
  })

  function save() {
    clearTimeout(timer)
    timer = undefined
    const value = fromDraft(draft.value)
    if (!same(value, source())) commit(value)
  }

  function flush() {
    if (timer !== undefined) save()
  }

  function schedule() {
    clearTimeout(timer)
    timer = setTimeout(save, delay)
  }

  onScopeDispose(flush)

  return { draft, schedule, flush, save }
}
