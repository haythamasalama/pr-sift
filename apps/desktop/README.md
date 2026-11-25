# PR Sift desktop

An Electron app for macOS, Windows and Linux. It signs in to GitHub, lists the git worktrees in your project folders
and moves the ones you pick to the Trash, and finds heavy folders you can rebuild (dependencies, build output, caches,
big media). Pull requests and the PR Sift review come next, reusing the extension's review UI as is.

## Run it

```bash
pnpm install
pnpm desktop:dev          # from the repository root
```

## Build an installer

```bash
pnpm --filter @pr-sift/desktop dist:mac     # .zip of the .app (run on a Mac for a .dmg)
pnpm --filter @pr-sift/desktop dist:win     # NSIS installer (run on Windows)
pnpm --filter @pr-sift/desktop dist:linux   # AppImage and .deb
```

Builds are not signed yet. On a Mac, an app built elsewhere needs an ad-hoc signature before it opens:

```bash
xattr -cr "PR Sift.app" && codesign --force --deep --sign - "PR Sift.app"
```

## How it is put together

- `src/main` runs in Electron's main process. It holds the GitHub token (encrypted with `safeStorage`), sends every
  GitHub request, runs git, measures folders and moves things to the Trash. Only paths found by the last scan can be
  removed.
- `src/preload` exposes one bridge, `window.prSift`, with a fixed list of channels (`src/shared/ipc.ts`).
- `src/renderer` is the Vue app. It reuses the extension's components and styles through the `@` alias, and installs a
  `chrome` shim (`shim/chrome.ts`) so extension code that calls `chrome.storage` and `chrome.runtime.sendMessage` runs
  unchanged.

## Tests

```bash
pnpm --filter @pr-sift/desktop test     # unit and git integration tests
pnpm --filter @pr-sift/desktop build && node apps/desktop/tests/e2e/smoke.mjs <projects folder> [screenshots folder]
```

The smoke run launches the built app with a throwaway profile and a stubbed GitHub, and walks through every screen.
On Linux without a display, wrap it in `xvfb-run -a`.
