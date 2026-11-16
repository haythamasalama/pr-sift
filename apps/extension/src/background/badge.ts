import type { UpdatedInfo } from '../lib/updates'

export interface UpdateState {
  updateReady?: string
  updated?: UpdatedInfo
}

export interface Badge {
  text: string
  color: string
  title: string
}

export const BADGE_KEYS = ['updateReady', 'updated'] as const

// The toolbar badge is drawn by Chrome outside the page, so it takes GitHub's blue and green as plain colours.
export function badgeFor({ updateReady, updated }: UpdateState): Badge | null {
  if (updateReady) return { text: '↑', color: '#1f6feb', title: `PR Sift ${updateReady} is ready. Open settings to restart.` }
  if (updated?.version) return { text: 'NEW', color: '#1f883d', title: `PR Sift was updated to ${updated.version}` }
  return null
}

export async function refreshBadge(): Promise<void> {
  try {
    const state = (await chrome.storage.local.get([...BADGE_KEYS])) as UpdateState
    const badge = badgeFor(state)
    const title = badge?.title ?? chrome.runtime.getManifest().action?.default_title ?? 'PR Sift'
    await chrome.action.setBadgeText({ text: badge?.text ?? '' })
    if (badge) await chrome.action.setBadgeBackgroundColor({ color: badge.color })
    await chrome.action.setTitle({ title })
  } catch {
    return
  }
}
