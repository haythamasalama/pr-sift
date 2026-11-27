import { describe, expect, it } from 'vitest'
import { loginFromEmail } from '../../src/renderer/noreply'

describe('loginFromEmail', () => {
  it('reads the account from a GitHub noreply address', () => {
    expect(loginFromEmail('12345+octo-cat@users.noreply.github.com')).toBe('octo-cat')
    expect(loginFromEmail('octo@users.noreply.github.com')).toBe('octo')
  })
  it('finds nothing in any other email', () => {
    expect(loginFromEmail('octo@example.com')).toBeUndefined()
  })
})
