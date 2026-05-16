# Invictus Edge — Signals. Cycles. Conviction.

Numerology-based market timing reference tool. Experimental research platform — not financial advice.

## Quick Start

No build tools, no dependencies. Open the file directly or serve locally:

```bash
# Option 1: Open directly (works for most browsers)
open index.html

# Option 2: Local HTTP server (recommended — required for some browsers for security/CORS)
# From project root:
python3 -m http.server 8000
# Then visit http://localhost:8000
```

From Windows (PowerShell or CMD):

```powershell
# From project root:
python -m http.server 8000
```

## Data Sources & Limitations

- **Numerology Engine**: Pure JavaScript (js/numerology.js), "Ted House Method" for compound and reduced numbers, master numbers (11, 22, 33) preserved. Birth data for personal cycles is pre-configured for "Ted" (month: 5, day: 1, year: 1999). Instrument foundation dates pre-configured for SPY (01/22/1993) and QQQ (03/10/1999).
- **Market Data**: Currently uses static placeholder data (e.g., `---` for prices). The application does NOT fetch live market data. Any mentions of "live data" refer to future potential updates, not current functionality.
- **Symbol Search**: Implemented as a dropdown selection for SPY and QQQ. No free-text symbol search yet.
- **Auto-updating Dashboard**: Numerology calculations update dynamically based on the selected date and instrument. Market data placeholders do not auto-update as there is no live feed.

## Tests

```bash
cd /mnt/c/Users/NCG/invictus-edge-standalone
node tests.js
```

Run `node --check` on individual JS:

```bash
node --check js/numerology.js
node --check js/app.js
```

The embedded JS in `index.html` (none present in this version, all JS is external) would be checked with:

```bash
node -e "
var fs = require('fs');
var html = fs.readFileSync('index.html', 'utf8');
var matches = html.match(/<script>([\s\S]*?)<\/script>/g);
var js = matches.map(function(m) { return m.replace(/<\/?script>/g, ''); }).join('\\n\\n');
fs.writeFileSync('/tmp/invictus-check.js', js);
" && node --check /tmp/invictus-check.js
```

## Project Structure

```
invictus-edge-standalone/
  index.html     — Main site (HTML + embedded CSS + links to external JS)
  css/
    styles.css   — Main styling
  js/
    app.js       — UI logic, dashboard rendering, event handlers
    numerology.js— Core numerology engine (calculations, constants)
  logo.svg       — Fintech shield logo (IE + candle motif)
  tests.js       — Numerological engine unit tests (17 tests)
  README.md      — This file
```

## Features

- **Universal Day Calculator** — UY, UM, UD with compound/reduced display
- **Personal Day Calculator** — PY, PM, PD based on birth data
- **Cycle Signals** — numerology timing system (7=SHORT, 11=COLLAPSE, 28=WEALTH)
- **Market Intel** — Reference placeholder cards (no live data)
- Fully responsive — mobile, tablet, desktop, print
- Dark fintech theme — navy/black with blue/gold accents
- 2% data saver mode via `prefers-reduced-motion`
- No external dependencies — vanilla HTML/CSS/JS only

## Numerological Method

All calculations show both compound and reduced values:

- **UY** — Universal Year: sum of year digits
- **UM** — Universal Month: current month + UY (reduced)
- **UD** — Universal Day: split day digits (ignore zeros), sum, add UM (reduced)
- **PY** — Personal Year: birth month + birth day + year digits
- **PM** — Personal Month: PY (compound) + current month
- **PD** — Personal Day: PM (compound) + current day

Master numbers (11, 22, 33) are preserved.

## Important Notes

- **No live market data** is fetched or displayed. Prices are manual reference placeholders (`---`).
- **Nothing on this site constitutes financial advice.**
- This is an experimental research tool for educational purposes only.
- Future update may add a live data bridge — for now, data is static.

## QA Checklist (for manual verification)

- [ ] `node tests.js` — all tests pass (confirm 17 passed)
- [ ] `node --check js/numerology.js` and `node --check js/app.js` — passes with no syntax errors
- [ ] Open `index.html` directly in browser — page loads without errors or console warnings
- [ ] **Live Search / Symbol Switch**:
    - [ ] Change "Instrument" dropdown (SPY & QQQ, SPY Only, QQQ Only) — dashboard cards update correctly to show/hide instrument-specific cards.
    - [ ] Symbol-specific numerology (Instrument Cycles) updates correctly when symbol is switched.
- [ ] **Data Auto-update**:
    - [ ] Change "Select Date" input — Universal and Personal numerology (UY, UM, UD, PY, PM, PD) sections auto-recalculate and update displayed values.
    - [ ] Signal panel values and interpretations update based on new date.
- [ ] **Metadata / Founded Date Fallback**:
    - [ ] Instrument cards (SPY, QQQ) correctly display "foundation" dates within their titles (e.g., "SPY &middot; 1/1").
    - [ ] Verify the foundation date is derived from `INSTRUMENTS` constant in `js/numerology.js` (currently hardcoded to actual IPO dates).
- [ ] Disclaimer present: "No financial advice", "experimental", "educational only".
- [ ] Market intel displays `---` placeholders — no live/fake prices.
- [ ] Market notice present: "Market data is manual reference only..."
- [ ] Responsive at 768px and 480px — no overflow, readable text (manual browser resize check).
- [ ] Print layout renders cleanly (manual print preview check).
- [ ] No broken images (logo.svg loads).
- [ ] SVG logo renders with IE shield + candles.
- [ ] Brand line "Signals. Cycles. Conviction." visible in header.
- [ ] Nav links scroll to correct sections.
- [ ] No console errors on page load or when interacting with date/symbol selectors. 