# Contributing

Thanks for helping. A few rules keep the project easy to maintain.

## Setup

```bash
pnpm install
pnpm check      # must pass before you open a pull request
pnpm build      # then load apps/extension as an unpacked extension to try changes
```

## Guidelines

- **Tests.** Add or update tests with every behavior change. Pure logic goes in `packages/core` with unit tests;
  feature state lives in `apps/extension/src/features/<feature>`; interface behavior gets a component test next to it
  in `apps/extension/tests/features/<feature>`.
- **Types.** No `any`. Keep functions small and typed.
- **Components.** Prefer the shadcn-vue components in `apps/extension/src/components/ui` (add new ones from
  `apps/extension` with `pnpm dlx shadcn-vue@latest add <name>`, see `.claude/skills/add-ui-component`) over hand-made controls. Use semantic color tokens (`bg-muted`,
  `text-muted-foreground`), not raw colors.
- **Shadow DOM.** The UI lives in a shadow root. Overlays must teleport into the shadow root (see
  `apps/extension/src/lib/portal.ts`), and global CSS from GitHub must not be assumed.
- **Comments.** Only explain _why_ when it is not obvious.
- **Scope.** One change per pull request, with a short description of what and why.
- **Commits.** [Conventional Commits](https://www.conventionalcommits.org): `feat(notes): add resolve button`. See
  `.claude/skills/commit/SKILL.md` for types and scopes.

## Screenshots and videos

Everything in `media/` is generated. After a visible change, run `pnpm capture` (it builds the extension, opens a demo
pull request in Playwright, records each screen, then renders the social image and the store images) and commit the new
files. Install the browser once with
`pnpm --filter @pr-sift/capture exec playwright install chromium`.

## Reporting bugs and ideas

Use the issue forms. They ask for the details we need.

### Bugs

Include the browser, whether you used a token, the pull request size (number of files), and the console output of
the GitHub tab. Do not paste your token.
