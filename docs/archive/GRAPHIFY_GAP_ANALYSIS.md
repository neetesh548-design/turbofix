# TurboFix Knowledge Graph Gap Analysis
**Generated:** 2026-07-24 | **Graph Size:** 2555 nodes, 5548 edges, 204 communities

## Executive Summary
The graph reveals **3 categories of gaps**:
1. **Extraction blind spots** (dynamic imports, runtime patterns)
2. **False positives** (47-45 inferred edges on core repos need verification)
3. **Real undocumented integrations** (Supabase edge functions, some services)

---

## Critical Gaps (Extraction Misses)

### 1. **Dynamic Python Imports Not Captured**
The AST extractor misses `from app.services import escalation_service` pattern.

**Affected Services:**
- `escalation_service.py` — Actually called from:
  - `ticket_service.py` (initialize, approve, reject, delegate, mark_outsourced, submit)
  - `main.py` (run_escalation_sweep lifespan hook)
  - `intelligence_service.py` (_send_escalation_whatsapp)
  - `consumables_service.py` (initialize_part_request_escalation)
  
  **Graph shows:** 0 callers ❌ | **Reality:** 4+ callers ✓

- `intelligence_service.py` — Likely has same pattern with dynamic check_repeat_failure, check_inventory calls

**Impact:** High-risk services appear abandoned when they're actually core.

### 2. **Supabase Edge Function Invocation Pattern**
Frontend calls via `supabase.functions.invoke('function_name', ...)` are not traced.

**Affected Edge Functions:**
- `ai_assistant/index.ts`
  - Called from: `src/components/AppShell.jsx:118`, `src/pages/Assistant.jsx:42`
  - Graph shows: No caller ❌ | Reality: 2 callers ✓

- `ai_diagnostics/`, `notification-service/`, `reporting/`, `asset-service/`, `check_inventory/`, `iot_telemetry_webhook/`, `user-provisioning/`
  - Status: **UNKNOWN** — No grep results found
  - Likely dead code or backend-only

**Impact:** Frontend-backend contract invisible in graph.

### 3. **Conditional/Lazy Repository Imports**
Multiple repository implementations (Local*, Sheets*, Supabase*) are swapped at runtime via env vars, not visible in static analysis.

**Affected:**
- `SupabaseAIFeedbackRepository` (cohesion 0.25)
- `SupabaseShiftConfigRepository` (0 callers visible)
- `LocalSettingsRepository` (isolated in tests only)

**Graph shows:** Isolated ❌ | **Reality:** Used conditionally ✓

---

## False Positive INFERRED Edges (High-Confidence Issues)

### MachineRepository — 47 INFERRED edges
**Example:** `MachineRepository` → `LocalEventRepository` [INFERRED 0.75]

**Reality Check:**
```python
# backend/app/repositories/base.py:214
class MachineRepository(ABC):  # Abstract base only
    """Read/write access to the Machines data entity."""
    # No imports of LocalEventRepository
```

**Verdict:** FALSE POSITIVE. Model inferred they're "related" but no actual dependency. They share a domain (machines) but don't call each other.

**Impact:** ~47 spurious edges inflate betweenness centrality scores. Need manual audit.

### TicketRepository — 45 INFERRED edges
Same pattern as MachineRepository. Abstract base with inferred connections that don't exist in code.

---

## Verified Real Gaps (Documentation Needed)

### 4. **Supabase Edge Functions with Unknown Purpose**
```
supabase/functions/ai_diagnostics/         ← What calls this?
supabase/functions/notification-service/   ← Backend or frontend?
supabase/functions/reporting/              ← Admin dashboard only?
supabase/functions/asset-service/          ← File handling?
supabase/functions/check_inventory/        ← Scheduled job?
supabase/functions/iot_telemetry_webhook/  ← IoT device callback?
supabase/functions/user-provisioning/      ← Onboarding?
```

**Action Required:** Add JSDoc with URL path and caller in each `index.ts`:
```typescript
/**
 * @route POST /ai_diagnostics
 * @caller src/pages/Assistant.jsx (line 42)
 * @caller supabase/functions/machine_record_service.ts
 */
export default async function(req: Request) { ... }
```

### 5. **Services with Sparse Test Coverage**
- `escalation_service.py` — tested via `test_new_features.py` (indirect)
  - ✓ initialize_ticket_escalation
  - ✓ approve_ticket_closure
  - ⚠️ check_repeat_failure logic (not explicitly tested)
  - ⚠️ send_escalation_whatsapp (integration untested)

