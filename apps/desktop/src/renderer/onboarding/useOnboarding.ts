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
    localStorage.setItem(KEY, value ? '1' : '0')
  } catch {
    // Without storage it shows again next launch, which is harmless.
  }
}

// Someone already signed in from a version before the walk-through has set the app up; they skip it.
function adopt(signedIn: boolean) {
  try {
    if (signedIn && localStorage.getItem(KEY) === null) write(true)
  } catch {
    // Nothing stored: the walk-through shows, which is harmless.
  }
}

export function useOnboarding() {
  return { done, finish: () => write(true), restart: () => write(false), adopt }
}
