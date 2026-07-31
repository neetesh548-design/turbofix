# TurboFix — Onboarding & Adoption Plan

**Purpose:** Turn the 150+ features in `modification.md` into an onboarding experience that is simple, user-friendly, and *makes factories buy* — without overwhelming anyone. Every section of the roadmap (1–19) is placed somewhere in this plan; see the **Coverage Matrix** (§11) as the guarantee that no point is left out.

---

## 0. The One Rule

> **Sell one promise. Deliver value in 5 minutes. Reveal the rest only when the customer is ready.**

The roadmap is our *build* order. It must never be the *show* order. A factory owner should never see 150 features. They should see **one machine reporting one breakdown and the loss it caused** — and then ask for more themselves.

---

## 1. The Core Problem (and the Fix)

**Problem:** `modification.md` is an engineering-complete spec. If onboarding mirrors it, TurboFix looks like SAP PM — long forms, many dashboards, 13 roles. That kills adoption in an Indian MSME where the operator is semi-literate and the owner has no patience for software.

**Fix — three reframes:**

1. **Feature list → outcome ladder.** Group the 8 priorities and 5 phases into **5 customer-facing "levels"** the factory graduates through. Each level is one sentence of value, not a feature dump.
2. **Onboard by role, not by module.** Each person meets only *their* 60-second job on first run (§14 UX Rules). Complexity exists in the backend, never on the operator's screen (Core Principle §2).
3. **Land-and-expand selling.** They buy Level 1 cheap, feel the money leak (§6/§3.8), and upgrade themselves. We never sell the whole roadmap up front.

---

## 2. Onboarding Philosophy (3 principles, straight from the roadmap)

| Principle | Source in roadmap | What it means for onboarding |
|---|---|---|
| **Under 3 taps for any action** | §2 Core Principle | Every first-run flow must complete in ≤3 taps. QR → speak → confirm. Nothing else on screen. |
| **Simple UI, intelligent backend** | §2 | Hide work orders, escalation, KPIs *behind* the scan. The operator sees a mic button; the backend builds the work order (§3.4). |
| **No important event outside the system** | §2, §19 | Onboarding's job is capture-rate. Success = >90% of breakdowns & PM recorded (§19). Everything else follows from that. |

**Anti-overwhelm guardrails (§15 becomes onboarding law):**
- No long onboarding forms — machine profile (§3.1) is filled progressively, not on day one.
- No mandatory fields beyond the 7 essentials (§3.3).
- No employee-scoring, no predictive AI, no IoT, no ERP replacement in the first-run experience (§15).
- Start with **one machine**, not the whole plant.

---

## 3. The Buyer Journey — Try → Land → Expand

How a factory actually goes from stranger to paying, expanding customer.

```
TRY (free, 5 min)      LAND (paid pilot, 30 days)     EXPAND (self-driven)
1 machine, 1 QR    →   1 line / 10–20 machines     →  whole plant → multi-plant
"See a breakdown       "See the monthly money           "Roll out Levels 3–5,
 captured + its loss"    leak on real machines"           enterprise, AI"
```

- **TRY** is the hook: print one QR (we already have the QR generator), stick it on the worst machine, report one breakdown by voice, watch the Owner Dashboard show the downtime + estimated loss (§3.8, §6.2). This is the *entire* sales demo. It uses the existing WhatsApp-native flow — zero app install, zero training.
- **LAND** is the 30-day paid pilot on one production line. Success criteria (§19) are the exit test: can the owner *see* current downtime and estimated loss, and did repeat failures trigger action?
- **EXPAND** is customer-pulled, not sales-pushed. Each maturity level (§4) unlocks when the previous one is habit.

---

## 4. The Spine — 5-Level Maturity Ladder

This is the heart of the plan. The roadmap's Priorities 1–8 and Phases 1–5 are repackaged into **5 levels a customer understands**. Each level = one promise, one buyer, the roadmap features it delivers, the "aha" moment, and the buy trigger. **We onboard one level at a time.** A customer can be selling on Level 1 while we're still building Level 4 — that's fine.

