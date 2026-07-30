const ALERTS_STORAGE_KEY = "cryptoViewer.alerts";
const POLL_INTERVAL_MS = 30_000;
const ALERT_DISMISS_LABEL = "×";

let coinsMeta = null;
let previousPrices = {};
let chartInstance = null;
let currentChartCoin = null;
let currentChartDays = 7;

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

function loadAlerts() {
  try {
    return JSON.parse(localStorage.getItem(ALERTS_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveAlerts(alerts) {
  localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
}

async function loadCoinsMeta() {
  const response = await fetch("/api/coins");
  coinsMeta = await response.json();

  const alerts = loadAlerts();
  const tbody = document.getElementById("price-table-body");
  const chartCoinSelect = document.getElementById("chart-coin-select");

  tbody.innerHTML = "";
  chartCoinSelect.innerHTML = "";

  for (const coinId of coinsMeta.coins) {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = coinsMeta.labels[coinId];

    const priceCell = document.createElement("td");
    priceCell.id = `price-${coinId}`;
    priceCell.textContent = "—";

    const changeCell = document.createElement("td");
    changeCell.id = `change-${coinId}`;
    changeCell.textContent = "—";

    const thresholdCell = document.createElement("td");
    const thresholdInput = document.createElement("input");
    thresholdInput.type = "number";
    thresholdInput.id = `alert-input-${coinId}`;
    thresholdInput.placeholder = "Sin alerta";
    thresholdInput.value = alerts[coinId]?.value ?? "";
    thresholdInput.addEventListener("change", () => onThresholdChange(coinId, thresholdInput.value));
    thresholdCell.appendChild(thresholdInput);

    row.append(nameCell, priceCell, changeCell, thresholdCell);
    tbody.appendChild(row);

    const option = document.createElement("option");
    option.value = coinId;
    option.textContent = coinsMeta.labels[coinId];
    chartCoinSelect.appendChild(option);
  }

  currentChartCoin = coinsMeta.coins[0];
}

function onThresholdChange(coinId, rawValue) {
  const alerts = loadAlerts();
  const value = Number(rawValue);

  if (rawValue === "" || Number.isNaN(value)) {
    delete alerts[coinId];
  } else {
    alerts[coinId] = { value };
    if (window.Notification && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  saveAlerts(alerts);
}

function showAlert(coinId, price, threshold, direction) {
  const banner = document.getElementById("alert-banner");
  banner.classList.remove("hidden");

  const label = coinsMeta.labels[coinId];
  const directionText = direction === "above" ? "subió por encima de" : "bajó por debajo de";
  const message = `${label} ${directionText} ${formatPrice(threshold)} (precio actual: ${formatPrice(price)})`;

  const entry = document.createElement("div");
  entry.className = "alert-entry";

  const text = document.createElement("span");
  text.textContent = message;

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.textContent = ALERT_DISMISS_LABEL;
  dismiss.addEventListener("click", () => {
    entry.remove();
    if (!banner.children.length) {
      banner.classList.add("hidden");
    }
  });

  entry.append(text, dismiss);
  banner.appendChild(entry);

  if (window.Notification && Notification.permission === "granted") {
    new Notification("Crypto Viewer", { body: message });
  }
}

function checkAlertCrossing(coinId, currentPrice) {
  const alerts = loadAlerts();
  const alert = alerts[coinId];
  const previousPrice = previousPrices[coinId];

  if (alert && previousPrice !== undefined) {
    const wasAbove = previousPrice >= alert.value;
    const isAbove = currentPrice >= alert.value;

    if (wasAbove !== isAbove) {
      showAlert(coinId, currentPrice, alert.value, isAbove ? "above" : "below");
    }
  }

  previousPrices[coinId] = currentPrice;
}

async function pollPrices() {
  const response = await fetch("/api/prices");
  const payload = await response.json();

  document.getElementById("last-updated").textContent = `Última actualización: ${new Date(
    payload.updatedAt
  ).toLocaleTimeString()}${payload.stale ? " (datos previos, CoinGecko no respondió)" : ""}`;

  for (const coinId of coinsMeta.coins) {
    const coinData = payload.coins[coinId];
    if (!coinData) continue;

    document.getElementById(`price-${coinId}`).textContent = formatPrice(coinData.usd);
    document.getElementById(`change-${coinId}`).textContent = formatChange(coinData.usd_24h_change);

    checkAlertCrossing(coinId, coinData.usd);
  }
}

async function loadChart(coinId, days) {
  const response = await fetch(`/api/history/${coinId}?days=${days}`);
  const payload = await response.json();

  const points = payload.prices.map(([timestamp, price]) => ({ x: timestamp, y: price }));

  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = document.getElementById("price-chart");
  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: coinsMeta.labels[coinId],
          data: points,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.15)",
          pointRadius: 0,
          fill: true,
          tension: 0.2,
        },
      ],
    },
    options: {
      scales: {
        x: { type: "time" },
        y: { ticks: { callback: (value) => formatPrice(value) } },
      },
    },
  });
}

function init() {
  loadCoinsMeta()
    .then(() => {
      const chartCoinSelect = document.getElementById("chart-coin-select");
      const chartTimeframeSelect = document.getElementById("chart-timeframe-select");

      chartCoinSelect.addEventListener("change", () => {
        currentChartCoin = chartCoinSelect.value;
        loadChart(currentChartCoin, currentChartDays);
      });

      chartTimeframeSelect.addEventListener("change", () => {
        currentChartDays = Number(chartTimeframeSelect.value);
        loadChart(currentChartCoin, currentChartDays);
      });

      return Promise.all([pollPrices(), loadChart(currentChartCoin, currentChartDays)]);
    })
    .then(() => {
      setInterval(pollPrices, POLL_INTERVAL_MS);
    });
}

window.addEventListener("DOMContentLoaded", init);
