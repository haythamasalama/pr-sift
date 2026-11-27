// Shortcuts read the way the system writes them: ⌘ ⌥ ⇧ ⌃ on a Mac, Ctrl+Alt+Shift elsewhere.
export const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent)

const MAC: Record<string, string> = { Mod: '⌘', Alt: '⌥', Shift: '⇧', Ctrl: '⌃', Up: '↑', Down: '↓', Enter: '↩', Esc: 'esc' }
const OTHER: Record<string, string> = { Mod: 'Ctrl', Up: '↑', Down: '↓', Esc: 'Esc' }

// `Mod+Shift+K` becomes ['⌘', '⇧', 'K'] on a Mac and ['Ctrl', 'Shift', 'K'] elsewhere.
export function keyParts(combo: string): string[] {
  const names = isMac ? MAC : OTHER
  return combo.split('+').map((k) => names[k] ?? k)
}
export const keyText = (combo: string) => keyParts(combo).join(isMac ? '' : '+')

export interface Shortcut {
  keys: string
  label: string
}
export const SHORTCUTS: { title: string; items: Shortcut[] }[] = [
  {
    title: 'App',
    items: [
      { keys: 'Mod+,', label: 'Settings' },
      { keys: 'Mod+N', label: 'Add a project' },
      { keys: 'Mod+L', label: 'Open a pull request link' },
      { keys: 'Mod+R', label: 'Refresh' },
      { keys: 'Mod+F', label: 'Find on this page' },
      { keys: 'Mod+/', label: 'Keyboard shortcuts' },
    ],
  },
  {
    title: 'Go to',
    items: [
      { keys: 'Mod+1', label: 'Needs you' },
      { keys: 'Mod+2', label: 'Auto-approve' },
      { keys: 'Mod+3', label: 'All worktrees' },
      { keys: 'Mod+4', label: 'Cleanup' },
      { keys: 'Mod+[', label: 'Back' },
      { keys: isMac ? 'Ctrl+Mod+S' : 'Ctrl+B', label: 'Show or hide the sidebar' },
    ],
  },
  {
    title: 'Review',
    items: [
      { keys: 'Mod+.', label: 'Focus: hide the sidebar' },
      { keys: 'Alt+Mod+Up', label: 'Previous pull request' },
      { keys: 'Alt+Mod+Down', label: 'Next pull request' },
      { keys: 'Esc', label: 'Close the review' },
    ],
  },
]
