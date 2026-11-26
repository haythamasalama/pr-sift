import { shallowRef } from 'vue'

// Whether the first-run walk-through (sign in, style, projects) was finished on this machine.
const KEY = 'ps:onboarded'

const read = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

const done = shallowRef(read())

function write(value: boolean) {
  done.value = value
  try {
    if (value) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    // Without storage it shows again next launch, which is harmless.
  }
}

export function useOnboarding() {
  return { done, finish: () => write(true), restart: () => write(false) }
}
