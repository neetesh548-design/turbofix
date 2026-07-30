# Security Audit Prompt Learnings

Source: `AI APP BUILDER PROMPTS 5 Security Checks Before You Launch Your App`

## What To Remember

- Run security checks in order: secrets, personal data, production readiness, deep logic review, attacker mindset.
- Treat AI output as a triage pass, not a substitute for human security review.
- Ask the tool to report what it found and changed so the review is auditable.

## 1. Secret Leak Prevention

- Move every secret to environment variables.
- Never expose service-role keys, signing secrets, database URLs, or private API keys in client code.
- Keep `.env` out of git and maintain a safe `.env.example`.
- Scan logs and API responses for accidental secret leakage.
- Rotate anything that was ever hardcoded.

## 2. Personal Data Flow Audit

- Trace where emails, phone numbers, passwords, names, and other PII are collected and where they go.
- Remove logs that print personal data or tokens.
- Minimize third-party payloads to only the fields they need.
- Hash passwords before storage and never return them.
- Avoid putting sensitive data in `localStorage` or unsafe cookies.

## 3. Pre-Deploy Production Audit

- Verify critical environment variables fail fast if missing.
- Remove debug code, test-only endpoints, and hardcoded test credentials.
- Keep error responses generic and log details only server-side.
- Add security headers and rate limiting, especially on auth endpoints.
- Restrict CORS to trusted origins.

## 4. Deep Security Audit

- Check authentication and authorization on every protected route.
- Look for IDOR by changing IDs in URLs or request bodies.
- Make password reset tokens random, single-use, and time-limited.
- Never trust client-side pricing or discounts.
- Validate file uploads, SQL inputs, and webhook signatures.

## 5. Attacker Perspective Review

- Try changing IDs to reach another user’s data.
- Check for login bypasses, token validation mistakes, and weak admin access.
- Test privilege escalation by modifying roles or guessing routes.
- Probe rate limits for signup, upload, messaging, and API abuse.
- Look for exposed internals like `.env`, `.git`, Swagger docs, or noisy health checks.

## Practical Use

- Re-run the checks after major feature changes.
- Prefer a short fix with a clear explanation over a large security framework.
- Keep the result list explicit: what failed, what changed, and what still needs human review.
