const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true";

const COIN_LABELS = {
  bitcoin: "Bitcoin (BTC)",
  ethereum: "Ethereum (ETH)",
};

function formatPrice(value) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatChange(value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

async function getCryptoPrices() {
  const response = await fetch(COINGECKO_URL);

  if (!response.ok) {
    throw new Error(`CoinGecko respondió con estado ${response.status}`);
  }

  return response.json();
}

async function main() {
  try {
    const data = await getCryptoPrices();

    const rows = Object.entries(COIN_LABELS).map(([id, label]) => ({
      Moneda: label,
      "Precio (USD)": formatPrice(data[id].usd),
      "Cambio 24h": formatChange(data[id].usd_24h_change),
    }));

    console.log("Precios de criptomonedas (fuente: CoinGecko)\n");
    console.table(rows);
  } catch (error) {
    console.error("No se pudieron obtener los precios de CoinGecko:", error.message);
    process.exitCode = 1;
  }
}

main();
