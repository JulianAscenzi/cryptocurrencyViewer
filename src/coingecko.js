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

export function formatPrice(value) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatChange(value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export async function getCryptoPrices(ids = COINS) {
  const url = `${SIMPLE_PRICE_URL}?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`CoinGecko respondió con estado ${response.status}`);
  }

  return response.json();
}

export async function getMarketChart(id, days) {
  if (!COINS.includes(id)) {
    throw new Error(`Moneda no soportada: ${id}`);
  }

  if (!ALLOWED_DAYS.includes(days)) {
    throw new Error(`Rango de días no soportado: ${days}`);
  }

  const url = `${MARKET_CHART_URL_BASE}/${id}/market_chart?vs_currency=usd&days=${days}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`CoinGecko respondió con estado ${response.status}`);
  }

  return response.json();
}

export function buildPriceRows(data) {
  return Object.entries(COIN_LABELS).map(([id, label]) => ({
    Moneda: label,
    "Precio (USD)": formatPrice(data[id].usd),
    "Cambio 24h": formatChange(data[id].usd_24h_change),
  }));
}
