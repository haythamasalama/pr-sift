# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private vulnerability reporting on the
repository's **Security** tab, and include the steps to reproduce.

You will get a reply within a few days. Fixes are released as a new version in the Chrome Web Store.

## What the extension can access

PR Sift runs only on `github.com`. It stores settings, viewed marks and notes in `chrome.storage.local`. The optional
GitHub token stays in that storage and is sent only to `api.github.com`. See [PRIVACY.md](PRIVACY.md).
