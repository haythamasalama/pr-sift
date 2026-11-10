# Contributing

Thanks for helping. A few rules keep the project easy to maintain.

## Setup

```bash
pnpm install
pnpm check      # must pass before you open a pull request
pnpm build      # load the folder as an unpacked extension to try changes
```

## Guidelines

- **Tests.** Add or update tests with every behavior change. Pure logic goes in `src/lib` and `src/composables`
  with unit tests; interface behavior gets a component test in `tests/components`.
- **Types.** No `any`. Keep functions small and typed.
- **Components.** Prefer the shadcn-vue components in `src/components/ui` (add new ones with
  `pnpm dlx shadcn-vue@latest add <name>`) over hand-made controls. Use semantic color tokens (`bg-muted`,
  `text-muted-foreground`), not raw colors.
- **Shadow DOM.** The UI lives in a shadow root. Overlays must teleport into the shadow root (see
  `src/lib/portal.ts`), and global CSS from GitHub must not be assumed.
- **Comments.** Only explain _why_ when it is not obvious.
- **Scope.** One change per pull request, with a short description of what and why.

## Reporting bugs

Include the browser, whether you used a token, the pull request size (number of files), and the console output of
the GitHub tab. Do not paste your token.
