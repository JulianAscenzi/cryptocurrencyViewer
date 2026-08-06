import { test } from "node:test";
import assert from "node:assert/strict";
import { computePortfolioSummary } from "../public/portfolio.js";

test("computePortfolioSummary returns null when there are no positive holdings", () => {
  assert.equal(computePortfolioSummary({}, {}), null);
  assert.equal(
    computePortfolioSummary({ bitcoin: 0 }, { bitcoin: { usd: 100, usd_24h_change: 1 } }),
    null
  );
});

test("computePortfolioSummary ignores holdings for coins missing from price data", () => {
  const result = computePortfolioSummary(
    { bitcoin: 1, dogecoin: 5 },
    { bitcoin: { usd: 100, usd_24h_change: 10 } }
  );

  assert.equal(result.totalValue, 100);
  assert.equal(result.weightedChange, 10);
});

test("computePortfolioSummary computes the value-weighted 24h change", () => {
  const result = computePortfolioSummary(
    { bitcoin: 2, ethereum: 10 },
    {
      bitcoin: { usd: 100, usd_24h_change: 10 },
      ethereum: { usd: 10, usd_24h_change: -5 },
    }
  );

  assert.equal(result.totalValue, 300);
  assert.equal(result.weightedChange, (200 * 10 + 100 * -5) / 300);
});

test("computePortfolioSummary guards against division by zero", () => {
  const result = computePortfolioSummary(
    { bitcoin: 1 },
    { bitcoin: { usd: 0, usd_24h_change: 5 } }
  );

  assert.equal(result.totalValue, 0);
  assert.equal(result.weightedChange, 0);
});
