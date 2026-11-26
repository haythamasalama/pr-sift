import type { PrFile, TreeNode } from './types'

export function buildTree(files: PrFile[]): TreeNode {
  const root: TreeNode = { name: '', path: '', count: 0, dirs: [], files: [] }
  for (const f of files) {
    const parts = f.filename.split('/')
    let node = root
    node.count++
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i]!
      let child = node.dirs.find((d) => d.name === name)
      if (!child) {
        child = { name, path: node.path ? `${node.path}/${name}` : name, count: 0, dirs: [], files: [] }
        node.dirs.push(child)
      }
      child.count++
      node = child
    }
    node.files.push(f)
  }
  const sort = (n: TreeNode) => {
    n.dirs.sort((a, b) => a.name.localeCompare(b.name))
    n.dirs.forEach(sort)
  }
  sort(root)
  return root
}

export function collectFiles(node: TreeNode): PrFile[] {
  return [...node.files, ...node.dirs.flatMap(collectFiles)]
}

/** Joins a folder that holds only one folder with that folder, as GitHub does: `src/Domain` becomes one row. */
export function compactTree(node: TreeNode): TreeNode {
  const dirs = node.dirs.map((d) => {
    let dir = d
    let name = d.name
    while (dir.files.length === 0 && dir.dirs.length === 1) {
      dir = dir.dirs[0]!
      name = `${name}/${dir.name}`
    }
    return { ...compactTree(dir), name }
  })
  return { ...node, dirs }
}
