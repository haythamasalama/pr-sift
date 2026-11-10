export function whenIdle(task: () => void, timeout = 400): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(task, { timeout })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(task, 0)
  return () => clearTimeout(id)
}
