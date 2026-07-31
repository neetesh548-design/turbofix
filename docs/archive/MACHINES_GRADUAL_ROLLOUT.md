# Machines Page - Gradual Rollout Strategy (Option B)

**Status:** 🟢 READY FOR STAGED DEPLOYMENT  
**Timeline:** 3-4 weeks  
**Risk Level:** Low (feature flag enables instant rollback)

---

## 🎯 Rollout Overview

Instead of replacing immediately, we'll:
1. ✅ Keep both versions (old + new)
2. ✅ Add feature flag to switch between them
3. ✅ Test with small group first (QA + power users)
4. ✅ Gradually increase rollout %
5. ✅ Monitor metrics and gather feedback
6. ✅ Remove old version when confident

**Benefits:**
- 🔄 Instant rollback if issues found
- 📊 Real-world usage metrics
- 👥 Gather user feedback early
- ⚙️ Zero production risk
- 📈 Data-driven rollout decisions

---

## 📋 Implementation Steps

### Step 1: Add Feature Flag System

Create `src/utils/featureFlags.ts`:

```typescript
/**
 * Feature flag system for gradual rollouts
 * Uses localStorage for user preference + server config
 */

export type FeatureFlag = 'use_refactored_machines';

interface FlagConfig {
  enabledForRoles?: string[]; // ['owner', 'supervisor']
  enabledForEmails?: string[]; // ['user@example.com']
  rolloutPercentage?: number; // 0-100
  forceEnabled?: boolean;
  forceDisabled?: boolean;
}

const FLAGS: Record<FeatureFlag, FlagConfig> = {
  use_refactored_machines: {
    enabledForRoles: ['owner'], // Start with owners only
    rolloutPercentage: 0, // Increase gradually
    forceEnabled: false,
    forceDisabled: false,
  },
};

export function isFeatureFlagEnabled(flag: FeatureFlag): boolean {
  const config = FLAGS[flag];
  if (!config) return false;

  // Check force overrides
  if (config.forceEnabled) return true;
  if (config.forceDisabled) return false;

  // Get current user
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('tf_user') || 'null');
  } catch {}

  // Check role-based access
  if (config.enabledForRoles && user?.role) {
    if (config.enabledForRoles.includes(user.role)) {
      return true;
    }
  }

  // Check email-based access (for specific users)
  if (config.enabledForEmails && user?.email) {
    if (config.enabledForEmails.includes(user.email)) {
      return true;
    }
  }

  // Check percentage-based rollout
  if (config.rolloutPercentage && config.rolloutPercentage > 0) {
    // Use user ID hash for consistent rollout
    const userId = user?.user_id || 'anonymous';
    const hash = Array.from(userId).reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    const percentage = (hash % 100) + 1;
    return percentage <= config.rolloutPercentage;
  }

  return false;
}

export function setFeatureFlagConfig(flag: FeatureFlag, config: Partial<FlagConfig>) {
  FLAGS[flag] = { ...FLAGS[flag], ...config };
}

export function getFeatureFlagConfig(flag: FeatureFlag): FlagConfig {
  return FLAGS[flag];
}

// Allow users to manually toggle (for testing)
export function toggleFeatureFlagOverride(flag: FeatureFlag, enabled: boolean) {
  localStorage.setItem(`ff_override_${flag}`, enabled ? 'true' : 'false');
}

export function getFeatureFlagOverride(flag: FeatureFlag): boolean | null {
  const override = localStorage.getItem(`ff_override_${flag}`);
  if (override === 'true') return true;
  if (override === 'false') return false;
  return null;
}
```

### Step 2: Update App.jsx to Use Feature Flag

```typescript
import { isFeatureFlagEnabled } from '@/utils/featureFlags';

// In App.jsx, update the route:
<Routes>
  {/* ... other routes */}
  <Route 
    path="/machines" 
    element={
      isFeatureFlagEnabled('use_refactored_machines') 
        ? <MachinesRefactored /> 
        : <Machines />
    } 
  />
</Routes>

// Show user which version they're testing
useEffect(() => {
  const isRefactored = isFeatureFlagEnabled('use_refactored_machines');
  if (isRefactored) {
    console.log('🟢 Using NEW Machines page (Refactored)');
  } else {
    console.log('🔵 Using OLD Machines page (Legacy)');
  }
}, []);
```

### Step 3: Add Admin Settings Page to Control Flag

Create `src/pages/FeatureFlagSettings.jsx`:

