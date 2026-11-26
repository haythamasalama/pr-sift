import { inject, type InjectionKey, type Ref } from 'vue'

export interface ExpandCommand {
  open: boolean
  n: number
}

export const treeExpandKey: InjectionKey<Ref<ExpandCommand>> = Symbol('treeExpand')
export const cardsExpandKey: InjectionKey<Ref<ExpandCommand>> = Symbol('cardsExpand')

export interface TreeLayout {
  indent: number
  guides: boolean
}

export const treeLayoutKey: InjectionKey<Ref<TreeLayout>> = Symbol('treeLayout')

export const useExpandCommand = (key: InjectionKey<Ref<ExpandCommand>>) => inject(key, null)

export const treeOpenFileKey: InjectionKey<Ref<string>> = Symbol('treeOpenFile')
