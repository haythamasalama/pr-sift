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
