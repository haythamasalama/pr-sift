import './defaults'
import { createApp } from 'vue'
import { bridge } from './bridge'
import { createChrome, guardFetch } from './shim/chrome'
import { navigate } from './navigation'
import { setAppInfo } from './appInfo'
import App from './App.vue'
import './style.css'

async function start() {
  const info = await bridge.invoke('app:info')
  setAppInfo(info)
  // Installed before any extension module runs, so `chrome.*` is there when they first read it.
  ;(globalThis as unknown as { chrome: unknown }).chrome = createChrome(bridge, {
    version: info.version,
    openSection: (section) => navigate(section === 'token' ? 'account' : 'settings'),
  })
  guardFetch(window)
  // Belt and braces for the rule in style.css: if anything still scrolls the window, put it back.
  window.addEventListener('scroll', () => (window.scrollX || window.scrollY) && window.scrollTo(0, 0))
  document.documentElement.dataset.platform = info.platform
  createApp(App).mount('#app')
}

void start()
