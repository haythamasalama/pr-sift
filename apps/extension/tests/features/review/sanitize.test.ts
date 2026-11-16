import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from '../../../src/features/review/sanitize'

describe('sanitizeHtml', () => {
  it('keeps the formatting of a rendered description', () => {
    const html = '<h2>Summary</h2><ul><li><strong>Fix</strong> the <code>diff</code></li></ul><pre><code>pnpm check</code></pre>'
    expect(sanitizeHtml(html)).toBe(html)
  })

  it('removes scripts, styles, frames, forms and event handlers', () => {
    const html =
      '<p onclick="steal()">Hi<script>steal()</script></p><style>p{}</style><object data="x.swf"></object><form><input type="text"></form><img src="/a.png" onerror="steal()">'
    expect(sanitizeHtml(html)).toBe('<p>Hi</p><img src="https://github.com/a.png">')
  })

  it('drops unsafe and same-page links and opens the rest in a new tab', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">a</a><a href="/o/r/issues/1">b</a><a class="anchor" href="#summary"></a>')
    expect(out).toBe(
      '<a target="_blank" rel="noopener noreferrer">a</a><a href="https://github.com/o/r/issues/1" target="_blank" rel="noopener noreferrer">b</a>',
    )
  })

  it('keeps task list checkboxes, read only', () => {
    expect(sanitizeHtml('<ul><li class="task-list-item"><input type="checkbox" checked> done</li></ul>')).toBe(
      '<ul><li class="task-list-item"><input type="checkbox" checked="" disabled=""> done</li></ul>',
    )
  })

  it('drops SVG and MathML, which can set a script URL through animation', () => {
    const svg = '<svg><a><animate attributeName="href" values="javascript:alert(1)"></animate><text>x</text></a></svg>'
    expect(sanitizeHtml(`<p>before</p>${svg}<math><mi>x</mi></math>`)).toBe('<p>before</p>')
  })
})
