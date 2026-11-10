import { describe, expect, it } from 'vitest'
import { ASSISTANTS, assistantById } from '../../../src/features/notes/assistants'

describe('assistants', () => {
  it('offers Claude, ChatGPT, Gemini and a clipboard-only option', () => {
    expect(ASSISTANTS.map((a) => a.label)).toEqual(['Claude', 'ChatGPT', 'Gemini', 'Clipboard only'])
  })

  it('falls back to Claude for an unknown or missing choice', () => {
    expect(assistantById(undefined).id).toBe('claude')
    expect(assistantById('nope').id).toBe('claude')
    expect(assistantById('gemini').url).toBe('https://gemini.google.com/app')
  })

  it('never puts note contents in the assistant URL', () => {
    for (const a of ASSISTANTS) expect(a.url ?? '').not.toContain('?')
  })
})
