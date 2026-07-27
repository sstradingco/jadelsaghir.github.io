import { money, pct } from "./analytics.js";

export function generateInsights(analytics) {
  const insights = [];
  const { items, groups, dayparts, weekdays, stats, bestSellers, worstSellers } = analytics;

  if (!items.length) {
    return [
      {
        type: "watch",
        title: "No item activity",
        body: "Upload a Toast export with line-item sales to generate insights.",
      },
    ];
  }

  if (bestSellers[0]) {
    const top = bestSellers[0];
    const share = top.net / (stats.netSales || 1);
    insights.push({
      type: "opportunity",
      title: `${top.item} leads the menu`,
      body: `${top.item} generated ${money(top.net)} (${pct(share)} of net sales) across ${top.qty} units. Protect availability and consider bundling sides or drinks with this hero item.`,
    });
  }

  if (worstSellers[0] && items.length > 4) {
    const slow = worstSellers[0];
    insights.push({
      type: "risk",
      title: `${slow.item} is a slow mover`,
      body: `Only ${money(slow.net)} in net sales (${slow.qty} units). Review portioning, placement, or whether it should be a limited special instead of a standing menu item.`,
    });
  }

  if (groups.length >= 2) {
    const topGroup = groups[0];
    const bottomGroup = groups[groups.length - 1];
    insights.push({
      type: "watch",
      title: `${topGroup.group} concentrates sales`,
      body: `${topGroup.group} accounts for ${pct(topGroup.share)} of revenue, while ${bottomGroup.group} sits at ${pct(bottomGroup.share)}. Check whether prep labor matches that mix.`,
    });
  }

  if (dayparts.length) {
    const ranked = [...dayparts].sort((a, b) => b.net - a.net);
    const strongest = ranked[0];
    const weakest = ranked[ranked.length - 1];
    insights.push({
      type: "opportunity",
      title: `${strongest.daypart} is the money window`,
      body: `${strongest.daypart} drives ${money(strongest.net)}. ${weakest.daypart} is softest at ${money(weakest.net)} — test a focused promo or labor trim in the weaker daypart.`,
    });
  }

  if (weekdays.some((d) => d.net > 0)) {
    const ranked = [...weekdays].sort((a, b) => b.net - a.net);
    const busiest = ranked[0];
    const slowest = [...weekdays].filter((d) => d.net > 0).sort((a, b) => a.net - b.net)[0];
    insights.push({
      type: "watch",
      title: `${busiest.day} carries the week`,
      body: `${busiest.day} leads with ${money(busiest.net)} across ${busiest.orderCount} orders. ${slowest.day} is lightest at ${money(slowest.net)} — a candidate for staff scheduling or midweek offers.`,
    });
  }

  if (stats.aov > 0) {
    const attach = stats.itemsSold / (stats.orderCount || 1);
    insights.push({
      type: attach < 2.2 ? "opportunity" : "watch",
      title: `AOV is ${money(stats.aov)}`,
      body:
        attach < 2.2
          ? `Guests average ${attach.toFixed(1)} items per ticket. Train a simple upsell (drink + side) to lift AOV without rewriting the menu.`
          : `Guests average ${attach.toFixed(1)} items per ticket, which is healthy. Keep the current attach habits and watch discounting that could erode AOV.`,
    });
  }

  // Concentration risk: top 3 items share
  if (items.length >= 5) {
    const top3 = items.slice(0, 3).reduce((sum, row) => sum + row.net, 0);
    const concentration = top3 / (stats.netSales || 1);
    if (concentration >= 0.45) {
      insights.push({
        type: "risk",
        title: "Sales are highly concentrated",
        body: `The top 3 items make up ${pct(concentration)} of net sales. A stockout or quality miss on those SKUs would hit revenue hard — harden prep par levels and backup recipes.`,
      });
    }
  }

  return insights.slice(0, 6);
}
