import type { InjectionKey } from 'vue'

export const contentStylesKey: InjectionKey<string> = Symbol('contentStyles')

export function createShadowHost(tag: string, css: string): { host: HTMLElement; target: HTMLElement } {
  const host = document.createElement(tag)
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = css
  const target = document.createElement('div')
  shadow.append(style, target)
  return { host, target }
}