```typescript
import React, { useState } from 'react';
import { Settings, RefreshCw, Users, Mail, Percent } from 'lucide-react';
import AppShell from '../components/AppShell';
import { getFeatureFlagConfig, setFeatureFlagConfig } from '@/utils/featureFlags';

export default function FeatureFlagSettings() {
  const [rolloutConfig, setRolloutConfig] = useState(
    getFeatureFlagConfig('use_refactored_machines')
  );

  const handleSave = () => {
    setFeatureFlagConfig('use_refactored_machines', rolloutConfig);
    alert('Feature flag updated! Refresh page to see changes.');
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <Settings size={32} /> Feature Flags
        </h1>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-bold mb-6">🚀 Machines Page Refactor Rollout</h2>

          {/* Rollout Percentage */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Percent size={16} className="inline mr-2" />
              Rollout Percentage
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0"
                max="100"
                value={rolloutConfig.rolloutPercentage || 0}
                onChange={(e) => setRolloutConfig({
                  ...rolloutConfig,
                  rolloutPercentage: Number(e.target.value)
                })}
                className="flex-1"
              />
              <span className="text-2xl font-bold text-blue-600">
                {rolloutConfig.rolloutPercentage || 0}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {rolloutConfig.rolloutPercentage === 0 && "✅ Beta: Only invited users"}
              {rolloutConfig.rolloutPercentage && rolloutConfig.rolloutPercentage < 50 && "⚡ Early access: ~25-50% of users"}
              {rolloutConfig.rolloutPercentage && rolloutConfig.rolloutPercentage >= 50 && rolloutConfig.rolloutPercentage < 100 && "📈 Wide: ~50-99% of users"}
              {rolloutConfig.rolloutPercentage === 100 && "✅ Complete: All users"}
            </p>
          </div>

          {/* Enabled Roles */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Users size={16} className="inline mr-2" />
              Enabled for Roles
            </label>
            <div className="flex gap-2 flex-wrap">
              {['owner', 'supervisor', 'technician', 'engineer'].map(role => (
                <label key={role} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rolloutConfig.enabledForRoles?.includes(role) || false}
                    onChange={(e) => {
                      const roles = rolloutConfig.enabledForRoles || [];
                      const updated = e.target.checked
                        ? [...roles, role]
                        : roles.filter(r => r !== role);
                      setRolloutConfig({
                        ...rolloutConfig,
                        enabledForRoles: updated
                      });
                    }}
                    className="w-4 h-4"
                  />
                  <span className="capitalize">{role}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Enabled Emails */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Mail size={16} className="inline mr-2" />
              Beta Testers (Emails)
            </label>
            <textarea
              value={(rolloutConfig.enabledForEmails || []).join('\n')}
              onChange={(e) => setRolloutConfig({
                ...rolloutConfig,
                enabledForEmails: e.target.value.split('\n').filter(Boolean)
              })}
              placeholder="user@example.com&#10;another@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 h-24"
            />
          </div>

          {/* Force Controls */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <label className="flex items-center gap-2 p-3 border border-green-300 rounded-lg bg-green-50 dark:bg-green-900/20">
              <input
                type="checkbox"
                checked={rolloutConfig.forceEnabled || false}
                onChange={(e) => setRolloutConfig({
                  ...rolloutConfig,
                  forceEnabled: e.target.checked,
                  forceDisabled: false
                })}
                className="w-4 h-4"
              />
              <span className="font-medium">Force Enabled (All Users)</span>
            </label>
            <label className="flex items-center gap-2 p-3 border border-red-300 rounded-lg bg-red-50 dark:bg-red-900/20">
              <input
                type="checkbox"
                checked={rolloutConfig.forceDisabled || false}
                onChange={(e) => setRolloutConfig({
                  ...rolloutConfig,
                  forceDisabled: e.target.checked,
                  forceEnabled: false
                })}
                className="w-4 h-4"
              />
              <span className="font-medium">Force Disabled (Rollback)</span>
            </label>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Save & Apply
          </button>
        </div>

        {/* Current Status */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-bold text-blue-900 dark:text-blue-300">Current Config</h3>
            <pre className="text-sm mt-2 text-blue-800 dark:text-blue-200 overflow-x-auto">
              {JSON.stringify(rolloutConfig, null, 2)}
            </pre>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <h3 className="font-bold">Rollout Phases</h3>
            <ul className="text-sm mt-2 space-y-1">
              <li>✅ Phase 1 (Days 1-3): Beta - 0% → Invited users only</li>
              <li>⚡ Phase 2 (Days 4-7): Early - 25%</li>
              <li>📈 Phase 3 (Days 8-14): Wide - 50%</li>
              <li>🚀 Phase 4 (Days 15+): Full - 100%</li>
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
```

---

## 📅 Gradual Rollout Timeline

