import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  COINS,
  COIN_LABELS,
  COIN_SYMBOLS,
  ALLOWED_DAYS,
  getCryptoPrices,
  getMarketChart,
} from "./src/coingecko.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PRICE_TTL_MS = Number(process.env.PRICE_CACHE_TTL_MS) || 25_000;
const CHART_TTL_MS = Number(process.env.CHART_CACHE_TTL_MS) || 30_000;

const priceCache = { data: null, timestamp: 0 };
const chartCache = new Map();

function isFresh(entry, ttl) {
  return Boolean(entry) && Date.now() - entry.timestamp < ttl;
}

// Mensaje genérico para no filtrar detalles internos (stack, texto de proveedor) al cliente;
// el error real siempre queda registrado con console.error del lado del servidor.
function genericUpstreamMessage(error, fallback) {
  if (error && error.status === 429) {
    return "CoinGecko está limitando las solicitudes, intenta de nuevo en un momento";
  }
  return fallback;
}

export const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "https://cdn.jsdelivr.net"],
        "connect-src": ["'self'"],
      },
    },
  })
);

const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.API_RATE_LIMIT) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes, intenta de nuevo más tarde" },
});
app.use("/api", apiLimiter);

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
    console.error("Error al obtener precios de CoinGecko:", error);
    if (priceCache.data) {
      res.json({
        updatedAt: new Date(priceCache.timestamp).toISOString(),
        coins: priceCache.data,
        stale: true,
      });
      return;
    }
    res.status(502).json({
      error: genericUpstreamMessage(
        error,
        "No se pudo obtener información de precios en este momento"
      ),
    });
  }
});

app.get("/api/history/:coinId", async (req, res) => {
  const { coinId } = req.params;
  const rawDays = req.query.days;
  const days = rawDays === undefined ? 7 : Number(rawDays);

  if (!COINS.includes(coinId)) {
    res.status(400).json({ error: "Moneda no soportada" });
    return;
  }

  if (!Number.isInteger(days) || !ALLOWED_DAYS.includes(days)) {
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
    console.error(`Error al obtener historial de ${coinId}:`, error);
    if (cached) {
      res.json({ coinId, days, prices: cached.data.prices, stale: true });
      return;
    }
    res.status(502).json({
      error: genericUpstreamMessage(
        error,
        "No se pudo obtener el historial de precios en este momento"
      ),
    });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Recurso no encontrado" });
});

// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  console.error("Error no manejado:", error);
  res.status(500).json({ error: "Error interno del servidor" });
});

const PORT = process.env.PORT || 3000;

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
}
