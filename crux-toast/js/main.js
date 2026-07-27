import { csvToObjects, mapToastRows } from "./csv.js";
import { generateDemoLineItems } from "./demo-data.js";
import { buildAnalytics, filterByRange, money, moneyExact } from "./analytics.js";
import { generateInsights } from "./insights.js";
import { drawDaypartChart, drawRevenueChart } from "./charts.js";
import { answerQuestion } from "./qa.js";

const state = {
  sourceLabel: "",
  allItems: [],
  range: "all",
  analytics: null,
};

const els = {
  empty: document.getElementById("empty-state"),
  dashboard: document.getElementById("dashboard"),
  csvInput: document.getElementById("csv-input"),
  csvInputHero: document.getElementById("csv-input-hero"),
  demoBtn: document.getElementById("demo-btn"),
  demoBtnHero: document.getElementById("demo-btn-hero"),
  clearBtn: document.getElementById("clear-btn"),
  rangeChips: document.getElementById("range-chips"),
  kpiRow: document.getElementById("kpi-row"),
  best: document.getElementById("best-sellers"),
  worst: document.getElementById("worst-sellers"),
  categories: document.getElementById("category-bars"),
  insights: document.getElementById("insight-list"),
  rangeLabel: document.getElementById("range-label"),
  sourceLabel: document.getElementById("data-source-label"),
  revenueChart: document.getElementById("revenue-chart"),
  daypartChart: document.getElementById("daypart-chart"),
  qaForm: document.getElementById("qa-form"),
  qaInput: document.getElementById("qa-input"),
  qaThread: document.getElementById("qa-thread"),
  qaSuggestions: document.getElementById("qa-suggestions"),
  status: document.getElementById("status-toast"),
};

function showStatus(message) {
  els.status.hidden = false;
  els.status.textContent = message;
  clearTimeout(showStatus._timer);
  showStatus._timer = setTimeout(() => {
    els.status.hidden = true;
  }, 2600);
}

