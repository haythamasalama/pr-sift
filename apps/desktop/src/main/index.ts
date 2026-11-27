import { app, BrowserWindow, dialog, nativeTheme, safeStorage, shell, type IpcMainInvokeEvent, type WebContents } from 'electron'
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ApiRequest, Events, EventName, Leftover, MenuCommand } from '#shared/ipc'
import { apiRequest, changesGitHub } from './github'
import { markForBrowser, parsePullLink, SCHEME, type PullLink } from '#shared/links'
import { handle } from './ipc'
import { scanLeftovers } from './leftovers/scan'
import { findProgram, pathKey, withExtraPath } from './paths'
import { readSettings, writeSettings } from './settings'
import { diskUsage, limiter } from './size'
import { Store } from './store'
import { run } from './exec'
import { TokenVault } from './token'
import { WorktreeService } from './worktrees/service'
import { ProjectService } from './projects/service'
import { deleteBranch, deleteBranches, listBranches } from './projects/branches'
import { AutoApproveService } from './autoapprove/service'
import { openIn } from './launch'
import { overview } from './projects/overview'
import { buildMenu } from './menu'
import { rememberBounds, savedBounds } from './windowState'

const here = fileURLToPath(new URL('.', import.meta.url))
const platform = process.platform
const home = homedir()

process.env[pathKey(platform, process.env)] = withExtraPath(platform, process.env, home)

app.setName('PR Sift')
if (!app.requestSingleInstanceLock()) app.quit()

let window: BrowserWindow | null = null

