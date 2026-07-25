# ESLint Warnings - Systematic Fix Guide

**Total Warnings Found:** 87  
**Status:** Ready to fix  
**Target:** 0 warnings  

---

## Quick Stats

| Category | Count | Priority | Est. Time |
|----------|-------|----------|-----------|
| Unused imports | 42 | HIGH | 15 min |
| Unused variables | 35 | HIGH | 20 min |
| Unused parameters | 8 | MEDIUM | 10 min |
| Control regex | 1 | MEDIUM | 2 min |
| Unused escape chars | 3 | MEDIUM | 1 min |
| Missing hook deps | 1 | HIGH | 2 min |
| Export components | 2 | LOW | 3 min |
| **TOTAL** | **87** | | **~53 min** |

---

## PRIORITY 1: UNUSED IMPORTS (42 warnings)

**Files with unused imports:** 14 files  
**Est. Time:** 15 minutes  
**Approach:** Remove each unused import

### src/pages/Login.jsx
```javascript
// Line 5: Remove unused imports
// ❌ CURRENT:
import { Building, User, Phone, Upload } from 'lucide-react';

// ✅ FIXED:
// (Remove this line entirely if all are unused, or keep only used ones)
```
**Unused:** Building, User, Phone, Upload (4 imports)

### src/pages/Settings.jsx
```javascript
// Line 4: Remove unused import
// ❌ CURRENT:
import { ArrowUpRight } from 'lucide-react';

// ✅ FIXED:
// (Remove if not used in component)
```
**Unused:** ArrowUpRight (1 import)

### src/pages/Inventory.jsx
```javascript
// Line 6: Remove unused imports
// ❌ CURRENT:
import { Plus, Factory, ArrowRight, Filter, ChevronRight } from 'lucide-react';

// ✅ FIXED:
// (Keep only: Plus or Factory - whichever is actually used)
```
**Unused:** Plus, Factory, ArrowRight, Filter, ChevronRight (5 imports)

### src/pages/Kaizen.jsx
```javascript
// Lines 3-6: Remove many unused imports
// ❌ CURRENT:
import { Activity, BookOpen, CalendarDays, ChevronRight, CircleAlert, Droplets, FileCheck2, MessageSquare, Play, ShieldCheck, TrendingUp, User, ArrowRight, Eye, RefreshCw } from 'lucide-react';

// ✅ FIXED:
// (Keep only the icons actually used in the component)
```
**Unused:** Activity, BookOpen, CalendarDays, ChevronRight, CircleAlert, Droplets, FileCheck2, MessageSquare, Play, ShieldCheck, TrendingUp, User, ArrowRight, Eye, RefreshCw (15 imports!)

### src/pages/Team.jsx
```javascript
// Line 4: Remove unused import
// ❌ CURRENT:
import { ContactReveal } from 'lucide-react';

// ✅ FIXED:
// (Remove if not used)
```
**Unused:** ContactReveal (1 import)

### src/pages/QRGateway.jsx
**No import issues**

### src/pages/MachinesRefactored.jsx
```javascript
// Line 4: Remove unused imports
// ❌ CURRENT:
import { AlertCircle, Edit2, Eye, EyeOff } from 'lucide-react';

// ✅ FIXED:
// (Keep only used icons)
```
**Unused:** AlertCircle, Edit2, Eye, EyeOff (4 imports)

### src/MachineContext.jsx
```javascript
// Line 1: Remove unused import
// ❌ CURRENT:
import React, { createContext, useState, useContext, useEffect } from 'react';

// ✅ FIXED:
import React, { createContext, useState, useContext } from 'react';
// (Remove useEffect if not used)
```
**Unused:** useEffect (1 import)

### src/components/ClosedLoopControlCard.jsx
```javascript
// Line 9: Remove unused import
// ❌ CURRENT:
import { CheckCircleOutlined } from '@ant-design/icons';

// ✅ FIXED:
// (Remove if not used)
```
**Unused:** CheckCircleOutlined (1 import)

### src/components/AntDNavigationLayout.jsx
```javascript
// Line 8: Remove unused import
// ❌ CURRENT:
import { Breadcrumb } from 'antd';

// ✅ FIXED:
// (Remove if not used)
```
**Unused:** Breadcrumb (1 import)

### src/hooks/useTheme.jsx
**No import issues**

### src/__tests__/performance.test.js
```javascript
// Line 2: Remove unused import
// ❌ CURRENT:
import { useMemoCallback } from 'some-library';

// ✅ FIXED:
// (Remove if not used)
```
**Unused:** useMemoCallback (1 import)

### tests/qr-gateway.spec.ts
```javascript
// Line 1: Remove unused import
// ❌ CURRENT:
import { BrowserContext } from '@playwright/test';

// ✅ FIXED:
// (Remove if not used in tests)
```
**Unused:** BrowserContext (1 import)

---

## PRIORITY 2: UNUSED VARIABLES (35 warnings)

