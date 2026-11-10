---
name: commit
description: Write PR Sift commit messages and pull request titles in the Conventional Commits format. Use before every commit, amend or pull request.
---

# Commits

Format: `type(scope): description`

- Imperative, lowercase, no period, under 72 characters.
- One commit per reason to change.
- No body unless the reason is not obvious from the diff. Then one or two short lines on why.
- No `Co-Authored-By`, no "Generated with", no mention of AI tools.

## Types

| Type       | Use for                              |
| ---------- | ------------------------------------ |
| `feat`     | new behaviour a user can see         |
| `fix`      | a bug                                |
| `refactor` | same behaviour, different structure  |
| `perf`     | measured speed or memory improvement |
| `docs`     | README, docs, AGENTS.md, skills      |
| `test`     | tests only                           |
| `build`    | build tooling and dependencies       |
| `ci`       | GitHub workflows                     |
| `style`    | formatting only                      |
| `chore`    | anything else, last resort           |

## Scopes

`filters`, `tree`, `diff`, `notes`, `review`, `appearance`, `options`, `core`, `site`, `capture`, `deps`, `ci`.
Leave the scope out when the change spans the whole project.

## Examples

```
feat(notes): send notes to Codex or Cursor
fix(filters): combine type and status filters with AND
refactor(core): move glob matching out of settings
docs: shorten the README
ci: deploy the site to GitHub Pages
```

## Pull requests

The title follows the same format, because it becomes the squash commit. The body says what changed and how to check
it, in a few bullets.
