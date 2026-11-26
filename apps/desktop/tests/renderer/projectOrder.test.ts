import { describe, expect, it } from 'vitest'
import type { Project } from '#shared/ipc'
import { groupProjects, sortProjects } from '../../src/renderer/useProjectOrder'
import { reorder, slotAt } from '../../src/renderer/useDragSort'

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

describe('dragging a project', () => {
  it('moves it to the slot under the pointer', () => {
    expect(reorder(['a', 'b', 'c', 'd'], 'a', 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(reorder(['a', 'b', 'c', 'd'], 'd', 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(reorder(['a', 'b'], 'a', 9)).toEqual(['b', 'a'])
  })
  it('lands after every row whose middle is above the pointer', () => {
    expect(slotAt(0, [17, 51, 85])).toBe(0)
    expect(slotAt(60, [17, 51, 85])).toBe(2)
    expect(slotAt(10_000, [17, 51, 85])).toBe(3)
  })
})

describe('grouping by repository', () => {
  const clone = (name: string, owner: string, repo: string): Project => ({ path: `/code/${name}`, name, github: { owner, repo } })
  const folders = [
    clone('backend', 'globex', 'backend'),
    p('notes'),
    clone('backend-hotfix', 'globex', 'Backend'),
    clone('docs', 'acme', 'docs'),
  ]
  it('puts folders of the same repository together, where the first one was', () => {
    const groups = groupProjects(folders, true)
    expect(groups.map((g) => g.projects.map((x) => x.name))).toEqual([['backend', 'backend-hotfix'], ['notes'], ['docs']])
    expect(groups[0]!.title).toBe('backend')
  })
  it('keeps every folder on its own when turned off', () => {
    expect(groupProjects(folders, false)).toHaveLength(4)
  })
})
