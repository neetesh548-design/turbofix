# Gradual Rollout Implementation Checklist

**Status:** 📋 READY TO IMPLEMENT  
**Time to Setup:** ~2 hours  
**Complexity:** Low

---

## 🎯 Quick Start (Copy-Paste Ready)

### Step 1: Add Feature Flag Check to App.jsx

Find this in `src/App.jsx`:
```jsx
import Machines from './pages/Machines';
```

Replace with:
```jsx
import Machines from './pages/Machines';
import MachinesRefactored from './pages/MachinesRefactored';
import { isFeatureFlagEnabled } from '@/utils/featureFlags';
```

Then find the routes section:
```jsx
<Route path="/machines" element={<Machines />} />
```

Replace with:
```jsx
<Route 
  path="/machines" 
  element={
    isFeatureFlagEnabled('use_refactored_machines') 
      ? <MachinesRefactored /> 
      : <Machines />
  } 
/>
```

Add this useEffect to log which version users are seeing:
```jsx
useEffect(() => {
  const isRefactored = isFeatureFlagEnabled('use_refactored_machines');
  console.log(
    isRefactored 
      ? '🟢 User is testing NEW Machines page (Refactored)' 
      : '🔵 User is using OLD Machines page (Legacy)'
  );
}, []);
```

---

### Step 2: Add Admin Settings Route

Find your routes in `src/App.jsx` and add:
```jsx
<Route path="/admin/feature-flags" element={<FeatureFlagSettings />} />
```

Import it:
```jsx
import FeatureFlagSettings from './pages/FeatureFlagSettings';
```

---

### Step 3: Create FeatureFlagSettings Component

Copy the code from the gradual rollout guide and save it as:
`src/pages/FeatureFlagSettings.jsx`

---

## 📅 Phase Transition Quick Guide

### Before Each Phase Change

1. **Open Feature Flag Settings**
   - Navigate to `/admin/feature-flags`
   - Only accessible to users with `owner` role

2. **Make Configuration Changes**

   **Phase 1 → Phase 2 (Day 4):**
   ```
   Rollout Percentage: 0% → 25%
   Enabled Roles: Add 'supervisor'
   ```

   **Phase 2 → Phase 3 (Day 8):**
   ```
   Rollout Percentage: 25% → 50%
   ```

   **Phase 3 → Phase 4 (Day 15):**
   ```
   Rollout Percentage: 50% → 100%
   OR check "Force Enabled"
   ```

3. **Click "Save & Apply"**
   - Changes take effect immediately
   - Users see message in browser console

4. **Monitor Dashboard**
   - Watch error rates
   - Check support tickets
   - Gather user feedback

---

## ✅ Implementation Checklist

### Before Launch (Day 1)

**Code Setup:**
- [ ] Copy `src/utils/featureFlags.ts` to your project
- [ ] Copy `src/pages/MachinesRefactored.jsx` to your project
- [ ] Copy `src/pages/FeatureFlagSettings.jsx` to your project
- [ ] Update `src/App.jsx` with feature flag check (see Step 1 above)
- [ ] Add admin route for `/admin/feature-flags`
- [ ] Run `npm run build` to verify no errors

**Testing:**
- [ ] Verify feature flag works: `isFeatureFlagEnabled('use_refactored_machines')`
- [ ] Test on old browser tab: should see OLD version
- [ ] Test manual override: `setFeatureFlagOverride('use_refactored_machines', true)`
- [ ] Refresh page: should see NEW version
- [ ] Clear override: `setFeatureFlagOverride('use_refactored_machines', null)`
- [ ] Check console: look for feature flag debug messages

**Documentation:**
- [ ] Send team email announcing rollout
- [ ] Share feature flag settings access with admins
- [ ] Create runbook for rollback procedure
- [ ] Prepare monitoring dashboard

---

### Phase 1: Internal Testing (Days 1-3)

