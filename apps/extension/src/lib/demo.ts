// The website's live demo runs this bundle with a stand-in `chrome` object that reports this id. The real extension
// always has its own id, so these parts only change on the website.
export const DEMO_ID = 'pr-sift-demo'

export const isDemo = () => globalThis.chrome?.runtime?.id === DEMO_ID
