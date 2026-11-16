# Changelog

Each entry starts with the area it touches: Filters, Tree, Review, Notes, AI, Views, Appearance, Security or License. New work
goes under `## Unreleased` until the next release moves it under its version and date.

## Unreleased

### Added

- Review: The pull request's state, author and avatar, branches, commit count and comment count sit under the title. Click a branch to copy it.
- Review: GitHub comment threads show inside the files, under their lines. The comment count opens the conversation and the
  code comments in the review, and each comment jumps to its line.
- Review: A Description button shows the pull request description above the files.
- Review: Approve, request changes or comment from a popover. Merge from a side sheet, with the merge method on the button
  and a dot when checks, reviews or conflicts may block it. Squash merges leave out AI co-authors such as Claude,
  ChatGPT, Gemini and Copilot by default, and remember the people you uncheck.
- Review: A token saved in the options works right away, without reloading GitHub.
- Review: The options page shows your version and checks for updates. Restart into a downloaded update from there or
  from the review menu.
- Review: After an update, the review names the new version and links to what’s new.
- Review: Rate PR Sift on the Chrome Web Store from the review menu or the options page.

### Changed

- License: PR Sift is now open source under the MIT license, replacing PolyForm Shield 1.0.0.

## 1.1.0 - 2026-11-14

### Added

- Views: Show hidden lines above and below each change, 20 at a time or all at once.
- Review: Ctrl+Z (or ⌘Z) undoes the last viewed change.
- Review: A Viewed menu restores one file, every file in the view, or clears all marks in the pull request.
- Review: The open button on a file jumps to that file inside the pull request on GitHub.
- Tree: Set the indent and turn guide lines on or off in the options.
- Appearance: A Settings item in the review menu opens the options page.

### Changed

- Appearance: The PR Sift button matches GitHub's buttons and follows the page's light or dark background.
- Review: Theme, settings and help share one menu, and progress sits next to the pull request title.
- Tree: Partly viewed folders show a dash instead of a check.

### Fixed

- Review: Pressing Escape in a menu closes the menu, not the whole review.

## 1.0.1 - 2026-11-12

### Fixed

- Tree: Clicking a folder's arrow opens the folder instead of marking it as viewed.

## 1.0.0 - 2026-11-11

The first public release.

### Added

- Notes: Private notes on one or many lines, with an adjustable start and end.
- Notes: A round blue "+" on every diff line, and drag across lines to note a range.
- Notes: Resolve notes to hide them from the diff and from the prompt.
- Notes: Edit and delete notes from the diff or from the Notes list.
- Notes: Post any note to GitHub as a review comment, with a token.
- AI: Copy open notes as one prompt with the code for Claude Code, Codex, Cursor, GitHub Copilot, Claude or ChatGPT.
- Filters: Combine type and change filters, for example only new PHP files.
- Filters: Shift-click a type to hide it on every pull request.
- Filters: Add your own endings such as .blade.php or .test.ts.
- Filters: A "with notes" filter for files that have your notes.
- Filters: Smart categories for tests, migrations, translations, config and CI.
- Tree: A viewed checkbox on every file and folder, and on the whole tree.
- Tree: Expand or collapse any folder and everything inside it.
- Tree: Search opens the tree to the matching files.
- Review: Mark files or whole folders as viewed, with a ring that turns green when you are done.
- Review: Viewed marks follow file content, so files changed by a new push come back.
- Review: Drag the sidebar edge to resize it, double-click to reset.
- Review: A short notice with a Reload button when PR Sift updates.
- Views: Unified or split diffs, for all files or one file.
- Views: Copy a file name, path, diff or only the added lines.
- Appearance: Light, dark or system theme with GitHub colors, and a near-black frame around the files in dark mode.
- Appearance: GitHub-style icons for added, modified, deleted and renamed files.

### Fixed

- Notes: Notes and viewed marks from two tabs no longer overwrite each other.
- Notes: A note on an unchanged line no longer appears twice in split view.
- Notes: Typing in a note is no longer blocked by GitHub shortcuts.
- Notes: A selected range keeps the added and removed colours under it.
- Review: The review opens again after you close it.
- Review: Empty pull requests open without an error.
- Filters: Type and change filters now narrow together instead of adding up.
- Views: Files with quoted names, renamed files and binary files are read correctly.
- Appearance: Small buttons and toggles keep their rounded corners inside GitHub.

### Security

- Security: The background worker only talks to GitHub and only answers PR Sift.
- Security: No known vulnerabilities in the dependencies.
