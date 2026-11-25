import type { PrRef } from '../../lib/types'
import { gh } from './github'

export interface LinkedIssue {
  number: number
  title: string
  url: string
  state: 'OPEN' | 'CLOSED'
  repo: string
  // Set for issues in another repository than the pull request.
  external: boolean
}

// The issues this pull request closes when it merges, as GitHub links them ("Fixes #12" or the Development sidebar).
export async function fetchLinkedIssues(pr: PrRef): Promise<LinkedIssue[]> {
  const res = await gh<{
    data?: {
      repository: {
        pullRequest: {
          closingIssuesReferences: {
            nodes: { number: number; title: string; url: string; state: 'OPEN' | 'CLOSED'; repository: { nameWithOwner: string } }[]
          }
        } | null
      } | null
    }
  }>('/graphql', 'POST', {
    query: `query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          closingIssuesReferences(first: 20) { nodes { number title url state repository { nameWithOwner } } }
        }
      }
    }`,
    variables: { owner: pr.owner, repo: pr.repo, number: pr.number },
  })
  const self = `${pr.owner}/${pr.repo}`.toLowerCase()
  return (res.data?.repository?.pullRequest?.closingIssuesReferences.nodes ?? []).map((n) => ({
    number: n.number,
    title: n.title,
    url: n.url,
    state: n.state,
    repo: n.repository.nameWithOwner,
    external: n.repository.nameWithOwner.toLowerCase() !== self,
  }))
}
