export type AssistantId = 'claude' | 'chatgpt' | 'gemini' | 'clipboard'

export interface Assistant {
  id: AssistantId
  label: string
  url: string | null
}

export const ASSISTANTS: Assistant[] = [
  { id: 'claude', label: 'Claude', url: 'https://claude.ai/new' },
  { id: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/' },
  { id: 'gemini', label: 'Gemini', url: 'https://gemini.google.com/app' },
  { id: 'clipboard', label: 'Clipboard only', url: null },
]

export const assistantById = (id: string | undefined): Assistant => ASSISTANTS.find((a) => a.id === id) ?? ASSISTANTS[0]!
