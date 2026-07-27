/** Synthetic Toast-like item selection rows for a Dearborn restaurant demo. */

const MENU = [
  { item: "Chicken Shawarma Plate", group: "Plates", price: 14.5, weight: 12 },
  { item: "Beef Shawarma Plate", group: "Plates", price: 15.5, weight: 8 },
  { item: "Mixed Grill", group: "Plates", price: 18.9, weight: 6 },
  { item: "Falafel Wrap", group: "Wraps", price: 9.5, weight: 9 },
  { item: "Chicken Wrap", group: "Wraps", price: 10.5, weight: 10 },
  { item: "Lamb Wrap", group: "Wraps", price: 11.5, weight: 5 },
  { item: "Hummus", group: "Starters", price: 6.5, weight: 7 },
  { item: "Baba Ganoush", group: "Starters", price: 6.5, weight: 4 },
  { item: "Stuffed Grape Leaves", group: "Starters", price: 7.0, weight: 2 },
  { item: "Fattoush Salad", group: "Salads", price: 8.5, weight: 6 },
  { item: "Greek Salad", group: "Salads", price: 9.0, weight: 4 },
  { item: "Lentil Soup", group: "Starters", price: 5.5, weight: 3 },
  { item: "Fresh Lemonade", group: "Drinks", price: 3.5, weight: 8 },
  { item: "Mint Tea", group: "Drinks", price: 2.75, weight: 5 },
  { item: "Turkish Coffee", group: "Drinks", price: 3.25, weight: 3 },
  { item: "Baklava", group: "Desserts", price: 4.5, weight: 4 },
  { item: "Knafeh", group: "Desserts", price: 6.0, weight: 2 },
  { item: "Kids Nuggets", group: "Kids", price: 7.5, weight: 2 },
  { item: "Side Rice", group: "Sides", price: 3.0, weight: 5 },
  { item: "Side Fries", group: "Sides", price: 3.5, weight: 7 },
];

const DINING = [
  { name: "Dine In", weight: 10 },
  { name: "Takeout", weight: 8 },
  { name: "Delivery", weight: 5 },
];

const SERVERS = ["Amina", "Omar", "Layla", "Chris", "Noor"];

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(rng, items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function daypartWeight(hour) {
  if (hour >= 11 && hour < 14) return 1.7; // lunch
  if (hour >= 17 && hour < 21) return 2.1; // dinner
  if (hour >= 14 && hour < 17) return 0.9; // afternoon
  if (hour >= 21 && hour < 23) return 0.7;
  return 0.25;
}

function weekdayWeight(day) {
  // 0 Sun .. 6 Sat
  const map = [0.85, 0.7, 0.75, 0.8, 0.95, 1.25, 1.35];
  return map[day];
}

export function generateDemoLineItems({ days = 30, seed = 42 } = {}) {
  const rng = mulberry32(seed);
  const lineItems = [];
  const end = new Date();
  end.setHours(22, 0, 0, 0);

  let orderCounter = 1000;

  for (let d = days - 1; d >= 0; d -= 1) {
    const day = new Date(end);
    day.setDate(end.getDate() - d);
    const dow = day.getDay();
    const baseOrders = Math.round(28 * weekdayWeight(dow) + rng() * 10);

    for (let o = 0; o < baseOrders; o += 1) {
      // Prefer lunch/dinner hours
      let hour = Math.floor(rng() * 14) + 10; // 10–23
      if (rng() > daypartWeight(hour) / 2.2) {
        hour = rng() > 0.45 ? 12 : 19;
      }
      const minute = Math.floor(rng() * 60);
      const when = new Date(day);
      when.setHours(hour, minute, 0, 0);

      orderCounter += 1;
      const orderId = `T-${orderCounter}`;
      const dining = pickWeighted(rng, DINING).name;
      const server = SERVERS[Math.floor(rng() * SERVERS.length)];
      const itemCount = 1 + Math.floor(rng() * 3) + (rng() > 0.7 ? 1 : 0);

      for (let i = 0; i < itemCount; i += 1) {
        const menuItem = pickWeighted(rng, MENU);
        // Make grape leaves / knafeh intentionally slow
        if (menuItem.item === "Stuffed Grape Leaves" && rng() > 0.35) continue;
        if (menuItem.item === "Knafeh" && rng() > 0.4) continue;

        const qty = rng() > 0.85 ? 2 : 1;
        const noise = 1 + (rng() - 0.5) * 0.04;
        const net = Math.round(menuItem.price * qty * noise * 100) / 100;

        lineItems.push({
          id: `${orderId}-${i}`,
          item: menuItem.item,
          group: menuItem.group,
          qty,
          net,
          orderId,
          when,
          dining,
          server,
        });
      }
    }
  }

  return lineItems;
}

export function demoCsvText() {
  const items = generateDemoLineItems();
  const header = [
    "Order Date",
    "Order Time",
    "Order #",
    "Menu Item",
    "Menu Group",
    "Qty",
    "Net Price",
    "Dining Option",
    "Server",
  ];
  const lines = [header.join(",")];
  for (const row of items) {
    const date = row.when.toLocaleDateString("en-US");
    const time = row.when.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    lines.push(
      [
        date,
        time,
        row.orderId,
        `"${row.item}"`,
        row.group,
        row.qty,
        row.net.toFixed(2),
        row.dining,
        row.server,
      ].join(",")
    );
  }
  return lines.join("\n");
}
