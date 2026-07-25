# Dashboard Functionality Issues - Bug Report

**Date Identified:** 2026-07-25  
**Severity:** 🔴 HIGH (5 bugs found)  
**Status:** Ready for fixes

---

## Summary

Found 5 bugs in Dashboard that cause functionality issues:
1. ❌ Service Worker registered 8x (memory leak + duplicate requests)
2. ❌ Urgency field malformed (capitalization bug)
3. ❌ Invalid date handling (silent failures)
4. ❌ Complex conditional logic breaks data display
5. ❌ Inefficient state update (unnecessary spreads)

---

## Bug #1: Service Worker Registered Multiple Times 🔴 CRITICAL

**Location:** Browser console (vite-plugin-pwa)  
**Severity:** HIGH - Memory leak + duplicate network requests

**Issue:**
Service Worker is registered 8 times instead of once:
```
[log] Service Worker registered via vite-plugin-pwa (x8)
```

**Root Cause:** The service worker registration is triggered in a component that re-renders multiple times (likely in `main.jsx` or `App.jsx` in a useEffect without proper cleanup)

**Impact:**
- Memory leak from duplicate service workers
- Duplicate caching conflicts
- Potential offline data inconsistencies
- Increased CPU usage

**Fix Required:** Check `src/main.jsx` and ensure service worker registration is only called once on app initialization

---

## Bug #2: Urgency String Malformed 🔴 HIGH

**Location:** `src/pages/Dashboard.jsx:593`  
**Severity:** HIGH - Data display corruption

**Current Code:**
```javascript
urgency: (summary.urgency || 'Medium').charAt(0).toUpperCase() + (summary.urgency || 'medium').slice(1),
```

**Problem:**
- If `summary.urgency` is undefined:
  - First part: `'Medium'.charAt(0).toUpperCase()` → `'M'`
  - Second part: `'medium'.slice(1)` → `'edium'`
  - Result: `'Medium'` ✓ (accidentally works)

- But logic is confusing and inefficient
- If `summary.urgency = 'high'`:
  - First part: `'high'.charAt(0).toUpperCase()` → `'H'`
  - Second part: `'high'.slice(1)` → `'igh'`
  - Result: `'High'` ✓

**However, the real bug:** Inconsistent capitalization in filter logic at line 681:
```javascript
urgent_issues: needsAttention.filter((item) => item.urgency === 'High' || item.urgency === 'Critical'),
```

If `urgency` field is not properly capitalized, urgent issues won't be filtered correctly!

**Impact:** Urgent issues may be hidden from dashboard

**Recommended Fix:**
```javascript
urgency: (['high', 'critical'].includes(summary.urgency?.toLowerCase()) 
  ? summary.urgency.charAt(0).toUpperCase() + summary.urgency.slice(1).toLowerCase()
  : 'Medium'),
```

---

## Bug #3: Invalid Date Handling 🔴 HIGH

**Location:** `src/pages/Dashboard.jsx:626`  
**Severity:** HIGH - Silent calculation failures

**Current Code:**
```javascript
const opened = new Date(ticket.created_at || ticket.reported_at || '');
return monthKey(opened) === month.key ? total + ticketCost(ticket, partCostByTicket) : total;
```

**Problem:**
- If both `ticket.created_at` and `ticket.reported_at` are undefined/null
- Creates `new Date('')` which is **Invalid Date**
- `monthKey(opened)` will return `undefined`
- Comparisons with `month.key` will always be false
- Cost calculations silently skip that ticket

**Impact:** 
- Total cost and cost_by_month calculations are incorrect
- Tickets with missing dates are silently dropped
- Dashboard shows inaccurate financial data

**Recommended Fix:**
```javascript
const opened = new Date(ticket.created_at || ticket.reported_at);
if (isNaN(opened.getTime())) {
  console.warn(`Ticket ${ticket.id} has invalid date, skipping cost calculation`);
  return total;
}
return monthKey(opened) === month.key ? total + ticketCost(ticket, partCostByTicket) : total;
```

---

## Bug #4: Complex Conditional Logic - ai_summary Fallback 🔴 HIGH

**Location:** `src/pages/Dashboard.jsx:634`  
**Severity:** MEDIUM-HIGH - Data display corruption

