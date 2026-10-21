# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

## Product decisions for this prototype

- The product monitors and evaluates keywords; it does not build or deploy the user's sites.
- Keep system judgments separate from the user's decision and from page/site coverage state.
- Personal preferences are an independent setting with global exploration and direction-focus modes.
- Collection schedules are configurable by source; hot and new signals can run every two minutes, while stable old-keyword scans can run daily.
- Each keyword detail must carry backlink candidates and social-content directions.
- Preserve the selected visual target: a quiet light-gray editorial dashboard, thin separators, dense information, and red/orange/yellow as sparse status colors.
- Demo business data must remain visibly labeled until real radar outputs are connected.
- Heat is a discovery trigger, not an opportunity verdict. A recommendation must show separate demand, competition, commercial, execution, and personal-fit evidence.
- Preserve provider provenance and connection state. DataForSEO/AIsa, GoAnyAPI, TrustMRR/payment-link signals, Ahrefs v3, Semrush v4, and Similarweb Batch now have adapters. Show `待凭证` until the matching environment key exists and `已校验` only after a real response.
- Do not average conflicting provider values into a single opaque number. Store source values separately and route conflicts or missing mandatory evidence to review.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