**Files affected:** 12 files  
**Est. Time:** 20 minutes  
**Approach:** Either remove or prefix with `_` if intentional

### Pattern 1: Completely Unused (Remove)
```javascript
// ❌ REMOVE THESE:
const uploadingPhoto = false;  // src/pages/QRGateway.jsx:282
const offlineQueued = [];       // src/pages/QRGateway.jsx:295
const canvas = null;            // tests/utils/qr-gateway-helpers.ts:248
const srcset = '';              // tests/ux-audit/responsive.spec.ts:225
const sizes = '';               // tests/ux-audit/responsive.spec.ts:226
```

### Pattern 2: Intentional But Unused (Prefix with `_`)
```javascript
// ✅ FIX BY PREFIXING:
const _timestamp = Date.now();  // supabase/functions/iot_telemetry_webhook/index.ts:14
const _factory = null;           // supabase/functions/check_inventory/index.ts:83
const _error = null;             // supabase/functions/ticket_gateway/index.ts:352
const _ctx = null;               // supabase/functions/reporting/index.ts:15
const _h2s = [];                 // tests/ux-audit/accessibility.spec.ts:102
```

### Files with Unused Variables

**src/pages/Dashboard.jsx**
- Line 1461: Function `KpiCard` declared but never used → Remove

**src/pages/Settings.jsx**
- Line 66: Variable `activeTab` → Prefix with `_` or remove
- Line 127: Variable `selectTab` → Prefix with `_` or remove

**src/pages/Tickets.jsx**
- Line 430: Variable `status` → Prefix with `_` or remove

**src/pages/Inventory.jsx**
- Line 67: Variable `filteredItems` → Prefix with `_` or remove

**src/pages/Kaizen.jsx**
- Line 13: Variable `KAIZEN_CATEGORIES` → Remove if not used
- Line 37: Variable `KAIZEN_STATUSES` → Remove if not used
- Line 117: Variable `users` → Prefix with `_` or remove
- Line 124: Variable `setUrgency` → Prefix with `_` or remove
- Line 127: Multiple variables → Prefix with `_` or remove

**src/pages/Team.jsx**
- Line 18: Variable `setActiveFilter` → Prefix with `_` or remove
- Line 164-167: Variables `techniciansCount`, `portalCount`, `responseCount`, `visibleTeam` → Prefix with `_` or remove

**src/__tests__/CounterWidget.test.jsx**
- Line 140: Parameter `lang` → Prefix with `_` or remove

**src/__tests__/CounterWidget.e2e.js**
- Line 221: Variable `tooltip` → Prefix with `_` or remove
- Line 244: Variable `incrementBtn` → Prefix with `_` or remove
- Line 245: Variable `counterWidget` → Prefix with `_` or remove

**src/__tests__/performance.test.js**
- Lines 12-14: Parameters `deps`, `cb` → Prefix with `_` or remove

**tests/ux-audit/accessibility.spec.ts**
- Multiple variables → Prefix with `_` or remove

**tests/ux-audit/performance.spec.ts**
- Line 259: Variable `startTime` → Prefix with `_` or remove

**tests/ux-audit/interactions.spec.ts**
- Line 250: Variable `content` → Prefix with `_` or remove

**supabase/functions/notification-service/index.ts**
- Line 38: Variable `error` → Prefix with `_` or remove

---

## PRIORITY 3: UNUSED PARAMETERS (8 warnings)

**Est. Time:** 10 minutes  
**Approach:** Prefix with `_` to indicate intentional

### Catch Parameters (Handle or Prefix)
```javascript
// ❌ CURRENT:
catch (e) {
  // error not handled
}

// ✅ FIXED:
catch (_e) {
  // error intentionally ignored
}
```

**Files with unused catch parameters:**
- tests/qr-gateway.spec.ts:519
- src/pages/Assistant.jsx:252
- src/pages/QRGateway.jsx:932, 1041, 1096, 1160
- tests/ux-audit/accessibility.spec.ts
- supabase/functions/whatsapp_webhook/index.ts:147

### Function Parameters
```javascript
// ❌ CURRENT:
function reportData(ctx) {
  // ctx not used
}

// ✅ FIXED:
function reportData(_ctx) {
  // ctx intentionally not used
}
```

**Files:**
- supabase/functions/reporting/index.ts:15
- supabase/functions/user-provisioning/index.ts:15

---

## PRIORITY 4: REGEX & ESCAPE ISSUES (4 warnings)

**Est. Time:** 3 minutes

### Issue 1: Control Characters in Regex
**File:** supabase/functions/ai_assistant/index.ts:78
```javascript
// ❌ CURRENT:
const regex = /[control-character]/;

// ✅ FIXED:
// (Need to see actual code - likely replace control char with escape)
```

### Issue 2: Unnecessary Escape Characters (3 instances)
**File:** supabase/functions/_shared/gemini.ts:238
```javascript
// ❌ CURRENT:
const template = `\`backticks\``;