- `intelligence_service.py` — tested via `test_assistant.py`
  - ✓ detect_language
  - ✓ extract_machine_record
  - ⚠️ check_repeat_failure (uncovered)
  - ⚠️ check_inventory (uncovered)

- `dashboard_service.py` — no explicit test file
  - Tests embedded in `test_new_features.py`
  - compute_kpis, build_custom_kpi_values logic not isolated

**Action:** Create dedicated test files:
- `test_escalation_service.py`
- `test_intelligence_service.py`
- `test_dashboard_service.py`

### 6. **Unclear Frontend-Backend Contracts**
No explicit documentation of API endpoints called by frontend pages.

**Example:** Records.jsx calls what?
```javascript
// src/pages/Records.jsx:364
const Records = () => {
  // Uses: apiFetch() from src/lib/api.js
  // But which /api/... endpoints?
  // Unclear from code alone
}
```

**Action:** Add JSDoc comments mapping frontend calls to backend routes:
```javascript
/**
 * @api GET /api/v1/records
 * @api POST /api/v1/records/:id/approve
 * @api POST /api/v1/records/:id/reject
 */
const Records = () => { ... }
```

---

## Bottleneck Nodes (High Centrality = Single Points of Failure)

| Node | Centrality | Role | Risk |
|------|-----------|------|------|
| **TicketRepository** | 0.044 | 23 unexplained connections | If broken, 23 routes affected |
| **MachineRepository** | 0.036 | 22 unexplained connections | CRITICAL |
| **UserRepository** | 0.031 | 16 unexplained connections | Auth collapse risk |

**Action:** Verify these 47+45+16 = 108 INFERRED edges are real or remove them.

---

## Thin Communities (70 omitted, <3 nodes each)

Over-fragmented modules with no clear integration:
- `test_vault_parts.py` community — only 1-2 nodes, no main workflow
- `OfflineQueue` community — offline caching exists but no integration visible
- `LocalSettingsRepository` — isolated in local dev path only
- Multiple config/constant files without callers

**Action:** Either connect these to main flow or document them as dev-only utilities.

---

## Recommendations (Priority Order)

### P0 (Critical)
- [ ] Fix AST extractor to capture `from x import y` dynamic patterns
  - Escalation service is already highly used but invisible
  - Multiple other services likely same issue

- [ ] Add Supabase edge function caller tracking
  - Document `supabase.functions.invoke()` pattern
  - Create index of all edge functions + callers

- [ ] Verify 92 INFERRED edges on MachineRepository, TicketRepository, UserRepository
  - Run `grep` to confirm or remove false positives
  - Reduces noise in centrality analysis

### P1 (High)
- [ ] Add missing integration tests
  - escalation_service.py (WhatsApp notifications, repeat failure logic)
  - intelligence_service.py (check_repeat_failure, check_inventory)
  - dashboard_service.py (KPI computation)

- [ ] Document edge function contracts
  - JSDoc in each supabase/functions/*/index.ts
  - Identify dead edge functions (ai_diagnostics, reporting, etc.)

- [ ] Map frontend-backend API contracts
  - Add comments to each React component showing backend /api/... calls
  - Create API spec document

### P2 (Medium)
- [ ] Audit conditional repository implementations
  - Document when Local* vs Sheets* vs Supabase* are used
  - Consider consolidating to reduce coupling

- [ ] Resolve ambiguous edges
  - `Evidence-Based Closure` ↔ `Spare-Part Requests` — is this real?
  - `Bluesky Icon` ↔ `Social Icon` — remove if metadata only

- [ ] Merge thin communities into parent workflows
  - Test utilities should cluster with what they test
  - Config constants should cluster with consumers

---

## Graph Quality Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Nodes | 2555 | ✓ Reasonable |
| Edges | 5548 | ⚠️ High INFERRED ratio (9%) |
| EXTRACTED edges | 5029 (91%) | ✓ Good |
| INFERRED edges | 519 (9%) | ⚠️ Needs verification |
| AMBIGUOUS edges | 2 (0.04%) | ✓ Acceptable |
| Isolated nodes | 275 (10.8%) | ⚠️ High, mostly config |
| Communities | 204 | ⚠️ Fragmented (70 thin) |

**Conclusion:** Graph structure is sound but extraction misses dynamic patterns and produces false inferred edges. Fixing the extraction will reduce noise and surface real gaps.
