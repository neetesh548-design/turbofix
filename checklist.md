# TurboFix Master Checklist

A senior-grade review checklist covering systems thinking, security, UX/UI, architecture, operations, and compliance. Use this before every release, feature merge, or production deployment.

---

## 1. Systems Thinking

### Feedback loops

- [ ] Every reinforcing loop (R1–R3) has a visible balancing counterpart — verify the balancing loop actually fires, not just exists in code.
- [ ] AI Learning loop (R1): confirm diagnosis accuracy is tracked per closure and the feedback reaches the AI prompt context.
- [ ] Pressure Spiral (R2): verify rushed-fix detection flags repeat failures within 30 days for the same component — not just same machine.
- [ ] Outsourcing Trap (R3): confirm vendor repair docs are captured and absorbed into the AI knowledge base after outsourced closure.
- [ ] Threshold Governance (B1): verify admin can adjust escalation thresholds and the system alerts when total window exceeds one shift.
- [ ] Inventory Homeostasis (B2): confirm auto-reorder fires when stock hits reorder level, and PO raises are tracked end-to-end.
- [ ] Workload Distribution (B3): confirm delegation shows colleague workload before allowing reassignment.

### Escalation integrity

- [ ] Each escalation chain (Breakdown Repair, Consumables & Spares) uses company-specific thresholds, never hardcoded defaults.
- [ ] Timer pause works correctly for outsourced tickets — timer does not silently resume.
- [ ] Auto-escalation fires at the exact threshold, not on the next polling cycle (verify worker interval vs. threshold granularity).
- [ ] Escalation does not skip levels — each level gets its full threshold window before the next level is notified.
- [ ] Dead zone detection: no ticket can exist without an assigned handler — verify the "dead zone tickets = 0" health metric is actively monitored.
- [ ] Shift handover: open tickets are communicated to the incoming shift — verify this works across midnight boundaries and timezone changes.

### Countermeasure validation

- [ ] Fixes That Fail: >2 tickets in 30 days for same component auto-flags for preventive overhaul — test with boundary values (exactly 2, exactly 3, exactly 30 days apart).
- [ ] Shifting the Burden: technician override rate is tracked — verify the metric is visible to Maintenance Head.
- [ ] Limits to Growth: tickets-per-technician ratio is monitored — verify the threshold is configurable per company.
- [ ] Eroding Goals: threshold drift is tracked over time — verify the safety ceiling alert works.
- [ ] Every auto-generated WhatsApp notification includes enough context for the recipient to act without opening the app.

### System boundaries

- [ ] No single point of failure in the escalation chain — if one notification fails, the system retries or alerts.
- [ ] Graceful degradation: if WaCRM is down, direct Meta API fallback works without data loss.
- [ ] If Supabase is unreachable, the system queues critical writes (ticket creation, escalation) rather than silently dropping them.
- [ ] Background workers (7 workers in main.py lifespan) have health checks — a stuck worker does not block others.

---

## 2. Security

### Authentication and authorization

- [ ] Every API endpoint validates JWT — no endpoint is accidentally public.
- [ ] Admin endpoints (`/admin/*`) require admin role validation, not just a valid JWT.
- [ ] Company-scoped queries: every database query includes `company_id` filter — no cross-tenant data leakage.
- [ ] Role hierarchy is enforced server-side: Technician cannot approve closures, only Maintenance Head can.
- [ ] Password reset tokens are single-use, time-limited (<1 hour), and invalidated on password change.
- [ ] Session tokens cannot be reused after logout.

### Input validation

- [ ] All user input is validated and sanitized before database writes — no raw SQL or unescaped strings.
- [ ] WhatsApp webhook payloads are validated against expected schema — malformed payloads are rejected, not partially processed.
- [ ] File uploads (photos, voice notes, documents) are validated for type, size, and content — no executable uploads.
- [ ] Phone numbers are normalized and validated before storage and WhatsApp API calls.
- [ ] AI prompt inputs are sanitized — user-supplied text in ticket descriptions cannot inject prompt instructions.

