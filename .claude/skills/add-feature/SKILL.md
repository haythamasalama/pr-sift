---
name: add-feature
description: Add a feature to PR Sift in the right place with tests. Use when building new behavior, a new filter, or a new panel.
---

# Add a feature

1. Decide where the logic lives.
   - No DOM, no `chrome`, no Vue: `packages/core/src/<module>.ts`, exported from `index.ts`, tested in `packages/core/tests`.
   - Everything else: `apps/extension/src/features/<feature>/`.
2. Keep state in a `use<Name>.ts` composable next to its components. Share it with children through `provide` and `inject` (see `useNotes.ts`).
3. Storage goes through `apps/extension/src/lib/extension.ts` and `settings.ts`. Add new settings to `Settings` and `DEFAULTS`.
4. Write tests first for pure logic. Add a component test in `apps/extension/tests/features/<feature>` for behavior a user can see. Fixtures come from `@pr-sift/core/testing`.
5. A new filter chip: extend `useFileFilter` and `matchesChip` in core; show it in `FilterBar.vue`.
6. Run `pnpm check`, then `pnpm build` and try the change on a real pull request.
