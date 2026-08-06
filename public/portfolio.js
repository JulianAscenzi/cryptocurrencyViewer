// Cálculo puro del resumen de portafolio, sin referencias al DOM, para que se pueda testear
// con node:test sin necesidad de simular un navegador (ver tests/portfolio.test.js).
export function computePortfolioSummary(holdings, coinsData) {
  const entries = Object.entries(holdings).filter(
    ([coinId, qty]) => qty > 0 && coinsData[coinId]
  );

  if (!entries.length) {
    return null;
  }

  let totalValue = 0;
  let weightedChangeSum = 0;
  for (const [coinId, qty] of entries) {
    const coinData = coinsData[coinId];
    const value = qty * coinData.usd;
    totalValue += value;
    weightedChangeSum += value * coinData.usd_24h_change;
  }

  const weightedChange = totalValue > 0 ? weightedChangeSum / totalValue : 0;

  return { totalValue, weightedChange };
}
