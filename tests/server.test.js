import { test } from "node:test";
import assert from "node:assert/strict";

const COINGECKO_URL_PATTERNS = [/\/simple\/price/, /\/market_chart/];

function stubCoinGeckoFetch(t, handler) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, ...rest) => {
    const isCoinGeckoCall = COINGECKO_URL_PATTERNS.some((pattern) => pattern.test(String(url)));
    if (!isCoinGeckoCall) {
      return originalFetch(url, ...rest);
    }
    return handler(url, ...rest);
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
}

async function startServer(env = {}) {
  const previousEnv = {};
  for (const [key, value] of Object.entries(env)) {
    previousEnv[key] = process.env[key];
    process.env[key] = value;
  }

  const { app } = await import(`../server.js?t=${Date.now()}-${Math.random()}`);

  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  return { server, baseUrl: `http://localhost:${port}` };
}

test("GET /api/coins returns the tracked coin metadata", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/coins`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload.coins, ["bitcoin", "ethereum", "tether", "binancecoin", "solana"]);
  assert.equal(payload.labels.bitcoin, "Bitcoin (BTC)");
});

test("GET /api/prices returns prices from a mocked CoinGecko response", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  stubCoinGeckoFetch(t, async () => ({
    ok: true,
    json: async () => ({ bitcoin: { usd: 50000, usd_24h_change: 2.5 } }),
  }));

  const response = await fetch(`${baseUrl}/api/prices`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.coins.bitcoin.usd, 50000);
  assert.equal(payload.stale, undefined);
});

test("GET /api/prices falls back to stale cached data when CoinGecko fails", async (t) => {
  const { server, baseUrl } = await startServer({ PRICE_CACHE_TTL_MS: "1" });
  t.after(() => server.close());

  let callCount = 0;
  stubCoinGeckoFetch(t, async () => {
    callCount += 1;
    if (callCount === 1) {
      return { ok: true, json: async () => ({ bitcoin: { usd: 100, usd_24h_change: 1 } }) };
    }
    throw new Error("network down");
  });

  const first = await fetch(`${baseUrl}/api/prices`);
  await first.json();

  await new Promise((resolve) => setTimeout(resolve, 10));

  const second = await fetch(`${baseUrl}/api/prices`);
  const secondPayload = await second.json();

  assert.equal(second.status, 200);
  assert.equal(secondPayload.stale, true);
  assert.equal(secondPayload.coins.bitcoin.usd, 100);
});

test("GET /api/history/:coinId rejects an unsupported coin id", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/history/dogecoin?days=7`);
  assert.equal(response.status, 400);
});

test("GET /api/history/:coinId rejects an unsupported days value", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/history/bitcoin?days=3`);
  assert.equal(response.status, 400);
});

test("GET /api/history/:coinId returns prices for a valid request", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  stubCoinGeckoFetch(t, async () => ({
    ok: true,
    json: async () => ({ prices: [[1700000000000, 42]] }),
  }));

  const response = await fetch(`${baseUrl}/api/history/bitcoin?days=7`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload.prices, [[1700000000000, 42]]);
});
