# PR Sift brand

<img src="apps/extension/icons/logo.svg" alt="PR Sift logo" width="72" />

This file describes the brand as the code ships it (November 2026). Every colour, size and file below is read from the code: the site
tokens in `apps/site/src/style.css`, the extension tokens in `apps/extension/src/content/style.css`, the logo in
`apps/site/scripts/build-pages.mjs` and the social cards in `tools/capture/cards.mjs`. Change a value there and here
together.

## Idea

**A funnel over a pull request.** A 200-file change goes in, the 12 files that matter come out. The brand is black
and white, like GitHub's own interface, so the code and the red and green diff colours carry the attention.

Principles:

1. **The diff is the hero.** Red and green lines are the only strong colour, and they always mean removed and added.
2. **Black and white, no accent colour.** Buttons, the logo and links use ink on paper. There is no brand blue.
3. **Feels like GitHub, is not GitHub.** The extension uses GitHub's own colours so it sits naturally on github.com.
   The site is quieter and its own. Every listing says "Not affiliated with GitHub".
4. **Private by default, in the design too.** No remote fonts, no CDNs, no analytics. Every font and icon is bundled.
5. **Show, don't tell.** Real screenshots and short videos of a real pull request, not illustrations.

## Name

- **PR Sift**: two words, "PR" in capitals, capital S. "Sift", as in a sieve, not "Shift".
- Never "PRSift", "Pr Sift", "PR-Sift" or "PR sift". In code identifiers: `pr-sift` and `prSift`.
- One line: **Review large GitHub pull requests without the noise.**
- Short: PR Sift is a free Chrome extension for large GitHub pull requests: smart file filters, viewed tracking and
  private notes for Claude Code, Codex, Cursor or ChatGPT.

## Logo

A rounded square tile with a funnel drawn as one stroke.

| Part   | Value                                                                              |
| :----- | :--------------------------------------------------------------------------------- |
| Grid   | 100 × 100                                                                          |
| Tile   | Full size, corner radius 22                                                        |
| Funnel | Path `M22 28h56L57 53v20l-14-7V53L22 28Z`, stroke 8, round caps and joins, no fill |

| File                                                        | Colours                            | Use                                                   |
| :---------------------------------------------------------- | :--------------------------------- | :---------------------------------------------------- |
| `public/brand/pr-sift-logo.svg` (generated)                 | Black tile `#000000`, white funnel | Light backgrounds, press kit                          |
| `public/brand/pr-sift-logo-light.svg` (generated)           | White tile, black funnel           | Dark backgrounds, press kit                           |
| `public/favicon.svg` (generated)                            | Black tile, white funnel           | Browser tab                                           |
| `apps/extension/icons/logo.svg` and `icon-16/32/48/128.png` | Black tile `#000000`, white funnel | Chrome toolbar, extensions page, store                |
| Site header and footer (inline)                             | Tile in `ink`, funnel in `paper`   | Follows the theme: black in light, near white in dark |

- The extension PNGs are rendered from `logo.svg` by `pnpm --filter @pr-sift/capture icons`. Edit the SVG, then run it.
- On the social cards the logo flips to a white tile with a black funnel, because the card is black.
- Keep clear space of at least a quarter of the tile around it. Smallest size 16 px.
- Don't recolour it, add a gradient, outline it, rotate it or put it on a busy picture.
- Next to the name: the tile, then **PR Sift** in semibold, a gap of about a third of the tile.

## Colour

### Site

| Token            | Light                 | Dark                                | Use                                              |
| :--------------- | :-------------------- | :---------------------------------- | :----------------------------------------------- |
| `paper`          | `#ffffff`             | `#111113`                           | Page                                             |
| `raised`         | `#f6f8fa`             | `#19191c`                           | Panels, video frames, hover on cards and buttons |
| `ink`            | `#000000`             | `#ececee`                           | Headings, body, primary buttons                  |
| `muted`          | `#57606a`             | `#a0a0a8`                           | Descriptions, footer links                       |
| `line`           | `#d0d7de`             | `#2a2a2f`                           | Borders and dividers                             |
| `add` / `add-bg` | `#1a7f37` / `#dafbe1` | `#4ade80` / `rgb(74 222 128 / .18)` | Added lines                                      |
| `del` / `del-bg` | `#cf222e` / `#ffebe9` | `#ff6b6b` / `rgb(255 107 107 / .2)` | Removed lines                                    |

