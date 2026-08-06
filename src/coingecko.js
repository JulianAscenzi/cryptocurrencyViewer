export const COINS = ["bitcoin", "ethereum", "tether", "binancecoin", "solana"];

export const COIN_LABELS = {
  bitcoin: "Bitcoin (BTC)",
  ethereum: "Ethereum (ETH)",
  tether: "Tether (USDT)",
  binancecoin: "BNB (BNB)",
  solana: "Solana (SOL)",
};

export const COIN_SYMBOLS = {
  bitcoin: "BTC",
  ethereum: "ETH",
  tether: "USDT",
  binancecoin: "BNB",
  solana: "SOL",
};

export const SIMPLE_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price";
export const MARKET_CHART_URL_BASE = "https://api.coingecko.com/api/v3/coins";
export const ALLOWED_DAYS = [1, 7, 30, 90, 365];

// Nota: public/app.js mantiene copias equivalentes de formatPrice/formatChange para el
// cliente. Es una duplicación intencional: public/ se sirve como estático sin bundler, así
// que no hay una forma barata de compartir este módulo con el navegador.
export function formatPrice(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/D";
  }
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatChange(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/D";
  }
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

const DEFAULT_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("CoinGecko no respondió a tiempo");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getCryptoPrices(ids = COINS, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const url = `${SIMPLE_PRICE_URL}?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  const response = await fetchWithTimeout(url, timeoutMs);

  if (!response.ok) {
    const error = new Error(`CoinGecko respondió con estado ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export async function getMarketChart(id, days, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!COINS.includes(id)) {
    throw new Error(`Moneda no soportada: ${id}`);
  }

  if (!ALLOWED_DAYS.includes(days)) {
    throw new Error(`Rango de días no soportado: ${days}`);
  }

  const url = `${MARKET_CHART_URL_BASE}/${id}/market_chart?vs_currency=usd&days=${days}`;
  const response = await fetchWithTimeout(url, timeoutMs);

  if (!response.ok) {
    const error = new Error(`CoinGecko respondió con estado ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

// Si CoinGecko devuelve una respuesta parcial (falta alguna moneda o le falta el campo
// `usd`), se saltean esas monedas en vez de tirar — así se muestra lo que sí llegó en vez de
// romper toda la tabla/CLI por un solo dato faltante.
export function buildPriceRows(data) {
  return Object.entries(COIN_LABELS)
    .filter(([id]) => data[id] && typeof data[id].usd === "number")
    .map(([id, label]) => ({
      Moneda: label,
      "Precio (USD)": formatPrice(data[id].usd),
      "Cambio 24h": formatChange(data[id].usd_24h_change),
    }));
}
