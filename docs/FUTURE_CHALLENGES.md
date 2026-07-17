# TurboFix — Future Challenges Log

Prepared 17 Jul 2026. Anticipated challenges clients will raise during plant visits,
with the honest current state and the planned answer. Update this log after every visit.

---

## 1. Product gaps (client will hit these in a live demo)

### 1.1 AI Assistant gives no answers
- **Current state:** The assistant page loads, but `ask()` is stubbed — it shows
  "backend is being migrated." The Gemini integration lives in
  `supabase/functions/_shared/gemini.ts` but no edge function serves the assistant yet.
- **Client will ask:** "You call it an AI maintenance platform — where is the AI?"
- **Plan:** Deploy a Supabase Edge Function that pulls the machine's tickets/documents
  and calls Gemini. Highest-priority gap because it is the headline feature.

### 1.2 Technician cannot upload repair evidence
- **Current state:** Photo/voice/PDF evidence upload in the Technician workspace is
  stubbed. The close-loop approval works, but without proof attached.
- **Client will ask:** "How do I audit that the repair was actually done?"
- **Plan:** Wire uploads to Supabase Storage (same pattern already working for machine
  documents on the Machines page), store evidence rows against the ticket.

### 1.3 Old-records OCR (the "Use old records" pitch) is offline
- **Current state:** Records page renders, but import/export and OCR processing return
  501 stubs. The landing page still advertises this feature.
- **Client will ask:** "We have 10 years of handwritten registers — you said you digitize them."
- **Plan:** Either deploy the OCR pipeline as an edge function or soften the marketing
  copy until it ships. Do not demo this page unprompted.

### 1.4 Settings that don't persist
- **Current state:** Escalation path and custom roles save only to local component state
  — refresh and they're gone. No `escalation` / `custom_roles` tables exist in Supabase.
- **Client will ask:** "I configured the breakdown alert chain yesterday, where did it go?"
- **Plan:** Add the two tables + RLS policies, reconnect the existing UI (the forms are done).

### 1.5 Team onboarding does not create login accounts
- **Current state:** "Onboard Staff" inserts a row into `public.users` but never creates
  a Supabase Auth account, so the password field is collected and discarded. The new
  member cannot actually sign in. (Also: the insert omits `company_id`, which the schema
  requires — verify this insert succeeds under RLS.)
- **Client will ask:** "I onboarded my supervisor, why can't she log in?"
- **Plan:** Creating auth users needs the service-role key, which cannot live in the
  frontend. Build a small `invite_user` edge function that the owner's session calls.

### 1.6 WhatsApp breakdown intake
- **Current state:** Tickets page says "issues reported over WhatsApp appear automatically,"
  but that depends on the `whatsapp_webhook` edge function being deployed and a Meta
  WhatsApp Business API number being approved. Meta approval takes days-to-weeks and
  per-conversation charges apply.
- **Client will ask:** "Can my operator just WhatsApp a photo of the broken machine?"
- **Plan:** Complete Meta Business verification early — it is the longest external
  dependency in the whole product. Have a fallback in-app "report issue" form.

---

## 2. Infrastructure risks (will surface after the client signs)

### 2.1 Supabase free-tier limits
- **Risk:** Free projects **pause after ~1 week of inactivity** (the site would go down
  until manually resumed), 500 MB database, 1 GB storage, limited monthly active users,
  and the email rate limit (~4/hour) we already hit while seeding demo accounts.
- **Trigger:** First idle week, or first plant that uploads a few hundred machine manuals.
- **Plan:** Upgrade to Supabase Pro (~US$25/mo) before the first paying client. Budget it
  into pricing.

### 2.2 Email delivery
- **Current state:** Email confirmation is disabled to work around the built-in mailer's
  rate limit. Password-reset emails still depend on it.
- **Risk:** Client staff who forget passwords may not receive reset emails reliably.
- **Plan:** Connect custom SMTP (Resend/Postmark/SES) in the Supabase dashboard.

### 2.3 Security posture
- **Current state:** The anon key is hardcoded in the frontend (safe **only** if RLS is
  airtight), signups are open (anyone can self-register an "owner"), and company
  registration auto-creates rows with status "pending" but nothing enforces the pending
  state — new owners get a live workspace immediately.
- **Client will ask (their IT team):** "Who can see our maintenance data? Is it isolated
  from other factories?"
- **Plan:** Audit every RLS policy against cross-tenant reads, enforce the
  pending-approval gate, and add rate limiting on signup. Do this before hosting two
  real factories on one project.

### 2.4 Backups and data ownership
- **Client will ask:** "If we leave TurboFix, do we get our data? What if you lose it?"
- **Plan:** Supabase Pro includes daily backups; add a per-plant CSV/ZIP export (the
  Records export UI already exists to hang this on). Put data-ownership language in the
  contract.

---

## 3. Adoption challenges (plant-floor reality)

### 3.1 Connectivity on the shop floor
- **Risk:** Indian plant floors often have weak Wi-Fi; the app currently requires a
  connection for every action.
- **Client will ask:** "The machine is in the basement — no network. Now what?"
- **Plan:** PWA with offline queue for the technician workflow (checklist + notes sync
  when back online). Large effort — scope it only if a client makes it a blocker.

### 3.2 Language coverage
- **Current state:** The landing page has EN/हिंदी/मराठी toggles, but the workspace pages
  (dashboard, tickets, technician) are English-only.
- **Client will ask:** "My technicians read Hindi, not English."
- **Plan:** Extend `translations.js` coverage to the technician-facing pages first —
  they have the least text and the most non-English users.

### 3.3 Mobile experience for technicians
- **Risk:** Technicians will use phones, not desktops. Pages are responsive but not
  tested on real low-end Android devices.
- **Plan:** Field-test the Technician and Tickets pages on a ₹10k Android phone before
  the first pilot.

---

## 4. Commercial questions to be ready for

| Question | Prepared answer needed |
|---|---|
| "What happens when we exceed 50 machines?" | Machine quota exists in UI (`0 of 50`) but nothing enforces or upsells it — define the pricing tiers. |
| "Can we run two plants under one company?" | Schema has one company per user; multi-plant needs a `plants` layer. Not built. |
| "SLA / uptime guarantee?" | GitHub Pages + Supabase free tier have no SLA. Answer honestly; Pro tiers change this. |
| "Audit trail for ISO/TPM compliance?" | Tickets store status changes but not who/when for every transition. Needs an events table. |
| "Integration with our ERP (SAP/Tally)?" | Not built; note which ERP each prospect uses and batch the demand. |

---

*Maintenance note: revisit after each client visit; move resolved items to the bottom
with the date closed.*