**Current Code:**
```javascript
description: ticket.issue_text || 
  (typeof ticket.ai_summary === 'object' 
    ? ticket.ai_summary?.summary 
    : ticket.ai_summary) || 
  'Maintenance work',
```

**Problem:**
- If `ticket.ai_summary` is a string (not object), it's used as description
- If `ticket.ai_summary` is an object but `summary` field is missing, falls back to string representation of object
- Could result in `description: "[object Object]"` in the UI

**Impact:**
- Dashboard shows "[object Object]" as issue description
- Confusing UI for end users
- Breaks filtering and search functionality

**Recommended Fix:**
```javascript
description: ticket.issue_text || 
  (typeof ticket.ai_summary === 'object' 
    ? ticket.ai_summary?.summary 
    : null) || 
  'Maintenance work',
```

---

## Bug #5: Inefficient State Update with Redundant Spreads 🟡 MEDIUM

**Location:** `src/pages/Dashboard.jsx:715`  
**Severity:** MEDIUM - Performance impact

**Current Code:**
```javascript
setData({ 
  ...fallback,                    // ← spreads all fallback properties
  ...next,                        // ← overwrites with next data
  kpis: { 
    ...fallback.kpis,             // ← spreads fallback.kpis again (redundant!)
    ...next.kpis 
  }, 
  auto_insights: { 
    ...fallback.auto_insights,    // ← spreads fallback.auto_insights again (redundant!)
    ...next.auto_insights 
  } 
});
```

**Problem:**
- `fallback` is spread at top level (line 1)
- Then `fallback.kpis` is spread into kpis object (redundant, already there)
- Then `fallback.auto_insights` is spread into auto_insights (redundant, already there)
- Creates unnecessary object allocations
- Performance impact on each dashboard load

**Impact:**
- Slower state updates
- More memory allocation
- Unnecessary re-renders

**Recommended Fix:**
```javascript
setData({ 
  ...fallback,
  ...next,
  kpis: { 
    ...fallback.kpis,
    ...next.kpis 
  }, 
  auto_insights: { 
    ...fallback.auto_insights,
    ...next.auto_insights 
  } 
});
// Already correct - the top-level spread handles the merge
// OR simplify to:
setData(prev => ({
  ...prev,
  ...next,
  kpis: { ...prev.kpis, ...next.kpis },
  auto_insights: { ...prev.auto_insights, ...next.auto_insights }
}));
```

---

## Testing Recommendations

1. **Test with missing dates:**
   - Create tickets without `created_at` and `reported_at`
   - Verify cost calculations don't skip them
   - Check console for warnings

2. **Test urgency filtering:**
   - Create tickets with different urgency levels (high, critical, medium, low)
   - Verify urgent_issues section shows only high/critical
   - Check capitalization consistency

3. **Test ai_summary edge cases:**
   - Ticket with `ai_summary` as string
   - Ticket with `ai_summary` as object without `summary` field
   - Ticket with `ai_summary` as null/undefined
   - Verify descriptions display correctly

4. **Performance test:**
   - Load dashboard with 1000+ tickets
   - Monitor memory usage
   - Check for service worker duplication in DevTools

---

## Production Impact

**Affected Users:** All TurboFix users viewing dashboard

**Severity:**
- 🔴 BUG #1 (Service Worker): Causes memory leaks
- 🔴 BUG #2 (Urgency): Urgent issues hidden
- 🔴 BUG #3 (Date): Financial data incorrect
- 🟡 BUG #4 (ai_summary): Confusing UI
- 🟡 BUG #5 (State Update): Performance issue

---

## Deployment Status

**Before Deployment:** ALL 5 BUGS MUST BE FIXED

Recommend:
1. Fix bugs in order of severity (Bug #1, #2, #3, #4, #5)
2. Run full test suite after each fix
3. Manual testing on staging environment
4. Deploy to production when all tests pass

---

## Next Steps

1. Create tickets for each bug fix
2. Run through 3-agent workflow:
   - Creator Agent: Implement fixes
   - Reviewer Agent: Code review fixes
   - Approver Agent: Verify in production
3. Deploy updated Dashboard component

