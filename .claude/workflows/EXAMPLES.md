# TurboFix Workflow Examples

Real-world examples of running the three-agent workflow for different scenarios.

## Table of Contents

1. [New Feature: Complete Example](#new-feature-complete-example)
2. [Bug Fix: Quick Example](#bug-fix-quick-example)
3. [Documentation Update](#documentation-update)
4. [Performance Optimization](#performance-optimization)
5. [Security Patch](#security-patch)

---

## New Feature: Complete Example

### Scenario

Build a new **Real-Time Notifications System** for TurboFix that alerts users to job updates, technician status changes, and system alerts in real-time.

### Step 1: Define Requirements

```bash
# Create GitHub issue first (optional but recommended)
gh issue create \
  --title "Feature: Real-Time Notifications System" \
  --body "Implement WebSocket-based notifications for job updates and alerts
  
## Acceptance Criteria:
- Real-time job status updates via WebSocket
- Notification bell icon showing unread count
- Notification center with full history
- Sound/browser notifications (optional)
- Works on mobile and desktop
- Supports all 9 languages
- 80%+ test coverage

## Priority: High
## Due Date: 2026-08-01"

# Capture the issue number
ISSUE_NUMBER=456
```

### Step 2: Run Workflow

```bash
cd /Users/nkumarsoni/TurboFix

# Start the workflow
claude workflow run turbofix-create-review-approve \
  --feature "Real-Time Notifications System" \
  --description "Implement WebSocket-based real-time notifications for job updates, technician status, and system alerts. Include notification center, unread counter, and multi-language support." \
  --acceptance-criteria "
  - Real-time job status updates via WebSocket
  - Notification bell with unread count
  - Notification center showing history
  - Works on mobile (375px), tablet (768px), desktop (1280px)
  - i18n support (9 languages)
  - 80%+ test coverage
  - No performance degradation" \
  --issue-number 456 \
  --priority high \
  --due-date "2026-08-01"
```

### Step 3: Monitor Workflow

```
▶ Starting Workflow: TurboFix Create-Review-Approve Pipeline
Workflow ID: wf_abc123xyz
Input Issue: #456

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Stage 1/3] Feature Creation - IN PROGRESS
Spawning: Creator Agent (claude-opus-5)
Timeout: 2 hours

14:35:02 ✓ Requirements parsed
14:35:15 ✓ Architecture designed
         - NotificationContext (state management)
         - WebSocketConnection (real-time connection)
         - NotificationCenter (UI component)
         - NotificationBell (notification counter)
         - NotificationItem (list item component)

14:35:30 ✓ Starting implementation...
14:40:15 ✓ Components created (5 new files, 1,200 LOC)
14:42:00 ✓ Tests written (45 unit tests, 12 E2E tests)
14:44:30 ✓ i18n translations added (7 languages)
14:45:00 ✓ Git branch created: feature/realtime-notifications
14:45:15 ✓ Commit: a1b2c3d (Real-time notifications system)

✅ Stage 1 Complete - Branch ready for review
Duration: 10 minutes 15 seconds
Files Created: 5 (1,200 LOC)
Test Coverage: 87%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Stage 2/3] Code Review - IN PROGRESS
Spawning: Reviewer Agent (claude-opus-5)
Timeout: 1 hour

14:45:30 ✓ Checked out branch: feature/realtime-notifications
14:45:45 ✓ TypeScript checks: PASS (0 errors)
14:46:00 ✓ ESLint: PASS (0 warnings)
14:46:45 ✓ Unit tests: PASS (45/45 tests)
14:47:30 ✓ E2E tests: PASS (12/12 tests)
14:48:00 ✓ Coverage analysis: 87% (exceeds 80% target)

Quality Review:
14:48:15 ✓ Architecture: MVP-first pattern followed
14:48:30 ✓ Code quality: No `any` types, proper error handling
14:49:00 ✓ React hooks: Correct usage, no memory leaks
14:49:30 ✓ i18n: All strings externalized, 7 languages
14:50:00 ✓ Responsive: Tested on 3 viewports (mobile/tablet/desktop)

Security Review:
14:50:30 ✓ No XSS vulnerabilities
14:50:45 ✓ WebSocket authentication verified
14:51:00 ✓ No secrets in code
14:51:15 ✓ Dependencies scanned: 0 vulnerabilities

Performance:
14:51:45 ✓ Bundle size: 234KB (acceptable)
14:52:00 ✓ Lighthouse score: 92/100
14:52:15 ✓ No memory leaks detected

✅ Stage 2 Complete - ALL QUALITY GATES PASSED
Duration: 6 minutes 45 seconds
Review Status: APPROVED
Security Score: 95/100
Performance Score: 92/100
Code Quality Score: 96/100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Stage 3/3] Approval & Deployment - IN PROGRESS
Spawning: Approver Agent (claude-opus-5)
Timeout: 1 hour

14:52:30 ✓ Final validation: ALL CRITERIA MET
14:52:45 ✓ Merge conflicts: None detected
14:53:00 ✓ Secrets: None found
14:53:15 ✓ Commits: Properly formatted (feat: ...)

Merge & Release:
14:53:30 ✓ Merged to main: SUCCESS
14:53:45 ✓ Version tagged: v1.6.0
14:54:00 ✓ Release notes: Generated

Build & Deploy:
14:54:30 ✓ Production build: SUCCESS (2 minutes)
14:56:45 ✓ Deployed to production: SUCCESS
14:57:00 ✓ Smoke tests: All passed

✅ Stage 3 Complete - DEPLOYED TO PRODUCTION
Duration: 4 minutes 30 seconds
Deployment Status: SUCCESS
Version: v1.6.0
URL: https://app.turbofix.co.in

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ WORKFLOW COMPLETE - TOTAL TIME: 21 MINUTES 30 SECONDS

📊 Final Metrics:
├─ Test Coverage: 87%
├─ Security Score: 95/100
├─ Performance: 92/100
├─ Code Quality: 96/100
├─ Files Changed: 5 new, 2 modified
├─ Lines of Code: 1,200
├─ Commits: 1
└─ Version: v1.6.0

🎉 Feature successfully deployed to production!
📢 Notifications sent to stakeholders
📋 Release notes: https://github.com/TurboFix/releases/tag/v1.6.0
🚨 Rollback available for 24 hours (git checkout v1.5.0)
```

### Step 4: Post-Deployment Verification

```bash
# Verify feature is live
curl https://app.turbofix.co.in/api/health
# Response: {"status":"ok","version":"v1.6.0"}

# Check production logs
npm run logs:production | grep -i "notification" | tail -10

# Monitor for issues
# Set reminder to check in 1, 6, 24 hours
```

### Step 5: Collect Metrics (24 Hours Later)

```bash
# View adoption metrics
claude workflow metrics turbofix-create-review-approve --stage approval

# Output:
# Real-Time Notifications System (v1.6.0)
# ────────────────────────────────────────
# Deployment Date: 2026-07-25
# Current Status: ✅ STABLE
#
# Adoption Metrics:
# - Users who viewed notification center: 1,240 (32%)
# - Active WebSocket connections: 340 (avg)
# - Notifications sent: 5,200 (24h)
# - Feature usage rate: 8.2 per user per day
#
# Performance:
# - Avg notification delay: 230ms
# - Error rate: 0.03%
# - No critical issues
#
# User Feedback:
# - ⭐⭐⭐⭐⭐ (4.8/5 rating)
# - "Love the real-time updates!"
# - "Works great on mobile"
#
# Recommendation: ✅ STABLE - Continue monitoring
```

---

## Bug Fix: Quick Example

### Scenario

Fix a critical bug: CSV export fails for non-English data due to encoding issues.

### Quick Workflow Run

```bash
cd /Users/nkumarsoni/TurboFix

# Start workflow
claude workflow run turbofix-create-review-approve \
  --feature "Fix: CSV Export Encoding for Non-English Data" \
  --description "Fix UTF-8 encoding issues preventing proper CSV export of data containing non-English characters (Hindi, Arabic, Russian, etc.)" \
  --acceptance-criteria "
  - CSV exports correctly for all 9 supported languages
  - Special characters preserved in exported files
  - Test cases for each language
  - No performance impact" \
  --issue-number 789 \
  --priority critical
```

### Expected Timeline

```
[Stage 1] Feature Creation        ✓ 5 minutes
[Stage 2] Code Review & Testing   ✓ 4 minutes
[Stage 3] Deployment              ✓ 3 minutes
────────────────────────────────────────────
Total: 12 minutes (quick fix!)

Version: v1.5.1 (patch release)
Status: ✅ LIVE
```

### Notification

```
✅ TurboFix v1.5.1 - Bug Fix Released

📋 Issue: #789 - CSV Export Encoding

🐛 Fix: UTF-8 encoding support for all languages
   - Fixed character encoding in CSV generation
   - Added language-specific formatting
   - Tested with all 9 languages

✅ Quality: 100% tests passing, no regressions

🚀 Status: Live in production
⏮️  Rollback: v1.5.0 (if needed)
```

---

## Documentation Update

### Scenario

Update README and API documentation for the new notifications feature.

### Workflow Run

```bash
claude workflow run turbofix-create-review-approve \
  --feature "Docs: Real-Time Notifications API Documentation" \
  --description "Add comprehensive API documentation for WebSocket notifications, including examples and troubleshooting" \
  --acceptance-criteria "
  - API endpoints documented
  - WebSocket connection guide
  - Code examples (REST + WebSocket)
  - Troubleshooting section
  - README updated with feature overview" \
  --priority normal
```

### Unique Aspect

For documentation-only changes:
- Creator skips most code (just updates .md files)
- Reviewer checks markdown formatting and content
- Approver deploys to docs site
- Total time: 5-8 minutes

---

## Performance Optimization

### Scenario

Optimize the Dashboard page to load in under 2 seconds (currently 3.5 seconds).

### Workflow Run

```bash
claude workflow run turbofix-create-review-approve \
  --feature "Perf: Dashboard Load Time Optimization" \
  --description "Optimize dashboard rendering: implement code-splitting, lazy loading, and memoization to reduce initial load time from 3.5s to <2s" \
  --acceptance-criteria "
  - Dashboard loads in <2 seconds
  - Lighthouse performance score ≥95
  - No visual regression
  - All features still work
  - Mobile performance improved" \
  --issue-number 234 \
  --priority high
```

### What Creator Does

```
✓ Analyze performance bottlenecks
✓ Implement code-splitting
✓ Add React.memo() optimization
✓ Setup lazy loading for heavy components
✓ Remove unused dependencies
✓ Benchmark before/after
✓ Write performance tests
```

### What Reviewer Checks

```
✓ Lighthouse score ≥95
✓ Bundle size increase reasonable
✓ No memory leaks
✓ Render performance maintained
✓ All tests still pass
```

---

## Security Patch

### Scenario

A critical security vulnerability is discovered in a dependency. Need emergency patch.

### Workflow Run

```bash
# URGENT: Run immediately
claude workflow run turbofix-create-review-approve \
  --feature "Security: Patch Vulnerable Dependency" \
  --description "Update vulnerable dependency XYZ to patched version 2.3.1. Addresses CVE-2026-12345." \
  --acceptance-criteria "
  - Dependency upgraded to safe version
  - All tests pass
  - No functionality broken
  - No other dependencies affected" \
  --issue-number 999 \
  --priority critical
```

### Accelerated Process

```
Normal workflow: 20 minutes
Security patch:  8 minutes (expedited)

Reason: Security patches skip some review steps
- Creator: Fast track
- Reviewer: Focus only on security aspects
- Approver: Immediate deployment with no delay

Status: ✅ DEPLOYED in 8 minutes
```

---

## Workflow Status Examples

### Success State

```json
{
  "workflow_id": "wf_abc123xyz",
  "status": "SUCCESS",
  "total_duration": "21 minutes 30 seconds",
  "stages": {
    "creation": {
      "status": "COMPLETE",
      "duration": "10 min 15 sec",
      "branch": "feature/realtime-notifications",
      "commit": "a1b2c3d"
    },
    "review": {
      "status": "APPROVED",
      "duration": "6 min 45 sec",
      "security_score": 95,
      "performance_score": 92,
      "code_quality_score": 96
    },
    "approval": {
      "status": "DEPLOYED",
      "duration": "4 min 30 sec",
      "version": "v1.6.0",
      "url": "https://app.turbofix.co.in"
    }
  }
}
```

### Failure State (Reviewer Rejection)

```json
{
  "workflow_id": "wf_def456uvw",
  "status": "NEEDS_REVISION",
  "failed_at_stage": "review",
  "duration": "5 minutes 30 seconds",
  "rejection_reason": "Insufficient test coverage",
  "details": {
    "current_coverage": 68,
    "required_coverage": 80,
    "shortfall": 12
  },
  "next_steps": [
    "Creator adds 12% more test coverage",
    "Push updated code to same branch",
    "Workflow restarts review stage automatically"
  ]
}
```

---

## Tips for Success

### 1. Clear Feature Descriptions Help Creator

**Bad Example:**
```
Feature: Improvements
```

**Good Example:**
```
Feature: Real-Time Notifications System
Description: WebSocket-based notifications for job updates
Components: NotificationCenter, NotificationBell, WebSocketConnection
Expected Timeline: 10-15 minutes
```

### 2. Monitor During Workflow

Don't walk away! Monitor progress:
- First 5 minutes: Usually smooth
- 5-10 minutes: Major decisions made
- 10-20 minutes: Code review happening
- 20+ minutes: Deployment & testing

### 3. Have Rollback Ready

After deployment:
- Stay available for 1 hour
- Monitor error rates
- Be ready to rollback if issues occur
- Rollback takes < 5 minutes

### 4. Communicate with Team

Notify stakeholders:
- When workflow starts
- At key milestones
- When deployment succeeds
- After 24 hours (stability confirmed)

---

## Troubleshooting Examples

### Issue: Creator Takes Too Long

**Problem:**
```
[Stage 1] Feature Creation - 25 minutes (exceeded expected 15 min)
```

**Check:**
```bash
# See what Creator is working on
claude agent logs creator | tail -50

# If stuck, check branch
git branch | grep feature/
```

**Solution:**
```bash
# Check Creator's progress
claude workflow logs turbofix-create-review-approve --stage creation

# If truly stuck (>30 min), manually create branch
git checkout -b feature/manual-fix
# And notify Creator to push to this branch
```

### Issue: Reviewer Blocks Code

**Problem:**
```
❌ Code review REJECTED - Needs revision
Blockers: 3
```

**Check Blocker Details:**
```bash
# View exact issues
claude workflow logs turbofix-create-review-approve --stage review | grep BLOCKER
```

**Expected Output:**
```
BLOCKER 1: Test coverage 75% (need 80%)
BLOCKER 2: TypeScript error in NotificationCenter.jsx:42
BLOCKER 3: Missing i18n for "notification_received"
```

**Creator Fixes & Retries:**
```bash
# Creator gets same branch back
git checkout feature/realtime-notifications

# Fixes the 3 issues
# Commits and pushes
git push origin feature/realtime-notifications

# Workflow re-runs review stage automatically
```

---

**Happy feature building! 🚀**

For more help, see [SETUP.md](./SETUP.md) or [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
