import { screen, type BrowserWindow, type Rectangle } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'

// The window opens where it was last closed, at the same size, like any desktop app.
// A spot that is no longer on any screen (a display was unplugged) falls back to the default.
interface Saved extends Rectangle {
  maximized?: boolean
}

export function savedBounds(file: string): Saved | null {
  try {
    const s = JSON.parse(readFileSync(file, 'utf8')) as Partial<Saved>
    if (![s.x, s.y, s.width, s.height].every((n) => typeof n === 'number' && Number.isFinite(n))) return null
    const saved = s as Saved
    const area = screen.getDisplayMatching(saved).workArea
    const visible =
      saved.x < area.x + area.width - 80 &&
      saved.x + saved.width > area.x + 80 &&
      saved.y >= area.y - 10 &&
      saved.y < area.y + area.height - 80
    return visible ? saved : null
  } catch {
    return null
  }
}

export function rememberBounds(win: BrowserWindow, file: string) {
  win.on('close', () => {
    try {
      const saved: Saved = { ...win.getNormalBounds(), maximized: win.isMaximized() }
      writeFileSync(file, JSON.stringify(saved))
    } catch {
      // Not being able to save it only means the next launch opens at the default size.
    }
  })
}
