#!/usr/bin/env node
/**
 * Analyze a Toast CSV from the terminal (no webpage required).
 *
 * Usage:
 *   node crux-toast/js/analyze-cli.mjs path/to/toast-export.csv
 *   node crux-toast/js/analyze-cli.mjs path/to/toast-export.csv "What are my worst sellers?"
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { csvToObjects, mapToastRows } from "./csv.js";
import { buildAnalytics } from "./analytics.js";
import { generateInsights } from "./insights.js";
import { answerQuestion } from "./qa.js";
import { moneyExact } from "./analytics.js";

const csvPath = process.argv[2];
const question = process.argv.slice(3).join(" ").trim();

if (!csvPath) {
  console.error("Usage: node crux-toast/js/analyze-cli.mjs <toast.csv> [question]");
  process.exit(1);
}

const text = readFileSync(resolve(csvPath), "utf8");
const { lineItems } = mapToastRows(csvToObjects(text));
const analytics = buildAnalytics(lineItems);
const insights = generateInsights(analytics);

console.log("=== Snapshot ===");
console.log(`Rows: ${lineItems.length.toLocaleString()}`);
console.log(`Range: ${analytics.rangeLabel}`);
console.log(`Net sales: ${moneyExact(analytics.stats.netSales)}`);
console.log(`Orders: ${analytics.stats.orderCount.toLocaleString()}`);
console.log(`AOV: ${moneyExact(analytics.stats.aov)}`);
console.log("");

console.log("=== Best sellers ===");
analytics.bestSellers.slice(0, 5).forEach((row, i) => {
  console.log(`${i + 1}. ${row.item} — ${moneyExact(row.net)} (${row.qty} units)`);
});
console.log("");

console.log("=== Worst sellers ===");
analytics.worstSellers.slice(0, 5).forEach((row, i) => {
  console.log(`${i + 1}. ${row.item} — ${moneyExact(row.net)} (${row.qty} units)`);
});
console.log("");

console.log("=== Insights ===");
insights.forEach((insight) => {
  console.log(`[${insight.type}] ${insight.title}`);
  console.log(`  ${insight.body}`);
});

if (question) {
  const answer = answerQuestion(question, analytics);
  console.log("");
  console.log("=== Answer ===");
  console.log(answer.title);
  console.log(answer.body);
  if (answer.bullets?.length) {
    answer.bullets.forEach((b) => console.log(`- ${b}`));
  }
}
