import {
  daypartOf,
  itemsForDaypart,
  money,
  moneyExact,
  pct,
} from "./analytics.js";

function normalize(q) {
  return q.toLowerCase().replace(/[?!.]/g, " ").replace(/\s+/g, " ").trim();
}

function listItems(rows, limit = 5, metric = "net") {
  return rows.slice(0, limit).map((row, i) => {
    if (metric === "qty") {
      return `${i + 1}. ${row.item} — ${row.qty} units (${moneyExact(row.net)})`;
    }
    return `${i + 1}. ${row.item} — ${moneyExact(row.net)} (${row.qty} units)`;
  });
}

function detectDaypart(q) {
  if (/\bbreakfast\b/.test(q)) return "Breakfast";
  if (/\blunch\b/.test(q)) return "Lunch";
  if (/\bafternoon\b|\bbetween lunch and dinner\b/.test(q)) return "Afternoon";
  if (/\bdinner\b|\bevening\b/.test(q)) return "Dinner";
  if (/\blate\b|\bnight\b/.test(q)) return "Late";
  return null;
}

function detectGroup(q, groups) {
  return groups.find((g) => q.includes(g.group.toLowerCase()))?.group || null;
}

export function answerQuestion(question, analytics) {
  const q = normalize(question);
  if (!q) {
    return { title: "Ask a question", body: "Try asking about best sellers, worst sellers, AOV, or dayparts." };
  }

  const { items, groups, dayparts, weekdays, stats, bestSellers, worstSellers, lineItems } = analytics;
  const daypart = detectDaypart(q);
  const groupName = detectGroup(q, groups);

  // Best / top sellers
  if (/(best|top|highest|most popular|strongest).*(seller|selling|item|menu)|what sells (the )?best|best sellers?/.test(q)) {
    let pool = items;
    let scope = "overall";
    if (daypart) {
      pool = itemsForDaypart(lineItems, daypart);
      scope = daypart.toLowerCase();
    } else if (groupName) {
      pool = items.filter((row) => row.group === groupName);
      scope = groupName;
    }
    const ranked = [...pool].sort((a, b) => b.net - a.net);
    if (!ranked.length) {
      return { title: "No matching items", body: `I could not find sellers for ${scope}.` };
    }
    return {
      title: `Best sellers (${scope})`,
      body: `Here are the top items by net sales:`,
      bullets: listItems(ranked, 5),
    };
  }

  // Worst / slow sellers
  if (/(worst|slow|lowest|least|poor|underperform).*(seller|selling|item|menu)|what sells (the )?worst|worst sellers?|slow movers?/.test(q)) {
    let pool = items;
    let scope = "overall";
    if (daypart) {
      pool = itemsForDaypart(lineItems, daypart);
      scope = daypart.toLowerCase();
    } else if (groupName) {
      pool = items.filter((row) => row.group === groupName);
      scope = groupName;
    }
    const ranked = [...pool].sort((a, b) => a.net - b.net);
    if (!ranked.length) {
      return { title: "No matching items", body: `I could not find slow movers for ${scope}.` };
    }
    return {
      title: `Worst sellers (${scope})`,
      body: `Lowest net sales among items with activity:`,
      bullets: listItems(ranked, 5),
    };
  }

  // AOV
  if (/average order|aov|avg (order|ticket)|ticket size/.test(q)) {
    const attach = stats.orderCount ? stats.itemsSold / stats.orderCount : 0;
    return {
      title: "Average order value",
      body: `AOV is ${moneyExact(stats.aov)} across ${stats.orderCount.toLocaleString()} orders. Guests average ${attach.toFixed(2)} items per ticket.`,
    };
  }

  // Revenue / sales total
  if (/(total|net)?\s*(sales|revenue)|how much (did we|have we)?\s*(make|made|sell)/.test(q)) {
    return {
      title: "Net sales",
      body: `Net sales are ${moneyExact(stats.netSales)} from ${stats.orderCount.toLocaleString()} orders and ${stats.itemsSold.toLocaleString()} items sold.`,
    };
  }

  // Daypart strength
  if (/daypart|when.*(busy|strong|make money)|strongest (daypart|period|window)|busiest (time|period|daypart)/.test(q)) {
    const ranked = [...dayparts].sort((a, b) => b.net - a.net);
    if (!ranked.length) {
      return { title: "Dayparts unavailable", body: "Timestamps were missing from the upload, so dayparts could not be computed." };
    }
    return {
      title: "Daypart performance",
      body: `${ranked[0].daypart} is strongest at ${money(ranked[0].net)}. Full mix:`,
      bullets: ranked.map((d) => `${d.daypart}: ${moneyExact(d.net)} · ${d.orderCount} orders`),
    };
  }

  // Busiest weekday
  if (/busiest day|which day|slowest day|weekday/.test(q)) {
    const active = weekdays.filter((d) => d.net > 0);
    if (!active.length) {
      return { title: "Weekday data unavailable", body: "I need dated Toast rows to rank days of the week." };
    }
    const busiest = [...active].sort((a, b) => b.net - a.net)[0];
    const slowest = [...active].sort((a, b) => a.net - b.net)[0];
    return {
      title: "Weekday pattern",
      body: `${busiest.day} is busiest (${money(busiest.net)}, ${busiest.orderCount} orders). ${slowest.day} is softest (${money(slowest.net)}).`,
      bullets: [...active]
        .sort((a, b) => b.net - a.net)
        .map((d) => `${d.day}: ${moneyExact(d.net)}`),
    };
  }

  // Menu group questions
  if (/menu group|category|which (group|category).*(under|weak|poor|best|strong)/.test(q) || groupName) {
    if (/under|weak|poor|worst|slow/.test(q)) {
      const weak = [...groups].sort((a, b) => a.net - b.net)[0];
      return {
        title: "Weakest menu group",
        body: `${weak.group} is lowest at ${moneyExact(weak.net)} (${pct(weak.share)} of sales).`,
        bullets: groups
          .slice()
          .sort((a, b) => a.net - b.net)
          .slice(0, 5)
          .map((g) => `${g.group}: ${moneyExact(g.net)} (${pct(g.share)})`),
      };
    }
    if (groupName) {
      const groupItems = items.filter((row) => row.group === groupName).sort((a, b) => b.net - a.net);
      const group = groups.find((g) => g.group === groupName);
      return {
        title: `${groupName} performance`,
        body: `${groupName} generated ${moneyExact(group?.net || 0)} (${pct(group?.share || 0)} of net sales). Top items:`,
        bullets: listItems(groupItems, 5),
      };
    }
    return {
      title: "Menu group mix",
      body: "Sales by menu group:",
      bullets: groups.map((g) => `${g.group}: ${moneyExact(g.net)} (${pct(g.share)})`),
    };
  }

  // Units / quantity leaders
  if (/most (units|quantity)|by quantity|units sold/.test(q)) {
    const ranked = [...items].sort((a, b) => b.qty - a.qty);
    return {
      title: "Highest quantity items",
      body: "Ranked by units sold:",
      bullets: listItems(ranked, 5, "qty"),
    };
  }

  // Specific item lookup
  const itemHit = items.find((row) => q.includes(row.item.toLowerCase()));
  if (itemHit) {
    const share = itemHit.net / (stats.netSales || 1);
    const daypartMix = {};
    for (const row of lineItems) {
      if (row.item !== itemHit.item) continue;
      const key = daypartOf(row.when);
      daypartMix[key] = (daypartMix[key] || 0) + row.net;
    }
    const mixBullets = Object.entries(daypartMix)
      .sort((a, b) => b[1] - a[1])
      .map(([name, net]) => `${name}: ${moneyExact(net)}`);
    return {
      title: itemHit.item,
      body: `${itemHit.item} sold ${itemHit.qty} units for ${moneyExact(itemHit.net)} (${pct(share)} of net sales). Menu group: ${itemHit.group}.`,
      bullets: mixBullets.length ? mixBullets : undefined,
    };
  }

  // Summary
  if (/summary|overview|how (am i|are we) doing|quick read/.test(q)) {
    const top = bestSellers[0];
    const slow = worstSellers[0];
    const strongest = [...dayparts].sort((a, b) => b.net - a.net)[0];
    return {
      title: "Operational summary",
      body: `Net sales ${moneyExact(stats.netSales)} across ${stats.orderCount.toLocaleString()} orders (AOV ${moneyExact(stats.aov)}).`,
      bullets: [
        top ? `Best seller: ${top.item} (${moneyExact(top.net)})` : null,
        slow ? `Worst seller: ${slow.item} (${moneyExact(slow.net)})` : null,
        strongest ? `Strongest daypart: ${strongest.daypart} (${money(strongest.net)})` : null,
        groups[0] ? `Top menu group: ${groups[0].group} (${pct(groups[0].share)})` : null,
      ].filter(Boolean),
    };
  }

  // Help / fallback
  return {
    title: "I can answer operational questions",
    body: "Try one of these angles with your Toast data:",
    bullets: [
      "What are my best sellers?",
      "What are my worst sellers at dinner?",
      "What is my average order value?",
      "Which daypart is strongest?",
      "Which menu group underperforms?",
      "How much revenue did we make?",
    ],
  };
}
