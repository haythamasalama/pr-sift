---
name: shadow-dom-rules
description: Rules for UI code that runs inside PR Sift's shadow root on github.com. Use when styling, adding overlays, or handling keyboard input.
---

# Shadow DOM rules

- Theme tokens are defined on `.ps-root` and `.ps-root.dark` in `apps/extension/src/content/style.css`. `:root` does not reach the shadow root.
- Tailwind's `@property` rules are registered on the document in `content/main.ts`; keep that.
- Overlays (dialogs, menus, popovers) teleport into the dedicated empty container at the end of `App.vue` through `portalTargetKey`. Never teleport into the element Vue patches: reopening the review fails with an `insertBefore` error.
- GitHub has global hotkeys. `lib/isolate.ts` stops key events leaving the host and neutralizes `preventDefault` from page listeners. Keep new inputs inside the host.
- Do not assume GitHub's CSS. Set borders, fonts and colors from tokens.
- Test reopen behavior in a real browser: open the review, close it, open it again, three times.
