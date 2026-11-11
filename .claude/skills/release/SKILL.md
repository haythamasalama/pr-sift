---
name: release
description: Cut a PR Sift release. Use when bumping the version, updating the changelog, or packaging the extension.
---

# Release

PR Sift uses semantic versions. A fix is a patch (`1.0.1`), new behaviour a minor (`1.1.0`), a change that breaks
saved settings or notes a major (`2.0.0`).

1. Make sure `main` is green: `pnpm check`.
2. Create a branch `release/v<version>`.
3. `pnpm release:version <version>` sets the version in `manifest.json` and every `package.json`.
4. In `CHANGELOG.md`, rename `## Unreleased` to `## <version> - <YYYY-MM-DD>`. Each item starts with its area. The
   site's changelog page and the GitHub release notes are built from this file.
5. `pnpm release:notes <version>` prints the notes the release will get. It fails if the section is missing.
6. `pnpm package` creates `apps/extension/pr-sift-<version>.zip`. Load the unpacked build and try a real pull request.
7. Open a pull request titled `chore(release): v<version>`, merge it, then tag the merge commit `v<version>` and push the
   tag. The Release workflow checks the tag against the manifest, builds the zip and publishes the GitHub release.
8. Upload the same zip in the Chrome Web Store dashboard (see `docs/STORE_LISTING.md`).
9. Start the next cycle with an empty `## Unreleased` heading only when there is something to put under it.
