import { getCryptoPrices, buildPriceRows } from "./src/coingecko.js";

async function main() {
  try {
    const data = await getCryptoPrices();
    const rows = buildPriceRows(data);

    console.log("Precios de criptomonedas (fuente: CoinGecko)\n");
    console.table(rows);
  } catch (error) {
    console.error("No se pudieron obtener los precios de CoinGecko:", error.message);
    process.exitCode = 1;
  }
}

main();
