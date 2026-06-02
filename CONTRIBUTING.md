# Contributing

Invictus Edge is maintained as a public-safe research dashboard. Contributions are welcome when they improve clarity, reliability, accessibility, or deployment quality.

## Good Contributions

- README/docs improvements.
- Accessibility fixes.
- Responsive layout fixes.
- JavaScript syntax/test coverage.
- Backend adapter cleanup for quote/chart endpoints.
- Bug reports with screenshots, browser version, and reproduction steps.

## Out of Scope

- Financial advice language.
- Guaranteed trading claims.
- Exposing private research rules, weighting, or strategy internals.
- Broker credentials, order-routing code, or live-trading execution logic.
- Fake/demo market data presented as live.

## Local Check

```bash
python3 -m http.server 8000
node tests.js
node --check js/numerology.js
node --check js/app.js
node --check js/symbolData.js
```

## Pull Request Checklist

- [ ] Site loads locally.
- [ ] No console errors on initial page load.
- [ ] JS syntax checks pass.
- [ ] Mobile layout still works.
- [ ] No private methodology or broker-sensitive logic is exposed.
- [ ] Disclaimer language remains visible.

## Maintainer Note

This repository is intentionally static and public. Private research logic and broker/order automation live outside this public surface.
