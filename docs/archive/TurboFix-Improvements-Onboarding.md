# TurboFix — Improvements Onboarding Plan (Maintenance-Critical)

The three inner loops are live (Foundation, Capture, Prevent; Repair mostly done). This plan onboards **every remaining improvement** — ranked the way a reliability engineer ranks work, not the way a product backlog does:

> **Safety & continuity → Chronic recurrence → Acute uptime → Parts continuity → Cost/capital → Scale & sensing.**

Each improvement carries: *why it is maintenance-critical*, *what to build*, *what data it reuses (the zero-burden proof)*, *the loop/KPI it closes*, and *the consequence of skipping it*. The zero-burden rule from the closed-loop plan still binds every item — an improvement that adds a step to anyone's day is redesigned until the step is a by-product of work already done.

---

## How these are prioritized (RCM logic)

Maintenance criticality ≠ business value. A feature that prevents a **recurring** failure outranks one that merely reports a number, because recurrence is chronic, compounding downtime. The tiers below follow failure consequence:

1. **Tier 0 — Safety & continuity:** a slipped hazard or a lost critical job can hurt someone or stop production silently. Highest priority regardless of ROI.
2. **Tier 1 — Chronic recurrence:** the same machine/component failing again is the single biggest avoidable cost in maintenance. Close this loop before chasing cost dashboards.
3. **Tier 2 — Acute uptime:** measure and defend availability so response is fast and provable.
4. **Tier 3 — Parts continuity:** "waiting for spare" is a top downtime driver; kill it.
5. **Tier 4 — Cost & capital:** convert reliability into ₹ so investment decisions are correct.
6. **Tier 5 — Scale & sensing:** multi-plant, IoT, integrations — leverage, once the core loop is disciplined.

---

## Tier 0 — Safety & continuity *(onboard first)*

Consequence of a gap here is a person or a silent production stop — non-negotiable.

| Improvement | Maintenance-critical because | What to build | Reuses (zero burden) | Closes / feeds |
|---|---|---|---|---|
| **Shift Handover Summary** | A critical/temporary repair unknown to the next shift is how machines fail unattended and hazards get missed | Auto-compiled end-of-shift brief: running critical jobs, temporary repairs, safety concerns, PM due, pending approvals, vendor visits | Open work orders, lifecycle stages, interventions already in the DB | Continuity loop; feeds Supervisor Dashboard |
| **Supervisor Verification hardening** | Temporary/incomplete repairs closing as "done" is the root of repeat breakdowns and unsafe restarts | Enforce verification-before-closure for critical machines; capture trial-run/safety-guard/leak checks; block close without evidence | Existing closure_approval intervention + lifecycle `verification_pending` | Repair-quality loop; feeds First-Time-Fix |
| **Audit Trail** | Safety-critical closures and threshold changes need a tamper-evident "who/what/when" | Append-only log on every ticket state change, approval, threshold edit, cost change; not editable by normal roles | State transitions already happen; just record them | Compliance; feeds Data-Quality |
| **AI Data-Quality Checks** | A KPI built on incomplete/unverified records misleads the whole plant — especially unverified critical closures | Flag: missing root cause, unverified critical closure, suspiciously short repair, duplicate WO, inconsistent downtime | All fields now captured in tickets (§3.4) | Trust layer under every KPI |

---

## Tier 1 — Chronic recurrence *(the highest-ROI improvement — zero new burden)*

This closes the **reliability-improvement loop**: a repeat failure must automatically become a permanent fix. It runs entirely on data already captured, so it adds **no burden** to anyone.

| Improvement | Maintenance-critical because | What to build | Reuses (zero burden) | Closes / feeds |
|---|---|---|---|---|
| **Repeat Breakdown → RCA trigger** | The same component failing twice is money burned on temporary fixes | Auto-raise an RCA when repeat_failure_count crosses threshold (per component/machine, configurable window) | `repeat_failure_flag`/`repeat_failure_count` already on tickets (phase2) | Recurrence loop |
| **Root-Cause Analysis (5-Why / Fishbone)** | Fixing the symptom guarantees the failure returns | Lightweight RCA record: failure mode, immediate cause, root cause, 5-why chain, fishbone category; history pre-loaded as evidence | Machine maintenance history, closed WOs | Feeds CAPA |
| **Corrective & Preventive Actions (CAPA)** | Analysis that doesn't become a tracked action changes nothing | CAPA items with owner, due date, effectiveness verification; corrective now, preventive into the schedule | RCA output + PM Scheduler (§3.5) | Improvement loop |
| **CAPA → PM checklist revision** | The permanent fix must live in the routine, or it's forgotten when staff leave | A preventive CAPA appends/edits the machine's PM checklist automatically | PM Scheduler + checklist (§3.5, live) | Prevention loop — the arc that *closes* the system |
| **Troubleshooting KB at point of repair** | Junior technicians re-solving solved problems is slow and error-prone | Surface prior successful fixes for this machine/symptom **inside the Technician Task Screen** (not a separate search) | Closed WO repair_action/root_cause + AI records | First-Time-Fix; reduces senior dependence |
| **First-Time Fix Rate** | A "fixed" machine that reopens is the clearest signal of repair-quality or training gaps | Compute reopen-within-window per technician/machine; framed as process signal, not blame | Ticket reopen/lifecycle data | Repair-quality KPI |

