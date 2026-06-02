# Security Policy

## Scope

This public repository contains the static Invictus Edge dashboard only.

Sensitive systems are intentionally out of scope for this repository:

- broker credentials;
- order routing;
- live/paper trade execution;
- private strategy rules;
- internal backtest tooling;
- private data feeds.

## Reporting Issues

If you find a security issue in the public site, open a GitHub issue with:

- affected file/path;
- reproduction steps;
- browser/environment;
- screenshots or console output if relevant.

Do **not** include secrets, API keys, broker tokens, or private account identifiers in public issues.

## Design Principles

- Public UI should not expose private research logic.
- Market-data failures should show offline/unavailable states, not fabricated values.
- Static site code should avoid unnecessary dependencies.
- Any broker/order automation must remain separate from the public dashboard.
