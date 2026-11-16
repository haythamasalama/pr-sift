export type SettingsSectionId = 'github' | 'token' | 'merging' | 'review' | 'files' | 'hidden' | 'filters' | 'appearance' | 'tree' | 'about'

export type PreviewArea = 'toolbar' | 'filters' | 'sidebar' | 'files' | 'actions' | 'all' | 'none'

export const sectionElementId = (id: SettingsSectionId) => `settings-section-${id}`

export const SECTION_NAV: { id: SettingsSectionId; label: string }[] = [
  { id: 'github', label: 'GitHub' },
  { id: 'review', label: 'Reviewing' },
  { id: 'files', label: 'Files' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'about', label: 'About' },
]
