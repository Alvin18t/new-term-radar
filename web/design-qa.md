# Design QA

## Comparison target

- Source visual truth: `/var/folders/tq/dtz7qwbs0_d9q8rrzh0c32600000gn/T/codex-clipboard-8cadad89-4b8f-43d0-b57c-d8bb87878cf7.png`
- Implementation: `http://127.0.0.1:4173/`
- Browser-rendered implementation screenshot: `qa/implementation-home-1229x1309.png`
- Full comparison: `qa/source-vs-implementation.png`
- Focused header comparison: `qa/focused-header-comparison.png`
- Focused recommendation comparison: `qa/focused-cards-comparison.png`
- Desktop viewport: 1229 × 1309 CSS px, device scale factor 1.
- Source pixels: 1229 × 1309. Implementation pixels: 1229 × 1309. No density normalization was required.
- Compared state: desktop, light theme, Today page, no drawer or modal open, initial demo-data state.
- Mobile evidence: `qa/implementation-mobile-390x844.png`, viewport 390 × 844 CSS px. Document and body scroll widths were both 390 px.

## Findings

No actionable P0, P1, or P2 mismatch remains.

- Fonts and typography: the implementation uses the same compact system-sans direction, dark optical weight for headings, and muted small metadata. Chinese and Latin text remain readable at the reference density. The source font is not embedded, so the platform system stack is an acceptable match.
- Spacing and layout rhythm: the desktop keeps the reference's full-width top bar, date/recommendation/metrics row, alert strip, three-column 24-hour pulse, and two-column recommendation/hot-topic layout. Section borders, vertical rhythm, and row density match closely. The expanded navigation is an intentional product requirement.
- Colors and visual tokens: the light gray page, white/near-white surfaces, black dividers, and sparse red/orange/yellow state colors match the source. Blue and green appear only for added semantic states.
- Image and icon fidelity: the real upstream `docs/logo.svg` is used. Phosphor icons provide a consistent thin-line system for added controls; no placeholder, CSS-drawn, or handcrafted SVG image assets are present.
- Copy and content: the visible hierarchy follows the source while adding the requested distinction between system judgment, user decision, site coverage, channels, and review. Demo content is explicitly labeled.
- Responsiveness: at 390 × 844, the header becomes two rows, main navigation remains scrollable, the dashboard becomes one column, and no horizontal document overflow occurs.

## Intentional differences

- Navigation adds 词库、站点、渠道、复盘 and 流程 because they are required parts of the long-running system.
- The newest upstream dark logo replaces the earlier orange mark.
- Recommendation cards use opportunity and personal-decision labels instead of duplicating the source's provider labels.
- The page includes only enough mock rows to demonstrate behavior; production row counts will come from the radar database.

## Interaction verification

- Searched the keyword library for `pdf` and confirmed the filtered row.
- Opened a keyword detail, switched to its channel tab, and changed the personal decision to 在做.
- Opened and saved Personal Preferences and System Settings.
- Opened Hot Topics, Sites, Channels, Review, and Flow pages.
- Switched the Flow page from product flow to business flow and confirmed the external site-building boundary.
- Checked browser console warnings and errors after the full route/interaction pass: none.

## Comparison history

Initial implementation comparison found no P0/P1/P2 issue. The reference composition and responsive behavior were already preserved, so no visual correction loop was required. Product-scope additions are documented above as intentional differences.

The 2026-10-21 multi-source iteration added the evidence gate, keyword verification tab, and provider inventory. `npm run build`, Sites packaging tests, `git diff --check`, and the local HTTP response passed. A fresh automated screenshot and click pass could not be captured because local browser control was disabled in Work settings during this iteration; the earlier desktop/mobile interaction evidence remains the visual baseline. The new layout includes explicit 1180 px and 640 px responsive rules, but the latest browser recapture remains the next QA action when browser control is available.

The direct-provider completion iteration added dynamic `configured`/`missing` status for Ahrefs, Semrush, and Similarweb, plus three advanced schedule rows. The status file contains no key values. Production build and Sites tests passed again; browser automation remains unavailable under the same Work setting.

## Follow-up polish

- P3: replace demo opportunity data with a real adapter over `radar.db` and scheduled job state.

latest result: build and static checks passed; fresh browser recapture unavailable


## 2026-10-21 premium visual update

- Goal: keep the information architecture and interaction behavior unchanged while moving the visual system toward a warmer, higher-contrast paper texture with copper accents.
- Updated design tokens: background `#f5f1ea`, surface `#fffcf7`, ink `#1d1b18`, muted `#6b645b`, line `#e3dbd0`, accent copper `#c0642c`, state colors tuned to match the new base.
- Added layered background with a subtle 42px grid, warm gradient, and soft shadows for cards and panels.
- Applied hover/focus micro-transitions to buttons, site list items, flow nodes, and focus rings.
- Replaced the active nav underline from ink to copper and aligned chart, meter, and sparkline accents to the new palette.

### Evidence

- Desktop viewport 1229 × 900: `qa/visual-desktop.png`
- Mobile viewport 390 × 844: `qa/visual-mobile.png`
- Overflow measurements: desktop scrollWidth 1229, clientWidth 1229; mobile scrollWidth 390, clientWidth 390. No horizontal overflow at either breakpoint.
- Build: `npm run build` passed.
- Sites packaging tests: `npm run test:sites`, 4/4 passed.
- Interaction behavior unchanged; only CSS tokens and surface treatment were adjusted.

latest result: premium visual update passed build, packaging tests, and desktop/mobile overflow checks
