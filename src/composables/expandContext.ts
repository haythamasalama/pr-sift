import { inject, type InjectionKey, type Ref } from 'vue'

export interface ExpandCommand {
  open: boolean
  n: number
}

export const treeExpandKey: InjectionKey<Ref<ExpandCommand>> = Symbol('treeExpand')
export const cardsExpandKey: InjectionKey<Ref<ExpandCommand>> = Symbol('cardsExpand')

export const useExpandCommand = (key: InjectionKey<Ref<ExpandCommand>>) => inject(key, null)
