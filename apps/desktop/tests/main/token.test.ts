import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Store } from '../../src/main/store'
import { TokenVault, type SafeStorage } from '../../src/main/token'
import type { Fetch } from '../../src/main/github'
import { tempDir } from './helpers'

const safe = (available = true): SafeStorage => ({
  isEncryptionAvailable: () => available,
  encryptString: (text) => Buffer.from(`enc:${text}`),
  decryptString: (data) => data.toString().replace(/^enc:/, ''),
})

const github =
  (status = 200, scopes = 'repo'): Fetch =>
  async () =>
    new Response(JSON.stringify({ login: 'octo', avatar_url: 'https://avatars.githubusercontent.com/u/1' }), {
      status,
      headers: { 'x-oauth-scopes': scopes },
    })

function vault(fetcher: Fetch = github(), storage = safe()) {
  const dir = tempDir('vault-')
  const file = join(dir, 'token.bin')
  return { file, vault: new TokenVault(file, storage, new Store(join(dir, 'desktop.json')), 'darwin', fetcher) }
}

describe('TokenVault', () => {
  it('saves an accepted token encrypted and reports the account', async () => {
    const { file, vault: v } = vault()
    const result = await v.save('  ghp_abc  ', 'pasted')
    expect(result.status).toMatchObject({ signedIn: true, source: 'pasted', account: { login: 'octo' } })
    expect(readFileSync(file, 'utf8')).toBe('enc:ghp_abc')
    expect(await v.token()).toBe('ghp_abc')
  })

  it('saves nothing when GitHub rejects the token', async () => {
    const { file, vault: v } = vault(github(401))
    expect(await v.save('ghp_bad', 'pasted')).toMatchObject({ ok: false, error: expect.stringMatching(/didn’t accept/) })
    expect(existsSync(file)).toBe(false)
  })

  it('refuses to store without encryption', async () => {
    const { vault: v } = vault(github(), safe(false))
    expect(await v.save('ghp_abc', 'pasted')).toMatchObject({ ok: false, error: expect.stringMatching(/encrypted storage/) })
  })

  it('warns when the repo scope is missing', async () => {
    const { vault: v } = vault(github(200, 'read:user'))
    expect((await v.save('ghp_abc', 'gh')).status?.scopeWarning).toMatch(/repo scope/)
  })

  it('signs out when a saved token stops working', async () => {
    let status = 200
    const { vault: v } = vault(async (input, init) => github(status)(input, init))
    await v.save('ghp_abc', 'pasted')
    status = 401
    expect(await v.refresh()).toMatchObject({ signedIn: false })
    expect(await v.token()).toBeUndefined()
  })

  it('stays signed in when GitHub can’t be reached', async () => {
    let offline = false
    const { vault: v } = vault(async (input, init) => {
      if (offline) throw new Error('offline')
      return github()(input, init)
    })
    await v.save('ghp_abc', 'pasted')
    offline = true
    expect(await v.refresh()).toMatchObject({ signedIn: true })
  })
})
