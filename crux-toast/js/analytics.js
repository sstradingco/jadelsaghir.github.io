const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function daypartOf(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "Unknown";
  const h = date.getHours();
  if (h < 11) return "Breakfast";
  if (h < 14) return "Lunch";
  if (h < 17) return "Afternoon";
  if (h < 21) return "Dinner";
  return "Late";
}

export function money(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function moneyExact(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

export function pct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function filterByRange(lineItems, rangeKey) {
  if (!rangeKey || rangeKey === "all") return lineItems;
  const days = Number(rangeKey);
  if (!Number.isFinite(days)) return lineItems;

  const dated = lineItems.filter((row) => row.when instanceof Date && !Number.isNaN(row.when.getTime()));
  if (!dated.length) return lineItems;

  const maxTime = dated.reduce((max, row) => Math.max(max, row.when.getTime()), 0);
  const cutoff = maxTime - (days - 1) * 24 * 60 * 60 * 1000;
  const cutoffDay = startOfDay(new Date(cutoff)).getTime();
  return lineItems.filter((row) => row.when && row.when.getTime() >= cutoffDay);
}

function aggregateItems(lineItems) {
  const map = new Map();
  for (const row of lineItems) {
    const key = row.item;
    const current = map.get(key) || {
      item: row.item,
      group: row.group,
      qty: 0,
      net: 0,
      orders: new Set(),
    };
    current.qty += row.qty;
    current.net += row.net;
    if (row.orderId) current.orders.add(row.orderId);
    map.set(key, current);
  }
  return [...map.values()]
    .map((row) => ({
      item: row.item,
      group: row.group,
      qty: row.qty,
      net: row.net,
      orderCount: row.orders.size,
      avgPrice: row.qty ? row.net / row.qty : 0,
    }))
    .sort((a, b) => b.net - a.net);
}

function aggregateGroups(lineItems) {
  const map = new Map();
  for (const row of lineItems) {
    const current = map.get(row.group) || { group: row.group, qty: 0, net: 0 };
    current.qty += row.qty;
    current.net += row.net;
    map.set(row.group, current);
  }
  return [...map.values()].sort((a, b) => b.net - a.net);
}

function revenueByDay(lineItems) {
  const map = new Map();
  for (const row of lineItems) {
    if (!(row.when instanceof Date)) continue;
    const key = startOfDay(row.when).toISOString().slice(0, 10);
    map.set(key, (map.get(key) || 0) + row.net);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, net]) => ({ date, net }));
}

function byDaypart(lineItems) {
  const map = new Map();
  for (const row of lineItems) {
    const key = daypartOf(row.when);
    const current = map.get(key) || { daypart: key, net: 0, qty: 0, orders: new Set() };
    current.net += row.net;
    current.qty += row.qty;
    if (row.orderId) current.orders.add(row.orderId);
    map.set(key, current);
  }
  const order = ["Breakfast", "Lunch", "Afternoon", "Dinner", "Late", "Unknown"];
  return order
    .filter((name) => map.has(name))
    .map((name) => {
      const row = map.get(name);
      return {
        daypart: row.daypart,
        net: row.net,
        qty: row.qty,
        orderCount: row.orders.size,
      };
    });
}

function byWeekday(lineItems) {
  const buckets = DAY_NAMES.map((name) => ({ day: name, net: 0, orders: new Set() }));
  for (const row of lineItems) {
    if (!(row.when instanceof Date)) continue;
    const idx = row.when.getDay();
    buckets[idx].net += row.net;
    if (row.orderId) buckets[idx].orders.add(row.orderId);
  }
  return buckets.map((b) => ({ day: b.day, net: b.net, orderCount: b.orders.size }));
}

function orderStats(lineItems) {
  const orders = new Map();
  for (const row of lineItems) {
    const key = row.orderId || `anon-${row.id}`;
    const current = orders.get(key) || { net: 0, qty: 0 };
    current.net += row.net;
    current.qty += row.qty;
    orders.set(key, current);
  }
  const values = [...orders.values()];
  const orderCount = values.length;
  const netSales = values.reduce((sum, o) => sum + o.net, 0);
  const itemsSold = values.reduce((sum, o) => sum + o.qty, 0);
  return {
    orderCount,
    netSales,
    itemsSold,
    aov: orderCount ? netSales / orderCount : 0,
  };
}

function dateRangeLabel(lineItems) {
  const dates = lineItems
    .map((row) => row.when)
    .filter((d) => d instanceof Date && !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b);
  if (!dates.length) return "Date range unavailable";
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  const start = fmt.format(dates[0]);
  const end = fmt.format(dates[dates.length - 1]);
  return start === end ? start : `${start} – ${end}`;
}

export function buildAnalytics(lineItems) {
  const items = aggregateItems(lineItems);
  const groups = aggregateGroups(lineItems);
  const stats = orderStats(lineItems);
  const days = revenueByDay(lineItems);
  const dayparts = byDaypart(lineItems);
  const weekdays = byWeekday(lineItems);
  const totalNet = stats.netSales || 1;

  return {
    lineItems,
    items,
    groups: groups.map((g) => ({ ...g, share: g.net / totalNet })),
    stats,
    days,
    dayparts,
    weekdays,
    bestSellers: items.slice(0, 8),
    worstSellers: [...items].sort((a, b) => a.net - b.net).slice(0, 8),
    rangeLabel: dateRangeLabel(lineItems),
    dayNames: DAY_NAMES,
  };
}

export function itemsForDaypart(lineItems, daypartName) {
  return aggregateItems(lineItems.filter((row) => daypartOf(row.when) === daypartName));
}
