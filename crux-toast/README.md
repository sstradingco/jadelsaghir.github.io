# CruX · Toast Operations Intelligence

Client-side dashboard that reads Toast POS exports, surfaces operational insights, and answers natural-language questions about restaurant performance.

## What it does

- Parses Toast-style CSVs (Item Selection Details / sales exports)
- Computes net sales, orders, AOV, best/worst sellers, daypart mix, and menu-group share
- Auto-generates opportunity / risk / watch insights
- Answers questions such as “What are my worst sellers?” or “Which daypart is strongest?”
- Includes a 30-day demo dataset so you can explore without an upload

## Use it

Open `/crux-toast/` on the deployed site, or locally:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000/crux-toast/`.

## Toast export tips

From Toast reports, export a CSV that includes at least:

- Menu item / item name
- Net price / net sales / amount
- Ideally also: quantity, order date/time, order #, menu group

Column names are matched flexibly (Toast label variants are supported).

## Privacy

All parsing and analytics run in the browser. Uploaded files are not sent to a server.