function sellerTable(rows) {
  if (!rows.length) return `<p class="hero-hint">No items in this range.</p>`;
  const body = rows
    .map(
      (row, i) => `
      <tr>
        <td class="rank">${i + 1}</td>
        <td>
          <strong>${escapeHtml(row.item)}</strong><br>
          <span style="color:var(--muted);font-size:0.82rem">${escapeHtml(row.group)}</span>
        </td>
        <td class="num">${row.qty.toLocaleString()}</td>
        <td class="num">${moneyExact(row.net)}</td>
      </tr>`
    )
    .join("");
  return `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th class="num">Qty</th>
          <th class="num">Net sales</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderKpis(analytics) {
  const { stats } = analytics;
  const cards = [
    { label: "Net sales", value: money(stats.netSales), note: moneyExact(stats.netSales) },
    { label: "Orders", value: stats.orderCount.toLocaleString(), note: "Unique tickets" },
    { label: "Avg order value", value: moneyExact(stats.aov), note: "Net sales ÷ orders" },
    { label: "Items sold", value: stats.itemsSold.toLocaleString(), note: `${analytics.items.length} unique SKUs` },
  ];
  els.kpiRow.innerHTML = cards
    .map(
      (card) => `
      <article class="kpi">
        <span>${card.label}</span>
        <strong>${card.value}</strong>
        <small>${card.note}</small>
      </article>`
    )
    .join("");
}

function renderCategories(groups) {
  const max = Math.max(...groups.map((g) => g.net), 1);
  els.categories.innerHTML = groups
    .map(
      (g) => `
      <div class="cat-row">
        <span>${escapeHtml(g.group)}</span>
        <div class="bar-track"><div class="bar-fill" data-width="${(g.net / max) * 100}"></div></div>
        <strong>${money(g.net)}</strong>
      </div>`
    )
    .join("");

  requestAnimationFrame(() => {
    els.categories.querySelectorAll(".bar-fill").forEach((el) => {
      el.style.width = `${el.dataset.width}%`;
    });
  });
}

function renderInsights(analytics) {
  const insights = generateInsights(analytics);
  els.insights.innerHTML = insights
    .map(
      (insight) => `
      <li>
        <span class="insight-tag ${insight.type}">${insight.type}</span>
        <div>
          <p class="title">${escapeHtml(insight.title)}</p>
          <p class="body">${escapeHtml(insight.body)}</p>
        </div>
      </li>`
    )
    .join("");
}

function renderDashboard() {
  const filtered = filterByRange(state.allItems, state.range);
  state.analytics = buildAnalytics(filtered);

  els.empty.hidden = true;
  els.dashboard.hidden = false;
  els.clearBtn.hidden = false;

  els.sourceLabel.textContent = state.sourceLabel;
  els.rangeLabel.textContent = state.analytics.rangeLabel;

  renderKpis(state.analytics);
  els.best.innerHTML = sellerTable(state.analytics.bestSellers);
  els.worst.innerHTML = sellerTable(state.analytics.worstSellers);
  renderCategories(state.analytics.groups);
  renderInsights(state.analytics);
  drawRevenueChart(els.revenueChart, state.analytics.days);
  drawDaypartChart(els.daypartChart, state.analytics.dayparts);
}

function loadLineItems(lineItems, sourceLabel) {
  state.allItems = lineItems;
  state.sourceLabel = sourceLabel;
  state.range = "all";
  els.rangeChips.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.range === "all");
  });
  els.qaThread.innerHTML = "";
  renderDashboard();
  const top = state.analytics.bestSellers[0];
  const slow = state.analytics.worstSellers[0];
  appendBubble(
    "assistant",
    "Quick read",
    `Loaded ${state.analytics.stats.orderCount.toLocaleString()} orders and ${money(state.analytics.stats.netSales)} in net sales. ${
      top ? `${top.item} leads; ` : ""
    }${slow ? `${slow.item} is the slowest mover.` : ""} Ask anything about sellers, dayparts, or categories.`
  );
}

async function handleCsvFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const objects = csvToObjects(text);
    const { lineItems } = mapToastRows(objects);
    loadLineItems(lineItems, `Uploaded · ${file.name}`);
    showStatus(`Loaded ${lineItems.length.toLocaleString()} Toast line items`);
  } catch (error) {
    console.error(error);
    showStatus(error.message || "Could not parse that CSV");
  }
}

function loadDemo() {
  const lineItems = generateDemoLineItems({ days: 30, seed: 42 });
  loadLineItems(lineItems, "Demo restaurant · last 30 days");
  showStatus("Demo Toast data ready");
}

function clearData() {
  state.allItems = [];
  state.analytics = null;
  els.dashboard.hidden = true;
  els.empty.hidden = false;
  els.clearBtn.hidden = true;
  els.qaThread.innerHTML = "";
  showStatus("Data cleared");
}

function appendBubble(role, title, body, bullets) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  let html = "";
  if (title) html += `<strong>${escapeHtml(title)}</strong>`;
  if (body) html += `<div>${escapeHtml(body)}</div>`;
  if (bullets?.length) {
    html += `<ul>${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`;
  }
  div.innerHTML = html;
  els.qaThread.appendChild(div);
  els.qaThread.scrollTop = els.qaThread.scrollHeight;
}

function appendAssistant(answer) {
  appendBubble("assistant", answer.title, answer.body, answer.bullets);
}

function ask(question) {
  const q = question.trim();
  if (!q || !state.analytics) return;
  appendBubble("user", "", q);
  const answer = answerQuestion(q, state.analytics);
  appendAssistant(answer);
  els.qaInput.value = "";
}

// Polyfill roundRect for older Chromium builds
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, w, h, r) {
    const radius = typeof r === "number" ? r : 0;
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    this.closePath();
  };
}

els.csvInput.addEventListener("change", (e) => handleCsvFile(e.target.files?.[0]));
els.csvInputHero.addEventListener("change", (e) => handleCsvFile(e.target.files?.[0]));
els.demoBtn.addEventListener("click", loadDemo);
els.demoBtnHero.addEventListener("click", loadDemo);
els.clearBtn.addEventListener("click", clearData);

els.rangeChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip || !state.allItems.length) return;
  state.range = chip.dataset.range;
  els.rangeChips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c === chip));
  renderDashboard();
});

els.qaForm.addEventListener("submit", (e) => {
  e.preventDefault();
  ask(els.qaInput.value);
});

els.qaSuggestions.addEventListener("click", (e) => {
  const btn = e.target.closest(".suggest");
  if (!btn) return;
  ask(btn.dataset.q);
});

window.addEventListener("resize", () => {
  if (!state.analytics) return;
  drawRevenueChart(els.revenueChart, state.analytics.days);
  drawDaypartChart(els.daypartChart, state.analytics.dayparts);
});