**Configuration:**
```javascript
// In Feature Flag Settings or direct update:
{
  enabledForEmails: [
    'qa@company.com',
    'product@company.com',
    'your.name@company.com',
  ],
  rolloutPercentage: 0,
  forceEnabled: false,
  forceDisabled: false,
}
```

**Tasks:**
- [ ] Day 1: QA runs full testing checklist
- [ ] Day 2: Fix any bugs found
- [ ] Day 3: Collect feedback, decide go/no-go

**Go/No-Go Decision:**
- [ ] Error rate < 0.5% ✅
- [ ] No critical bugs ✅
- [ ] QA approval received ✅
- [ ] Proceed to Phase 2?

---

### Phase 2: Power User Beta (Days 4-7)

**Configuration Changes:**
```javascript
{
  enabledForRoles: ['owner', 'supervisor'],
  rolloutPercentage: 25, // ~25% of users get new version
}
```

**Implementation:**
- [ ] Day 4: Update configuration
- [ ] Day 4: Notify supervisors
- [ ] Days 4-7: Monitor metrics
- [ ] Days 4-7: Collect user feedback

**Key Metrics:**
- [ ] Track: Report Issue time (target: 5-10s)
- [ ] Track: Task success rate (target: >99%)
- [ ] Track: Error rate (target: <0.5%)

**Decision Point:**
- [ ] Metrics looking good? Continue
- [ ] Issues found? Fix before continuing
- [ ] Ready for Phase 3?

---

### Phase 3: Wide Rollout (Days 8-14)

**Configuration Changes:**
```javascript
{
  enabledForRoles: [], // Remove role restriction
  rolloutPercentage: 50, // ~50% of all users
}
```

**Implementation:**
- [ ] Day 8: Update to 50% rollout
- [ ] Day 8: Notify all users
- [ ] Days 8-14: Monitor closely
- [ ] Daily: Check support tickets
- [ ] Daily: Monitor error rates

**Watch For:**
- [ ] Any spike in errors?
- [ ] Support tickets increasing?
- [ ] Negative user feedback?
- [ ] Performance degradation?

**Decision Point:**
- [ ] Metrics stable? Ready for Phase 4
- [ ] Issues found? Fix and pause
- [ ] Rollback if critical?

---

### Phase 4: Full Release (Day 15+)

**Configuration Changes:**
```javascript
{
  forceEnabled: true, // All users get new version
  rolloutPercentage: 0, // Percentage no longer matters
}
```

**Implementation:**
- [ ] Day 15: Update to Force Enabled
- [ ] Day 15: Send "All users now on new version" email
- [ ] Week 1: Monitor closely
- [ ] Week 2-3: Remove old code

**Post-Launch Tasks:**
- [ ] Remove old `src/pages/Machines.jsx`
- [ ] Remove feature flag conditional in App.jsx
- [ ] Remove FeatureFlagSettings admin page
- [ ] Update documentation

---

## 🚨 Emergency Rollback (Any Time)

If critical issue found:

1. **Immediate Rollback (30 seconds):**
   - Open `/admin/feature-flags`
   - Check "Force Disabled (Rollback)"
   - Click "Save & Apply"
   - All users see old version instantly

2. **Investigation (1-2 hours):**
   - Identify root cause
   - Fix the issue
   - Test thoroughly
   - Verify fix works

3. **Re-Rollout (2-4 hours):**
   - Clear "Force Disabled"
   - Set to previous phase
   - Monitor metrics closely
   - Proceed cautiously

---

## 📊 Monitoring Command Reference

### In Browser Console:

```javascript
// Check if current user gets new version
isFeatureFlagEnabled('use_refactored_machines')

// View detailed debug info
logFeatureFlagsDebug()

// Manually test override
setFeatureFlagOverride('use_refactored_machines', true) // Force new
setFeatureFlagOverride('use_refactored_machines', false) // Force old
setFeatureFlagOverride('use_refactored_machines', null) // Clear override

// Get current config
getFeatureFlagConfig('use_refactored_machines')

// See all flags status
getAllFeatureFlags()

// Track metrics
recordMetric({
  flag: 'use_refactored_machines',
  enabled: true,
  event: 'report-issue',
  duration: 4500, // ms
})

// See metrics summary
getMetricsSummary('use_refactored_machines')
```

