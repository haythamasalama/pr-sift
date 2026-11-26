import { createApp } from 'vue'
import { installFonts } from '@/lib/fonts'
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
  // The PR Sift theme's IBM Plex fonts, bundled with the app.
  installFonts()
  document.documentElement.dataset.platform = info.platform
  createApp(App).mount('#app')
}

void start()
