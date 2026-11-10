const EVENTS = ['keydown', 'keyup', 'keypress', 'beforeinput'] as const

export function isolateKeyboard(host: HTMLElement) {
  for (const type of EVENTS) {
    window.addEventListener(
      type,
      (e) => {
        if (!e.composedPath().includes(host)) return
        const cancel = e.preventDefault.bind(e)
        e.preventDefault = () => {
          if (e.currentTarget !== window && e.currentTarget !== document) cancel()
        }
      },
      true,
    )
    host.addEventListener(type, (e) => {
      if ((e as KeyboardEvent).key !== 'Escape') e.stopPropagation()
    })
  }
}
