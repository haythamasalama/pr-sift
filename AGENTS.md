# PR Sift: notes for contributors and coding agents

PR Sift is a Chrome extension that helps review large GitHub pull requests. Read `docs/ARCHITECTURE.md` first.

## Commands

```bash
pnpm install
pnpm check      # typecheck + lint + format check + tests; must pass
pnpm build      # builds apps/extension/dist; load apps/extension as an unpacked extension
```

## Rules

- Pure logic goes in `packages/core` and must not import Vue, `chrome` or the DOM.
- Feature code goes in `apps/extension/src/features/<feature>` with tests in `apps/extension/tests/features/<feature>`.
- Use shadcn-vue components and semantic color tokens. No raw colors, no `space-y-*`.
- Comments only for a non-obvious reason. No comments that restate the code.
- Never add Claude, Co-Authored-By or generated-by lines to commits or pull requests.
- Do not send data to third-party hosts. No remote fonts, analytics or CDNs (see `PRIVACY.md`).

## Skills

Task guides live in `.claude/skills/`: `add-ui-component`, `add-feature`, `shadow-dom-rules`, `release`.