// prsift://github.com/owner/repo/pull/12 opens that pull request here. macOS hands the link over as open-url;
// Windows and Linux start a second copy with the link in its arguments, which hands it to this one and quits.
if (process.defaultApp) {
  if (process.argv[1]) app.setAsDefaultProtocolClient(SCHEME, process.execPath, [resolve(process.argv[1])])
} else app.setAsDefaultProtocolClient(SCHEME)
let pageReady = false
let waitingPull: PullLink | null = null
let waitingCommand: MenuCommand | null = null
const linkIn = (args: string[]) => args.find((a) => a.startsWith(`${SCHEME}://`))
function openPull(link: string | undefined) {
  const pull = link ? parsePullLink(link) : null
  if (!pull) return
  if (window && pageReady) {
    send('pull:open', pull)
    if (window.isMinimized()) window.restore()
    window.focus()
  } else {
    waitingPull = pull
    if (!window && app.isReady()) createWindow()
  }
}
app.on('open-url', (event, url) => {
  event.preventDefault()
  openPull(url)
})
waitingPull = parsePullLink(linkIn(process.argv) ?? '')
const userData = app.getPath('userData')
// What the review UI reads and writes through `chrome.storage.local`.
const shared = new Store(join(userData, 'storage.json'))
// What only the main process uses: settings and sign-in details.
const internal = new Store(join(userData, 'desktop.json'))
const vault = new TokenVault(join(userData, 'token.bin'), safeStorage, internal, platform)
const worktrees = new WorktreeService({
  store: internal,
  trash: (path) => shell.trashItem(path),
  roots: () => readSettings(internal),
})
// Worktrees used to go to the Trash with an Undo list; they are deleted for good now, so the old undo records go.
void rm(join(userData, 'undo'), { recursive: true, force: true }).catch(() => undefined)
void internal.remove(['worktreeUndo']).catch(() => undefined)
async function pickFolder(title: string) {
  const options = { properties: ['openDirectory', 'createDirectory'] as ('openDirectory' | 'createDirectory')[], title }
  const picked = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options)
  return picked.canceled ? null : (picked.filePaths[0] ?? null)
}
const projects = new ProjectService({ store: internal, roots: () => readSettings(internal), pickFolder: () => pickFolder('Add a project') })
// Every request to GitHub goes through here; one that changes something tells the windows to look again.
async function github(req: ApiRequest) {
  const res = await apiRequest(await vault.token(), req)
  if (res.ok && changesGitHub(req)) send('github:changed', { at: Date.now() })
  return res
}
const autoApprove = new AutoApproveService({
  store: internal,
  request: github,
  onChange: (status) => send('autoapprove:changed', status),
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
    const res = await github(request)
    if (res.status === 401 && (await vault.token())) send('auth:changed', await vault.refresh())
    return res
  })

  h('settings:get', () => readSettings(internal))
  h('settings:set', (_e, next) => writeSettings(internal, next ?? {}))
  h('dialog:pick-folder', () => pickFolder('Add a folder to look in'))

  const projectsChanged = (list: Awaited<ReturnType<typeof projects.list>>) => {
    send('projects:changed', list)
    return list
  }
  h('projects:list', () => projects.list())
  h('projects:candidates', () => projects.candidates())
  h('projects:browse', () => projects.browse())
  h('projects:add', async (_e, paths) => projectsChanged(await projects.add(Array.isArray(paths) ? paths.map(String) : [])))
  h('projects:remove', async (_e, path) => projectsChanged(await projects.remove(String(path))))
  h('projects:overview', async (_e, path) => overview(await projects.require(String(path))))
  h('worktrees:list', async (_e, repo) => worktrees.listRepo(await projects.require(String(repo))))
  h('worktrees:changes', (_e, path) => worktrees.changes(String(path)))
  h('worktrees:diff', (_e, path, file) => worktrees.diff(String(path), String(file)))
  h('worktrees:patch', (_e, path, mode, commit) =>
    worktrees.patch(String(path), mode === 'branch' || mode === 'commit' ? mode : 'uncommitted', commit ? String(commit) : undefined),
  )
  h('worktrees:discard', (_e, path, file) => worktrees.discard(String(path), String(file)))
  h('worktrees:add', async (_e, repo, branch) => worktrees.add(await projects.require(String(repo)), String(branch)))
  h('worktrees:rename', (_e, path, name) => worktrees.rename(String(path), String(name)))
  h('worktrees:rename-branch', (_e, path, name) => worktrees.renameBranch(String(path), String(name)))
  h('worktrees:open', (_e, path, target) => {
    const known = worktrees.knows(String(path))
    if (!known) throw new Error('This folder is not in the last scan.')
    return openIn(target === 'terminal' ? 'terminal' : 'editor', known, platform, process.env)
  })
  h('branches:list', async (_e, repo) => listBranches(await projects.require(String(repo))))
  h('branches:delete', async (_e, repo, name, force) => deleteBranch(await projects.require(String(repo)), String(name), force === true))

  h('branches:delete-many', async (_e, repo, names, options) => {
    const path = await projects.require(String(repo))
    const opts = { force: options?.force === true, remote: options?.remote === true }
    const gh = async (req: Parameters<typeof apiRequest>[1]) => apiRequest(await vault.token(), req)
    return deleteBranches(path, Array.isArray(names) ? names.map(String) : [], opts, {
      async hasOpenPull(owner, name, branch) {
        const res = await gh({
          type: 'gh',
          path: `/repos/${owner}/${name}/pulls?state=open&head=${encodeURIComponent(`${owner}:${branch}`)}`,
        })
        if (!res.ok) throw new Error('Could not ask GitHub about open pull requests.')
        return Array.isArray(res.data) && res.data.length > 0
      },
      async remove(owner, name, branch) {
        const ref = branch.split('/').map(encodeURIComponent).join('/')
        const res = await gh({ type: 'gh', path: `/repos/${owner}/${name}/git/refs/heads/${ref}`, method: 'DELETE' })
        return {
          ok: res.ok,
          error: res.ok ? undefined : ((res.data as { message?: string } | null)?.message ?? `GitHub answered ${res.status}.`),
        }
      },
    })
  })

  h('autoapprove:status', () => autoApprove.status())
  h('autoapprove:save', (_e, config) => autoApprove.save(config))
  h('autoapprove:preview', (_e, config, refresh) => autoApprove.preview(config, refresh === true))
  h('autoapprove:run', () => autoApprove.run())
  h('autoapprove:clear-log', () => autoApprove.clearLog())

  h('worktrees:scan', () => worktrees.scan())
  h('worktrees:details', (_e, path) => worktrees.details(String(path)))
  h('worktrees:remove', (_e, path) => worktrees.remove(String(path)))
  h('worktrees:prune', (_e, repo) => worktrees.prune(String(repo)))

  h('leftovers:scan', async (_e, root) => {
    const settings = await readSettings(internal)
    const roots = root === undefined || root === null ? settings.roots : [await projects.require(String(root))]
    const found = await scanLeftovers({ roots, depth: Math.max(settings.depth + 4, 8), platform, home, env: process.env })
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
  h('window:appearance', (_e, mode, background) => {
    if (mode === 'system' || mode === 'light' || mode === 'dark') nativeTheme.themeSource = mode
    if (typeof background === 'string' && /^#[0-9a-f]{6}$/i.test(background)) window?.setBackgroundColor(background)
  })
}

const EXTERNAL_HOSTS = new Set(['github.com', 'docs.github.com', 'cli.github.com', 'pr-sift.haythamasalama.me'])

function openExternal(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' && EXTERNAL_HOSTS.has(parsed.hostname)) void shell.openExternal(markForBrowser(parsed).toString())
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

const windowFile = join(userData, 'window.json')
function createWindow() {
  const saved = savedBounds(windowFile)
  window = new BrowserWindow({
    width: saved?.width ?? 1180,
    height: saved?.height ?? 780,
    ...(saved ? { x: saved.x, y: saved.y } : {}),
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
  rememberBounds(window, windowFile)
  if (saved?.maximized) window.maximize()
  pageReady = false
  window.webContents.on('did-finish-load', () => {
    pageReady = true
    if (waitingPull) send('pull:open', waitingPull)
    waitingPull = null
    if (waitingCommand) send('menu:command', waitingCommand)
    waitingCommand = null
  })
  window.once('ready-to-show', () => window?.show())
  window.on('closed', () => {
    window = null
    pageReady = false
  })
  if (rendererUrl) void window.loadURL(rendererUrl)
  else void window.loadFile(rendererFile)
}

app.on('second-instance', (_event, argv) => {
  const link = linkIn(argv)
  if (link) return openPull(link)
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
  buildMenu(platform, (command) => {
    // With the window closed (macOS keeps the app running), the command waits for the new page.
    if (window && pageReady) return send('menu:command', command)
    waitingCommand = command
    if (!window) createWindow()
  })
  createWindow()
  void vault.refresh().then((status) => send('auth:changed', status))
  void autoApprove.start()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (platform !== 'darwin') app.quit()
})