### Level 1 — "Never lose a breakdown" *(the sellable MVP)*
- **Promise to buyer:** Every breakdown is captured and timed automatically. Nothing lives in a worker's head anymore.
- **Who feels it first:** Operator (reports in 20–30s), Owner (finally sees what's stopped).
- **Roadmap delivered:** §3.1 Machine Digital Profile, §3.2 QR reporting, §3.3 simple issue registration + AI extraction, §3.4 Work Orders, §3.5 PM Scheduler, §3.6 Technician screen, §3.7 Supervisor dashboard, §3.8 Owner dashboard, plus the four core KPIs — MTTR, MTBF, downtime, PM compliance (§11.1–11.2). Matches Phase 1 (§16) and the *Recommended Initial Scope* items 1–11, 13–15 (§17).
- **Aha moment:** Owner opens the dashboard and sees "Machine 4 down 3.2 hrs today ≈ ₹X lost."
- **Buy trigger:** The estimated-loss number on a real machine. That number sells the product.

### Level 2 — "Close the loop" *(operational control)*
- **Promise:** No job falls through the cracks. Critical issues escalate on their own; nothing closes without proof.
- **Who feels it:** Supervisor, Maintenance Head.
- **Roadmap delivered:** §4.1 Auto-escalation (configurable path Operator→…→Owner), §4.2 Root-Cause Analysis, §4.3 Repeat-breakdown detection, §4.4 Approval workflow (WhatsApp/email/mobile), §4.5 Verification-before-closure, plus §7.3 Shift Handover. Phase 2 (§16).
- **Aha moment:** A critical breakdown auto-escalates to the Plant Head at 2 a.m. and gets acted on — visibly, on the record.
- **Buy trigger:** "The system chases people so I don't have to."

### Level 3 — "Control spares & cost" *(stop the leaks)*
- **Promise:** Know what spares you have, what you're burning, and never get stuck waiting for a part.
- **Who feels it:** Storekeeper, Purchase Officer, Supervisor.
- **Roadmap delivered:** §5.1 Spare inventory, §5.2 Issue/return linked to work orders, §5.3 Low-stock alerts, §5.4 Purchase requests from a work order. Phase 2 tail (§16).
- **Aha moment:** A low-stock alert fires *before* a critical spare runs out and stalls a planned PM.
- **Buy trigger:** Fewer "machine down, waiting for part" days.

### Level 4 — "See the money" *(the owner's dream)*
- **Promise:** TurboFix shows which machine is losing money, why, and whether to repair or replace it.
- **Who feels it:** Owner, Plant Head, Finance.
- **Roadmap delivered:** §6.1 Machine-wise maintenance cost, §6.2 Downtime cost (clearly labelled *estimate* until wired to real data), §6.3 Repair-vs-replacement indicator (decision stays with the manager), §6.4 Budget tracking, plus §11.4 Cost KPIs. Phase 3 (§16).
- **Aha moment:** The "Top 5 loss-making machines" list appears — and one of them surprises the owner.
- **Buy trigger:** This is the *renewal and upsell* engine. Money visibility is why owners keep paying.

### Level 5 — "Scale & get smart" *(enterprise + knowledge + AI)*
- **Promise:** Run every plant on one screen, keep machine knowledge forever, and let AI do the summarising and quality-checking.
- **Who feels it:** Corporate Reliability Manager, Maintenance Head, IT Admin.
- **Roadmap delivered:**
  - **Enterprise (§10):** asset hierarchy, full role-based access (§10.2), multi-plant dashboard (§10.3), audit trail (§10.4), integrations — SAP/Tally/Power BI/ERP (§10.5). Phase 4.
  - **Knowledge (§7):** document library on the QR page (§7.1), troubleshooting knowledge base built from closed repairs (§7.2).
  - **AI (§9):** voice-to-work-order (§9.1, already the reporting default), AI troubleshooting assistant (§9.2), AI failure/financial summaries (§9.3), AI data-quality checks (§9.4). Phase 5.
- **Aha moment:** A new technician fixes a machine using a troubleshooting guide written by someone who left the company last year (§19 — history survives staff turnover).
- **Buy trigger:** Institutional memory + one-screen control across plants.

> **Onboarding rule:** never show a customer a level above the one they're living in. Level 4's cost dashboards would intimidate a Level 1 buyer. Reveal on graduation, not on signup.

---

## 5. Role-First First-Run (so nobody is overwhelmed)

Complexity is real; the trick is that **each role only meets their slice** (§14 UX Rules + §10.2 roles). Below is the *first 60 seconds* each role sees. Everything else is hidden until needed.

| Role | First-run screen (only this) | Onboarding target | Roadmap |
|---|---|---|---|
| **Operator** | A mic + camera button after QR scan. Nothing else. | Report an issue in 20–30s | §14.1, §3.2, §3.3 |
| **Technician** | "My open jobs" list; one **Start** tap; voice for closure notes. | Start in 1 tap, close in <1 min | §14.2, §3.6 |
| **Supervisor** | One action-focused screen: open breakdowns, overdue, PM due, escalations. | Manage from a single screen | §14.3, §3.7 |
| **Maintenance Head** | Approval inbox + RCA + repeat-failure alerts. | Act on exceptions only | §4.2, §4.3, §4.4 |
| **Storekeeper / Purchase** | Low-stock list + purchase requests. | Keep spares flowing | §5.1–5.4 |
| **Owner** | 6 answers: what's stopped, why, cost, who, when restored, what decision (§14.4). | See money & decisions | §3.8, §6, §14.4 |
| **Corporate / IT Admin** | Multi-plant compare + role setup + audit. | Governance & scale | §10 |

**First-run mechanic for every role:** we pre-fill with **sample data on one demo machine** so the screen is never empty (§14 — no blank states). The user's *first real action* is guided by a single coach-mark, then the coaching disappears.

---

## 6. Cross-Cutting Enablers (woven through every level, never sold separately)

These roadmap sections are not "levels" — they are quiet threads that run through all onboarding so the product *feels* smart without extra clicks.

- **Notifications (§8):** Smart rules only (§8.2) — notify only when the user must act, plus a **daily summary** instead of alert spam. Onboarding sets sensible defaults so a new customer never gets flooded on day one. Channels: in-app, WhatsApp, email, SMS for critical (§8.1).
- **AI assistance (§9):** Always **assistive, always confirmed** — voice-to-work-order needs reporter confirmation (§9.1, §3.3); troubleshooting needs technician verification (§9.2); no AI auto-approval of safety-critical work (§15). Onboarding messaging: "AI does the typing, you make the call."
- **KPIs (§11):** Introduced *as a by-product of doing the work*, never as a setup task. Level 1 shows the 4 core KPIs; deeper KPI sets (§11.3 work-order, §11.4 cost, §11.5 workforce) surface at their matching level. Workforce KPIs are framed as workload planning, **not employee scoring** (§11.5, §15).
- **Knowledge capture (§7):** Every closed job silently feeds machine history and (after supervisor approval) the troubleshooting KB — the customer builds an asset library just by working.
- **Systems thinking + feedback loops (§12):** Onboarding demonstrates *one* loop live — "repeat breakdown → RCA → PM checklist updated → monitored" (§12.4) — so the buyer sees the product learns, not just logs.
- **Governance (§13):** Traceability, audit trail, verification & validation, non-functional requirements (offline, multilingual, role-based, export) are enterprise **trust signals** surfaced only at Level 5 / procurement stage (§13, §10.4).

---

## 7. How We Hide the Complexity (progressive disclosure rules)

1. **One machine before one plant.** Setup starts with a single machine profile (§3.1); the rest are added by CSV import or one-at-a-time later — never a long form up front (§15).
2. **Machine profile fills itself over time.** Only name + ID + location required to start; manufacturer, warranty, AMC, documents, etc. get added as they're used.
3. **Statuses appear as they occur.** Machine statuses (§3.1) and the 10 work-order states (§3.4) are backend truth; the operator only ever sees "reported / being fixed / fixed."
4. **Levels gate features.** A tenant at Level 1 literally cannot see Level 4 cost screens. Upgrading flips them on.
5. **Defaults over configuration.** Escalation paths (§4.1), notification rules (§8.2), SLA timers, reorder levels — all ship with sane Indian-MSME defaults; configuration is optional and lives in admin, not in the daily flow.

---

## 8. Onboarding Mechanics (the actual setup experience)

- **5-minute self-serve start:** enter factory name → auto-generate company code → add one machine → print/download its QR (existing generator) → scan → report a test breakdown by voice. Done. Value shown.
- **Guided pilot setup (Land stage):** a wizard imports 10–20 machines (CSV or guided), assigns one technician per machine (§3.1 responsible technician), sets the shift pattern, and picks the top-3 machines to watch. ≤15 minutes.
- **Sample-data sandbox:** every new tenant gets a demo machine with fake history so dashboards, KB, and KPIs are never empty on first look.
- **In-context coaching, not a manual:** one coach-mark per role, dismissed after first use. No training day required — that's the WhatsApp-native advantage.
- **Multilingual from first run:** Hindi/Marathi UI toggle offered at signup (§13.3 non-functional, §14). Voice and issue capture work in the operator's language.
- **Offline-tolerant capture:** issue reporting queues if the network drops (§13.3), so a basement machine shop still works.

---

## 9. Commercial Packaging (tiers mapped to levels — so people buy)

Pricing mirrors the maturity ladder, so the customer only pays for the level they've grown into. **Avoid too many add-ons (§15).** Keep it to four clean tiers:

| Tier | Level(s) | Who buys | Hook |
|---|---|---|---|
| **Capture** (entry) | Level 1 | MSME owner | "Never lose a breakdown." Cheapest, land fast. |
| **Control** | Levels 2–3 | Growing factory | Escalation, spares, closure proof. |
| **Insight** | Level 4 | Owner/Finance | The money dashboards — the renewal driver. |
| **Enterprise** | Level 5 | Multi-plant groups | Hierarchy, SSO, audit, ERP integration, AI. |

- **Start free / near-free** on Capture for the first machine to remove buying friction.
- **Price on outcome, not seats** where possible — downtime saved is the story (§19).
- **No long contracts at entry** — the 30-day pilot *is* the proof.

---

## 10. Proof & Success Milestones (how we show it worked — the reason they keep paying)

Onboarding is not "done" at signup; it's done when the customer can *demonstrate value*. Tie every rollout to §19 success criteria:

- ✅ >90% of breakdowns recorded
- ✅ >90% of PM activities tracked
- ✅ Technicians update work without paperwork
- ✅ Owner can see live downtime + estimated loss
- ✅ Repeat failures trigger corrective action
- ✅ Machine history survives staff turnover
- ✅ Every completed action updates a KPI
- ✅ Customer can point to reduced downtime / delay / cost

**Onboarding scorecard** (shown to the owner at day 30): capture rate, PM compliance, top loss machines, downtime trend. If these move, the customer expands themselves.

---

## 11. Coverage Matrix — every roadmap section is placed (no point left out)

| Roadmap § | Topic | Where it lives in onboarding |
|---|---|---|
| §1 | Product goal | Framing / positioning (§0–1 here, §18 message) |
| §2 | Core principle, 3-tap, workflow | Onboarding Philosophy (§2), Progressive Disclosure (§7) |
| §3.1 | Machine digital profile + statuses | Level 1; filled progressively (§7 rule 2) |
| §3.2 | QR reporting | Level 1 / TRY hook (§3, §8) |
| §3.3 | Simple issue registration + AI extract | Level 1; Operator first-run (§5); confirm-before-submit |
| §3.4 | Work orders + 10 statuses | Level 1 backend; hidden from operator (§7 rule 3) |
| §3.5 | PM scheduler | Level 1 |
| §3.6 | Technician task screen | Level 1; Technician first-run (§5) |
| §3.7 | Supervisor dashboard | Level 1; Supervisor first-run (§5) |
| §3.8 | Owner dashboard | Level 1 aha + Level 4 depth; Owner first-run (§5) |
| §4.1 | Auto-escalation | Level 2; defaults shipped (§7 rule 5) |
| §4.2 | Root-cause analysis | Level 2; Maintenance Head first-run |
| §4.3 | Repeat-breakdown detection | Level 2; feedback-loop demo (§6/§12) |
| §4.4 | Approval workflow | Level 2 |
| §4.5 | Verification before closure | Level 2 |
| §5.1 | Spare inventory | Level 3 |
| §5.2 | Spare issue/return | Level 3 |
| §5.3 | Low-stock alert | Level 3; smart notifications (§6/§8) |
| §5.4 | Purchase request | Level 3 |
| §6.1 | Machine-wise cost | Level 4 |
| §6.2 | Downtime cost (labelled estimate) | Level 4; also the Level 1 buy trigger number |
| §6.3 | Repair-vs-replacement | Level 4 |
| §6.4 | Budget tracking | Level 4 |
| §7.1 | Document library | Level 5 knowledge thread (§6) |
| §7.2 | Troubleshooting KB | Level 5; built from closed jobs (§6) |
| §7.3 | Shift handover | Level 2 |
| §8.1 | Notification channels | Cross-cutting (§6) |
| §8.2 | Smart notification rules + daily summary | Cross-cutting (§6); anti-flood default |
| §9.1 | Voice-to-work-order | Level 1 default; AI thread (§6) |
| §9.2 | AI troubleshooting assistant | Level 5; verification-required framing |
| §9.3 | AI failure/financial summaries | Level 5 |
| §9.4 | AI data-quality check | Level 5 |
| §10.1 | Asset hierarchy | Level 5 / Enterprise (§4, §5) |
| §10.2 | Role-based access | Role-first onboarding (§5) + Level 5 setup |
| §10.3 | Multi-plant dashboard | Level 5 |
| §10.4 | Audit trail | Level 5; governance trust signal (§6) |
| §10.5 | Integrations (SAP/Tally/BI/ERP) | Level 5; procurement stage |
| §11.1–11.2 | Reliability & PM KPIs | Level 1 (4 core KPIs) |
| §11.3 | Work-order KPIs | Level 2 |
| §11.4 | Cost KPIs | Level 4 |
| §11.5 | Workforce KPIs (non-punitive) | Level 5; framed as planning (§6, §15) |
| §12 | Systems thinking + feedback loops | Demonstrated live (§6); one loop in onboarding |
| §13.1 | Stakeholder needs | Role-first design basis (§5) |
| §13.2 | Functional requirements | Backend spec; verified in pilot (§10) |
| §13.3 | Non-functional (offline, multilingual, export, RBAC…) | Onboarding mechanics (§8) + Enterprise trust (§6) |
| §13.4 | Verification & validation | Pilot exit tests (§3 Land, §10) |
| §13.5 | Traceability | Enterprise/procurement trust signal (§6) |
| §14.1–14.4 | UX rules per role | Role-first first-run (§5) |
| §15 | Features to avoid early | Anti-overwhelm guardrails (§2, §7) |
| §16 | Development phases 1–5 | Mapped to Levels 1–5 (§4) |
| §17 | Recommended initial scope (15 items) | = Level 1 + Level 3 spare basics; the sellable MVP (§4) |
| §18 | Positioning, tagline, owner message | Sales narrative (§0, §3, §12 below) |
| §19 | Success criteria | Proof & milestones (§10) |

*If a section isn't visible to a given customer yet, it's not missing — it's gated behind their current level (§7 rule 4).*

---

## 12. First 30 / 60 / 90 Days for a New Customer

- **Days 0–1 (TRY):** one machine, one QR, one voice report, owner sees the loss number. *Level 1 hook landed.*
- **Days 2–30 (LAND / Level 1):** one production line live; operators reporting, technicians closing with evidence, PM scheduled, 4 core KPIs moving. Day-30 scorecard vs §19.
- **Days 31–60 (Level 2–3):** turn on escalation, closure verification, and spare tracking once capture is habit. Owner sees fewer "waiting for part" days.
- **Days 61–90 (Level 4):** switch on the money dashboards; present "Top 5 loss-making machines" and a repair-vs-replace flag. *This is where the renewal/expansion conversation happens.*
- **Beyond (Level 5):** multi-plant, knowledge base, AI summaries — customer-pulled, not pushed.

---

## 13. Positioning We Lead With (§18)

- **Tagline:** *Scan. Report. Repair. Record. Improve.*
- **Owner message:** *TurboFix shows which machine is losing money, why it is failing, what action is pending, and what to do to prevent the next breakdown.*
- **The single demo that sells:** one QR, one voice note, one loss number on the owner's screen. Everything in this document exists to protect the simplicity of that moment.

---

*Prepared for TurboFix · maps 1:1 to `modification.md` (all sections §1–§19).*
