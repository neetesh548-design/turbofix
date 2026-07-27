# TurboFix Layout Audit

Logging ground for layout/CSS bugs found across the app, page by page.

**Update (2026-07-27, repair pass):** every bug logged below except the
"Home — not fully covered" and "RCA form not covered" follow-ups has been
fixed and verified in-browser at desktop + mobile widths. Entries are left
in place with a ✅ **Fixed** note added inline so this doc still works as a
record of what was found and how it was resolved — not just a stale backlog.

**Update (2026-07-28, follow-up pass):** closed out the three remaining
items — full-scroll audited Home (clean, no bugs), opened RCA's real form
(found and fixed a missing CSS import that was breaking its whole layout,
plus a demo-context bug), and fixed the two functional/data issues (Team's
session-expired banner, Shutdown Planner's "no machines found") by giving
both pages the same demo-mode fallback pattern already used elsewhere in the
app. One new *non-layout* bug was found and deliberately left unfixed: RCA
submission fails on a `company_id` schema mismatch — see the RCA section.

- Audited by: Claude (browser walkthrough), 2026-07-27
- Viewports checked: Desktop (1600×1000), Tablet (900–1000×900), Mobile (390×844)
- Mode: Demo owner session (`ACME3` demo company), dark theme unless noted

## Legend
- 🔴 High — broken/overlapping/unusable
- 🟡 Medium — visually wrong but usable (dead space, misalignment, overflow)
- 🟢 Low — cosmetic nit

## Home / Landing (`/`)

Checked desktop (1600px) and mobile (390px) above-the-fold hero. No layout
bugs found — hero, badge, headline, CTA buttons and the "ACME3 Live" preview
card are well-aligned and wrap cleanly at mobile width.

**Update (2026-07-27, follow-up pass):** completed the full-scroll audit.
Native/JS/anchor scrolling all turned out to be blocked in this tooling
environment (not a page bug — confirmed by testing `scrollTo`, `#anchor`
links, and real scroll on multiple unrelated pages), so instead each of the
13 top-level sections (hero, transformation, closed-loop, stakeholders,
platform, records, how, knowledge, demo, fit, faq, contact, footer) was
brought to the top of the viewport by hiding the ones before it via
`element.style.display = 'none'` and re-screenshotting, at both 1600px and
390px widths. Cross-checked with `document.documentElement.scrollWidth`
(1592px at 1600px viewport, 390px at 390px viewport — both ≤ the viewport,
confirming zero horizontal overflow anywhere across the full ~10,500px page)
and direct `getBoundingClientRect()` measurements of the platform section's
6-card grid (perfectly contiguous, no gaps).

🟢 **Result: clean.** Every section is well-aligned at both breakpoints —
2-column layouts collapse to 1 column correctly on mobile, the FAQ accordion,
demo video card, and contact form all reflow properly, and the footer's
3-column layout holds up. No layout bugs found on the Home page.

---

## Login (`/login.html`)

🟡 **Quick-access role buttons truncate their labels.** The "Quick demo access"
row (Plant Owner / Maintenance Head / Technician) is a 3-column grid where two
of the three labels don't fit their button and get ellipsis-truncated:
"Plant Own…", "Maintena…" (only "Technician" fits, since it's a single word).
Worse on mobile (390px): all three truncate to "Plant …", "Maint…", "Tech…",
making the buttons useless without hovering/guessing. Likely a `white-space:
nowrap` + `text-overflow:ellipsis` combo without either shrinking the font,
wrapping to two lines, or widening the column. Fix should probably let the
label wrap onto 2 lines instead of truncating.

✅ **Fixed**: labels now wrap onto 2 lines (`whitespace-normal`, no more
`truncate`), font dropped to 11px and button padding tightened so
"Maintenance Lead" wraps cleanly at the word boundary instead of mid-word.
Verified on desktop and mobile.

🟢 On mobile, the "Phone or Email" input's placeholder text also clips
("...or 9876…" instead of the full example number) — minor, likely just needs
a shorter placeholder string at narrow widths.

---

## Reset Password (`/reset-password.html`)

🟡 **This page doesn't share the Login page's card layout and looks unfinished
by comparison.** Login wraps its form in a centered card (shield icon, "STAFF
SIGN-IN" heading, stacked full-width labels/inputs). Reset Password instead
renders as bare left-aligned text directly on the page background: a plain
"TURBOFIX" heading, then "Reset your password", then an **inline** `Account
email` label sitting directly next to a narrow (~200px) input box — not
stacked above it like every other form in the app. On a 1600px-wide desktop
viewport the whole form hugs the left edge with a huge dead area to the right
and above/below it; it reads more like an unstyled fallback than a designed
screen. Same cramped label-next-to-input layout persists at 390px mobile
width, where the input additionally has no room to grow.

**Suggested direction for the fix phase:** reuse the Login page's card
component/classes here instead of the current bespoke (or missing) styles.

✅ **Fixed**: rebuilt on Login's exact shell (`Navbar` + centered
`bg-[#131922]/90` card, `KeyRound` icon, stacked full-width labels/inputs).
Verified on desktop and mobile — no more inline label/dead space.

---

## Dashboard (`/dashboard.html`)

Desktop (1600px): clean. All KPI tiles, the fleet health map, operating
summary, top-problem-machines table, and the equipment-health/financial-impact
cards align correctly with no dead space or overlap.

🟡 **Mobile (390px): "Fleet health map" criticality table overflows
horizontally and its last column header gets clipped.** The table (columns:
Criticality / Running / Issues / Down / Maintenance) doesn't reflow into a
mobile-friendly stacked layout — it stays a fixed-width table wider than the
390px viewport, forces horizontal scroll, and the rightmost "Maintenance"
header renders as "MAINTENANC" cut off right at the edge, with a visible
scroll-affordance bar. Same table pattern may exist elsewhere (Machines tickets
table already has a `.machine-mobile-table` responsive variant — this
dashboard table doesn't seem to reuse that pattern).

**Not covered:** couldn't verify whether the fixed bottom tab bar
(Dashboard/Tickets/Machines/Inventory) overlaps the last card ("More context")
when scrolled to the bottom at a *real* mobile viewport height — this session's
tooling only lets me simulate mobile width by inflating the viewport height
(no true scroll), which sidesteps fixed-position overlap bugs. Worth a manual
check.

✅ **Fixed** (the header-clip part): headers now wrap (`white-space: normal;
word-break: break-word`) instead of hard-clipping, and the wrap container got
a trailing fade + right padding as a defensive fallback in case any column
combination still overflows. "Maintenance" now reads across two lines
instead of cutting off as "MAINTENANC".

---

## Machines — list view (`/machines.html`)

Desktop (1600px): Grid view and List view toggle both look correct — 3-column
card grid, colour-coded status bars, aligned columns in list mode. No bugs
found.

🟡 **Mobile (390px): the health filter chip row overflows and clips the last
chip.** The "All 5 / Running 3 / Issues 1 / Down 1" filter row doesn't wrap or
give a visible scroll affordance — the last chip ("Down 1") is cut off
mid-label at the right edge of the viewport ("Dow…"), same truncation-without-
affordance pattern as the Login page's role buttons. Likely needs
`overflow-x: auto` with a scroll hint, or wrapping to a second row, at narrow
widths.

Machine workspace drilldown at mobile width (390px) was re-checked after the
sidebar float fix and stacks correctly (nav rail full-width on top, tab
content below, no dead space) — confirms the earlier fix's mobile fallback is
working as intended.

✅ **Fixed**: `.machine-filter-chips` gets a trailing fade-mask + right
padding below 720px, so the cut-off "Down" chip now reads as "there's more,
scroll" instead of looking broken.

---

## Machines — workspace drilldown (`/machines.html`, machine detail workspace)

**🟢 Fixed already** (2026-07-27, commit `10a4521`): `.machine-workspace-tabs` (the
left nav rail listing Overview/Documents/Spare parts/.../QR tag) had no `float`,
so it behaved as a plain block box — its content sibling dropped below it
instead of flowing beside it, leaving a large dead rectangle to the right of
the nav on desktop widths (>1450px). Fixed by floating the nav and letting the
`overflow-x:auto` on the adjacent content div form a BFC so it wraps beside
the float; unset the float at the existing ≤1450px breakpoint so mobile/tablet
stacking is unaffected. Verified across Overview, Consumables, QR tag tabs.

No other issue found here yet — flagging that the fix was float-based sidebar
layout so if this pattern (`.foo-tabs` + adjacent `div`) is reused elsewhere,
check for the same missing `float`.

---

## Tickets (`/tickets.html`)

🟢 Clean on both desktop (1600px) and mobile (390px). KPI strip, filter chips
(these wrap onto multiple rows on mobile instead of clipping — good contrast
to the Machines-page chip bug above), and the work-order list all reflow
correctly. No layout bugs found.

---

## Team (`/team.html`)

🟡 **Desktop (1600px): the "No team members found" empty-state card doesn't
span the full width of its table container**, leaving a large dead rectangle
to its right (from ~x835 to the container's right edge ~x1278, full height of
the card, ~356px tall) — the same "child box narrower than its container, no
flex/grid to fill the row" pattern as the Machines workspace bug fixed
earlier. At mobile width (390px) this isn't visible because the card already
spans the full (narrow) container.

🟢 **Unstyled error banner:** "Your session has expired. Please sign in
again." renders as plain unstyled text directly on the page background (no
card, icon, or color), even though the header clearly still shows the owner
as signed in — looks like a leftover/placeholder error state rather than a
designed alert component. Flagging as a component-consistency nit.

✅ **Fixed (2026-07-28, follow-up pass):** root cause was that demo logins
don't create a real Supabase auth session, so the `onboard_team_member` edge
function rejects the call as unauthenticated and [Team.jsx](src/pages/Team.jsx)
surfaced the raw auth error as "Your session has expired." Added a
`DEMO_TEAM` roster to [demoMachines.js](src/utils/demoMachines.js) (same
names — S. Patil, K. Nair, Ramesh Yadav, Anil Kumar, Vikram Patil — already
referenced as "Assigned to" on Machines/Tickets, plus Demo Owner) and wired
Team.jsx to show it instead of the error when `inventory_mode === 'demo'`,
matching the pattern already used by Machines/Dashboard/Tickets/Inventory.
Verified: reporting chain resolves correctly too (S. Patil → Demo Owner,
Ramesh Yadav → S. Patil, etc.), no more error banner.

✅ **Dead-space bug fixed**: [`EmptyState`](src/components/EmptyState.jsx)'s
root now gets `width: 100%; box-sizing: border-box` (a shared-component fix,
so every other `EmptyState` usage benefits too), and `.app-shell .vault-table`
got `width: 100%` so the table itself — not just the empty-state card inside
it — stretches to fill its card. Verified the card now spans the full table
width on desktop.

---

## Settings (`/settings.html`)

🔴 **Cross-cutting bug: global `input` style leaks into Ant Design `<Select>`
internals and visually blurs the selected value.** [src/index.css:251](src/index.css#L251)
has:
```css
input, select, textarea {
  background: rgba(26, 31, 38, 0.5);
  border: 1px solid rgba(160, 174, 192, 0.2);
  padding: 12px 16px;
  backdrop-filter: blur(10px);
  ...
}
```
This is meant to style plain form fields, but Ant Design's `<Select>` renders
a real (normally invisible/zero-size) `<input class="ant-select-input">` for
keyboard/search handling *inside* the visible select box. The blanket `input`
selector gives that internal input a visible background + border + padding +
`backdrop-filter: blur(10px)`, which sits on top of the selected-value text
and blurs it into illegibility. Confirmed on Settings → General & Preferences
→ "Internet AI Enrichment" dropdown (value is really "Always ask before
internet lookup" — readable in the DOM/accessibility tree, unreadable on
screen). **Since this is a global CSS rule, any `antd Select` anywhere in the
app is probably affected the same way** — worth a project-wide search for
`ant-select` usage once this is scheduled for a fix, not just a Settings-page
fix. Likely fix: scope the legacy `input, select, textarea` rule so it doesn't
match `.ant-select-input`, or exclude `backdrop-filter`/background/padding for
inputs inside `.ant-select`.

✅ **Fixed**: the rule now reads `input:not([class*="ant-"]), select:not(...),
textarea:not(...)` (and its `:focus`/`::placeholder` variants), so it no
longer touches any Ant Design internal input. Verified the "Internet AI
Enrichment" dropdown is crisp/readable now, and spot-checked a plain native
`<select>` (Assistant page) still gets the original glass styling — no
regression.

🟡 **Duplicate section navigation.** The page renders the same 7 section
labels twice at once: once as the left "SECTIONS" sidebar list, and again as
a horizontal tab strip at the top of the content pane (which itself overflows
and hides "Smart Modules"/"Security & Encryption" behind a "…" menu at
1600px). Having both nav patterns visible and in sync looks like a leftover
from switching layouts (e.g. sidebar nav added, old horizontal tabs never
removed) rather than an intentional design. Confirmed via DOM text dump — both
lists exist as separate elements, not a visual duplicate from a screenshot
artifact. **Worse on mobile (390px):** the full 7-item vertical "SECTIONS"
list renders first (long scroll), then the horizontal tab strip repeats right
below it but only fits 1 label ("General & Preferences") before collapsing
everything else behind "…" — doubling the scroll distance to reach actual
settings content for zero benefit.

✅ **Fixed**: added `renderTabBar={() => null}` to the content-pane `<Tabs>`
in [Settings.jsx](src/pages/Settings.jsx) so it still switches content by
`activeKey` but no longer renders its own redundant header row. The left
"SECTIONS" list is now the only navigation. Verified tab-switching still
works (clicked into "Plant Info") and the duplicate strip is gone at both
desktop and mobile widths.

---

## Assistant (`/assistant.html`)

🟢 Clean at desktop and mobile. Single centered "Ask TurboFix" card, native
`<select>` for scope (not blurred — consistent with the Settings finding that
only Ant Design `Select` is affected), textarea, buttons all align correctly
and reflow to full width on mobile.

---

## Technician (`/technician.html`)

Viewed as the Owner demo role, which correctly gets a role-restricted message
instead of the technician hub ("This workspace is not part of your role
view."). Not re-tested as an actual Technician account.

🟢 **Minor:** the restriction card has a large fixed/min-height regardless of
its 3 lines of content, leaving a big dead area below the text — reproduced
at both 1600×1000 desktop and 390×844 mobile, so it's not a viewport-height
artifact of this audit's tooling. Low priority since it's an edge-case screen
(wrong-role visit), but easy to fix (drop the min-height / let the card size
to content).

✅ **Fixed**: root cause was `.app-content` being a `display:flex` container
(default `align-items: stretch`) with `.role-view-message` as its sole child,
so the card stretched to the container's `min-height: calc(100vh - 68px)`.
Added `align-self: center` to `.role-view-message` so it opts out of
stretching without touching `.app-content`'s behavior for any other page.
Verified the card now sizes to its 3 lines of content.

---

## Shutdown Planner (`/shutdown-planner.html`)

🟢 Clean on desktop and mobile. Summary card, 3-step wizard (Set the window /
Choose work / Review plan), and the "plan at a glance" sidebar all align well
and stack correctly on mobile. No layout bugs found.

✅ **"No machines found" fixed (2026-07-28, follow-up pass):**
[ShutdownPlanner.jsx](src/pages/ShutdownPlanner.jsx) queried
`supabase.from('machines')` directly with no demo-mode fallback at all
(unlike Machines/Dashboard/Tickets/Inventory, which all check
`inventory_mode === 'demo'`). Added the same `DEMO_MACHINES` fallback,
including synthesizing demo tickets from each machine's `track_record.open_list`
so priority/estimate calculations have real open-issue data to work with.
Also fixed a small along-the-way bug: the real-data ticket mapping never
carried `urgency` through, so `hasHighUrgency` could never be true for real
tickets either — added `urgency: t.urgency` to that map. Verified: all 5 demo
machines now appear with correct priority badges (Critical/Recommended/
Preventive) and the capacity bar reacts to selection.

---

## Records (`/records.html`)

Desktop (1600px): clean — hero, 4-step process strip, stat cards, and the
Review inbox / Approved knowledge / Backup & restore tabs all align well.
(Page was stuck on "Loading machine records…" in the review inbox panel —
flagging as a possible functional/data issue, not layout.)

🟡 **Mobile (390px): the "Backup & restore" tab loses its label**, showing
only its icon while "Review inbox" and "Approved knowledge" keep full text —
the tab row overflows and a horizontal-scroll affordance bar appears below it.
This is the **same underlying pattern as the Login role-buttons and the
Machines-page filter chips**: a horizontal row of chip/tab-like controls with
no mobile wrapping/shrinking strategy, just silent clipping. Worth fixing all
of these together as one shared component/pattern rather than one-off patches.

✅ **Fixed**: applied the same trailing fade-mask + right padding treatment to
`.records-tabs` at ≤680px, matching Machines and Inventory.

---

## Support (`/support.html`)

🟢 Clean on desktop and mobile. Simple centered layout, buttons stack
correctly on mobile. No bugs found.

---

## QR Gateway (`/qr-gateway.html`)

🟢 Clean on desktop and mobile — the public "scan the QR tag" complaint form
(language picker, phone verification) is well-centered and reflows correctly.
No bugs found.

## QR Generator (`/qr-generator.html`)

🟢 Clean on desktop and mobile. Header stats, WhatsApp number field, machine
list textarea, and footer all reflow correctly with no overlap or dead space.

---

## Inventory (`/inventory.html`)

Desktop (1600px): clean and dense — KPI tiles, donut chart, cost-trend chart,
savings-opportunity cards, and the parts-usage table all align correctly with
no overlap or dead space.

🟡 **Mobile (390px): same filter-chip overflow bug as Machines/Login/Records.**
The "All stock / Critical / At risk / Healthy / Overstocked / Obsolete / More
filters" row clips "Overstocked" (and presumably "Obsolete") off the right
edge with no wrap or scroll hint, only "More filters" reflows to its own line
below. **This is now the 4th page with the identical symptom** — a strong
signal this is one reusable chip/filter-row component (or copy-pasted
pattern) that needs one fix applied everywhere, not four separate patches.
See the consolidated note under Machines (list view) above.

✅ **Fixed**: same trailing fade-mask + right padding treatment applied to
`.inv-status-filters` at ≤720px.

---

## Kaizen (`/kaizen.html`)

Desktop (1600px): clean — KPI tiles, "Savings by category" bar list,
implementation funnel, and the top-savings-ideas table all align well.

🟢 **Minor, mobile only:** a couple of category labels in "Savings by
category" truncate with ellipsis ("Breakdown Pre…", "Process Simplif…")
because the label column is a fixed width that doesn't shrink the bar or wrap
the text. Low severity (the ₹ value and bar are still fully readable), but
same family as the recurring chip-truncation issue — bars could let labels
wrap to a second line instead of clipping. The ideas table reflows into
readable stacked cards on mobile with no issues.

✅ **Fixed**: removed the `overflow:hidden; text-overflow:ellipsis;
white-space:nowrap` combo from `.kz-catbar-label` in favor of normal wrapping
(`overflow-wrap: break-word`, `line-height: 1.25`). "Breakdown Prevention"
now wraps onto 2 full lines instead of truncating.

---

## RCA (`/rca.html`)

**Update (2026-07-28, follow-up pass):** opened the real form (via
Tickets → expand a row → "RCA" link, `rca.html?machine=DEMO-M001&ticket=T005`)
instead of just the empty state, and found the actual root cause of both this
page's blank look *and* the earlier "no machine linked" issue:

🔴 **[RCA.jsx](src/pages/RCA.jsx) never imported its own stylesheet.** Every
other page using the shared `rd-*`/`decision-page` design system (Dashboard,
Kaizen, Inventory, ReportBreakdown) explicitly does `import './Dashboard.css'`
for the base classes (`.rd-panel`, `.rd-split`, `.rd-kpi-row`, `.rd-badge`,
etc.) before adding their own page CSS. RCA.jsx used all of those same
classes but had **no CSS import at all**, so the whole page was rendering
essentially unstyled: plain-text buttons, no card borders/spacing, and —
concretely — the `.rd-split` two-column grid (RCA input beside the Kaizen
suggestion panel) fell back to `display: block` and stacked full-width
instead of side-by-side. **Fixed** by adding `import './Dashboard.css';`.
Verified at both breakpoints: the 2-column grid now works, KPI fields
(Machine ID / Location / Technician) sit in a proper row, and buttons/cards
match the rest of the app.

🔴 **Also fixed: demo sessions never actually got machine/ticket context**,
which is why every demo visit showed "No machine was linked to this RCA"
even with `?machine=...&ticket=...` in the URL. The earlier fix (commit
`4d627be`) only *suppressed the error message*; `machine`/`ticket` state
stayed `null` because `DEMO-M001` isn't a real Supabase row (RLS was never
the actual blocker for a synthetic ID). Added a demo fallback that looks the
machine up in `DEMO_MACHINES` and the ticket up in `DEMO_TICKETS` (matching
the pattern already used for Team and Shutdown Planner below), so the form
now renders full real-feeling context: machine name/location, assigned
technician, and the original issue text.

🟡 **New finding, not fixed (backend/schema, not layout):** submitting the
RCA form fails with `Could not find the 'company_id' column of 'rca_reports'
in the schema cache` — the insert payload includes a `company_id` field the
`rca_reports` table doesn't have. This reproduces for real (non-demo) users
too, since it's a schema mismatch, not an RLS/demo issue. Left alone since
it needs a product decision (add the column via migration, or drop the field
from the payload) rather than a blind layout-side fix.

---

## Report Breakdown (`/report-breakdown.html`)

🟢 Clean on both desktop and mobile. The 4-step form (Machine / Issue / Photo
/ Assignment) stacks correctly, and — notably — the "Not starting / Unusual
noise / Oil leak / Overheating / Pressure dropping" quick-tag chip row and the
"Critical / High / Medium / Low" urgency row both **wrap correctly onto a
second line on mobile instead of clipping**. This is a good reference
implementation of the chip-row pattern that's broken elsewhere (Login,
Machines, Records, Inventory) — worth copying this page's approach when fixing
the recurring pattern noted above.

---

## Recurring patterns (fix once, apply everywhere)

These showed up on multiple, unrelated pages. All three are now ✅ **fixed**:

1. **Chip/tab row overflow with no wrap or scroll affordance, at mobile
   width.** A horizontal row of pill buttons or tabs gets clipped mid-label
   with no ellipsis-avoidance, no wrap, and often no visible scrollbar hint.
   Seen on: Login (role buttons), Machines list (health filter chips),
   Records (section tabs), Inventory (stock filter chips).
   **Fix applied:** Login's role buttons now wrap text onto 2 lines instead
   of truncating (they're a 3-button grid, not a scroller, so wrapping was
   the right fix there). Machines/Records/Inventory's chip *scrollers* each
   got a trailing fade-mask + right padding so the cut-off last chip reads
   as "scroll for more" instead of looking broken. These were 3 separate
   implementations, not one shared component, so each got its own
   (identical) CSS treatment rather than a single consolidated fix — a
   real shared `ScrollableChipRow` component is a good candidate for a
   future refactor, not done here.
2. **Child box narrower than its container with no flex/grid to fill the
   row, leaving dead space beside it.** Root-caused once on the Machines
   workspace nav (missing `float`, already fixed in commit `10a4521`); the
   same *symptom* reappeared on Team's empty-state card.
   **Fix applied:** [`EmptyState`](src/components/EmptyState.jsx)'s root now
   has `width: 100%`, and `.app-shell .vault-table` got `width: 100%` too
   (the table itself wasn't filling its card, independent of the empty-state
   component) — both are shared, so this benefits every other page using
   either.
3. **Global `input, select, textarea` CSS rule bleeds into Ant Design
   component internals.** [src/index.css:251](src/index.css#L251)'s
   `backdrop-filter: blur(10px)` + background/border/padding meant for plain
   form fields also styled Ant Design's internal `.ant-select-input`,
   visually blurring select values.
   **Fix applied:** scoped the rule with `:not([class*="ant-"])` so it skips
   any Ant Design–owned input, everywhere in the app, in one place.

---

## Status board

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Home | `/` | 🟢 clean (full scroll audited) |
| 2 | Login | `/login.html` | ✅ fixed (role buttons wrap) |
| 3 | Reset Password | `/reset-password.html` | ✅ fixed (rebuilt on Login's card) |
| 4 | Dashboard | `/dashboard.html` | ✅ fixed (mobile table header wraps) |
| 5 | Machines (list) | `/machines.html` | ✅ fixed (mobile filter chip fade) |
| 6 | Machines (workspace) | `/machines.html` (drawer → full workspace) | ✅ fixed (sidebar float bug) |
| 7 | Tickets | `/tickets.html` | 🟢 clean |
| 8 | Team | `/team.html` | ✅ fixed (empty-state/table width + session-expired banner) |
| 9 | Settings | `/settings.html` | ✅ fixed (blur leak scoped, duplicate nav removed) |
| 10 | Assistant | `/assistant.html` | 🟢 clean |
| 11 | Technician | `/technician.html` | ✅ fixed (role-gate card no longer stretches) |
| 12 | Shutdown Planner | `/shutdown-planner.html` | ✅ fixed ("no machines found") |
| 13 | Records | `/records.html` | ✅ fixed (mobile tab fade) |
| 14 | Support | `/support.html` | 🟢 clean |
| 15 | QR Gateway | `/qr-gateway.html` | 🟢 clean |
| 16 | QR Generator | `/qr-generator.html` | 🟢 clean |
| 17 | Inventory | `/inventory.html` | ✅ fixed (mobile filter chip fade) |
| 18 | Kaizen | `/kaizen.html` | ✅ fixed (mobile label wraps) |
| 19 | RCA | `/rca.html` | ✅ fixed (missing CSS import + demo context) |
| 20 | Report Breakdown | `/report-breakdown.html` | 🟢 clean (good chip-wrap reference) |

---
