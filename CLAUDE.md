# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file Node.js CLI script (`index.js`) that fetches BTC and ETH prices (USD, 24h change) from the
CoinGecko public API (`/api/v3/simple/price`) and prints them as a table via `console.table`. No build step,
no dependencies, no test suite — the entire project is currently `index.js` plus `package.json`.

Note: the README/package.json describe a broader goal of tracking BTC, ETH, USDT, BNB, and SOL, but the
current implementation only fetches bitcoin and ethereum (see `COIN_LABELS` in `index.js`).

## Commands

- Run the viewer: `node index.js`
- No install step is required (zero dependencies); no lint, test, or build scripts are defined in `package.json`.

## Architecture notes

- ESM module (`"type": "module"` in package.json) — use `import`/`export` syntax, not `require`.
- Uses the global `fetch` (Node 18+), no HTTP client dependency.
- All coin metadata lives in one place: `COIN_LABELS` maps CoinGecko coin IDs to display labels, and also
  drives which `ids` are requested in `COINGECKO_URL`. To add/remove a tracked coin, both the URL's `ids`
  param and `COIN_LABELS` need to stay in sync.
- Error handling is centralized in `main()`: network/HTTP failures are caught, logged in Spanish, and set
  `process.exitCode = 1` rather than throwing — preserve this pattern (and the Spanish user-facing strings)
  for consistency if extending output/error paths.
