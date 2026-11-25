import { app, BrowserWindow, dialog, safeStorage, shell, type IpcMainInvokeEvent, type WebContents } from 'electron'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Events, EventName, Leftover } from '#shared/ipc'
import { apiRequest } from './github'
import { handle } from './ipc'
import { scanLeftovers } from './leftovers/scan'
import { findProgram, pathKey, withExtraPath } from './paths'
import { readSettings, writeSettings } from './settings'
import { diskUsage, limiter } from './size'
import { Store } from './store'
import { run } from './exec'
import { TokenVault } from './token'
import { WorktreeService } from './worktrees/service'

const here = fileURLToPath(new URL('.', import.meta.url))
const platform = process.platform
const home = homedir()

process.env[pathKey(platform, process.env)] = withExtraPath(platform, process.env, home)

app.setName('PR Sift')
if (!app.requestSingleInstanceLock()) app.quit()

let window: BrowserWindow | null = null
const userData = app.getPath('userData')
// What the review UI reads and writes through `chrome.storage.local`.
const shared = new Store(join(userData, 'storage.json'))
// What only the main process uses: settings, sign-in details, undo records.
const internal = new Store(join(userData, 'desktop.json'))
const vault = new TokenVault(join(userData, 'token.bin'), safeStorage, internal, platform)
const worktrees = new WorktreeService({
  store: internal,
  undoDir: join(userData, 'undo'),
  trash: (path) => shell.trashItem(path),
  roots: () => readSettings(internal),
})
const leftovers = new Map<string, Leftover>()
const sizes = limiter(4)

function send<E extends EventName>(event: E, payload: Events[E]) {
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send(event, payload)
}

shared.on('changed', (changes) => {
  // The token lives in the vault; the window only ever sees that one is there.
  const visible = Object.fromEntries(Object.entries(changes).filter(([key]) => key !== 'token'))
  if (Object.keys(visible).length) send('store:changed', visible)
})

const rendererUrl = process.env.ELECTRON_RENDERER_URL
const rendererFile = join(here, '../renderer/index.html')

function trusted(event: IpcMainInvokeEvent) {
  const url = event.senderFrame?.url ?? ''
  if (rendererUrl && url.startsWith(rendererUrl)) return true
  try {
    return resolve(fileURLToPath(url.split('#')[0]!)) === resolve(rendererFile)
  } catch {
    return false
  }
}

const TOKEN_PLACEHOLDER = 'stored-in-system-keychain'

