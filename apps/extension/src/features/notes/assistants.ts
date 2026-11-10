export type AssistantId = 'claude-code' | 'codex' | 'cursor' | 'copilot' | 'claude' | 'chatgpt' | 'clipboard'

export type AssistantKind = 'agent' | 'chat' | 'clipboard'

export interface Assistant {
  id: AssistantId
  label: string
  kind: AssistantKind
  url: string | null
}

// Coding agents run in a terminal or an editor, so there is no page to open: the prompt is only copied.
export const ASSISTANTS: Assistant[] = [
  { id: 'claude-code', label: 'Claude Code', kind: 'agent', url: null },
  { id: 'codex', label: 'Codex', kind: 'agent', url: null },
  { id: 'cursor', label: 'Cursor', kind: 'agent', url: null },
  { id: 'copilot', label: 'GitHub Copilot', kind: 'agent', url: null },
  { id: 'claude', label: 'Claude', kind: 'chat', url: 'https://claude.ai/new' },
  { id: 'chatgpt', label: 'ChatGPT', kind: 'chat', url: 'https://chatgpt.com/' },
  { id: 'clipboard', label: 'Clipboard only', kind: 'clipboard', url: null },
]

export const assistantsOfKind = (kind: AssistantKind): Assistant[] => ASSISTANTS.filter((a) => a.kind === kind)

export const assistantById = (id: string | undefined): Assistant => ASSISTANTS.find((a) => a.id === id) ?? ASSISTANTS[0]!
