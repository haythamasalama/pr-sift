<p align="center"><img src="icons/logo.svg" alt="PR Sift" width="72" /></p>

# PR Sift

A Chrome extension that makes reviewing large GitHub pull requests fast. It opens a review workspace on top of any
pull request page, so you can filter by file type or folder, mark files as viewed in bulk, keep private notes, and
carry on from where you stopped.

It reads the pull request with your existing GitHub login. No account, server or token is required for reviewing.

## Features

- **Smart filters, generated from the pull request.** File types (`.php`, `.blade.php`, `.d.ts`…), change status
  (added, deleted, renamed), quick categories (tests, docs, migrations, translations, config, CI), folders that
  repeat in several places, and folders grouped by parent. Click a type to show only it, click again to undo.
  Shift-click (or right-click) a type to always hide it; that choice is remembered. **Reset filters** clears everything.
- **Review mode.** Files disappear from the list and the tree the moment you mark them viewed. A progress ring
  shows how much is left. Viewed marks are stored per file _content_, so a file that changes after a new push comes
  back as "Updated since viewed".
- **Folder navigation.** A resizable tree with expand/collapse all, folder-level viewed checkboxes, and
  click-to-jump. Works on narrow windows with a drawer.
- **Unified and split diffs**, globally or per file, with GitHub-style syntax highlighting.
- **Private notes.** Select code or press `+` on a line to write a note only you can see. Copy all notes as a
  ready-to-paste prompt for an AI assistant, or post any note to GitHub as a line comment when you want your team
  to see it (needs a token).
- **Live updates.** When new commits are pushed, a banner offers a refresh that keeps your filters and view, and
  resets only the files that changed.
- **Copy helpers** for each file: name, full path, diff, or added lines.
- **Fast on big pull requests.** Diffs are rendered lazily and unmounted when far from the viewport; the list is
  built progressively.

## Install

### From source

Requirements: Node.js 22+ and pnpm 10+.

```bash
pnpm install
pnpm build
```

Then open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked** and select this folder. After
rebuilding, reload the extension and refresh the GitHub tab.

### Packaging for the Chrome Web Store

```bash
pnpm package   # builds and creates pr-sift-<version>.zip
```

## Usage

Open any pull request on github.com and press the **PR Sift** button at the bottom right.

| Action                     | How                                                          |
| -------------------------- | ------------------------------------------------------------ |
| Filter by type             | Click a chip under **Types**; click again to exclude         |
| Add an unknown type        | **+ type**, or type `.blade.php` in the file search          |
| Filter by folder           | **Smart filters** tab; or the search box above the list      |
| Jump to a file or folder   | Click it in the tree                                         |
| Widen the sidebar          | Drag its edge; double-click to reset                         |
| Write a private note       | Select code, or hover a line and press `+`                   |
| Send notes to an assistant | **Notes** → **Copy for Claude**                              |
| Post a note to GitHub      | **Post to GitHub** on the note (confirm with a second click) |

## Settings

Open the extension options (click the toolbar icon). A GitHub token is optional. It is only used to:

- read a pull request when your browser session cannot (fallback), and
- post notes as GitHub comments.

Use a fine-grained token limited to the repositories you need, with **Pull requests: Read and write**. If your
organization requires approval for tokens, an admin must approve it first.

The JSON editor accepts:

| Key                | Meaning                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `presets`          | Named shortcuts: `{ "name": "Orders", "include": ["src/Order/**"] }` |
| `hide`             | Glob patterns hidden by default (lock files, minified files…)        |
| `hideStatuses`     | Statuses hidden by default, e.g. `["removed"]`                       |
| `customExtensions` | Extra compound suffixes, e.g. `[".blade.php"]`                       |
| `hiddenTypes`      | Types you always hide (Shift-click a chip), e.g. `[".json"]`         |
| `reviewMode`       | Hide viewed files immediately                                        |
| `diffView`         | `"unified"` or `"split"`                                             |
| `sidebarWidth`     | Sidebar width in pixels                                              |

## Privacy

Everything stays in your browser. See [PRIVACY.md](PRIVACY.md).

## Development

```bash
pnpm test            # unit and component tests (Vitest)
pnpm test:coverage   # with coverage for src/lib and src/composables
pnpm typecheck       # vue-tsc
pnpm lint            # ESLint
pnpm format          # Prettier
pnpm check           # typecheck + lint + format check + tests
```

Stack: Vue 3, TypeScript, Vite, Tailwind CSS 4, [shadcn-vue](https://www.shadcn-vue.com) components (Reka UI),
highlight.js. The interface renders inside a shadow root so it never interferes with GitHub's styles.

```
src/
  background/     service worker (GitHub API and cross-origin reads)
  content/        the in-page app (App.vue, components/)
  composables/    state: filters, viewed marks, notes, updates, resizing
  lib/            pure logic: diff parsing, scopes, tree, highlighting, GitHub access
  options/        the options page
  components/ui/  generated shadcn-vue components
tests/            mirrors src/
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Limitations

- Reading uses GitHub's `.diff` endpoint. Very large pull requests may be refused by GitHub; the token fallback uses
  the API instead.
- The "Refresh" detection looks for GitHub's own refresh control on the page, which GitHub may change. Periodic
  checking is the fallback.
- GitHub Enterprise Server is not supported yet (the extension only runs on `github.com`).

## License

[MIT](LICENSE)