function registerHandlers() {
  const h = <C extends Parameters<typeof handle>[0]>(channel: C, fn: Parameters<typeof handle<C>>[1]) => handle(channel, fn, trusted)

  h('app:info', () => ({ version: app.getVersion(), platform, home }))

  h('auth:status', () => vault.status())
  h('auth:save-token', async (_e, token) => {
    const result = await vault.save(String(token ?? ''), 'pasted')
    if (result.status) send('auth:changed', result.status)
    return result
  })
  h('auth:gh-available', () => findProgram('gh', platform, process.env, existsSync) !== null)
  h('auth:import-gh', async () => {
    const gh = findProgram('gh', platform, process.env, existsSync)
    if (!gh) return { ok: false, error: 'The GitHub CLI (gh) is not installed.' }
    const res = await run(gh, ['auth', 'token', '--hostname', 'github.com'], { timeout: 15_000 })
    const token = res.stdout.trim()
    if (res.code !== 0 || !token) return { ok: false, error: 'gh is not signed in. Run gh auth login in a terminal, then try again.' }
    const result = await vault.save(token, 'gh')
    if (result.status) send('auth:changed', result.status)
    return result
  })
  h('auth:sign-out', async () => {
    const status = await vault.clear()
    send('auth:changed', status)
    send('store:changed', { token: {} })
    return status
  })

  h('store:get', async (_e, keys) => {
    const list = Array.isArray(keys) ? keys.map(String) : []
    const values = await shared.get(list.filter((k) => k !== 'token'))
    if (list.includes('token') && (await vault.token())) values.token = TOKEN_PLACEHOLDER
    return values
  })
  h('store:set', async (_e, values) => {
    const { token, ...rest } = (values ?? {}) as Record<string, unknown>
    if (typeof token === 'string' && token !== TOKEN_PLACEHOLDER) {
      const result = await vault.save(token, 'pasted')
      if (result.status) send('auth:changed', result.status)
      send('store:changed', { token: { newValue: result.ok ? TOKEN_PLACEHOLDER : undefined } })
    }
    await shared.set(rest)
  })
  h('store:remove', async (_e, keys) => {
    const list = Array.isArray(keys) ? keys.map(String) : []
    if (list.includes('token')) {
      send('auth:changed', await vault.clear())
      send('store:changed', { token: {} })
    }
    await shared.remove(list.filter((k) => k !== 'token'))
  })
  h('gh:request', async (_e, request) => {
    const res = await apiRequest(await vault.token(), request)
    if (res.status === 401 && (await vault.token())) send('auth:changed', await vault.refresh())
    return res
  })

  h('settings:get', () => readSettings(internal))
  h('settings:set', (_e, next) => writeSettings(internal, next ?? {}))
  h('dialog:pick-folder', async () => {
    const options = { properties: ['openDirectory', 'createDirectory'] as const, title: 'Add a project folder' }
    const picked = window
      ? await dialog.showOpenDialog(window, { ...options, properties: [...options.properties] })
      : await dialog.showOpenDialog({ ...options, properties: [...options.properties] })
    return picked.canceled ? null : (picked.filePaths[0] ?? null)
  })

  h('worktrees:scan', () => worktrees.scan())
  h('worktrees:details', (_e, path) => worktrees.details(String(path)))
  h('worktrees:remove', (_e, path) => worktrees.remove(String(path)))
  h('worktrees:undo-list', () => worktrees.undoList())
  h('worktrees:undo', (_e, id) => worktrees.undo(String(id)))
  h('worktrees:prune', (_e, repo) => worktrees.prune(String(repo)))

  h('leftovers:scan', async () => {
    const settings = await readSettings(internal)
    const found = await scanLeftovers({ roots: settings.roots, depth: Math.max(settings.depth + 4, 8), platform, home, env: process.env })
    leftovers.clear()
    for (const item of found) leftovers.set(item.path, item)
    return found
  })
  h('leftovers:size', (_e, path) => {
    const item = leftovers.get(String(path))
    if (!item) throw new Error('This item is not in the last scan.')
    return item.size ?? sizes(() => diskUsage(item.path))
  })
  h('leftovers:trash', async (_e, paths) => {
    const result = { trashed: [] as string[], failed: [] as { path: string; error: string }[] }
    for (const path of Array.isArray(paths) ? paths.map(String) : []) {
      if (!leftovers.has(path)) {
        result.failed.push({ path, error: 'Not in the last scan.' })
        continue
      }
      try {
        await shell.trashItem(path)
        leftovers.delete(path)
        result.trashed.push(path)
      } catch (e) {
        result.failed.push({ path, error: e instanceof Error ? e.message : String(e) })
      }
    }
    return result
  })

  h('shell:reveal', (_e, path) => shell.showItemInFolder(String(path)))
  h('shell:open-external', (_e, url) => openExternal(String(url)))
}

const EXTERNAL_HOSTS = new Set(['github.com', 'docs.github.com', 'cli.github.com', 'pr-sift.haythamasalama.me'])

function openExternal(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' && EXTERNAL_HOSTS.has(parsed.hostname)) void shell.openExternal(parsed.toString())
  } catch {
    return
  }
}

function lockDown(contents: WebContents) {
  contents.setWindowOpenHandler(({ url }) => {
    openExternal(url)
    return { action: 'deny' }
  })
  contents.on('will-navigate', (event, url) => {
    if (rendererUrl && url.startsWith(rendererUrl)) return
    event.preventDefault()
    openExternal(url)
  })
  contents.on('will-attach-webview', (event) => event.preventDefault())
}

function createWindow() {
  window = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 760,
    minHeight: 520,
    title: 'PR Sift',
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: join(here, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })
  lockDown(window.webContents)
  window.once('ready-to-show', () => window?.show())
  window.on('closed', () => (window = null))
  if (rendererUrl) void window.loadURL(rendererUrl)
  else void window.loadFile(rendererFile)
}

app.on('second-instance', () => {
  if (!window) return createWindow()
  if (window.isMinimized()) window.restore()
  window.focus()
})

app.on('web-contents-created', (_e, contents) => lockDown(contents))

app.whenReady().then(() => {
  // Linux without a keyring has only the basic backend. The token is then obfuscated rather than encrypted, and the
  // app says so, instead of refusing to work at all.
  if (platform === 'linux' && !safeStorage.isEncryptionAvailable() && safeStorage.getSelectedStorageBackend() === 'basic_text') {
    safeStorage.setUsePlainTextEncryption(true)
  }
  registerHandlers()
  createWindow()
  void vault.refresh().then((status) => send('auth:changed', status))
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (platform !== 'darwin') app.quit()
})
