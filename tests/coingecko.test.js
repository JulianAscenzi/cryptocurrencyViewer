import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COINS,
  formatPrice,
  formatChange,
  getCryptoPrices,
  getMarketChart,
  buildPriceRows,
} from "../src/coingecko.js";

function stubFetch(t, handler) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
}

test("formatPrice formats as USD currency", () => {
  assert.equal(formatPrice(1234.5), "$1,234.50");
});

test("formatChange adds a plus sign for non-negative values", () => {
  assert.equal(formatChange(3.2), "+3.20%");
  assert.equal(formatChange(-1.5), "-1.50%");
});

test("getMarketChart rejects an unsupported coin id", async () => {
  await assert.rejects(() => getMarketChart("dogecoin", 7), /Moneda no soportada/);
});

test("getMarketChart rejects an unsupported days range", async () => {
  await assert.rejects(() => getMarketChart("bitcoin", 3), /Rango de días no soportado/);
});

test("getCryptoPrices returns parsed JSON on a successful response", async (t) => {
  stubFetch(t, async () => ({
    ok: true,
    json: async () => ({ bitcoin: { usd: 100, usd_24h_change: 1.2 } }),
  }));

  const data = await getCryptoPrices(["bitcoin"]);
  assert.deepEqual(data, { bitcoin: { usd: 100, usd_24h_change: 1.2 } });
});

test("getCryptoPrices throws with the response status on failure", async (t) => {
  stubFetch(t, async () => ({ ok: false, status: 503 }));

  await assert.rejects(() => getCryptoPrices(["bitcoin"]), /503/);
});

test("buildPriceRows returns one row per tracked coin with the expected columns", () => {
  const data = Object.fromEntries(COINS.map((id) => [id, { usd: 10, usd_24h_change: 0 }]));
  const rows = buildPriceRows(data);

  assert.equal(rows.length, COINS.length);
  for (const row of rows) {
    assert.ok("Moneda" in row);
    assert.ok("Precio (USD)" in row);
    assert.ok("Cambio 24h" in row);
  }
});
