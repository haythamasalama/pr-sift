export type SettingsSectionId =
  | 'github'
  | 'token'
  | 'merging'
  | 'review'
  | 'files'
  | 'hidden'
  | 'filters'
  | 'appearance'
  | 'style'
  | 'base-color'
  | 'code-colors'
  | 'tree'
  | 'about'

export type PreviewArea = 'toolbar' | 'filters' | 'sidebar' | 'files' | 'actions' | 'all' | 'none'

export const sectionElementId = (id: SettingsSectionId) => `settings-section-${id}`

export type SettingsTab = 'github' | 'review' | 'files' | 'appearance' | 'about'

export const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'github', label: 'GitHub' },
  { id: 'review', label: 'Reviewing' },
  { id: 'files', label: 'Files' },
  { id: 'appearance', label: 'Appearance' },
]

// Inside a review the sheet leads with what changes the review; About comes last.
export const SHEET_TABS = [...SETTINGS_TABS.filter((t) => t.id !== 'about'), ...SETTINGS_TABS.filter((t) => t.id === 'about')]

export const TAB_OF: Record<SettingsSectionId, SettingsTab> = {
  github: 'github',
  token: 'github',
  merging: 'github',
  review: 'review',
  files: 'files',
  hidden: 'files',
  filters: 'files',
  appearance: 'appearance',
  style: 'appearance',
  'base-color': 'appearance',
  'code-colors': 'appearance',
  tree: 'appearance',
  about: 'about',
}