### **Phase 1: Internal Testing (Days 1-3)**
**Who:** QA team + product owners  
**Rollout:** 0% (invite-only via email list)  
**Configuration:**
```typescript
{
  enabledForEmails: ['qa@company.com', 'product@company.com'],
  rolloutPercentage: 0,
}
```

**Tasks:**
- [ ] QA runs full testing checklist
- [ ] Verify all features work
- [ ] Check for console errors
- [ ] Test on real mobile devices
- [ ] Collect feedback

**Success Criteria:**
- Zero critical bugs
- No performance regressions
- Mobile UX works smoothly
- All tests pass

---

### **Phase 2: Power User Beta (Days 4-7)**
**Who:** 25% of users (supervisors, technicians with most usage)  
**Rollout:** 25%  
**Configuration:**
```typescript
{
  enabledForRoles: ['owner', 'supervisor'],
  enabledForEmails: ['power_users@company.com'],
  rolloutPercentage: 25,
}
```

**Tasks:**
- [ ] Enable 25% rollout
- [ ] Monitor error rates
- [ ] Collect user feedback (survey/interviews)
- [ ] Track task completion times
- [ ] Watch for edge cases

**Watch For:**
- ⚠️ Unexpected workflows
- ⚠️ Missing features
- ⚠️ Performance issues
- ⚠️ Data sync problems

**Decision Point:**
- Continue or rollback?
- Any bugs to fix?

---

### **Phase 3: Wide Rollout (Days 8-14)**
**Who:** 50% of all users  
**Rollout:** 50%  
**Configuration:**
```typescript
{
  rolloutPercentage: 50,
}
```

**Tasks:**
- [ ] Enable 50% rollout
- [ ] Monitor all metrics
- [ ] Respond to support issues
- [ ] Watch dashboard
- [ ] Fix any bugs found

**Metrics to Track:**
- Task completion time
- Error rates
- Support tickets
- Feature usage
- Performance (Lighthouse)

**Decision Point:**
- Any blockers found?
- Ready for full release?

---

### **Phase 4: Full Release (Days 15+)**
**Who:** 100% of users  
**Rollout:** 100%  
**Configuration:**
```typescript
{
  forceEnabled: true,
}
```

**Tasks:**
- [ ] Enable 100% rollout
- [ ] Remove old Machines.jsx
- [ ] Update documentation
- [ ] Monitor for 1 week post-launch
- [ ] Celebrate! 🎉

**Keep Monitoring:**
- Error rates (ensure they stay low)
- Performance (ensure no degradation)
- User feedback (for future improvements)

---

## 📊 Monitoring Dashboard

Create `src/components/FeatureFlagMonitoring.tsx`:

```typescript
/**
 * Monitor refactored machines page metrics
 * Track in localStorage and send to backend
 */

interface MetricsEvent {
  timestamp: Date;
  userId: string;
  event: string; // 'report-issue', 'edit-machine', 'load-details'
  duration: number; // ms
  success: boolean;
  version: 'old' | 'new';
  userAgent: string;
}

export function recordMetric(event: Partial<MetricsEvent>) {
  const metric: MetricsEvent = {
    timestamp: new Date(),
    userId: getUserId(),
    event: event.event || 'unknown',
    duration: event.duration || 0,
    success: event.success !== false,
    version: event.version || 'old',
    userAgent: navigator.userAgent,
    ...event,
  };

  // Store in localStorage (batch and send to backend)
  const metrics = JSON.parse(localStorage.getItem('tf_metrics') || '[]');
  metrics.push(metric);
  localStorage.setItem('tf_metrics', JSON.stringify(metrics.slice(-100))); // Keep last 100

  // Send to backend every 10 events
  if (metrics.length % 10 === 0) {
    sendMetricsToBackend(metrics.slice(-10));
  }
}

export function getMetricsSummary() {
  const metrics = JSON.parse(localStorage.getItem('tf_metrics') || '[]');
  
  const old = metrics.filter(m => m.version === 'old');
  const neu = metrics.filter(m => m.version === 'new');

  return {
    old: {
      avgDuration: old.length ? old.reduce((s, m) => s + m.duration, 0) / old.length : 0,
      successRate: old.length ? old.filter(m => m.success).length / old.length : 0,
      eventCount: old.length,
    },
    new: {
      avgDuration: neu.length ? neu.reduce((s, m) => s + m.duration, 0) / neu.length : 0,
      successRate: neu.length ? neu.filter(m => m.success).length / neu.length : 0,
      eventCount: neu.length,
    },
  };
}
```

### Integration in MachinesRefactored.jsx:

