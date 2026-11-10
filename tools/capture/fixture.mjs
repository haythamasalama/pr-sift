const files = []

const header = (path, kind, from) => {
  const lines = [`diff --git a/${from ?? path} b/${path}`]
  if (kind === 'added') lines.push('new file mode 100644', 'index 0000000..1a2b3c4', '--- /dev/null', `+++ b/${path}`)
  else if (kind === 'removed') lines.push('deleted file mode 100644', 'index 4c3b2a1..0000000', `--- a/${path}`, '+++ /dev/null')
  else if (kind === 'renamed')
    lines.push(
      'similarity index 92%',
      `rename from ${from}`,
      `rename to ${path}`,
      'index 5d6e7f8..8f7e6d5 100644',
      `--- a/${from}`,
      `+++ b/${path}`,
    )
  else lines.push('index 5d6e7f8..8f7e6d5 100644', `--- a/${path}`, `+++ b/${path}`)
  return lines
}

export function added(path, body) {
  const lines = body.replace(/^\n/, '').replace(/\n$/, '').split('\n')
  files.push([...header(path, 'added'), `@@ -0,0 +1,${lines.length} @@`, ...lines.map((l) => '+' + l)].join('\n'))
}

export function removed(path, body) {
  const lines = body.replace(/^\n/, '').replace(/\n$/, '').split('\n')
  files.push([...header(path, 'removed'), `@@ -1,${lines.length} +0,0 @@`, ...lines.map((l) => '-' + l)].join('\n'))
}

export function modified(path, hunks, kind = 'modified', from) {
  const out = header(path, kind, from)
  let offset = 0
  for (const { at, lines, title = '' } of hunks) {
    const rows = lines.replace(/^\n/, '').replace(/\n$/, '').split('\n')
    const oldCount = rows.filter((r) => r[0] !== '+').length
    const newCount = rows.filter((r) => r[0] !== '-').length
    out.push(`@@ -${at},${oldCount} +${at + offset},${newCount} @@${title ? ' ' + title : ''}`)
    out.push(...rows.map((r) => (r[0] === '+' || r[0] === '-' ? r : ' ' + (r[0] === ' ' ? r.slice(1) : r))))
    offset += newCount - oldCount
  }
  files.push(out.join('\n'))
}

export const diffText = () => files.join('\n') + '\n'
export const fileCount = () => files.length
