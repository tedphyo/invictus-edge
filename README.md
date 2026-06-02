# Invictus Edge — Signals · Cycles · Conviction

Invictus Edge is a static research dashboard for market-timing context around SPY/QQQ and other liquid symbols. It combines a dark fintech UI, TradingView chart embed, symbol watchlist, and a summarized cycle score layer.

**Status:** experimental research / educational use only. Not financial advice. Not a signal service.

## Live Site

- GitHub Pages: `https://tedphyo.github.io/invictus-edge/`
- Repository: `https://github.com/tedphyo/invictus-edge`

## What It Does

- **Cycle dashboard:** displays date/symbol timing scores in a compact public-safe format.
- **Symbol focus:** SPY and QQQ first, with support for searched/custom symbols.
- **TradingView chart:** embedded chart panel with quick timeframe controls.
- **Market cards:** quote/watchlist panels when a compatible backend is available.
- **Mobile-first UI:** dark navy/gold brand system, responsive layout, no build step.
- **Static deploy:** vanilla HTML/CSS/JS, GitHub Pages friendly.

## Public Scope

The public app intentionally shows only summarized scores and labels. Internal research rules, weighting, private trade logic, broker execution code, and backtest implementation details are not exposed in this repository.

## Project Structure

```text
invictus-edge/
├── index.html          # Static site shell
├── css/styles.css      # Brand + responsive styles
├── js/app.js           # UI, chart, watchlist, market bridge handling
├── js/numerology.js    # Public-safe score engine
├── js/symbolData.js    # Symbol metadata fallbacks
├── logo.svg            # Invictus Edge shield mark
├── tests.js            # Node sanity checks
├── CHANGELOG.md        # Visible release history
├── CONTRIBUTING.md     # Maintainer / contribution notes
├── SECURITY.md         # Security and disclosure policy
└── README.md
```

## Run Locally

No install required.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Windows PowerShell:

```powershell
python -m http.server 8000
```

You can also open `index.html` directly, but local HTTP is cleaner for browser security behavior.

## Verification

```bash
node tests.js
node --check js/numerology.js
node --check js/app.js
node --check js/symbolData.js
```

Manual QA:

- Page loads without console errors.
- Logo renders.
- Date changes update dashboard scores.
- SPY/QQQ tabs switch chart focus.
- Timeframe buttons update the TradingView iframe.
- Offline backend state is clearly labeled instead of showing fake data.
- Mobile width stays readable with no horizontal overflow.

## Data / Backend Notes

This static repo can run without a backend. If `/api/*` endpoints are unavailable, the UI falls back to offline placeholders and keeps the chart/widget usable.

Expected optional endpoints:

- `GET /api/quote/:symbol`
- `GET /api/chart/:symbol?range=1d&interval=5m`
- `GET /api/watchlist?symbols=SPY,QQQ,...`
- `GET /api/search/:query`
- `GET /api/symbol-meta?symbol=SPY`

## Roadmap

- Cleaner backend adapter contract for quotes/chart bars.
- Public demo screenshots and short mobile walkthrough.
- More complete symbol metadata coverage.
- Accessibility pass for keyboard and screen-reader behavior.
- Expanded test coverage for UI state transitions.

## Maintainer

Maintained by Ted Way Aung Phyo as part of an open-source trading automation and research stack.

Core priorities:

- protect private research logic;
- avoid fake market data;
- keep broker/order code separate and security-sensitive;
- use automation to reduce review, testing, and deployment load.

## Disclaimer

Invictus Edge is experimental software for research and education. It does not provide investment advice, trade recommendations, or guaranteed outcomes. Markets involve risk.