**Why this tier first (after safety):** it is the only tier that *shrinks future work* — every closed recurrence permanently removes breakdowns, PM load, and cost. It also adds **zero** data-entry burden because it consumes what §3.4/§3.5 already capture.

---

## Tier 2 — Acute uptime (measure & defend availability)

| Improvement | Maintenance-critical because | What to build | Reuses (zero burden) | Closes / feeds |
|---|---|---|---|---|
| **Machine Availability** | Availability is the direct link between maintenance and production output | Availability % = uptime / scheduled time, per machine/line, from downtime records | `downtime_minutes` (§3.4) + status timeline | Owner/Corporate KPI |
| **MTBF / MTTR surfacing** | Frequency and repair-speed pinpoint unreliable machines and process delays | Surface existing analytics views on machine + dashboards with trend | `analytics_machine_mtbf` / `analytics_mttr_monthly` (exist) | Reliability trend |
| **Downtime accuracy** | Wrong downtime = wrong everything downstream (cost, availability) | Reconcile auto-computed downtime with waiting-for-spare/vendor pauses | Lifecycle timestamps + waiting stages | Feeds cost + availability |
| **Supervisor / Technician Dashboard depth** | Real-time control of open jobs, overdue, PM-due, workload prevents silent backlog | Action-focused views: open breakdowns, overdue, PM due today, jobs waiting spare/approval, technician workload, repeat breakdowns | All present in tickets/pm_schedules | Coordination loop |

---

## Tier 3 — Parts continuity (kill "waiting for spare")

| Improvement | Maintenance-critical because | What to build | Reuses (zero burden) | Closes / feeds |
|---|---|---|---|---|
| **Spare-to-Work-Order linking** | Un-linked spares mean no true machine cost and no consumption signal | Select the spare on the job; decrement stock, attach to WO, roll into machine cost | parts table + WO (§3.4) | Cost loop + consumption trend |
| **Low-Stock hardening** | A critical spare hitting zero mid-breakdown extends downtime dangerously | Reserve-aware alerts, lead-time-aware order-by dates, critical-spare flags | parts + existing alert path | Prevents extended downtime |
| **Purchase Request completion** | Procurement delay is downtime you can't fix on the floor | Raise a pre-filled PR from the WO; track approval → receipt | purchase_orders (exists) | Supply loop |
| **Vendor & AMC performance** | An unaccountable vendor or a lapsed AMC is a hidden reliability risk | Track vendor response time, AMC/warranty expiry alerts, outsourced-repair outcomes | Vendor/AMC fields on Machine Profile (§3.1, live) + outsource fields | Vendor accountability |

---

## Tier 4 — Cost & capital decisions (make maintenance value visible)

| Improvement | Maintenance-critical because | What to build | Reuses (zero burden) | Closes / feeds |
|---|---|---|---|---|
| **Machine-Wise Maintenance Cost** | You can't manage the worst machines without knowing their true cost | Aggregate spare + labour + vendor + downtime cost per machine; cost/hour, cost/unit | Linked spares, `labour_minutes`, downtime cost | Owner Dashboard |
| **Downtime Cost surfacing** | Rupee impact is the language owners act on | Downtime × configured rate, labelled estimate until wired to production data | `hourly_downtime_cost` + `downtime_minutes` (both live) | Owner buy-trigger |
| **Budget Tracking** | Uncontrolled maintenance spend hides the real problem machines | Plan vs actual, committed PO cost, planned/unplanned split, variance | PO + cost aggregation | Financial control |
| **Repair-vs-Replacement Indicator** | Over-maintaining a dying machine wastes capital and keeps failing production | Flag machines where cost↑, MTBF↓, availability↓, repair approaches replacement threshold; decision stays human | MTBF + machine cost + availability | Capital decision loop |
| **Owner Dashboard depth** | The owner's whole reason to pay: what's stopped, why, cost, who, when, what decision | Top-5 loss machines, downtime ₹, PM compliance, availability, pending high-value approvals, repair-vs-replace | Everything above, computed | Renewal/expansion engine |

---

## Tier 5 — Scale & sensing (leverage, once the core loop is disciplined)