### Secrets management

- [ ] No secrets in source code, git history, or client-side bundles — verify with `git log --all -p | grep -i "secret\|password\|token\|key"`.
- [ ] Environment variables: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `WACRM_API_KEY`, `WACRM_WEBHOOK_SECRET` are never logged, never returned in API responses.
- [ ] `.env` files are in `.gitignore` — verify they are not committed.
- [ ] Admin page does not expose API keys, tokens, or connection strings in the browser DOM.
- [ ] Error responses do not leak stack traces, database schema, or internal paths in production.

### Webhook security

- [ ] Meta webhook: `X-Hub-Signature-256` HMAC verification is enforced when `WHATSAPP_APP_SECRET` is set.
- [ ] WaCRM webhook: `X-Wacrm-Signature` (t=unix,v1=hmac-sha256) verification is enforced when `WACRM_WEBHOOK_SECRET` is set.
- [ ] Webhook endpoints have rate limiting (currently 60/min for Meta, 120/min for WaCRM) — verify these limits are appropriate for peak load.
- [ ] Webhook replay attacks: verify timestamp validation (t= parameter) rejects requests older than 5 minutes.

### Data protection

- [ ] Contact information is masked until an authorized user explicitly reveals it (ContactReveal component).
- [ ] Database RLS (Row Level Security) policies are active on all user-facing tables — service-role bypasses are only used in backend server code.
- [ ] Media files (photos, voice notes) stored in `MEDIA_STORE_DIR` are not publicly accessible via URL guessing.
- [ ] Backup exports do not include plaintext passwords, tokens, or PII beyond what the authorized user requested.
- [ ] Logs do not contain PII (phone numbers, names) in production — use structured logging with redaction.

### API security

