import { inject, type InjectionKey } from 'vue'
import { openOptions } from '../../lib/extension'
import type { SettingsSectionId } from './sections'

export type OpenSettings = (section?: SettingsSectionId) => void

export const settingsOpenerKey: InjectionKey<OpenSettings> = Symbol('settings-opener')

export const useSettingsOpener = (): OpenSettings => inject(settingsOpenerKey, () => openOptions())
