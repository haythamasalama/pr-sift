import { describe, expect, it } from 'vitest'
import type { Project } from '#shared/ipc'
import { sortProjects } from '../../src/renderer/useProjectOrder'

const p = (name: string, owner?: string): Project => ({ path: `/code/${name}`, name, github: owner ? { owner, repo: name } : undefined })
const list = [p('saas', 'globex'), p('App', 'acme'), p('docs', 'acme'), p('notes')]
const names = (out: Project[]) => out.map((x) => x.name)

describe('sortProjects', () => {
  it('sorts by name without caring about case', () => {
    expect(names(sortProjects(list, 'name', {}, []))).toEqual(['App', 'docs', 'notes', 'saas'])
  })

  it('puts the last opened first, then the rest A to Z', () => {
    expect(names(sortProjects(list, 'recent', { '/code/saas': 2, '/code/docs': 1 }, []))).toEqual(['saas', 'docs', 'App', 'notes'])
  })

  it('groups by GitHub owner, with local-only projects last', () => {
    expect(names(sortProjects(list, 'owner', {}, []))).toEqual(['App', 'docs', 'saas', 'notes'])
  })

  it('keeps your own order and adds new projects at the end', () => {
    expect(names(sortProjects(list, 'custom', {}, ['/code/saas', '/code/App']))).toEqual(['saas', 'App', 'docs', 'notes'])
  })
})
