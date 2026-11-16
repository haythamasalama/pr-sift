export type SettingsSectionId = 'about' | 'token' | 'theme' | 'hidden' | 'defaults' | 'merging' | 'tree' | 'filters' | 'help'

export type PreviewArea = 'toolbar' | 'filters' | 'sidebar' | 'files' | 'actions' | 'all' | 'none'

export const sectionElementId = (id: SettingsSectionId) => `settings-section-${id}`
