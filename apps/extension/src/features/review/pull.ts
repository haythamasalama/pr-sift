import { backgroundText, gh, hasToken } from './github'
import { avatarUrl, hashText, infoFromPagePayload, parseDiff, prState } from '@pr-sift/core'
import type { PrFile, PrInfo, PrRef, Via } from '../../lib/types'

export interface Loaded {
  info: PrInfo
  files: PrFile[]
  via: Via
  signature: string
  headSha: string
}

const basePath = (pr: PrRef) => `/${pr.owner}/${pr.repo}/pull/${pr.number}`

async function fetchDiff(base: string, fresh = false): Promise<string> {
  const problems: string[] = []
  try {
    const res = await fetch(base + '.diff', { credentials: 'same-origin', cache: fresh ? 'no-store' : 'default' })
    if (res.ok) return await res.text()
    problems.push(`page fetch: ${res.status}`)
  } catch (e) {
    problems.push(`page fetch: ${(e as Error).message}`)
  }
  const res = await backgroundText('https://github.com' + base + '.diff')
  if (res.ok) return res.text
  problems.push(`background fetch: ${res.error ?? res.status} (${res.url})`)
  throw new Error(problems.join('; '))
}

function pageInfo(doc: Document): Partial<PrInfo> {
  let info: Partial<PrInfo> = {}
  for (const script of doc.querySelectorAll('script[data-target="react-app.embeddedData"]')) {
    try {
      info = infoFromPagePayload(JSON.parse(script.textContent ?? ''))
    } catch {
      continue
    }
    if (Object.keys(info).length) break
  }
  const body = doc.querySelector('rails-partial[data-partial-name$=".Body"] .js-comment-body') ?? doc.querySelector('.js-comment-body')
  const descriptionHtml = body?.innerHTML.trim()
  return descriptionHtml ? { ...info, descriptionHtml } : info
}

async function loadViaSession(pr: PrRef): Promise<Omit<Loaded, 'via'>> {
  const base = basePath(pr)
  const [diffText, pageRes] = await Promise.all([fetchDiff(base, true), fetch(base, { credentials: 'same-origin' }).catch(() => null)])
  const files = parseDiff(diffText, base)
  const html = pageRes?.ok ? await pageRes.text() : ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const page = pageInfo(doc)
  const title = doc.querySelector('.js-issue-title')?.textContent?.trim() || page.title || document.title.split(' by ')[0] || ''
  const headSha = /"headSha":"([0-9a-f]{40})"/.exec(html)?.[1] ?? ''
  return { info: { ...page, title }, files, signature: hashText(diffText), headSha }
}

interface ApiPull {
  title: string
  changed_files: number
  head: { sha: string; ref?: string }
  base?: { ref?: string }
  user?: { login?: string; avatar_url?: string } | null
  commits?: number
  state?: string
  merged?: boolean
  draft?: boolean
  body_html?: string | null
}

interface ApiFile {
  filename: string
  status: string
  additions: number
  deletions: number
  patch?: string
  sha: string
  blob_url: string
}

async function loadViaApi(pr: PrRef): Promise<Omit<Loaded, 'via'>> {
  const api = `/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}`
  const data = await gh<ApiPull>(api, undefined, undefined, 'application/vnd.github.html+json')
  const pages = Math.min(30, Math.max(1, Math.ceil(data.changed_files / 100)))
  const chunks = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      i === 0
        ? gh<ApiFile[]>(`${api}/files?per_page=100&page=1`)
        : gh<ApiFile[]>(`${api}/files?per_page=100&page=${i + 1}`).catch(() => []),
    ),
  )
  const files = chunks.flat().map<PrFile>((f) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,
    hash: f.sha,
    blob_url: f.blob_url,
  }))
  const info: PrInfo = {
    title: data.title,
    author: data.user?.login,
    authorAvatar: avatarUrl(data.user?.avatar_url),
    base: data.base?.ref,
    head: data.head.ref,
    commits: data.commits,
    state: prState(data.state, { merged: data.merged, draft: data.draft }),
    descriptionHtml: data.body_html || undefined,
  }
  return { info, files, signature: data.head.sha, headSha: data.head.sha }
}

export async function loadPr(pr: PrRef): Promise<Loaded> {
  let sessionError: Error
  try {
    return { ...(await loadViaSession(pr)), via: 'session' }
  } catch (e) {
    sessionError = e as Error
  }
  if (!(await hasToken())) {
    throw new Error(
      `Could not read this pull request with your GitHub session (${sessionError.message}). Add a token in the extension options to use the API instead.`,
    )
  }
  return { ...(await loadViaApi(pr)), via: 'api' }
}

export interface Probe {
  signature: string
  state: PrInfo['state']
}

export async function fetchProbe(pr: PrRef, via: Via): Promise<Probe> {
  if (via === 'api') {
    const data = await gh<ApiPull>(`/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}`)
    return { signature: data.head.sha, state: prState(data.state, { merged: data.merged, draft: data.draft }) }
  }
  const base = basePath(pr)
  const [diffText, pageRes] = await Promise.all([
    fetchDiff(base, true),
    fetch(base, { credentials: 'same-origin', cache: 'no-store' }).catch(() => null),
  ])
  const doc = new DOMParser().parseFromString(pageRes?.ok ? await pageRes.text() : '', 'text/html')
  return { signature: hashText(diffText), state: pageInfo(doc).state }
}

function decodeBase64(content: string): string {
  const binary = atob(content.replace(/\n/g, ''))
  return new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0)))
}

export async function fetchFileLines(pr: PrRef, sha: string, path: string): Promise<string[]> {
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  let text: string | null = null
  const res = await fetch(`/${pr.owner}/${pr.repo}/raw/${sha}/${encoded}`, { credentials: 'same-origin' }).catch(() => null)
  if (res?.ok) text = await res.text()
  if (text === null && (await hasToken())) {
    const data = await gh<{ content?: string; encoding?: string }>(`/repos/${pr.owner}/${pr.repo}/contents/${encoded}?ref=${sha}`)
    if (data.encoding === 'base64' && data.content) text = decodeBase64(data.content)
  }
  if (text === null) throw new Error('Could not load ' + path)
  return (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n')
}
