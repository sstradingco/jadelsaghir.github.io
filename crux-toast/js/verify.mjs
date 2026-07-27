import { generateDemoLineItems, demoCsvText } from "./demo-data.js";
import { csvToObjects, mapToastRows } from "./csv.js";
import { buildAnalytics, filterByRange } from "./analytics.js";
import { generateInsights } from "./insights.js";
import { answerQuestion } from "./qa.js";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const demoItems = generateDemoLineItems({ days: 30, seed: 42 });
console.assert(demoItems.length > 500, "expected substantial demo volume");

const csv = demoCsvText();
writeFileSync(join(__dirname, "..", "data", "demo-toast-export.csv"), csv);

const mapped = mapToastRows(csvToObjects(csv));
console.assert(mapped.lineItems.length === demoItems.length, "csv round-trip count");

const analytics = buildAnalytics(filterByRange(mapped.lineItems, "7"));
console.assert(analytics.bestSellers.length > 0, "best sellers");
console.assert(analytics.worstSellers.length > 0, "worst sellers");
console.assert(analytics.stats.netSales > 0, "net sales");

const insights = generateInsights(analytics);
console.assert(insights.length >= 3, "insights generated");

const best = answerQuestion("What are my best sellers?", analytics);
console.assert(/best sellers/i.test(best.title), best.title);
console.assert(best.bullets?.length > 0, "best seller bullets");

const worst = answerQuestion("What are my worst sellers at dinner?", analytics);
console.assert(/worst sellers/i.test(worst.title), worst.title);

const aov = answerQuestion("What is my average order value?", analytics);
console.assert(/average order value/i.test(aov.title), aov.title);

console.log("OK", {
  lines: mapped.lineItems.length,
  net7d: Math.round(analytics.stats.netSales),
  top: analytics.bestSellers[0]?.item,
  slow: analytics.worstSellers[0]?.item,
  insights: insights.length,
});
