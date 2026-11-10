# Releasing

Chrome updates installed extensions by itself when a higher `version` is published in the Chrome Web Store. A release is
therefore: bump the version, publish the build, tag it.

1. Follow `.claude/skills/release/SKILL.md` to bump the version and update `CHANGELOG.md`.
2. Push a tag such as `v0.2.0`. The **Release** workflow runs the checks, builds `apps/extension/pr-sift-<version>.zip`,
   verifies that the tag matches `manifest.json`, and attaches the zip to a GitHub release.
3. Upload the same zip in the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole).
   Review takes a while, so release early in the week.

## Automating the store upload later

The Chrome Web Store has a publishing API. To use it from the workflow you need a developer account, an OAuth client and
a refresh token stored as repository secrets. Add that step after the release is created and keep manual upload as the
fallback.

## Store listing

The text, images and privacy answers for the dashboard are in [STORE_LISTING.md](STORE_LISTING.md).