---

## 🎯 Success Indicators by Phase

### Phase 1 Complete When:
- ✅ All QA tests pass
- ✅ No critical bugs
- ✅ Team comfortable with code
- ✅ Ready for power users

### Phase 2 Complete When:
- ✅ Task time = old version or better
- ✅ Error rate < 0.5%
- ✅ Positive user feedback
- ✅ No new issues found

### Phase 3 Complete When:
- ✅ 50% adoption stable
- ✅ Support tickets not increasing
- ✅ Metrics unchanged or improved
- ✅ Ready for full release

### Phase 4 Complete When:
- ✅ 100% users on new version
- ✅ Old code removed
- ✅ Metrics stable for 1 week
- ✅ No regressions

---

## 📞 Communication Templates

### Phase Announcement Email Template

```
Subject: Testing new Machines page feature (Phase X)

Hi [Group Name],

Starting [DATE], we're rolling out an improved Machines page that's:
✅ 83% faster (5 seconds vs 30 seconds)
✅ Simpler to use
✅ Mobile-friendly

YOUR ROLE:
• Use the page normally
• Report any issues to #product-slack
• Give feedback if anything feels wrong

TIMELINE:
• Phase X: [DATE] to [DATE]
• If you see any issues, email support@company.com

TECHNICAL DETAILS:
You may see a new version of the Machines page. This is normal.
If you want to switch back to the old version, let us know.

Questions? Reach out to the Product team.

Thank you!
```

### Issue Response Template

```
Subject: 🚨 Issue found in Machines page - temporary rollback

We discovered a small issue in the new Machines page.
We've temporarily switched everyone back to the old version.

Status:
🔧 FIXING (ETA: [Time])
🟢 FIXED (we'll re-roll out when ready)

Impact:
• Your work is not affected
• Everything works normally
• You can continue using the app

We'll notify you when we re-enable the new version.

Thank you for your patience!
```

---

## 🔍 Troubleshooting

### "Users not seeing new version"
```javascript
// Check if feature flag is enabled
isFeatureFlagEnabled('use_refactored_machines') // Should be true

// Check configuration
getFeatureFlagConfig('use_refactored_machines')

// If percentage-based, check if user ID hashes correctly
getCurrentUser() // Should return user object with user_id
```

### "Manual override not working"
```javascript
// Clear any existing overrides
setFeatureFlagOverride('use_refactored_machines', null)

// Then set new override
setFeatureFlagOverride('use_refactored_machines', true)

// Refresh page
window.location.reload()
```

### "Performance degradation detected"
```javascript
// Check metrics
getMetricsSummary('use_refactored_machines')

// Identify slow operations
recordMetric({
  flag: 'use_refactored_machines',
  enabled: true,
  event: 'page_load',
  duration: 2000, // ms
})

// If needed, trigger rollback
setFeatureFlagConfig('use_refactored_machines', { forceDisabled: true })
```

---

## ✅ Final Verification

Before starting Phase 1:

```bash
# 1. Verify files exist
ls src/utils/featureFlags.ts
ls src/pages/MachinesRefactored.jsx
ls src/pages/FeatureFlagSettings.jsx

# 2. Build and verify no errors
npm run build

# 3. Test feature flag in browser console
isFeatureFlagEnabled('use_refactored_machines') // Should return false initially

# 4. Test admin page access
# Navigate to /admin/feature-flags (should be accessible to owner role)

# 5. Check console messages
# Should see: "🔵 User is using OLD Machines page (Legacy)"
```

---

## 🎉 You're Ready!

When all checkboxes are complete:
1. ✅ Code setup verified
2. ✅ Feature flag working
3. ✅ Admin settings accessible
4. ✅ Team communication sent

**Start Phase 1 → Day 1 at [TIME]**

Good luck! 🚀

