export type SettingsSectionId = 'github' | 'token' | 'merging' | 'review' | 'files' | 'hidden' | 'filters' | 'appearance' | 'tree' | 'about'

export type PreviewArea = 'toolbar' | 'filters' | 'sidebar' | 'files' | 'actions' | 'all' | 'none'

export const sectionElementId = (id: SettingsSectionId) => `settings-section-${id}`

export type SettingsTab = 'github' | 'review' | 'files' | 'appearance' | 'about'

export const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'github', label: 'GitHub' },
  { id: 'review', label: 'Reviewing' },
  { id: 'files', label: 'Files' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'about', label: 'About' },
]

export const TAB_OF: Record<SettingsSectionId, SettingsTab> = {
  github: 'github',
  token: 'github',
  merging: 'github',
  review: 'review',
  files: 'files',
  hidden: 'files',
  filters: 'files',
  appearance: 'appearance',
  tree: 'appearance',
  about: 'about',
}
