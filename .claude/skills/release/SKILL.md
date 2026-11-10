---
name: release
description: Cut a PR Sift release. Use when bumping the version, updating the changelog, or packaging the extension.
---

# Release

1. Make sure `main` is green: `pnpm check`.
2. Bump `version` in `apps/extension/manifest.json`, `apps/extension/package.json` and the workspace packages together.
3. Move the `Unreleased` entries in `CHANGELOG.md` under the new version and date.
4. Run `pnpm package`; it creates `apps/extension/pr-sift-<version>.zip` from `manifest.json`, `dist` and `icons`.
5. Load the unpacked build and try a real pull request before uploading the zip to the Chrome Web Store.
6. Tag the commit `v<version>`.
