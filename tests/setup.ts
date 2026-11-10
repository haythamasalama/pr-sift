import { afterEach, vi } from 'vitest'

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

vi.stubGlobal('IntersectionObserver', ObserverStub)
vi.stubGlobal('ResizeObserver', ObserverStub)

if (!('matchMedia' in window)) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('IntersectionObserver', ObserverStub)
  vi.stubGlobal('ResizeObserver', ObserverStub)
})
