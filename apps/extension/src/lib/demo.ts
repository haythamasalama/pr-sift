// The website's live demo runs this bundle with a stand-in `chrome` object that reports this id. The real extension
// always has its own id, so these parts only change on the website.
export const DEMO_ID = 'pr-sift-demo'

export const isDemo = () => globalThis.chrome?.runtime?.id === DEMO_ID

// Inside the home page the demo is part of the page and stays open. In full screen, closing it goes back to the site.
export const isEmbeddedDemo = () => isDemo() && window.top !== window

export function leaveDemo() {
  if (history.length > 1) history.back()
  else location.assign('/#try')
}
