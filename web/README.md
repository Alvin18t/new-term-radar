# Signalrank keyword opportunity radar

This is the interactive web framework for turning `new-term-radar` signals into a long-running personal opportunity system. It is built against upstream commit `4fd12da` (2026-10-21).

## What is implemented

- Today: prioritized opportunities, 24-hour pulse, source health, hot-topic clusters.
- Keywords: searchable and filterable library with system labels, personal decisions, site coverage, and source-by-source verification kept as separate states.
- Hot topics: multi-source themes linked back to actionable keywords.
- Sites: portfolio management, keyword/page coverage, user and payment outcomes. Site building remains external.
- Channels: backlink candidates, social-content angles, status and reusable channel rules.
- Review: 14-day outcome review, lead time, traffic/user/payment result hierarchy.
- Flow: interactive product and business process maps.
- Preferences and system settings: global/direction focus, constraints, per-source refresh plans, and model-routing policy.
- Multi-source gate: heat triggers discovery; Google Trends/Ads, SERP/KD, DR/traffic, advertising/payment evidence, and personal fit determine actionability.

The upstream code uses DataForSEO through AIsa, GoAnyAPI, TrustMRR, and public payment-link signals. This workspace now adds direct Ahrefs Keywords Explorer v3, Semrush Keyword Metrics v4, and asynchronous Similarweb Batch API adapters. The current machine has no credentials for those paid providers, so the UI shows `待凭证` instead of presenting demo values as verified.

The current screen uses labeled demo data in `src/data/demoData.js`. The UI state is browser-local and resets on reload.

## Run locally

```bash
npm install
npm run dev
```

Validation:

```bash
npm run build
npm run test:sites
```

## Integration boundary

The existing Python package remains the collection and first-pass analysis engine. A production backend should read `radar.db` and run the existing CLI/MCP operations, then persist the additional user, site, page, channel, and outcome records described in [`PRODUCT_AND_BUSINESS_FLOW.md`](./PRODUCT_AND_BUSINESS_FLOW.md).

