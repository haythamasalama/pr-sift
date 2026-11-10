import { backgroundText, gh, hasToken } from './github'
import { hashText, parseDiff } from '@pr-sift/core'
import type { PrFile, PrInfo, PrRef, Via } from '../../lib/types'

export interface Loaded {
  info: PrInfo
  files: PrFile[]
  via: Via
  signature: string
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

async function loadViaSession(pr: PrRef): Promise<Omit<Loaded, 'via'>> {
  const base = basePath(pr)
  const [diffText, pageRes] = await Promise.all([fetchDiff(base, true), fetch(base, { credentials: 'same-origin' }).catch(() => null)])
  const files = parseDiff(diffText, base)
  if (!files.length) throw new Error('the diff was empty')
  const doc = new DOMParser().parseFromString(pageRes?.ok ? await pageRes.text() : '', 'text/html')
  const title = doc.querySelector('.js-issue-title')?.textContent?.trim() || document.title.split(' by ')[0] || ''
  return { info: { title }, files, signature: hashText(diffText) }
}

interface ApiPull {
  title: string
  changed_files: number
  head: { sha: string }
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
  const data = await gh<ApiPull>(api)
  const pages = Math.max(1, Math.ceil(data.changed_files / 100))
  const chunks = await Promise.all(Array.from({ length: pages }, (_, i) => gh<ApiFile[]>(`${api}/files?per_page=100&page=${i + 1}`)))
  const files = chunks.flat().map<PrFile>((f) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,
    hash: f.sha,
    blob_url: f.blob_url,
  }))
  return { info: { title: data.title }, files, signature: data.head.sha }
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

export async function fetchSignature(pr: PrRef, via: Via): Promise<string> {
  if (via === 'api') return (await gh<ApiPull>(`/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}`)).head.sha
  return hashText(await fetchDiff(basePath(pr), true))
}