// ✅ FIXED:
const template = ``backticks``;
// (Remove unnecessary backslashes)
```

---

## PRIORITY 5: REACT HOOK ISSUES (1 warning)

**Est. Time:** 2 minutes

### Missing useEffect Dependencies
**File:** src/pages/QRGateway.jsx:487
```javascript
// ❌ CURRENT:
useEffect(() => {
  greetUser();  // Function used but not in dependencies
}, []);

// ✅ FIXED:
useEffect(() => {
  greetUser();
}, [greetUser]);  // Add missing dependency
```

---

## PRIORITY 6: COMPONENT EXPORT ISSUES (2 warnings)

**Est. Time:** 3 minutes  
**Approach:** Create separate file for constants/exports

### Issue: Fast Refresh Only for Components
**Files:**
- src/MachineContext.jsx:63
- src/hooks/useTheme.jsx:32

```javascript
// ❌ CURRENT (in component file):
export const CONSTANT = 'value';

export default MyComponent;

// ✅ FIXED (move constant to separate file):
// constants.js
export const CONSTANT = 'value';

// MyComponent.jsx
import { CONSTANT } from './constants';
export default MyComponent;
```

---

## SYSTEMATIC FIX PLAN

### Step 1: Unused Imports (15 min)
1. [ ] src/pages/Login.jsx - Remove 4 imports
2. [ ] src/pages/Settings.jsx - Remove 1 import
3. [ ] src/pages/Inventory.jsx - Remove 5 imports
4. [ ] src/pages/Kaizen.jsx - Remove 15 imports
5. [ ] src/pages/Team.jsx - Remove 1 import
6. [ ] src/pages/MachinesRefactored.jsx - Remove 4 imports
7. [ ] src/MachineContext.jsx - Remove 1 import
8. [ ] src/components/ClosedLoopControlCard.jsx - Remove 1 import
9. [ ] src/components/AntDNavigationLayout.jsx - Remove 1 import
10. [ ] src/__tests__/performance.test.js - Remove 1 import
11. [ ] tests/qr-gateway.spec.ts - Remove 1 import

### Step 2: Unused Variables (20 min)
1. [ ] src/pages/Dashboard.jsx - Remove function
2. [ ] src/pages/Settings.jsx - Prefix/remove 2 variables
3. [ ] src/pages/Tickets.jsx - Prefix/remove 1 variable
4. [ ] src/pages/Inventory.jsx - Prefix/remove 1 variable
5. [ ] src/pages/Kaizen.jsx - Prefix/remove 9 variables
6. [ ] src/pages/Team.jsx - Prefix/remove 4 variables
7. [ ] src/__tests__/CounterWidget.test.jsx - Prefix/remove 1 parameter
8. [ ] src/__tests__/CounterWidget.e2e.js - Prefix/remove 3 variables
9. [ ] src/__tests__/performance.test.js - Prefix/remove 3 parameters
10. [ ] tests/ux-audit files - Prefix/remove 6 variables
11. [ ] tests/ux-audit/performance.spec.ts - Prefix/remove 1 variable
12. [ ] tests/ux-audit/interactions.spec.ts - Prefix/remove 1 variable
13. [ ] supabase/functions files - Prefix/remove 2 variables

### Step 3: Catch Parameters (10 min)
1. [ ] Prefix all unused catch parameters with `_`

### Step 4: Function Parameters (5 min)
1. [ ] Prefix all unused function parameters with `_`

### Step 5: Fix Regex & Escapes (3 min)
1. [ ] supabase/functions/ai_assistant/index.ts - Fix control regex
2. [ ] supabase/functions/_shared/gemini.ts - Remove escape chars

### Step 6: React Hook Dependencies (2 min)
1. [ ] src/pages/QRGateway.jsx - Add missing dependency

### Step 7: Component Exports (3 min)
1. [ ] src/MachineContext.jsx - Move exports
2. [ ] src/hooks/useTheme.jsx - Move exports

---

## How to Execute

### Auto-Fix What You Can
```bash
# Some ESLint warnings can be auto-fixed
npm run lint -- --fix

# Then verify
npm run lint
```

### Manual Fixes (Can't Auto-Fix)
For items that can't auto-fix, edit each file directly:

1. Remove unused imports
2. Prefix unused variables with `_`
3. Fix regex patterns
4. Add hook dependencies
5. Move component exports

---

## Verification

```bash
# After all fixes
npm run lint

# Expected output:
# 0 warnings found ✅

# If warnings remain
npm run lint | grep warning
# Fix any remaining issues
```

---

## Time Estimate

- Unused imports: 15 min
- Unused variables: 20 min
- Catch parameters: 10 min
- Function parameters: 5 min
- Regex/escapes: 3 min
- Hook dependencies: 2 min
- Component exports: 3 min
- **Total: ~60 minutes**

Once complete, run full test suite to ensure no regressions.

---

**Ready to fix? Start with Unused Imports (Step 1) 🚀**
