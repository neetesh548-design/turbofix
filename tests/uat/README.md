# TurboFix UAT automation

This folder is the structured UAT layer for TurboFix.

It is intentionally separate from the older ad hoc Playwright specs in `tests/`
so we can build a stable release-oriented suite without rewriting every legacy
audit immediately.

## Layout

- `smoke/` fast release gates
- `flows/` business journeys
- `roles/` access and visibility matrix
- `visual/` screenshot regression
- `mobile/` viewport-specific checks
- `accessibility/` a11y coverage
- `fixtures/` shared test fixtures
- `pages/` light page objects
- `utils/` helpers
- `data/` seeded user/data definitions

## Commands

- `npm run uat:smoke`
- `npm run uat:smoke:headed`
- `npm run uat:smoke:mobile`
- `npm run uat:report`

## Current scope

The first implementation wave covers:

- login entry
- dashboard load
- machines load + drawer + workspace transition
- tickets load
- team load
- settings load
- support load
- admin portal login shell

All of these run against stable demo/local sessions where possible, so local UAT
is not blocked on fragile external credentials.
