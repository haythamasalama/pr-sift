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

| Host                               | Why                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `github.com`                       | Read the pull request's diff, title and description with your login           |
| `patch-diff.githubusercontent.com` | GitHub redirects some `.diff` downloads here                                  |
| `api.github.com`                   | Only with a token: fallback reading, comments, posting, approving and merging |
| `avatars.githubusercontent.com`    | Profile pictures of the author and commenters, as GitHub shows them           |

PR Sift never sends your notes, code or token anywhere else. Notes are posted to GitHub only when you press
**Post to GitHub** and confirm. A pull request is approved or merged only when you press **Approve** or the merge button
in its dialog.

**Copy for …** puts your notes on the clipboard. For Claude or ChatGPT it also opens the site in a new tab. PR Sift
sends nothing to any assistant; you paste the notes yourself.

**Check for updates** asks Chrome to look for a new version, as Chrome already does on its own every few hours.
**What’s new** and **Rate PR Sift** only open a page in a new tab.

## Permissions

- `storage`: the local data above.
- Host access to the three hosts above, and nothing else.
