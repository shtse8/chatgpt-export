---
version: alpha
name: ChatGPT Export
description: Independent, open-source browser extension that turns every ChatGPT conversation into files the user keeps. Calm archival tool, indigo ink on warm paper, clearly third-party.
colors:
  primary: "#3642C9"
  primary-hover: "#2A34A8"
  on-primary: "#FFFFFF"
  primary-soft: "#E6E8FB"
  on-primary-soft: "#232C8F"
  tertiary: "#F2B544"
  on-tertiary: "#1B1D2A"
  surface: "#FAF8F4"
  surface-raised: "#FFFFFF"
  on-surface: "#1B1D2A"
  on-surface-muted: "#565A6C"
  outline: "#DCD8CF"
  success: "#1E6B47"
  error: "#B3321C"
  on-error: "#FFFFFF"
  surface-dark: "#13151F"
  surface-raised-dark: "#1D2030"
  on-surface-dark: "#ECEBF5"
  on-surface-muted-dark: "#A3A6BA"
  outline-dark: "#33374A"
  primary-dark: "#8C96FF"
  on-primary-dark: "#13151F"
  primary-soft-dark: "#262B52"
  on-primary-soft-dark: "#C9CDFF"
  success-dark: "#6FD3A0"
  error-dark: "#FF8A75"
  on-error-dark: "#13151F"
typography:
  display:
    fontFamily: IBM Plex Sans
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
  headline:
    fontFamily: IBM Plex Sans
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.01em
  title:
    fontFamily: IBM Plex Sans
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: IBM Plex Sans
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.04em
  mono:
    fontFamily: IBM Plex Mono
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
  stat:
    fontFamily: IBM Plex Mono
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.1
    fontFeature: '"tnum" 1'
rounded:
  sm: 4px
  md: 6px
  lg: 10px
  tile: 28px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 40px
  popup-width: 360px
  popup-padding: 16px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: 10px 16px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-primary-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.on-primary-dark}"
  button-danger-dark:
    backgroundColor: "{colors.error-dark}"
    textColor: "{colors.on-error-dark}"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.primary}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: 10px 16px
    height: 40px
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    rounded: "{rounded.md}"
    height: 40px
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 8px 10px
    height: 34px
  input-dark:
    backgroundColor: "{colors.surface-raised-dark}"
    textColor: "{colors.on-surface-dark}"
  card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 12px
  card-dark:
    backgroundColor: "{colors.surface-raised-dark}"
    textColor: "{colors.on-surface-dark}"
  caption:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
  caption-dark:
    backgroundColor: "{colors.surface-raised-dark}"
    textColor: "{colors.on-surface-muted-dark}"
  divider:
    backgroundColor: "{colors.outline}"
    height: 1px
  divider-dark:
    backgroundColor: "{colors.outline-dark}"
    height: 1px
  status-complete:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.success}"
    typography: "{typography.title}"
  status-complete-dark:
    backgroundColor: "{colors.surface-raised-dark}"
    textColor: "{colors.success-dark}"
  nav:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.headline}"
    height: 48px
    padding: 0 16px
  nav-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-surface-dark}"
  format-chip:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.on-primary-soft}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: 4px 8px
  format-chip-dark:
    backgroundColor: "{colors.primary-soft-dark}"
    textColor: "{colors.on-primary-soft-dark}"
  file-tag:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: 2px 6px
  progress-meter:
    backgroundColor: "{colors.outline}"
    textColor: "{colors.on-surface}"
    typography: "{typography.stat}"
    size: 64px
  progress-meter-fill:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
---

# ChatGPT Export

## Overview

ChatGPT Export is an independent, open-source browser extension (also a userscript and bookmarklet) that saves every ChatGPT conversation as JSON, Markdown, plain text or HTML, including on Team and Business plans that lack a built-in export. It runs in the user's own browser session; nothing leaves the machine. It is published by its author under the MIT licence and is **not affiliated with OpenAI**.

Audience: people who rely on ChatGPT for work (team-plan members, researchers, developers, writers) and want their history as files they own, for backup, search, migration or compliance. They open the popup a few times a month and need to trust it in seconds.

