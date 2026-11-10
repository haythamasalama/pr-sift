import { createApp } from 'vue'
import App from './App.vue'
import { ignoreInvalidatedContext } from '../lib/extension'
import { isolateKeyboard } from '../lib/isolate'
import styles from './style.css?inline'

ignoreInvalidatedContext()

const properties = styles.match(/@property[^{]+\{[^}]*\}/g) ?? []
if (properties.length) {
  const registered = new CSSStyleSheet()
  registered.replaceSync(properties.join('\n'))
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, registered]
}

const host = document.createElement('div')
host.id = 'review-lens-host'
isolateKeyboard(host)
const shadow = host.attachShadow({ mode: 'open' })

const style = document.createElement('style')
style.textContent = styles
shadow.appendChild(style)

const mountPoint = document.createElement('div')
shadow.appendChild(mountPoint)
document.documentElement.appendChild(host)

createApp(App).mount(mountPoint)

setInterval(() => {
  if (!host.isConnected) document.documentElement.appendChild(host)
}, 1000)
