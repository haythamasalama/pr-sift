# Changelog

Each entry starts with the area it touches: Filters, Tree, Review, Notes, AI, Views, Appearance, Security or License. New work
goes under `## Unreleased` until the next release moves it under its version and date.

## 1.3.0 - 2026-11-18

### Added

- Review: Code in the diff is colored for every language, found from the file name, its first `#!` line or the code
  itself, and each part of a Vue, Svelte or Astro file gets its own language.

### Fixed

- Review: Code colors match GitHub's: variables, operators, methods and properties, and calls with type arguments such
  as `ref<Point | null>()`, which no longer leave the lines after them uncolored.
- Notes: The Show resolved switch, Delete all and the copy button stay on one row, and the copy button is only as wide
  as its label.

## 1.2.1 - 2026-11-18

### Fixed

- Review: Add a token and Change in the review open the PR Sift settings page instead of a blank tab.
- Notes: The copy button in Private notes keeps its width after you copy, so it no longer drops to a new line.
- Review: The pull request state (Merged, Closed, Draft) now updates by itself while the review is open, without a reload.

## 1.2.0 - 2026-11-17

### Added

- Filters: Save the file types and folders you picked as a saved filter in the top bar with Save view.
- Filters: Saved filters start from one click with Backend, Frontend, Tests, Docs and AI examples, and show how many
  files they match in the open pull request.
- Review: The pull request's state, author and avatar, branches, commit count and comment count sit under the title.
  Click a branch to copy it.
- Review: GitHub comment threads show inside the files, under their lines. The comment count opens the conversation and
  the code comments in the review, and each comment jumps to its line.
- Review: A Description button shows the pull request description above the files.
- Review: Approve, request changes or comment from a popover. Merge from a side sheet, with the merge method on the button
  and a dot when checks, reviews or conflicts may block it. Squash merges leave out AI co-authors such as Claude,
  ChatGPT, Gemini and Copilot by default, and remember the people you uncheck.
- Review: With Merge commit or Rebase, the merge sheet lists the co-authors that stay in the history and offers Squash
  instead, since only a squash can leave them out.
- Review: Settings open in a side sheet over the review, starting on GitHub, and every change applies right away. They
  also open from where you need them: the Hidden switch, the saved filter buttons and the co-author list in Merge.
- Review: Open PR Sift automatically, so pull requests open straight in PR Sift. Turn it on from the tip in the review
  or in Settings under Reviewing. Closing the review keeps it closed until the next pull request.
- Review: A token saved in the settings works right away, without reloading GitHub.
- Review: About in Settings shows your version and checks for updates. Restart into a downloaded update from there or
  from the review menu.
- Review: After an update, the review names the new version and links to what’s new.
- Review: The PR Sift toolbar icon shows ↑ when an update is ready and NEW after one is installed. The PR Sift button on
  GitHub shows a dot at the same time.
- Review: New settings carry a small dot in Settings until you use them once.
- Review: Rate PR Sift on the Chrome Web Store from About in Settings.
- Notes: Tooltips name the resolve, edit and delete buttons on a note.

### Changed

- Filters: Presets are now called saved filters and are edited as a list of names and paths instead of JSON. Your
  existing presets stay.
- Review: Settings are grouped by what you want to do in tabs (GitHub, Reviewing, Files, Appearance, About), the same
  on the options page and in the sheet, and save as you change them. The connection shows who you are on GitHub, the
  theme and diff view are picked from small previews, the folder indentation has a live tree, and hidden paths and
  co-authors are chips. "Always hidden" counts the files it hides in the open pull request. A switch in GitHub turns
  the AI co-author list on or off.
- Review: Create a token opens a classic GitHub token named PR Sift with the repo scope checked. It works for
  organization repositories without an approval step, and the review and merge prompts ask for the same token.
- Review: The review menu holds the theme, Settings and Help and feedback. Help and feedback opens About, with what’s
  new, rating, reporting a problem and suggesting an idea.
- Review: On small screens the header keeps to two rows. The top search is gone, since the sidebar has one.
- Review: The Approve popover shows each review type with a short hint.
- Review: The merge dot sits on the corner of the Merge button, and buttons next to a main action have a border so they
  read as buttons.
- Notes: The code a note quotes keeps the diff's colors. "Show resolved in the diff" counts resolved notes, says when
  there are none, and says they show dimmed once it is on.
- Notes: A note shows its lines and buttons on one row and its text below, so it stays readable in narrow windows.
- Notes: Post to GitHub posts in one click and takes the note's colors. Once a note is posted, the button goes away.
- Views: The selected choice in Unified and Split, and in the merge method, is easier to see.
- Security: You add or change the GitHub token on PR Sift's own options page. Inside the review, Settings show the
  connection and open that page, so GitHub's page never holds the token field.
- License: PR Sift is now open source under the MIT license, replacing PolyForm Shield 1.0.0.

### Fixed

- Review: The merge sheet no longer lists the pull request author as their own co-author when some of their commits
  use an email GitHub does not link to them.
- Review: People named Claude, Gemini or Copilot stay checked. The AI list now matches the tools' own addresses and bot
  accounts, a co-author you check back stays checked next time, and merging with the list turned off keeps it as it
  was.
- Views: A file's header stays flush with the top while you scroll, so no code shows above it.
- Security: Descriptions and comments drop SVG and MathML, which could carry a script link.

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
