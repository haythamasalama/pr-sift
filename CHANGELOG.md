# Changelog

Each entry starts with the area it touches: Filters, Tree, Review, Notes, AI, Views, Appearance or Security. New work
goes under `## Unreleased` until the next release moves it under its version and date.

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