| Improvement | Maintenance-critical because | What to build | Reuses / note | Closes / feeds |
|---|---|---|---|---|
| **Configurable Workflow (thresholds UI)** | Every plant's escalation/priority/PM tolerances differ; hardcoding breaks reliability discipline | Admin UI over the existing escalation_config + PM thresholds | escalation_config exists | Adapts loop per factory |
| **Multi-Plant Hierarchy** | Groups need company→plant→line→machine→component to manage assets | Hierarchy on top of machines/factories | factory_id present | Enterprise readiness |
| **Corporate Dashboard** | Compare reliability & cost across plants to find best/worst performers | Cross-plant availability, MTBF/MTTR, PM compliance, cost | Per-plant KPIs | Corporate decisions |
| **Audit + Data Export & API** | No lock-in; feed maintenance data to other systems | Export + read API over existing tables | additive | Integration readiness |
| **ERP Integration** | Removes duplicate entry across purchase/inventory/finance | Connectors to SAP/Tally/ERP for PO, spares, cost | after cost loop stable | Removes double entry |
| **IoT / condition-based triggers** | Machines sensing their own condition is the ultimate zero-burden input and enables predictive PM | Feed sensor thresholds into PM `condition` trigger (already a supported trigger_type) | pm_schedules.trigger_type='condition' ready | Predictive loop |
| **Offline Capability** | Weak shop-floor network must never block capture | Queue capture offline, sync later | capture path | Reliability of capture |

---

## Onboarding sequence (each phase closes a reliability loop, zero burden)

| Phase | Improvements | Reliability loop closed | Burden added | Verification (functional + burden) |
|---|---|---|---|---|
| **P1 · Safety net** | Shift Handover, Verification hardening, Audit Trail, Data-Quality | Nothing critical slips a shift or closes unverified | None (auto-compiled) | A critical job appears in the next shift's brief; a critical WO cannot close without verification — and no one typed a handover |
| **P2 · Stop recurrence** *(highest ROI)* | Repeat→RCA→CAPA→PM revision, KB-at-repair, First-Time-Fix | The same failure cannot recur unaddressed | **Zero** — runs on captured data | A 2nd identical failure auto-raises RCA; a preventive CAPA edits the PM checklist; the fix appears in the next technician's screen |
| **P3 · Defend uptime** | Availability, MTBF/MTTR surfacing, Supervisor/Technician dashboards | Downtime is measured and responded to in real time | None | Availability + overdue + PM-due render live; supervisor coordinates from one screen |
| **P4 · Parts continuity** | Spare-to-WO, Low-stock hardening, PR completion, Vendor/AMC | "Waiting for spare/vendor" downtime is minimized | Storekeeper reacts to alerts only | Issuing a spare decrements stock, links to WO, rolls into cost; a critical spare warns before stockout |
| **P5 · Value & decisions** | Machine cost, downtime cost, budget, repair-vs-replace, Owner Dashboard | Reliability becomes ₹ and capital decisions | Owner reads only | Top-5 loss machines + repair-vs-replace flag render with no manual entry |
| **P6 · Scale & sensing** | Config UI, Multi-plant, Corporate, Audit/Export/API, ERP, IoT, Offline | Loop scales across plants and self-senses | IT setup once | Cross-plant compare; a sensor threshold raises a condition-based PM |

**Sequencing rule:** P1 and P2 come before any dashboard/cost work. A pretty cost dashboard on top of an open recurrence loop just reports the bleeding faster — it doesn't stop it.

---

## The maintenance case in one line per tier (why "critical")

- **Tier 0:** without it, a hazard or a critical job slips silently — the one failure mode you can never accept.
- **Tier 1:** without it, you pay for the same breakdown forever — chronic, compounding downtime.
- **Tier 2:** without it, you can't prove or defend availability to production.
- **Tier 3:** without it, good technicians stand idle waiting for parts.
- **Tier 4:** without it, the budget funds the wrong machines.
- **Tier 5:** without it, discipline that works in one plant can't be replicated across many.

---

## Immediate recommendation

Onboard in strict order **P1 → P2 first**. P2 (Repeat → RCA → CAPA → PM revision) is the single highest-leverage improvement in the entire product: it closes the loop that permanently reduces breakdowns, it is what a maintenance head judges the system by, and it adds **zero data-entry burden** because it feeds on the work-order and PM data already captured in the live system. Everything downstream (cost, dashboards, capital decisions) is more accurate once recurrence is under control.

Each improvement ships the same proven way as the last three slices: DB migration → edge/cron (if needed) → frontend → build/verify → `db push` → deploy → merge to `main`, with both a functional and a burden test before it's called "onboarded."

---

*Prepared for TurboFix · every remaining improvement placed, ranked by maintenance criticality, with a zero-burden onboarding path.*
