# Releasing

Chrome updates installed extensions by itself when a higher `version` is published in the Chrome Web Store. A release is
therefore: bump the version, publish the build, tag it. The first release was `1.0.0` on 2026-11-11.

1. `pnpm release:version 1.1.0` sets the version in `manifest.json` and every `package.json` at once.
2. Move the `## Unreleased` entries in `CHANGELOG.md` under `## 1.1.0 - <date>`. `pnpm release:notes 1.1.0` shows the
   notes the release will get, and fails if that section is missing.
3. Merge the release pull request, then push a tag such as `v1.1.0`. The **Release** workflow runs the checks, builds
   `apps/extension/pr-sift-<version>.zip`, verifies that the tag matches `manifest.json`, and publishes a GitHub release
   with the changelog section as its notes and the zip attached.
4. Upload the same zip in the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole).
   Review takes a while, so release early in the week.

The step by step for an agent is in `.claude/skills/release/SKILL.md`. The site's changelog page and its Atom feed are
built from `CHANGELOG.md` on every deploy.

## Automating the store upload later

The Chrome Web Store has a publishing API. To use it from the workflow you need a developer account, an OAuth client and
a refresh token stored as repository secrets. Add that step after the release is created and keep manual upload as the
fallback.

## Store listing

The text, images and privacy answers for the dashboard are in [STORE_LISTING.md](STORE_LISTING.md).
