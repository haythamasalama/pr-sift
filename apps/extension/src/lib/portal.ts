import type { InjectionKey, Ref } from 'vue'

export const portalTargetKey: InjectionKey<Ref<HTMLElement | null>> = Symbol('portalTarget')
