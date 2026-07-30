import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COINS, COIN_LABELS, COIN_SYMBOLS, ALLOWED_DAYS, getCryptoPrices, getMarketChart } from "./src/coingecko.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PRICE_TTL_MS = Number(process.env.PRICE_CACHE_TTL_MS) || 25_000;
const CHART_TTL_MS = Number(process.env.CHART_CACHE_TTL_MS) || 30_000;

const priceCache = { data: null, timestamp: 0 };
const chartCache = new Map();

function isFresh(entry, ttl) {
  return Boolean(entry) && Date.now() - entry.timestamp < ttl;
}

export const app = express();

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/coins", (_req, res) => {
  res.json({ coins: COINS, labels: COIN_LABELS, symbols: COIN_SYMBOLS });
});

app.get("/api/prices", async (_req, res) => {
  if (isFresh(priceCache, PRICE_TTL_MS)) {
    res.json({ updatedAt: new Date(priceCache.timestamp).toISOString(), coins: priceCache.data });
    return;
  }

  try {
    const data = await getCryptoPrices();
    priceCache.data = data;
    priceCache.timestamp = Date.now();
    res.json({ updatedAt: new Date(priceCache.timestamp).toISOString(), coins: data });
  } catch (error) {
    if (priceCache.data) {
      res.json({ updatedAt: new Date(priceCache.timestamp).toISOString(), coins: priceCache.data, stale: true });
      return;
    }
    res.status(502).json({ error: error.message });
  }
});

app.get("/api/history/:coinId", async (req, res) => {
  const { coinId } = req.params;
  const days = Number(req.query.days) || 7;

  if (!COINS.includes(coinId)) {
    res.status(400).json({ error: "Moneda no soportada" });
    return;
  }

  if (!ALLOWED_DAYS.includes(days)) {
    res.status(400).json({ error: "Rango de días no soportado" });
    return;
  }

  const cacheKey = `${coinId}:${days}`;
  const cached = chartCache.get(cacheKey);

  if (isFresh(cached, CHART_TTL_MS)) {
    res.json({ coinId, days, prices: cached.data.prices });
    return;
  }

  try {
    const data = await getMarketChart(coinId, days);
    chartCache.set(cacheKey, { data, timestamp: Date.now() });
    res.json({ coinId, days, prices: data.prices });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
}
