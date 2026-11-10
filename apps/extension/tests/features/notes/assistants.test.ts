import { describe, expect, it } from 'vitest'
import { ASSISTANTS, assistantById, assistantsOfKind } from '../../../src/features/notes/assistants'

describe('assistants', () => {
  it('offers coding agents, then chats, then a clipboard-only option', () => {
    expect(assistantsOfKind('agent').map((a) => a.label)).toEqual(['Claude Code', 'Codex', 'Cursor', 'GitHub Copilot'])
    expect(assistantsOfKind('chat').map((a) => a.label)).toEqual(['Claude', 'ChatGPT'])
    expect(assistantsOfKind('clipboard').map((a) => a.label)).toEqual(['Clipboard only'])
  })

  it('only opens a page for chats', () => {
    for (const a of ASSISTANTS) expect(a.url !== null).toBe(a.kind === 'chat')
  })

  it('falls back to Claude Code for an unknown, missing or removed choice', () => {
    expect(assistantById(undefined).id).toBe('claude-code')
    expect(assistantById('nope').id).toBe('claude-code')
    expect(assistantById('gemini').id).toBe('claude-code')
    expect(assistantById('chatgpt').url).toBe('https://chatgpt.com/')
  })

  it('never puts note contents in the assistant URL', () => {
    for (const a of ASSISTANTS) expect(a.url ?? '').not.toContain('?')
  })
})
