# Privacy

PR Sift does not collect, transmit or sell any data. It has no server, analytics or tracking.

## What it stores

Everything is stored locally with `chrome.storage.local`:

- your settings (filters, layout, remembered choices);
- which files you marked as viewed, per pull request;
- your private notes, per pull request;
- an optional GitHub token, if you add one. It is never synced and only sent to `api.github.com`.

Uninstalling the extension deletes all of it.

## Network access

| Host                               | Why                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `github.com`                       | Read the pull request's diff and title with your existing login           |
| `patch-diff.githubusercontent.com` | GitHub redirects some `.diff` downloads here                              |
| `api.github.com`                   | Only when you add a token: fallback reading and posting notes as comments |

PR Sift never sends your notes, code or token anywhere else. Notes are posted to GitHub only when you press
**Post to GitHub** and confirm.

**Copy for …** puts your notes on the clipboard. For Claude or ChatGPT it also opens the site in a new tab. PR Sift
sends nothing to any assistant; you paste the notes yourself.

## Permissions

- `storage`: the local data above.
- Host access to the three hosts above, and nothing else.
