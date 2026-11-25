// Reads `owner/repo` from a GitHub remote URL in any of the forms git accepts.
export function parseGithubRemote(url: string): { owner: string; repo: string } | undefined {
  const m =
    /^(?:https?:\/\/(?:[^@/]+@)?github\.com\/|git@github\.com:|ssh:\/\/git@github\.com(?::\d+)?\/|git:\/\/github\.com\/)([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(
      url.trim(),
    )
  return m ? { owner: m[1]!, repo: m[2]! } : undefined
}

// `git remote -v` output: prefers origin, then upstream, then any GitHub remote.
export function pickGithubRemote(remoteV: string): { owner: string; repo: string } | undefined {
  const remotes = new Map<string, { owner: string; repo: string }>()
  for (const line of remoteV.split('\n')) {
    const [name, url] = line.split(/\s+/)
    if (!name || !url || remotes.has(name)) continue
    const parsed = parseGithubRemote(url)
    if (parsed) remotes.set(name, parsed)
  }
  return remotes.get('origin') ?? remotes.get('upstream') ?? remotes.values().next().value
}