- The browser `theme-color` is `#ffffff` in light and `#111113` in dark.
- Primary button: `ink` background with `paper` text. Secondary: `paper` with a `line` border, `raised` on hover.
- The dark theme is a soft near-black, deliberately not GitHub's blue-black.
- The press kit lists three colours: Black `#000000`, White `#ffffff`, Gray `#57606a`.

### Extension

The extension draws inside github.com, so it uses GitHub's Primer colours, not the site's.

| Token                 | Light                 | Dark                                 |
| :-------------------- | :-------------------- | :----------------------------------- |
| `background`          | `#ffffff`             | `#0d1117`                            |
| `foreground`          | `#1f2328`             | `#f0f6fc`                            |
| `muted-foreground`    | `#59636e`             | `#9198a1`                            |
| `secondary` / `muted` | `#f6f8fa`             | `#212830` / `#151b23`                |
| `accent`              | `#eaeef2`             | `#262c36`                            |
| `border` / `input`    | `#d1d9e0`             | `#3d444d`                            |
| `ring` (focus)        | `#0969da`             | `#1f6feb`                            |
| `emphasis` (blue)     | `#0969da`             | `#1f6feb`                            |
| `primary`             | `oklch(0.205 0 0)`    | `oklch(0.922 0 0)`                   |
| `success`             | `#1f883d`             | `#238636`                            |
| `destructive`         | `#cf222e`             | `#f85149`                            |
| `add-fg` / `add-bg`   | `#1a7f37` / `#e6ffec` | `#3fb950` / `rgba(46, 160, 67, .15)` |
| `del-fg` / `del-bg`   | `#cf222e` / `#ffebe9` | `#f85149` / `rgba(248, 81, 73, .1)`  |
| `hunk`                | `#ddf4ff`             | `rgba(56, 139, 253, .1)`             |

Syntax colours also follow GitHub (keyword `#cf222e` / `#ff7b72`, entity `#8250df` / `#d2a8ff`, constant `#0550ae` /
`#79c0ff`, string `#0a3069` / `#a5d6ff`, comment `#6e7781` / `#8b949e`, tag `#116329` / `#7ee787`).

In extension code use the shadcn-vue semantic tokens (`bg-background`, `text-muted-foreground`), never raw colours.
`primary` is neutral to match the brand. GitHub's blue (`emphasis`, the Button `emphasis` variant) is kept for the
places GitHub itself uses blue: the add-note button on a diff line, the sidebar resize handle and the progress ring
(blue while files are left, `success` green when all are viewed).

- `sidebar` (`#ffffff` light, `#010409` dark) is the panel chrome: the top bar, the filter bar and the sidebar. The
  file list sits on `background`, so the chrome and the content read as two layers.
- `selected` (`rgb(212 167 44 / .28)` light, `rgb(187 128 9 / .3)` dark) marks the lines of a note range. It is
  painted over the diff colours, never instead of them.
- The radius scale comes from `--radius` (10 px) on `:root` and `:host`. Controls use the shadcn sizes, which give
  8 px for small buttons and toggles and 10 px for inputs and default buttons. Don't override corners per component.

### Social cards

Black background, white text, GitHub's dark diff colours: removed `#f85149` on `rgb(248 81 73 / .17)`, added
`#3fb950` on `rgb(46 160 67 / .2)`, subtitle `#8b949e`.

## Type

| Where                                         | Family                                                             | Weights       |
| :-------------------------------------------- | :----------------------------------------------------------------- | :------------ |
| Site                                          | IBM Plex Sans                                                      | 400, 500, 600 |
| Site code, the hero diff, numbers in the demo | IBM Plex Mono                                                      | 400, 500      |
| Social and store cards                        | IBM Plex Sans 500/600 and IBM Plex Mono 500, embedded in the image |               |
| Extension                                     | Inter if the visitor has it, otherwise the system UI font          |               |
| Extension code                                | `ui-monospace`, SF Mono, Menlo                                     |               |

- Fonts are self-hosted from `@fontsource`. Nothing loads from Google Fonts or any other host.
- Headings are semibold (600) with tight tracking. Nothing heavier than 600.
- The extension UI is 13 px, like GitHub.

