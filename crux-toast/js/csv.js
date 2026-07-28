/** Minimal CSV parser with quoted-field support. */

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

export function csvToObjects(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((values) => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] ?? "";
    });
    return obj;
  });
}

const ALIASES = {
  item: [
    "menu item",
    "item",
    "item name",
    "item name (master)",
    "product",
    "product name",
    "menu item name",
  ],
  group: [
    "menu group",
    "sales category",
    "category",
    "item group",
    "menu",
    "group",
  ],
  qty: ["qty", "quantity", "item qty", "# of items", "count", "units"],
  net: [
    "net price",
    "net amount",
    "net sales",
    "amount",
    "sales",
    "total",
    "price",
    "item total",
    "gross sales",
    "gross price",
  ],
  orderId: ["order #", "order id", "order number", "check #", "check number", "order"],
  date: ["order date", "date", "business date", "sent date", "opened date"],
  time: ["order time", "time", "sent time", "opened time"],
  datetime: ["order datetime", "datetime", "timestamp", "opened"],
  dining: ["dining option", "order type", "service", "dining options"],
  server: ["server", "employee", "cashier"],
};

function normalizeHeader(header) {
  return String(header || "")
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickField(headers, aliases) {
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  for (const alias of aliases) {
    const hit = normalized.find((h) => h.norm === alias);
    if (hit) return hit.raw;
  }
  for (const alias of aliases) {
    const hit = normalized.find((h) => h.norm.includes(alias));
    if (hit) return hit.raw;
  }
  return null;
}

function parseNumber(value) {
  if (value == null || value === "") return 0;
  const cleaned = String(value).replace(/[$,\s]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseDateTime(dateStr, timeStr, datetimeStr) {
  if (datetimeStr) {
    const direct = new Date(datetimeStr);
    if (!Number.isNaN(direct.getTime())) return direct;
  }

  const datePart = String(dateStr || "").trim();
  const timePart = String(timeStr || "12:00").trim() || "12:00";
  if (!datePart) return null;

  const combined = new Date(`${datePart} ${timePart}`);
  if (!Number.isNaN(combined.getTime())) return combined;

  // Toast often uses MM/DD/YYYY
  const mdy = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) {
    const month = Number(mdy[1]) - 1;
    const day = Number(mdy[2]);
    let year = Number(mdy[3]);
    if (year < 100) year += 2000;
    const t = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    let hours = 12;
    let minutes = 0;
    if (t) {
      hours = Number(t[1]);
      minutes = Number(t[2]);
      const ampm = t[4]?.toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
    }
    const d = new Date(year, month, day, hours, minutes);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

export function mapToastRows(objects) {
  if (!objects.length) {
    throw new Error("No rows found in CSV.");
  }

  const headers = Object.keys(objects[0]);
  const fields = {
    item: pickField(headers, ALIASES.item),
    group: pickField(headers, ALIASES.group),
    qty: pickField(headers, ALIASES.qty),
    net: pickField(headers, ALIASES.net),
    orderId: pickField(headers, ALIASES.orderId),
    date: pickField(headers, ALIASES.date),
    time: pickField(headers, ALIASES.time),
    datetime: pickField(headers, ALIASES.datetime),
    dining: pickField(headers, ALIASES.dining),
    server: pickField(headers, ALIASES.server),
  };

  if (!fields.item || !fields.net) {
    throw new Error(
      "Could not find required Toast columns. Need an item name column and a sales/price column."
    );
  }

  const lineItems = [];
  objects.forEach((row, index) => {
    const item = String(row[fields.item] || "").trim();
    if (!item) return;

    const qty = fields.qty ? parseNumber(row[fields.qty]) : 1;
    let net = parseNumber(row[fields.net]);
    // If qty exists and net looks like unit price (small relative to qty), keep as line total if header says price
    // Prefer treating mapped "net" as line total; if qty > 1 and value is tiny, still use as-is.
    if (!fields.qty && net === 0) return;

    const when = parseDateTime(
      fields.date ? row[fields.date] : "",
      fields.time ? row[fields.time] : "",
      fields.datetime ? row[fields.datetime] : ""
    );

    lineItems.push({
      id: `${index}-${item}`,
      item,
      group: String((fields.group && row[fields.group]) || "Uncategorized").trim() || "Uncategorized",
      qty: qty || 1,
      net,
      orderId: fields.orderId ? String(row[fields.orderId] || "").trim() : "",
      when,
      dining: fields.dining ? String(row[fields.dining] || "").trim() : "",
      server: fields.server ? String(row[fields.server] || "").trim() : "",
    });
  });

  if (!lineItems.length) {
    throw new Error("CSV parsed, but no usable line items were found.");
  }

  return { lineItems, fields };
}