- [ ] CORS is configured to allow only known origins — no wildcard `*` in production.
- [ ] Rate limiting is applied to authentication endpoints (login, signup, password reset) — prevent brute force.
- [ ] HTTP security headers are set: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`.
- [ ] All external API calls (Meta, Supabase, WaCRM, Gemini) use HTTPS — no HTTP fallbacks.

### AI Firewall Security

> **Purpose:** Prevent abuse, misuse, or exploitation of the Gemini API key for any purpose outside TurboFix maintenance operations. The API key costs money and carries risk — treat it like a payment credential.

#### Access control

- [ ] Gemini API key is stored only in Supabase Secrets and backend `.env` — never in client-side code, localStorage, or browser-accessible responses.
- [ ] AI Assistant Edge Function (`ai_assistant`) validates the Supabase JWT before every request — unauthenticated or expired tokens are rejected with 401.
- [ ] User role is checked server-side: only `owner`, `maintenance_head`, and `supervisor` can use the AI Assistant — technicians and unauthenticated users are blocked.
- [ ] The Edge Function does not expose or echo the Gemini API key in any response, error message, or log.
- [ ] Platform Admin is the only person who can change the Gemini API key — verify the `/admin/config/gemini` endpoint requires admin auth.

#### Rate limiting and cost control

- [ ] Per-user rate limit is enforced on the AI Assistant: max **20 queries per user per hour** — prevent a single user from exhausting the API quota.
- [ ] Per-company rate limit is enforced: max **100 queries per company per day** — prevent one factory from consuming all capacity.
- [ ] Global daily cap on Gemini API calls — if the cap is hit, the system returns a graceful "AI temporarily unavailable" message, not an error.
- [ ] Token count per request is limited — the system prompt + user context is capped to prevent extremely long (expensive) requests.
- [ ] WhatsApp AI features (transcription, image analysis, issue summarization) each have independent rate limits separate from the chat assistant.
- [ ] API usage metrics are logged: total calls, tokens consumed, errors, latency — visible to Platform Admin.

#### Prompt injection and misuse prevention

- [ ] System prompt is hardcoded server-side and cannot be overridden or appended to by user input — the user's message is strictly placed in the `user` role, never in `system`.
- [ ] System prompt includes explicit scope restriction: *"You are TurboFix, an industrial maintenance AI. Refuse any request unrelated to factory maintenance, machine diagnostics, or operational support."*
- [ ] User input is sanitized before insertion into the AI prompt — strip control characters, excessive whitespace, and known injection patterns (`ignore previous instructions`, `system:`, `assistant:`).
- [ ] Maximum user message length is enforced (e.g., 2000 characters) — prevent prompt-stuffing attacks.
- [ ] AI responses are validated before returning to the user — if the response contains code execution instructions, credential requests, or URLs to unknown domains, it is blocked.
- [ ] The AI cannot be used as a general-purpose chatbot, code generator, or content writer — verify by testing with off-topic prompts ("write me a poem", "help me with my homework") and confirming refusal.

#### Data leakage prevention

- [ ] The AI context includes only the requesting user's company data — no cross-tenant data is injected into the prompt.
- [ ] AI responses are not cached across users or companies — each request builds context fresh from the authenticated user's scope.
- [ ] Conversation history is not stored server-side beyond the current session — no long-term AI memory that could leak data.
- [ ] AI diagnostic summaries written to tickets do not include raw prompt content, system instructions, or internal schema details.

#### Monitoring and alerting

- [ ] Unusual usage patterns trigger alerts: >50 requests/hour from one user, requests outside business hours, sudden spike in API errors.
- [ ] Failed AI requests (400, 403, 429, 500 from Gemini) are logged with request metadata (user_id, company_id, timestamp) but **not** the full prompt content.
- [ ] Platform Admin dashboard shows AI usage summary: daily/weekly call volume, top users, error rate, estimated cost.
- [ ] If the API key is revoked or expires, all AI features degrade gracefully — no cascading errors, just "AI temporarily unavailable" messages.

#### Key rotation and lifecycle

- [ ] API key can be rotated from Platform Admin console without redeployment — verify the `/admin/config/gemini` endpoint updates both backend config and Supabase Secrets.
- [ ] Old API key is invalidated immediately after rotation — no grace period where both keys work.
- [ ] Key rotation is logged in the audit trail with admin identity and timestamp.
- [ ] If the key is compromised, there is a documented emergency procedure: revoke in Google AI Studio → rotate in Platform Admin → verify all AI features recover.

---

## 3. UX/UI

### Information architecture

- [ ] Every page has a clear purpose visible within 2 seconds of loading — no ambiguous landing states.
- [ ] Navigation shows the user's current location (active tab/breadcrumb).
- [ ] Summary numbers (tile counts, badges) are clickable and link to the filtered detail view.
- [ ] Empty states show a helpful message and next action — never a blank area or "No data."
- [ ] Error states tell the user what happened and what to do next — never just "Error" or a raw HTTP code.

### Role-appropriate views

- [ ] Owner sees: company dashboard, team management, escalation config, machine fleet overview, cost metrics.
- [ ] Maintenance Head sees: ticket queue, approval inbox, AI diagnosis review, shift handover, parts requests.
- [ ] Engineer/Supervisor sees: assigned tickets, delegation options, machine history, escalation status.
- [ ] Technician sees: assigned work, diagnosis details, fix/delegate/outsource actions, evidence upload.
- [ ] Each role sees only the actions they can perform — no disabled buttons for unauthorized actions, hide them instead.

### WhatsApp experience

- [ ] Every outbound template message is under 1024 characters and uses clear, actionable language.
- [ ] Variable substitution (`{{1}}`, `{{2}}`) produces grammatically correct sentences for all possible values.
- [ ] Technicians can respond with simple keywords (FIX, DELEGATE, OUTSOURCE) — no complex syntax required.
- [ ] Voice notes and photos are acknowledged immediately — the user knows their input was received.
- [ ] Error messages sent via WhatsApp are helpful, not technical — "I didn't understand that. Try: FIX T-12345" not "ParseError: invalid command token."

### Forms and input

- [ ] Every form has visible validation — errors appear inline next to the field, not in an alert box.
- [ ] Required fields are marked before submission, not discovered by trial-and-error.
- [ ] Phone number fields accept Indian format (+91), international format, and auto-normalize.
- [ ] Date/time pickers respect the user's timezone and display in 12-hour or 24-hour format per locale.
- [ ] Long-running operations (AI analysis, file upload, broadcast) show progress indication.

### Mobile and responsive

- [ ] All pages work on 375px width (iPhone SE) without horizontal scroll.
- [ ] Touch targets are at least 44x44px — no tiny buttons on mobile.
- [ ] Tables switch to card layout on mobile — no sideways scrolling for critical data.
- [ ] Modal dialogs are scrollable and dismissible on small screens.
- [ ] Admin dashboard is usable on tablet (768px) — factory owners often use tablets on the shop floor.

### Accessibility

- [ ] All images have meaningful `alt` text — decorative images use `alt=""`.
- [ ] Color is never the only indicator — status also uses icons, labels, or patterns.
- [ ] Keyboard navigation works through all interactive elements in logical order.
- [ ] Focus states are visible — not removed for aesthetics.
- [ ] Screen reader can navigate the full ticket lifecycle: create, assign, escalate, close.
- [ ] Contrast ratio meets WCAG AA (4.5:1 for text, 3:1 for large text and UI components).

### Language and localization

- [ ] Hindi/Marathi support where configured — verify translations are complete, not mixed-language.
- [ ] Maintenance terminology is consistent: use "machine" not "asset/device/equipment" interchangeably.
- [ ] Date format is DD/MM/YYYY (Indian convention), not MM/DD/YYYY.
- [ ] Currency is displayed as INR (₹) where applicable.

---

## 4. Architecture and Code Quality

### Backend (FastAPI)

- [ ] All async functions use `await` correctly — no accidental synchronous calls blocking the event loop.
- [ ] Background tasks (`BackgroundTasks`) are used for slow operations — webhook returns 200 immediately.
- [ ] httpx client connections are properly closed — no connection pool exhaustion under load.
- [ ] Dependency injection (`Depends()`) is used consistently — no direct instantiation of repositories in routes.
- [ ] Config values are loaded once at startup from environment — no `os.getenv()` calls in request handlers.

### Frontend (React + Vite)

- [ ] No `useEffect` without proper dependency arrays — verify no infinite re-render loops.
- [ ] API calls handle loading, success, and error states — no unhandled promise rejections.
- [ ] Route-level code splitting works — verify lazy loading reduces initial bundle size.
- [ ] Supabase auth state changes trigger proper re-renders — no stale auth in long-lived tabs.
- [ ] Client-side routing handles direct URL access and browser back/forward correctly.

### Database (Supabase)

- [ ] Migrations are idempotent — running them twice does not error or duplicate data.
- [ ] Indexes exist on frequently queried columns: `company_id`, `status`, `assigned_to`, `machine_id`, `created_at`.
- [ ] Foreign key constraints exist where needed — no orphaned records when a parent is deleted.
- [ ] RLS policies are tested — verify a user from Company A cannot read Company B's data.
- [ ] Edge Functions are deployed and match the code in `supabase/functions/`.

### Integration points

- [ ] WaCRM fallback: when `WACRM_API_URL` is not set, all WhatsApp sends use direct Meta API — verify no WaCRM-only code paths break.
- [ ] Meta API version (`WHATSAPP_API_VERSION`) is pinned and tested — API deprecations don't break silently.
- [ ] AI provider (Gemini/OpenAI) failure does not crash the ticket creation flow — degrade to manual diagnosis.
- [ ] Supabase PostgREST errors return meaningful error codes, not generic 500s.

---

## 5. Operations and Reliability

### Deployment

- [ ] Render deployment includes all required environment variables — document the full list.
- [ ] Database migrations are applied before backend deployment — not after.
- [ ] Frontend build (`npm run build`) succeeds with current `.env` — Vite bakes env vars at build time.
- [ ] Railway (WaCRM) deployment has `PORT`, `NEXTAUTH_URL`, and Supabase credentials set.
- [ ] Zero-downtime deployment: new version starts before old one stops — verify Render's behavior.

### Monitoring and alerting

- [ ] Structured logging (`get_logger`) is used everywhere — no bare `print()` statements.
- [ ] Critical failures (WhatsApp send failure, Supabase write failure, AI timeout) are logged at ERROR level.
- [ ] Background worker failures are logged and do not crash the entire FastAPI process.
- [ ] Health check endpoint exists and returns service status (DB connected, WhatsApp configured, WaCRM connected).
- [ ] Render logs are reviewed after every deployment — check for startup errors.

### Backup and recovery

- [ ] Supabase automatic backups are enabled — verify backup schedule.
- [ ] Media files in `MEDIA_STORE_DIR` are backed up or stored in durable storage (not ephemeral container disk).
- [ ] WaCRM Supabase project has separate backup — verify it's not the same project.
- [ ] Recovery procedure is documented: how to restore from backup, re-deploy, and verify.

### Performance

- [ ] Database queries use pagination — no unbounded `SELECT *` on tables that grow over time (tickets, events, messages).
- [ ] AI calls (Gemini) have timeouts — a slow AI response does not hold the webhook response.
- [ ] WhatsApp media downloads have timeouts — a slow Meta CDN does not block the event loop.
- [ ] Frontend loads under 3 seconds on 4G — verify with Lighthouse or similar.
- [ ] Images are optimized — no raw camera photos served as-is to the browser.

### Scalability considerations

- [ ] Background workers use asyncio tasks, not threads — verify no blocking I/O in async workers.
- [ ] Supabase connection pooling is configured — not opening a new connection per request.
- [ ] Rate limits on webhook endpoints match expected peak load (e.g., factory with 50 machines, 200 workers).
- [ ] WaCRM broadcast does not hit Meta API rate limits — batch with delays if needed.

---

## 6. Testing

### Unit tests

- [ ] Core parsing logic (WhatsApp message parsing, command extraction) has test coverage.
- [ ] AI response parsing (diagnosis extraction, urgency classification) is tested with edge cases.
- [ ] Escalation timer logic is tested: threshold boundaries, timezone edge cases, weekend handling.
- [ ] Auth token validation is tested: expired tokens, malformed tokens, wrong company scope.

### Integration tests

- [ ] Webhook → ticket creation → notification flow works end-to-end.
- [ ] Escalation timer → auto-escalation → WhatsApp notification flow works.
- [ ] Part request → inventory check → reservation → PO generation flow works.
- [ ] WaCRM webhook → ticket_service handler → response flow works.
- [ ] Admin API endpoints return correct data for authorized users and reject unauthorized users.

### Manual verification

- [ ] Send a WhatsApp message to the test number → verify ticket is created in the system.
- [ ] Upload a photo with "close T-XXXXX" caption → verify closure evidence flow.
- [ ] Send a voice note → verify AI transcription and diagnosis.
- [ ] Test the admin dashboard on desktop and mobile browsers.
- [ ] Test the WaCRM tab: connection status, contacts, conversations, send message, broadcast.

---

## 7. Compliance and Business

### Data handling

- [ ] Personal data (names, phone numbers, photos) is stored only as long as needed — define retention policy.
- [ ] User can request their data be deleted — verify deletion cascades to all related records.
- [ ] Cross-border data: if Supabase region differs from user location, document the data residency.
- [ ] WhatsApp Business API usage complies with Meta's Commerce Policy and Business Messaging Policy.

### Audit trail

- [ ] Every ticket state change (created, assigned, escalated, delegated, outsourced, closed) is logged with timestamp and actor.
- [ ] Approval/rejection by Maintenance Head is logged with reason and evidence reference.
- [ ] Escalation threshold changes by admin are logged — who changed what, when.
- [ ] AI diagnosis accuracy overrides by technicians are logged for the AI learning loop.

### Business continuity

- [ ] System works during partial outages: Supabase down, WhatsApp API down, AI provider down, WaCRM down.
- [ ] Error budget: define acceptable failure rates for each integration point.
- [ ] Runbook exists: common issues and how to resolve them (expired token, webhook not receiving, AI timeout).
- [ ] Stakeholder notification: who gets alerted when the system itself is down (not just machine breakdowns).

---

## 8. AI Records (Machine Knowledge Extraction)

The AI Records workspace converts paper and digital records into approved machine knowledge. Every item below is specific to this pipeline: upload → validate → AI extract → normalize → human review → Maintenance Head approval → MachineData.md build → backup/restore. Treat extracted facts as **claims to be verified**, never as truth, until a Maintenance Head approves them.

### Ingestion and file handling

- [ ] Only whitelisted extensions are accepted (`ALLOWED_DOCUMENT_EXTENSIONS`) — reject everything else with a clear message, not a silent failure.
- [ ] Magic-byte validation runs on every upload — a `.pdf` that is actually an executable is rejected (`_content_matches_extension`).
- [ ] Verify the weak-signature cases: `.csv`, `.txt`, `.md`, `.dxf` have **no** magic check — confirm this cannot be abused to upload disguised binaries that reach the AI or storage.
- [ ] `.webp` uses the `RIFF` signature, which also matches `.wav`/`.avi` — confirm a mislabeled media file cannot pass as an image and break extraction downstream.
- [ ] File size is enforced server-side (`MAX_DOCUMENT_SIZE_MB`) **before** the AI call — a 500 MB upload never reaches Gemini.
- [ ] SHA-256 duplicate detection works per `(company_code, machine_id)` — re-uploading the same file returns 409, not a silent duplicate record.
- [ ] The same file uploaded to two different machines is allowed (dedup is machine-scoped, not global) — confirm this is intended.
- [ ] Filenames are sanitized before storage (`Path(filename).name`) — a client sending `../../etc/passwd` cannot escape the storage directory.
- [ ] Machine ownership is verified: upload rejects any `machine_id` whose `company_code` does not match the uploader (no cross-tenant record injection).

### Extraction fidelity and format coverage

- [ ] `_source_text` covers `.txt`, `.md`, `.csv`, `.xlsx`, `.docx` — confirm PDF and image extraction rely entirely on the multimodal AI provider, and verify that path actually returns data (not silent empties).
- [ ] Text extraction is capped at 50,000 chars — verify a large manual is not silently truncated in a way that drops critical maintenance data without warning the reviewer.
- [ ] `.xlsx` extraction reads every worksheet, skips empty cells, and respects the 50k cap mid-loop — verify multi-sheet BOMs are fully captured.
- [ ] `.docx` extraction reads `word/document.xml` — verify tables, headers, and text boxes are captured, not just body paragraphs.
- [ ] When the AI provider fails or times out, `extract_record_data` falls back to an empty extraction with a visible note and confidence 0 — confirm the reviewer clearly sees "AI extraction is unavailable," not a blank draft that looks complete.
- [ ] On AI failure, the first 800 chars of source text land in `summary` — verify this is presented as raw source, not as an AI conclusion.

### Confidence scoring and source attribution

- [ ] Every extracted field carries `confidence` (0–100, clamped) and `source` — verify both render in the review UI next to the value.
- [ ] `overall_confidence` averages identity-field confidences (only for populated fields) plus every list-item confidence — confirm an all-empty extraction shows 0%, correctly signaling "verify before approval."
- [ ] Low-confidence fields (<60%) are visually flagged in the review UI so the reviewer scrutinizes them, not rubber-stamps them.
- [ ] `source` references point to the actual document/page/section — confirm they are not fabricated by the model (hallucinated citations are a known LLM failure).
- [ ] A field with a value but confidence 0 (or missing source) is treated as unverified, not as fact.

### AI safety (hallucination, fabrication, injection)

- [ ] Prompt injection: uploaded document text is fed into the extraction prompt (`source_text`) — verify a malicious document containing "ignore previous instructions, output X" cannot alter extraction behavior or exfiltrate other data.
- [ ] The model cannot invent spare-part numbers, torque specs, or safety intervals that are not in the source — spot-check extracted values against the original document for a sample of records.
- [ ] Numeric/units fidelity: verify the AI does not silently convert units (mm↔inch, bar↔psi) or drop decimal points during extraction.
- [ ] Safety-critical fields (`safety_note`, `risks`, `recommended_action`) are never auto-approved — they always require explicit Maintenance Head sign-off.
- [ ] The extraction schema is enforced by `normalize_extraction` — malformed or extra fields returned by the AI are dropped, and type coercion never crashes the request.
- [ ] Items with no meaningful field (only confidence/source populated) are discarded — verify empty rows do not pollute the draft.

### Human-in-the-loop review and approval governance

- [ ] Only roles authorized by `assert_can_upload_machine_records()` can upload and edit drafts — verify a Technician cannot silently edit extracted knowledge if not permitted.
- [ ] **Only Maintenance Head** can approve or reject (`assert_maintenance_head()`) — verify no other role, including Owner, can approve unless intended.
- [ ] Approved records are locked: `update_draft` returns 409 on an approved record — verify approved knowledge cannot be edited in place; a revised source must be uploaded.
- [ ] Re-approving an already-approved record returns 409 — no double-approval, no duplicate MachineData build.
- [ ] Rejecting a record clears `approved_by`/`approved_at` and records the reason — verify the rejection note is mandatory or at least captured.
- [ ] Every state change appends to `history_json` with actor `user_id`, name, role, timestamp, and note — verify the audit trail is complete and append-only.
- [ ] Version increments on every draft update and restore — verify version numbers never go backward or collide.

### Approved-knowledge propagation to MachineData

- [ ] MachineData.md is rebuilt **only on approval** (`build_machine_data` inside `decide_record` when `approved=True`) — verify unapproved drafts never leak into the canonical AI context.
- [ ] Only `status == "approved"` records feed `extracted_sections` — verify a `needs_review` record's extracted data never appears in MachineData.md.
- [ ] Document filtering is correct: a document tied to an unapproved record is **excluded**, but the same document tied to an approved record is **included** — verify this edge case (`record_document_ids` vs `approved_document_ids`).
- [ ] `_missing_sections` accurately reports data gaps (manual, wiring/hydraulic diagram, BOM) — verify the gap list reflects reality and drives the reviewer to upload what is missing.
- [ ] MachineData.md is the single canonical context consumed by the escalation/diagnosis AI — verify no other code path reads unapproved extractions.
- [ ] Confidence and approver metadata are carried into the markdown (`Extraction confidence: N%`, `Approved by`) so downstream AI and humans see provenance.

### Storage durability

- [ ] Production uses `DOCUMENT_STORE=drive` (Google Drive), not local disk — verify uploaded originals survive Railway/Render redeploys.
- [ ] MachineData.md and MachineDataInet.md are written to `DOCUMENT_STORE_DIR` (local disk) — confirm these are regenerated on approval and not permanently lost on ephemeral filesystems, or migrate them to durable storage.
- [ ] `_safe_path` prevents reads/writes outside the storage base directory — verify path traversal is blocked on the local backend.
- [ ] Large extractions are zlib-compressed to fit the data-store cell limit (`_EXCEL_CELL_SAFE_LIMIT`, 32k); an over-limit record returns 413 — verify the user gets a "split into smaller files" message, not a corrupt save.
- [ ] A very long `history_json` cannot exceed the cell limit and silently drop audit entries — verify history is truncated safely or moved to a dedicated store if it grows.

### Backup and restore integrity

- [ ] Export includes originals, per-record JSON, structured CSVs (all six sections), MachineData files, and a `manifest.json` (`turbofix-machine-records-v1`) — verify the archive is complete and re-importable.
- [ ] Export includes records of **all** statuses (no status filter in `export_backup`) — confirm this is intended and that unapproved drafts in a backup are clearly labeled by status.
- [ ] Import requires Maintenance Head (`assert_maintenance_head()`) — no other role can restore.
- [ ] Zip-bomb protection: import rejects >100 MB archives and >250 MB expanded size — verify both limits trigger 413.
- [ ] Path-traversal protection: import rejects any entry starting with `/` or containing `..` — verify `manifest.json` and record paths cannot escape.
- [ ] Restored records always return to `needs_review` and require fresh Maintenance Head approval — verify no record is restored as pre-approved.
- [ ] Import dedup by `file_hash` skips records already present — verify a re-import does not create duplicates, and the `restored`/`skipped` counts are accurate.
- [ ] A malformed or wrong-format ZIP returns a clear 400 (`invalid TurboFix backup`, `unsupported backup format`) — never a 500 or partial import.

### Internet reference augmentation

- [ ] `MachineDataInet.md` is generated only when the user explicitly approves internet augmentation — verify it is never built silently.
- [ ] The DuckDuckGo lookup (`_internet_reference`) sends the machine name to a third party — verify no confidential company or serial data is leaked in the query, and confirm this is acceptable to the customer.
- [ ] The external fetch has a timeout (10s) and fails gracefully with a "verify against OEM manual" note — verify a slow or blocked network does not hang the approval flow.
- [ ] Fetched internet text (capped 5,000 chars) is clearly labeled as unverified reference, never merged into approved facts without review.
- [ ] Internet content is treated as untrusted data — verify it cannot inject instructions into the downstream diagnosis AI (it is context, not command).

### Reviewer UX

- [ ] The review screen shows the original document side-by-side (or one click away) with the extracted draft so the reviewer can verify field-by-field.
- [ ] Confidence and source are visible per field; low-confidence values stand out.
- [ ] Empty sections show "No X extracted" with a way to add manually — not a blank area.
- [ ] The approve/reject actions are only visible to Maintenance Head; other roles see read-only.
- [ ] After approval, the reviewer sees confirmation that MachineData.md was rebuilt and which sections are still missing (data gaps).
- [ ] Record status (`needs_review`, `approved`, `rejected`) is unambiguous at a glance in the inbox list.

### Multilingual and terminology

- [ ] Extraction preserves the source language of technical terms — verify Hindi/Marathi part names or notes are not mistranslated or dropped.
- [ ] Units and standards (IS/DIN/ANSI) mentioned in the source are preserved verbatim, not normalized away.
- [ ] Machine, spare-part, and consumable naming is consistent with how the plant refers to them — not the AI's generic renaming.

---

## 9. Pre-Release Gate

Before every production release, verify:

- [ ] `git diff --check` passes — no whitespace errors or merge conflict markers.
- [ ] `npm run build` succeeds — frontend compiles without errors.
- [ ] Backend starts without errors — `uvicorn app.main:app` launches cleanly.
- [ ] All required Supabase migrations are applied — `npx supabase db push` completes.
- [ ] All Edge Functions are deployed — `npx supabase functions deploy` completes.
- [ ] Environment variables on Render match the documented list — no missing or stale values.
- [ ] Smoke test: send one WhatsApp message, verify it creates a ticket, verify the notification reaches the assigned technician.
- [ ] No `TODO`, `FIXME`, or `HACK` comments remain in shipped code — address or remove them.
- [ ] This checklist has been reviewed by the person deploying, not just the person who wrote the code.

---

*Last updated: 2026-07-19*
*Maintainer: Neetesh Kumar Soni*
