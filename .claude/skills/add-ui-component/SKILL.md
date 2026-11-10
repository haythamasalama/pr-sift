---
name: add-ui-component
description: Add or update a shadcn-vue component in PR Sift without breaking the shadow root or the privacy rules. Use before running any shadcn-vue CLI command.
---

# Add a shadcn-vue component

Run every CLI command from `apps/extension`, never from the repository root.

1. Check `apps/extension/src/components/ui` first; the component may already exist.
2. Run `pnpm dlx shadcn-vue@latest add <name>`. If it asks to overwrite an existing file, answer no.
3. Review the diff:
   - `apps/extension/src/content/style.css`: the CLI may re-add a Google Fonts `@import` and global `*` / `body` rules. Remove them. The extension must not contact third-party hosts, and `body` rules do nothing inside the shadow root.
   - Components that teleport (`DialogContent`, `DropdownMenuContent`, popovers, selects) must use `portalTargetKey` from `@/lib/portal` as the portal target. Compare with `DialogContent.vue` and restore the patch if the CLI replaced it.
4. Never run `shadcn-vue apply <preset>`; it overwrites the components and the theme tokens.
5. Use the component with its documented composition (for example `Field` inside `FieldGroup`, `Card` with `CardHeader`).
6. Run `pnpm check`.
