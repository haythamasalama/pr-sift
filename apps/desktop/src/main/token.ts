import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Account, AuthResult, AuthStatus, TokenSource } from '#shared/ipc'
import { scopeWarning, TokenRejected, verifyToken, type Fetch } from './github'
import type { Store } from './store'

export interface SafeStorage {
  isEncryptionAvailable(): boolean
  encryptString(text: string): Buffer
  decryptString(data: Buffer): string
  getSelectedStorageBackend?(): string
}

interface AuthMeta {
  source: TokenSource
  account: Account
  scopeWarning?: string
}

const META_KEY = 'auth'

// Keeps the GitHub token encrypted by the system keychain (Keychain, DPAPI or libsecret). Only the main process ever holds it.
export class TokenVault {
  private cached: string | undefined
  private loaded = false

  constructor(
    private readonly file: string,
    private readonly safe: SafeStorage,
    private readonly store: Store,
    private readonly platform: NodeJS.Platform,
    private readonly fetcher: Fetch = (input, init) => fetch(input, init),
  ) {}

  private canStore() {
    return this.safe.isEncryptionAvailable()
  }

  private weakStorage() {
    return this.platform === 'linux' && this.safe.getSelectedStorageBackend?.() === 'basic_text'
  }

  async token(): Promise<string | undefined> {
    if (this.loaded) return this.cached
    this.loaded = true
    try {
      this.cached = this.safe.decryptString(await readFile(this.file))
    } catch {
      this.cached = undefined
    }
    return this.cached
  }

  async status(): Promise<AuthStatus> {
    const token = await this.token()
    const meta = await this.store.getOne<AuthMeta>(META_KEY)
    const base = { canStore: this.canStore(), weakStorage: this.weakStorage() }
    if (!token || !meta) return { signedIn: false, ...base }
    return { signedIn: true, account: meta.account, source: meta.source, scopeWarning: meta.scopeWarning, ...base }
  }

  async save(raw: string, source: TokenSource): Promise<AuthResult> {
    const token = raw.trim()
    if (!token) return { ok: false, error: 'Paste a token first.' }
    if (/\s/.test(token)) return { ok: false, error: 'A token has no spaces in it. Check what you pasted.' }
    if (!this.canStore()) return { ok: false, error: 'This system offers no encrypted storage, so PR Sift can’t keep a token safely.' }
    let verified
    try {
      verified = await verifyToken(token, this.fetcher)
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
    await mkdir(dirname(this.file), { recursive: true })
    await writeFile(this.file, this.safe.encryptString(token), { mode: 0o600 })
    this.cached = token
    this.loaded = true
    await this.store.set({
      [META_KEY]: { source, account: verified.account, scopeWarning: scopeWarning(verified.scopes) } satisfies AuthMeta,
    })
    return { ok: true, status: await this.status() }
  }

  // Checks the saved token still works; a rejected one signs you out, a network failure keeps you signed in.
  async refresh(): Promise<AuthStatus> {
    const token = await this.token()
    const meta = await this.store.getOne<AuthMeta>(META_KEY)
    if (!token || !meta) return this.status()
    try {
      const verified = await verifyToken(token, this.fetcher)
      await this.store.set({ [META_KEY]: { ...meta, account: verified.account, scopeWarning: scopeWarning(verified.scopes) } })
    } catch (e) {
      if (e instanceof TokenRejected) await this.clear()
    }
    return this.status()
  }

  async clear(): Promise<AuthStatus> {
    this.cached = undefined
    this.loaded = true
    await rm(this.file, { force: true })
    await this.store.remove([META_KEY])
    return this.status()
  }
}
