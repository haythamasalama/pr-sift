import type { AutoApproveConfig, AutoApproveRule } from './ipc'

export const DEFAULT_CONFIG: AutoApproveConfig = { enabled: false, dryRun: true, intervalMinutes: 10, rules: [] }

export function newRule(id: string, name = 'New rule'): AutoApproveRule {
  return {
    id,
    name,
    enabled: true,
    repos: [],
    authors: [],
    excludeAuthors: [],
    paths: [],
    blockedPaths: [],
    labels: [],
    blockedLabels: [],
    titleWords: [],
    baseBranches: [],
    maxFiles: null,
    maxLines: null,
    requireChecks: true,
    requireMergeable: true,
    skipChangesRequested: true,
    minAgeMinutes: 0,
    comment: 'Approved automatically by PR Sift.',
  }
}

// Starting points offered when adding a rule. Each is a plain rule the person can change.
export const TEMPLATES: { id: string; label: string; description: string; rule: Partial<AutoApproveRule> }[] = [
  {
    id: 'deps',
    label: 'Dependency updates from bots',
    description: 'Dependabot and Renovate changing only package and lock files, with checks passing.',
    rule: {
      name: 'Dependency updates from bots',
      authors: ['dependabot[bot]', 'renovate[bot]'],
      paths: ['**/package.json', '**/*lock*', '**/composer.json', '**/go.mod', '**/go.sum', '**/requirements*.txt'],
      maxLines: 2000,
    },
  },
  {
    id: 'docs',
    label: 'Docs only',
    description: 'Pull requests that change only Markdown and documentation files.',
    rule: { name: 'Docs only', paths: ['**/*.md', '**/*.mdx', 'docs/**'], maxFiles: 20 },
  },
  {
    id: 'small',
    label: 'Small changes from people I trust',
    description: 'Up to 5 files and 50 lines from the authors you list, never touching CI or migrations.',
    rule: {
      name: 'Small changes from trusted authors',
      maxFiles: 5,
      maxLines: 50,
      blockedPaths: ['.github/**', '**/migrations/**', '**/*.sql', '**/.env*'],
      minAgeMinutes: 15,
    },
  },
]
