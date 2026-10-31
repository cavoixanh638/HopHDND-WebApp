---
name: hophdnd-inline-search-highlight
description: Diagnose and fix search-term highlighting that breaks Vietnamese text wrapping, Unicode identity, numeric tokens, or editor hit areas inside flex/grid tables, buttons and popups; use when adding or reviewing inline marks in rendered data.
---

# Safe inline search highlights

## Scope and first diagnosis

Use for **display-only** search highlights, especially Vietnamese accented / unaccented queries in table cells, popups, flex/grid controls and read-only or editable values. Search matching, source data, input value and permission/lease code are separate responsibilities. Do not change any of them to make a visual issue disappear.

1. Reproduce with **the same exact source text, font, computed width and display mode** before and after highlighting. Example in HopHDND: `MẪU: Điều chỉnh kế hoạch đầu tư công trung hạn từ nguồn ngân sách địa phương.`, query `ngân sách` and `ngan sach`. Also exercise a 390px viewport and a *narrow saved column on desktop*.
2. Inspect DOM **children of the actual flex/grid parent** and computed `display`, `min-width`, `white-space`, `overflow-wrap`, `word-break`, padding, font and line-height. A React Fragment with text/mark/text yields multiple anonymous flex/grid items when they are direct children. A `word-break` tweak alone does not repair that layout.
3. Confirm whether a component actually invokes the highlighter in the relevant popup. If it does not, do not claim a live popup search test merely because a cloned highlight uses the popup CSS. Label such a test a *styling fixture*.

## Fix pattern — preserve text, not just color

- Render exactly **one real inline text wrapper** in *both* the matched and nonmatched states. Within that wrapper, keep `<mark>` inline; an inline mark must not be a separate grid/flex item, badge or button. A trailing pencil/caret stays a separate sibling of the wrapper, not inserted between substrings.
- Keep the existing source string and matching **UTF-16 offsets/ranges**; render `source.slice(start,end)` through React text nodes, never `innerHTML` or string-interpolated HTML. Do not normalize, trim, decompose, case-fold or reserialize the source just for display. No markup in `<input value>` or active editors.
- Use `padding:0; margin:0; border:0; display:inline; font:inherit; line-height:inherit; color:inherit` on the mark and only a yellow background. Do not add `min-width`, padding, line boxes or font changes to marks; respect custom colors on ancestor cells and never turn a whole workflow/status row yellow.
- Protect only **short numeric tokens** where a partial hit creates a seam (e.g. a mark on `25` within `254`): one nested *inline* `white-space:nowrap` number run. Do not set `nowrap` on whole long phrases, paragraphs or controls. Ordinary long words still need controlled natural wrapping.
- Preserve accessible text, `textContent`, mouse hitbox, focus, keyboard Esc/no-op, read-only and editable values, including separate status/CellPicker icons. Do not change search predicate, saved layout/width, role logic, lease lifecycle, audit or raw Excel/Firebase data.

## Required verification

**Static/SSR proves identity, not layout.** Assert same concatenated text, exact matched substrings and range offsets for NFC/NFD Vietnamese, unaccented query, multiple hits, middle-of-word, whitespace, HTML-like escaped text, numeric `254` / `25` and no-hit. Compare the DOM element structure with and without marks.

**Real Chromium proves geometry.** In the actual built component, capture unmarked and highlighted nodes; place them in otherwise-identical fixed-width flex *and* grid controls, with pencil/caret as a sibling. Measure `getBoundingClientRect` and per-glyph DOM `Range` rectangles, distinct line baselines and right-edge overflow. Keep the **same text, same width, font and viewport**; do not widen the column, hide overflow or disable existing controls to manufacture a pass. Capture before/after images on desktop and 390px. Also check genuine main-table display and editor hitbox; use a clearly labelled fixed-width popup fixture if the popup does not currently call the highlighter.

### Project example (run from `source/`)

```bash
npm ci
npm run typecheck
npm exec -- vitest run tests/search.test.ts tests/search-highlight.test.tsx tests/pr95-v6-l2-inline-search-highlight.test.tsx
npm run build:compact:qa
node scripts/pr95-v6-l2-inline-highlight-browser.mjs
```

Evidence must include the console marker `PR95_V6_L2_INLINE_GEOMETRY_PASS` and measured line counts/maximum glyph drift, not only successful regex or a server-side render. Current implementation to inspect: `src/features/items/SearchHighlight.tsx` and `src/features/items/search-highlight.css`; original matching implementation `src/domain/search.ts` should remain unchanged.

## Reuse boundaries

Adapt the markup and measurements to the new app's actual wrappers, fonts, break rules and search API. Do not assume its data or picker matches HopHDND, and do not call mocked React/SSR a browser test or a synthetic preview a real production read. The procedure grants **no permission** to merge PRs, publish Pages, deploy Firebase, change Rules, import Excel or read/write production data. Follow the target project's independent review and explicit release authorization.
