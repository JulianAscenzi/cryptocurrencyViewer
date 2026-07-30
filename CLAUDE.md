# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Node.js crypto dashboard tracking BTC, ETH, USDT, BNB, and SOL via the CoinGecko public API. It has three
entry points sharing one core module:

- `server.js` — an Express app serving a REST API (`/api/coins`, `/api/prices`, `/api/history/:coinId`) plus
  the static `public/` client.
- `public/` — a vanilla-JS (no framework) client: live price table, a Chart.js historical chart, per-coin
  price alerts, and a portfolio value tracker, all polling the API above.
- `cli.js` — prints current prices as a table via `console.table`.

All three depend on `src/coingecko.js`, the single source of truth for coin metadata (`COINS`, `COIN_LABELS`,
`COIN_SYMBOLS`) and all CoinGecko API calls.

Tests live in `tests/` (`node:test`, no extra test framework) and run in CI via
`.github/workflows/ci.yml`.

## Commands

- Run the web server: `npm start` (http://localhost:3000)
- Run the CLI: `npm run cli`
- Run tests: `npm test` (equivalent to `node --test`, which auto-discovers `**/*.test.js` — don't pass a
  directory path as a positional arg, e.g. `node --test tests/` fails on this Node version)
- No lint or build step is defined.

## Architecture notes

- ESM module (`"type": "module"` in package.json) — use `import`/`export` syntax, not `require`.
- Uses the global `fetch` (Node 18+), no HTTP client dependency besides `express`.
- All coin metadata lives in one place: `src/coingecko.js`'s `COINS`/`COIN_LABELS`/`COIN_SYMBOLS`. To
  add/remove a tracked coin, only this module needs to change — `server.js`, `cli.js`, and `public/app.js`
  (via `/api/coins`) all derive from it.
- `server.js` exports `app` (for tests) and only calls `app.listen()` when run directly — guarded by
  `import.meta.url === \`file://${process.argv[1]}\``. Cache TTLs are read from `PRICE_CACHE_TTL_MS` /
  `CHART_CACHE_TTL_MS` env vars (defaulting to 25s/30s) so tests can force fast cache expiry.
- `/api/prices` falls back to the last cached data (flagged `stale: true`) if CoinGecko is unreachable and a
  cache entry exists, rather than failing the request — preserve this resilience pattern if touched.
- Client-side state (alert thresholds, portfolio holdings) is persisted in `localStorage`
  (`cryptoViewer.alerts`, `cryptoViewer.holdings`) — there is no server-side persistence or auth.
- Error handling favors catching failures at the boundary (CLI's `main()`, each Express route handler) and
  reporting in Spanish, matching the user-facing string convention used throughout — preserve this for any
  new output/error paths.
- Deployment config: `render.yaml` (Render Blueprint, `npm ci` build / `npm start` run, no env vars needed —
  Render injects `PORT`).