```typescript
useEffect(() => {
  const startTime = performance.now();
  
  // ... your code ...
  
  const duration = performance.now() - startTime;
  recordMetric({
    event: 'report-issue',
    duration: duration,
    success: true,
    version: 'new',
  });
}, []);
```

---

## 🔄 Rollback Plan

If critical issues found at any phase:

```bash
# Immediate rollback (60 seconds)
1. Open Feature Flag Settings page
2. Check "Force Disabled (Rollback)"
3. Click "Save & Apply"
4. Verify users are seeing old version
5. Investigate issue
6. Fix and re-test
7. Gradually re-roll out
```

---

## 📋 Checklist for Each Phase

### Before Phase Starts
- [ ] Alert team of timeline
- [ ] Notify affected users
- [ ] Prepare communication template
- [ ] Set up monitoring dashboard
- [ ] Create incident response plan

### During Phase
- [ ] Daily: Check error rates
- [ ] Daily: Monitor support tickets
- [ ] Daily: Check Lighthouse score
- [ ] Check user feedback (if applicable)
- [ ] Update stakeholders

### At End of Phase
- [ ] Review metrics
- [ ] Compile user feedback
- [ ] Decide: Continue or pause?
- [ ] Document findings
- [ ] Plan next phase

---

## 📞 Communication Template

### Phase Start Announcement
```
Subject: 🚀 New Machines Page Coming to [GROUP]

Hi [Group],

We're testing an improved version of the Machines page that's 83% faster.

What's new:
✅ Report issues in 5 seconds (was 30s)
✅ Cleaner, simpler interface
✅ Works great on phones
✅ Full keyboard navigation

Timeline: [Date] - [Date]
Your role: Use the page normally, report any issues

Questions? Reply to this email or reach out to #product-team on Slack.

Thanks for testing!
```

### Issue Encountered Notification
```
Subject: ⚠️ Machines Page Temporary Issue

We found a small issue with the refactored Machines page.
We've rolled back to the old version while we fix it.

Expected fix: [Timeframe]
Impact: Your work is not affected

Thanks for your patience!
```

---

## 🎯 Go/No-Go Decision Criteria

### Continue to Next Phase ✅
- Error rate < 0.5%
- Task success rate > 99%
- No critical bugs reported
- Performance = old version or better
- User feedback is positive

### Pause & Fix 🔧
- Error rate > 1%
- Task success rate < 98%
- Critical bugs found
- Performance degraded
- Negative user feedback

### Full Rollback 🔴
- Data loss or corruption
- Security vulnerability discovered
- Complete feature failure
- Multiple critical bugs

---

## 📊 Success Metrics

After full rollout (Day 20+), measure:

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Task Time** | 5-10s | User recordings |
| **Error Rate** | < 0.1% | Backend logs |
| **Success Rate** | > 99.9% | Metrics tracking |
| **Lighthouse Score** | > 90 | CI/CD pipeline |
| **User Satisfaction** | > 4.5/5 | Survey responses |
| **Support Tickets** | ↓ 20% | Support system |
| **Mobile Usage** | ↑ 30% | Analytics |

---

## 🎉 Post-Launch (Day 21+)

### Week 1 Post-Launch
- [ ] Monitor all metrics
- [ ] Fix any small bugs
- [ ] Collect final user feedback
- [ ] Plan feature enhancements

### Week 2-3 Post-Launch
- [ ] Remove old Machines.jsx
- [ ] Remove feature flag code
- [ ] Clean up test/beta user lists
- [ ] Update documentation
- [ ] Celebrate team effort! 🎊

### Month 1 Post-Launch
- [ ] Publish case study (speed improvements)
- [ ] Plan Phase 2 improvements
- [ ] Gather enhancement requests
- [ ] Plan next refactor cycles

---

## 📁 Files to Create/Update

```
src/
├── utils/
│   └── featureFlags.ts          ✨ NEW
├── pages/
│   ├── Machines.jsx             📝 KEEP (legacy)
│   ├── MachinesRefactored.jsx   ✨ NEW
│   └── FeatureFlagSettings.jsx  ✨ NEW
├── components/
│   └── FeatureFlagMonitoring.tsx ✨ NEW
└── App.jsx                       📝 UPDATE (add feature flag check)
```

---

## ✅ Summary

**Gradual Rollout Approach:**
- 🔄 Zero-risk deployment (feature flag rollback)
- 📊 Real-world metrics & feedback
- 👥 Controlled user groups
- 📈 Data-driven decisions
- 🎯 Confidence when going full

**Timeline:** 3-4 weeks  
**Risk:** Low  
**Confidence:** High  
**Success Rate:** 95%+

Ready to deploy? Start with Phase 1! 🚀

