import { shallowRef } from 'vue'

// An on/off choice kept between launches, such as a page's Projects only switch.
export function useSavedFlag(key: string, fallback = false) {
  let start = fallback
  try {
    const saved = localStorage.getItem(key)
    if (saved !== null) start = saved === '1'
  } catch {
    // Starts from the fallback.
  }
  const on = shallowRef(start)
  function set(value: boolean) {
    on.value = value
    try {
      localStorage.setItem(key, value ? '1' : '0')
    } catch {
      // Lasts until the app closes.
    }
  }
  return { on, set }
}