Personality: **a calm archivist**. Indigo ink on warm paper, file-format tags like folder labels, numbers in monospace. Precise, quiet, trustworthy; never flashy.

Identity boundary: this is a third-party tool. Never use OpenAI's teal-green, its knot logo, its near-black chat chrome, its typefaces or a copy of the ChatGPT interface. "ChatGPT" appears only as the plain-text product name and in descriptive sentences; it is never styled as a logo. Store listings and marketing images carry the line "Not affiliated with OpenAI."

Logo mark: keep the existing rounded-square tile with a white diagonal "out" arrow. Its fill moves from the old green-to-blue gradient to flat Archive Indigo (#3642C9).

Voice: plain, short, factual. Lead with what the user gets ("Every conversation, saved as files you keep"). Name formats and numbers exactly ("1,284 conversations · 3 failed · retrying"). Privacy is stated, not shouted: "Runs in your browser. No API key. Nothing uploaded." No exclamation marks, no emoji in UI copy, no hype words (magic, supercharge, unleash).

Images for store listings, social posts and banners: flat vector diagrams on Paper (#FAF8F4) or Ink Night (#13151F). The recurring motif is a stack of generic speech-bubble lines flowing through the arrow tile into neat file cards, each labelled with a Manila (#F2B544) `.md`, `.json`, `.html` or `.txt` tag. Show the real extension popup rendered in this design system, at 1:1 or 2x, framed on a plain surface. No photos of people, no 3D renders, no glowing gradients, no robot or brain imagery, no screenshots of ChatGPT's own interface or of real user conversations; sample conversations use neutral invented text ("Trip plan for Lisbon").

## Colors

One ink hue, one warm highlight, warm-paper neutrals. Indigo was chosen because it signals reliability and is far from OpenAI's green and monochrome identity.

- **Archive Indigo (#3642C9):** `primary`. The single main action ("Export"), progress fill, focus rings, links and the logo tile. Hover/pressed: #2A34A8. Text on it: #FFFFFF.
- **Indigo Wash (#E6E8FB):** `primary-soft`. Selected format chips and selected rows; text on it #232C8F.
- **Manila (#F2B544):** `tertiary`. File-extension tags and one highlight per marketing image. Never a text colour on light surfaces; text on it is #1B1D2A.
- **Paper (#FAF8F4):** `surface`, the popup and page background. **White (#FFFFFF):** `surface-raised`, cards and inputs.
- **Ink (#1B1D2A):** `on-surface`, all primary text. **Slate (#565A6C):** `on-surface-muted`, labels, captions, metadata.
- **Fold (#DCD8CF):** `outline`, card borders, dividers, empty progress track. Not for text.
- **Ledger Green (#1E6B47):** `success`, "Export complete" text and icon only. Deliberately darker and bluer than OpenAI green.
- **Brick (#B3321C):** `error`, failed items and the Stop button; text on it #FFFFFF.

Dark mode follows `prefers-color-scheme` and is first-class: Ink Night (#13151F) `surface-dark`, #1D2030 `surface-raised-dark`, #ECEBF5 text, #A3A6BA muted text, #33374A outlines, Lilac Indigo (#8C96FF) `primary-dark` with #13151F text on it, #262B52 chip wash with #C9CDFF text, #6FD3A0 success text and #FF8A75 error with #13151F text on it. Manila stays #F2B544 in both modes.

## Typography

**IBM Plex Sans** for all interface and marketing text; **IBM Plex Mono** for file names, format tags, counts, speeds and ETAs. Both are SIL Open Font License and cover Latin, Greek and Cyrillic. The extension ships in English. Bundle the WOFF2 files in the extension (no remote font requests, for privacy); fallback stack: `"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` and `"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace`.

- `display` 40/600 for store tiles and banners only. `headline` 20/600 for the popup title. `title` 15/600 for buttons and card headings.
- `body` 13/400 is the popup default; `body-sm` 12/400 for helper text.
- `label` 11/600 sentence case with slight tracking for field labels; no all-caps.
- `mono` 12/500 for `.md`-style tags and file names; `stat` 18/600 with tabular figures for live counts so digits do not jitter.

## Layout

The popup is a single 360px column with 16px padding, built on a 4px grid (`xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 24, `xxl` 40). Order is fixed: header (name, version) → format choice → scope (all, new since last export, search, selected) → one primary action → progress card → result. One primary button per state; Start becomes Stop while running. Related fields group inside one card with 12px internal padding and 12px between cards.

Store screenshots are 1280×800: popup at 2x on the left third, the conversation-to-files diagram on the right, one `display` headline of at most six words, 40px outer margin. Small promo tile 440×280: logo tile, product name and one Manila file tag only.

## Elevation & Depth

Flat by default; hierarchy comes from tone. Paper background, white raised cards with a 1px Fold (#DCD8CF) border; in dark mode #1D2030 cards with a #33374A border. The only shadow is for floating elements (dropdown menus, toast): `0 4px 16px rgba(27, 29, 42, 0.12)` in light mode, none in dark mode (use the border instead). No glows, no glassmorphism, no gradients in UI.

## Shapes

Gentle, engineered corners: 4px (`sm`) for chips and tags, 6px (`md`) for buttons and inputs, 10px (`lg`) for cards. The logo tile uses a 28px radius at 128px (22% of its size, scaled with the icon). `full` only for status dots and the circular progress meter. File cards in illustrations are rectangles with one folded top-right corner, the brand's signature shape.

## Components

- **button-primary:** Archive Indigo, white `title` text, 40px tall, full width in the popup. Hover #2A34A8. Disabled: 40% opacity. Focus: 2px ring in primary with 2px surface offset.
- **button-secondary:** white with a 1px Fold border and indigo text, for "Choose conversations" and "Open folder". **button-danger:** Brick, used only for Stop (dark: #FF8A75 with #13151F text).
- **caption / divider:** Slate `body-sm` helper text and metadata; 1px Fold dividers between list rows (dark: #A3A6BA text, #33374A dividers).
- **status-complete:** "Export complete · 1,284 saved" in Ledger Green `title` on a white card (dark: #6FD3A0).
- **input:** white field, 1px Fold border, 6px radius, 34px tall; focus border becomes Archive Indigo; error border and helper text in Brick. Labels sit above in `label`.
- **card:** white, 10px radius, 1px Fold border, 12px padding. Holds settings groups, progress and results.
- **nav:** the popup header, 48px, Paper background, logo tile at 20px, product name in `headline`, version in `mono` Slate on the right. No tabs.
- **format-chip:** segmented choice of JSON / Markdown / Text / HTML in `mono`; unselected is white with a Fold border, selected is Indigo Wash with #232C8F text.
- **file-tag:** Manila tag with Ink `mono` text naming an extension; used in results ("chatgpt-export-2026-11-11.md") and illustrations.
- **progress-meter:** 64px ring, Fold track, Archive Indigo fill, percentage in `stat` centred. Beside it a 2×2 grid of `stat` numbers (done, failed, speed, ETA) with `label` captions. Completed state swaps the ring for a Ledger Green check.

## Do's and Don'ts

- Do keep the logo tile Archive Indigo with the white out-arrow, on every icon size and listing image.
- Do write "Not affiliated with OpenAI" on store listings, banners and social images.
- Do show counts, formats and file names in IBM Plex Mono with tabular figures.
- Do keep one primary indigo button per popup state.
- Do support light and dark mode in the popup and in exported HTML, using the paired tokens above.
- Don't use OpenAI's teal-green, the OpenAI knot, near-black chat chrome, or a replica of the ChatGPT interface anywhere.
- Don't style the word "ChatGPT" as a logo or put it in a different colour from the rest of the name.
- Don't use gradients, glows, neon, sparkles, robots or brain imagery.
- Don't show real conversations or real account data in screenshots; use invented, neutral samples.
- Don't use Manila for body text or on white backgrounds as a text colour; it is a fill only.
- Don't load fonts or images from remote servers inside the extension.
