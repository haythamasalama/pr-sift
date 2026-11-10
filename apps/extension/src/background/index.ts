interface ApiMessage {
  type: 'gh'
  path: string
  method?: string
  body?: unknown
}

interface TextMessage {
  type: 'text'
  url: string
}

type Message = ApiMessage | TextMessage

async function api(msg: ApiMessage) {
  const { token } = (await chrome.storage.local.get('token')) as { token?: string }
  if (!token) return { ok: false, status: 401, data: { message: 'No token set in the extension options.' } }
  const res = await fetch('https://api.github.com' + msg.path, {
    method: msg.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(msg.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: msg.body ? JSON.stringify(msg.body) : undefined,
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}

async function fetchText(url: string) {
  try {
    const res = await fetch(url, { credentials: 'include' })
    return { ok: res.ok, status: res.status, url: res.url, text: await res.text() }
  } catch (e) {
    return { ok: false, status: 0, url, text: '', error: String(e) }
  }
}

chrome.runtime.onMessage.addListener((msg: Message, _sender, send) => {
  const task = msg.type === 'gh' ? api(msg) : msg.type === 'text' ? fetchText(msg.url) : null
  if (!task) return
  task.then(send).catch((e) => send({ ok: false, status: 0, data: { message: String(e) } }))
  return true
})

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage()
})
