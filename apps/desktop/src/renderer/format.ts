export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return ''
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

export function formatAgo(ms: number | undefined, now = Date.now()): string {
  if (!ms) return ''
  const minutes = Math.round((now - ms) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`
  const years = Math.round(days / 365)
  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

// Shows a path from the home folder down, the way people read it.
export function shortPath(path: string, home: string): string {
  return home && path.startsWith(home) ? '~' + path.slice(home.length) : path
}

// Electron wraps errors thrown in the main process; people only need the message itself.
export function errorText(e: unknown): string {
  const text = e instanceof Error ? e.message : String(e)
  return text.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}

// A path as it reads inside your project folders: `web/globex/backend` rather than the whole absolute path.
// Outside every project folder it falls back to the path from the home folder.
export function projectPath(path: string, roots: string[], home: string): string {
  const sep = /[\\/]/
  const root = roots
    .filter((r) => path === r || (path.startsWith(r) && sep.test(path.charAt(r.replace(/[\\/]+$/, '').length))))
    .sort((a, b) => b.length - a.length)[0]
  if (!root) return shortPath(path, home)
  const rest = path.slice(root.replace(/[\\/]+$/, '').length + 1)
  return rest || shortPath(path, home)
}
