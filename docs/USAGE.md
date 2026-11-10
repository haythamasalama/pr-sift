# Using PR Sift

## Everyday actions

| Action                       | How                                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Show only one type           | Click a chip under **Types**, e.g. `.php`                                                                              |
| Combine type and change      | Click `.php`, then `added`: only new PHP files                                                                         |
| Always hide a type           | Shift-click or right-click its chip. Remembered across pull requests                                                   |
| Add your own type            | **+ type**, e.g. `.blade.php`, `.test.ts`                                                                              |
| Undo every filter            | **Reset filters**                                                                                                      |
| Jump to a folder or file     | Click it in the tree; search above the tree opens matching folders                                                     |
| Expand or collapse a subtree | The two icons on a folder row                                                                                          |
| Mark a folder as viewed      | The checkbox on the folder row                                                                                         |
| Hide what you have read      | **Hide viewed**; the ring shows what is left                                                                           |
| Split one file               | The split icon on the file header                                                                                      |
| Copy name, path, diff, lines | The copy icon on the file header                                                                                       |
| Write a note on many lines   | Drag from the `+` next to a line, or select code and press **Add note**                                                |
| Resolve, edit or post a note | The icons on the note, or in **Notes**                                                                                 |
| Send notes to an assistant   | **Notes** → **Copy for Claude Code**; the arrow picks Codex, Cursor, GitHub Copilot, Claude, ChatGPT or clipboard only |
| Theme                        | The palette button: system, light or dark                                                                              |

## Settings

Open the extension options from the toolbar icon. Theme changes apply at once; other changes reach open reviews when
you press **Save**.

- **GitHub token (optional).** Used only to post a note as a review comment, and as a fallback when GitHub refuses to
  load a very large diff. Use a fine-grained token limited to the repositories you need, with **Pull requests: Read
  and write**.
- **Hidden files.** Path patterns (`**/*.lock`) and change types hidden until you turn on **Hidden**.
- **Defaults.** Hide viewed files, unified or split view.
- **Presets.** Named sets of path patterns shown as buttons in the review, for example
  `[{ "name": "Backend", "include": ["src/**"] }]`.

## Limitations

- Reading uses GitHub's `.diff` endpoint. GitHub may refuse very large pull requests; with a token the extension
  falls back to the API, which lists at most 3000 files.
- New-commit detection looks for GitHub's own refresh control, which GitHub may change. Periodic checking is the
  fallback.
- GitHub Enterprise Server is not supported yet.