## The diff headline

The signature move of the brand: a headline written as a two-line diff.

```
− Scroll 214 changed files.
+ Review the 12 that matter.
```

- Mono, weight 500, red line on top, green line below, each line kept on one line at every width.
- Used in the site hero, the social image and the store images. Keep the numbers concrete.

## Shape and space

| Element                                                | Radius                         |
| :----------------------------------------------------- | :----------------------------- |
| Logo tile                                              | 22 % of its size               |
| Buttons, inputs                                        | 6 px (`rounded-md`)            |
| Screenshots, videos, the demo, cards on the brand page | 8 px (`rounded-lg`)            |
| Sibling app cards                                      | 12 px (`rounded-xl`)           |
| Theme switch                                           | Full pill                      |
| Extension components                                   | Base radius 10 px (`0.625rem`) |

- Site content width 1152 px (`max-w-6xl`) with 16 px side gutters on phones and 24 px from `sm`.
- Separate sections with space and a `line` border, not with shadows.

## Imagery

All media is generated from a demo pull request by `tools/capture` (`pnpm --filter @pr-sift/capture capture`).

| Asset                                            | Size                                                 | Where                  |
| :----------------------------------------------- | :--------------------------------------------------- | :--------------------- |
| Screenshots `media/screenshots/*.webp`           | 3200 × 2120                                          | Site, README, docs     |
| Videos `media/videos/*.mp4` with a poster `.jpg` | 1600 × 1000, recorded at 2× and zoomed on the action | Site                   |
| Share image `media/og.png`                       | 1200 × 630 at 2×                                     | Open Graph and X cards |
| Store promo tiles `media/store/promo-*.png`      | 440 × 280 and 1400 × 560                             | Chrome Web Store       |
| Store screenshots `media/store/screenshot-*.jpg` | 1280 × 800                                           | Chrome Web Store       |

- Show the extension on a real-looking pull request, in light mode first, dark mode as one extra shot.
- Posters come from the middle of each video, so the still frame shows the feature, not an empty start.
- Browser logos on the site are monochrome (Simple Icons), so no brand colour competes with the diff.

## Motion

- Videos play only while on screen. With reduced motion they don't autoplay and show controls instead.
- The demo file list filters itself in the hero, and its height is fixed so the page never jumps.
- The theme changes instantly, with no animation.
- Smooth scrolling for in-page links.

## Site footer

- Columns: Product, Guides, Compare, Resources. The System, Light and Dark switch sits under Resources.
- **Sibling apps**: the other apps by the same maker, each as a card with its own logo in its own colours. EasyShoot
  (blue tile, "Easy" in ink and "Shoot" in `#1a63d6` light / `#8cc4ff` dark) and WhatsApp Business Monitor (green
  tile). The whole card is the link, with a `raised` background on hover and no underline.
- Bottom row: "Copyright © year Haytham A. Salama. All rights reserved.", then Privacy Policy, License, X, and the
  author's signature.
- The signature is pure black `#000` in light and pure white `#fff` in dark, 44 × 22 px, linking to
  [haythamasalama.me](https://haythamasalama.me/). It never takes the theme's ink colour or a hover colour.

## Voice

Short and plain. Say what the reviewer gets, not how it is built.

- Lead with the outcome and a real number: "a 200-file change becomes the 12 files that matter".
- Name the AI tools in this order: Claude Code, Codex, Cursor, GitHub Copilot, Claude, ChatGPT.
- Privacy is the promise and must stay true: your code stays in your browser, PR Sift talks only to GitHub, no
  account, no server, no analytics.
- Always say "Not affiliated with GitHub" in store and press text.
- No superlatives, no exclamation marks. Emoji only in the README's short bullet lists.
- Sentence case for headings and buttons. Use the same feature names everywhere: Private notes, Smart filters, Viewed,
  Split and Unified.

## License and author

- PolyForm Shield 1.0.0: free to use, including at work. No reselling, no copies, no competing product.
- Author: Haytham A. Salama, [haythamasalama.me](https://haythamasalama.me/), X
  [@haythamasalama](https://x.com/haythamasalama).
- Spell the name "Haytham A. Salama" everywhere: README, `package.json`, the license, the site and the store.
