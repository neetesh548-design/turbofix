# TurboFix Create-Review-Approve Workflow Setup Guide

Complete guide to set up and use the three-agent workflow for TurboFix feature development.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Running the Workflow](#running-the-workflow)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The TurboFix workflow automates feature development through three sequential quality gates:

```
Creator Agent → Reviewer Agent → Approver Agent → Production
```

**Benefits:**
- ✅ Consistent quality standards
- ✅ Automated testing and validation
- ✅ Safe deployments with rollback capability
- ✅ Full audit trail
- ✅ Clear handoffs between teams

---

## Prerequisites

### Required Tools

```bash
# Git (for branch management)
git --version
# Expected: git version 2.x.x or higher

# Node.js (for building and testing)
node --version npm --version
# Expected: node v18.x.x or higher, npm 9.x.x or higher

# Claude Code CLI
claude --version
# Expected: claude version 0.3.0 or higher
```

### Required Accounts & Access

- ✅ GitHub account with push access to TurboFix repo
- ✅ Supabase account (database access)
- ✅ Claude API access (or Claude Code CLI)
- ✅ Production deployment credentials (GitHub Pages / Cloud provider)

### Repository Setup

```bash
# Navigate to TurboFix directory
cd /Users/nkumarsoni/TurboFix

# Verify git is initialized
git status
# Should show: On branch main

# Verify remote is set
git remote -v
# Should show: origin https://github.com/TurboFix/TurboFix.git
```

---

## Installation

### Step 1: Verify Agent Files Exist

```bash
# Check all three agent files are in place
ls -la .claude/agents/

# Expected output:
# -rw-r--r--  creator.md
# -rw-r--r--  reviewer.md
# -rw-r--r--  approver.md
```

### Step 2: Verify Workflow Config

```bash
# Check workflow config file
ls -la .claude/workflows/

# Expected output:
# -rw-r--r--  turbofix-create-review-approve.yaml
# -rw-r--r--  SETUP.md
```

### Step 3: Install Dependencies

```bash
# Install npm packages (if not already done)
npm install

# Verify build tools work
npm run build --dry-run

# Verify tests can run
npm run test -- --listTests | head -5
```

### Step 4: Verify Git Configuration

```bash
# Set your git identity (if not already set)
git config user.name "Neetesh Kumar Soni"
git config user.email "neetesh548@gmail.com"

# Verify configuration
git config --list | grep user
# Expected:
# user.name=Neetesh Kumar Soni
# user.email=neetesh548@gmail.com
```

### Step 5: Setup Environment Variables

Create `.env` file in project root (if not exists):

```bash
# Copy from .env.example if available
cp .env.example .env

# Or create new
cat > .env << 'EOF'
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key

# API
VITE_API_ENDPOINT=https://api.turbofix.co.in

# Environment
VITE_LOG_LEVEL=info
NODE_ENV=production
EOF

# Verify (don't commit this file)
echo ".env" >> .gitignore
```

---

## Configuration

### Configure Notifications (Optional)

#### Slack Notifications

1. Create Slack webhook:
   - Go to https://api.slack.com/apps
   - Create New App → From scratch
   - Enable Incoming Webhooks
   - Add New Webhook to Workspace
   - Copy webhook URL

2. Add to workflow config:
   ```bash
   cat > .claude/workflows/slack-config.json << 'EOF'
   {
     "webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
     "channel": "#turbofix-releases",
     "mention_on_failure": "@devops-team"
   }
   EOF
   ```

#### GitHub Notifications

Notifications will automatically post to GitHub when:
- Feature branch is created
- Code review is complete
- Feature is deployed

No additional setup needed.

#### Email Notifications (Optional)

```bash
cat > .claude/workflows/email-config.json << 'EOF'
{
  "smtp_server": "smtp.gmail.com",
  "smtp_port": 587,
  "from_email": "turbofix-releases@gmail.com",
  "to_emails": [
    "team@turbofix.co.in",
    "devops@turbofix.co.in"
  ]
}
EOF
```

### Configure Deployment Target

Update `.claude/workflows/turbofix-create-review-approve.yaml`:

```yaml
# Find the deployment section and update:
deployment:
  target: github-pages  # or: vercel, netlify, aws-s3, custom
  production_url: https://app.turbofix.co.in
  
  github_pages:
    branch: gh-pages
    
  # OR for cloud deployment:
  vercel:
    project_id: your-project-id
    team_id: your-team-id
```

---

## Running the Workflow

### Method 1: Manual CLI Command (Recommended for Testing)

#### Start Workflow with Feature Requirement

```bash
cd /Users/nkumarsoni/TurboFix

# Simple format
claude workflow run turbofix-create-review-approve \
  --feature "Activity Dashboard" \
  --description "Add activity metrics and analytics to dashboard" \
  --acceptance-criteria "Display KPI cards, 7-day graph, date filtering, CSV export"

# Or detailed format
claude workflow run turbofix-create-review-approve \
  --feature "Activity Dashboard" \
  --description "Add activity metrics and analytics to dashboard" \
  --acceptance-criteria "Display KPI cards, 7-day graph, date filtering, CSV export" \
  --issue-number 123 \
  --priority high \
  --assignee "Neetesh Kumar Soni"
```

#### What Happens

```
▶ Starting workflow: TurboFix Create-Review-Approve Pipeline

[Stage 1/3] Feature Creation
├─ Spawning Creator Agent...
├─ Processing requirement: "Activity Dashboard"
├─ Designing architecture...
├─ Writing code components...
├─ Creating tests (85%+ coverage)...
├─ Creating git branch: feature/activity-dashboard
├─ Committing changes...
└─ ✅ COMPLETE - Branch created (feature/activity-dashboard-abc123)

[Stage 2/3] Code Review
├─ Spawning Reviewer Agent...
├─ Checking out feature branch...
├─ Running TypeScript checks...
├─ Running ESLint...
├─ Running unit tests (45 tests)...
├─ Running E2E tests (12 tests)...
├─ Security validation...
├─ Performance analysis...
└─ ✅ APPROVED - All quality gates passed

[Stage 3/3] Approval & Deployment
├─ Spawning Approver Agent...
├─ Final validation checks...
├─ Merging to main branch...
├─ Creating version tag (v1.5.0)...
├─ Building for production...
├─ Deploying to production...
├─ Running smoke tests...
└─ ✅ DEPLOYED - Feature live at https://app.turbofix.co.in

✅ Workflow Complete!
Version: v1.5.0
Status: SUCCESSFULLY DEPLOYED
Time: 15 minutes 23 seconds
```

### Method 2: Interactive Claude Code Session

```bash
# Open Claude Code with the project
claude code /Users/nkumarsoni/TurboFix

# Then type in the chat:
# "Run the TurboFix workflow to create a feature for [feature description]"
```

Claude will:
1. Guide you through the workflow
2. Show real-time progress
3. Handle handoffs automatically
4. Provide notifications at each stage

### Method 3: GitHub Webhook (Automated)

When a PR is labeled with `auto-workflow`:

```bash
# Create a feature branch and PR
git checkout -b feature/my-feature
git push origin feature/my-feature

# Create PR on GitHub with label "auto-workflow"
# Workflow starts automatically
```

---

## Monitoring

### Track Workflow Progress

```bash
# View workflow status
claude workflow status turbofix-create-review-approve

# View detailed logs
claude workflow logs turbofix-create-review-approve

# View metrics
claude workflow metrics turbofix-create-review-approve
```

### Check Agent Progress

During workflow execution:

```bash
# Check Creator agent status
claude agent status creator

# Check Reviewer agent status
claude agent status reviewer

# Check Approver agent status
claude agent status approver
```

### Monitor Production Deployment

After deployment:

```bash
# Check production health
curl https://app.turbofix.co.in/api/health

# View deployment logs
npm run logs:production

# Check recent deployments
git log --oneline -n 10 | grep "v1\."
```

---

## Workflow Examples

### Example 1: Simple Feature Request

```bash
claude workflow run turbofix-create-review-approve \
  --feature "Dark Mode Support" \
  --description "Add dark theme option to application" \
  --acceptance-criteria "Toggle theme, save preference, apply to all pages"
```

**Expected Duration:** 15-20 minutes
**Output:** Theme toggle feature live in production

### Example 2: Feature with Dependencies

```bash
claude workflow run turbofix-create-review-approve \
  --feature "Advanced Analytics" \
  --description "Add ML-powered insights to dashboard" \
  --acceptance-criteria "Show predictions, confidence scores, explain factors" \
  --issue-number 456 \
  --priority high \
  --due-date "2026-07-30"
```

**Expected Duration:** 20-30 minutes
**Output:** Analytics feature with full test coverage deployed

### Example 3: Bug Fix

```bash
claude workflow run turbofix-create-review-approve \
  --feature "Fix: CSV Export Encoding" \
  --description "Fix UTF-8 encoding issues in CSV exports for non-English data" \
  --acceptance-criteria "CSV exports correctly for all 9 supported languages" \
  --issue-number 789 \
  --priority critical
```

**Expected Duration:** 10-15 minutes
**Output:** Bug fix deployed, previous version available for rollback

---

## Troubleshooting

### Issue: Workflow Stalls at Creator Stage

**Symptoms:**
```
[Stage 1/3] Feature Creation
├─ Spawning Creator Agent...
└─ ⏳ Waiting... (no progress for 5+ minutes)
```

**Solutions:**

1. Check Creator agent is running:
   ```bash
   ps aux | grep claude
   # Should show creator agent process
   ```

2. Check for errors:
   ```bash
   claude agent logs creator
   ```

3. Verify branch wasn't created:
   ```bash
   git branch -a | grep feature/
   # If branch exists, Creator failed silently
   ```

4. Restart workflow:
   ```bash
   claude workflow cancel turbofix-create-review-approve
   # Wait 10 seconds
   claude workflow run turbofix-create-review-approve [same args]
   ```

### Issue: Reviewer Rejects Code

**Message:**
```
❌ Code review REJECTED - Needs revision
Blockers: 2
```

**What To Do:**

1. Creator receives feedback automatically
2. Creator fixes issues in the feature branch
3. Push fixes:
   ```bash
   git push origin feature/activity-dashboard
   ```
4. Restart reviewer:
   ```bash
   claude workflow retry turbofix-create-review-approve --stage review
   ```

### Issue: Build Fails During Deployment

**Error:**
```
❌ Deployment FAILED
Rollback initiated
Error: Build step failed
```

**Solutions:**

1. Check build logs:
   ```bash
   npm run build 2>&1 | tail -50
   ```

2. Identify the error (usually TypeScript or missing import)

3. Creator fixes the issue:
   ```bash
   # Creator would do this:
   git checkout feature/activity-dashboard
   # Fix the issue
   git add -A
   git commit -m "fix: resolve build error"
   git push origin feature/activity-dashboard
   ```

4. Restart workflow from beginning:
   ```bash
   claude workflow restart turbofix-create-review-approve
   ```

### Issue: Merge Conflict

**Error:**
```
⚠️ WARNING: Merge conflicts detected
```

**Solutions:**

1. Approver cannot merge automatically
2. Creator must resolve conflicts:
   ```bash
   git checkout feature/activity-dashboard
   git fetch origin
   git rebase origin/main
   # Resolve conflicts in your editor
   git add .
   git rebase --continue
   git push -f origin feature/activity-dashboard
   ```

3. Restart approval stage:
   ```bash
   claude workflow retry turbofix-create-review-approve --stage approval
   ```

### Issue: Secrets Detected in Code

**Error:**
```
❌ SECURITY BLOCKER: Secrets detected in code
```

**Immediate Action:**

1. **STOP** - Do not proceed
2. **ROTATE** - Rotate the exposed credential immediately
3. **REMOVE** - Creator removes the secret from code
4. **CLEAR** - Clear git history if needed:
   ```bash
   # Only if absolutely necessary (nuclear option)
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env' \
     --prune-empty --tag-name-filter cat -- --all
   ```
5. **RESTART** - Begin workflow again with clean code

### Issue: Production Deployment Fails

**Error:**
```
❌ Deployment FAILED
Status: 500 Internal Server Error
```

**Automatic Actions:**
- Approver automatically triggers rollback
- Previous version restored
- Team notified immediately

**Manual Investigation:**
```bash
# Check production status
curl -i https://app.turbofix.co.in/api/health

# View deployment logs
tail -100 /var/log/turbofix/deployment.log

# Check for recent errors
npm run logs:production | grep ERROR | tail -20

# Verify database connectivity
npm run db:health-check
```

### Issue: Workflow Timeout

**Error:**
```
⏱️ TIMEOUT: Workflow exceeded 8 hour limit
Status: FAILED
```

**Cause:** One stage took too long

**Solutions:**
1. Increase timeout in workflow config:
   ```yaml
   config:
     timeout: 43200  # 12 hours instead of 8
   ```

2. Or increase individual stage timeout:
   ```yaml
   stages:
     - id: creation
       timeout: 10800  # 3 hours for creation stage
   ```

3. Restart workflow with longer timeout

---

## Best Practices

### 1. Clear Feature Descriptions

**❌ Bad:**
```
Feature: Improvements
Description: Make dashboard better
```

**✅ Good:**
```
Feature: Activity Dashboard Analytics
Description: Add metrics dashboard showing daily activity trends
Acceptance Criteria:
- Display 7-day activity graph
- Show KPI cards (jobs, completion %, revenue)
- Support date range filtering
- Export to CSV
```

### 2. Link to Issues

Always include issue number:
```bash
claude workflow run turbofix-create-review-approve \
  --feature "Activity Dashboard" \
  --issue-number 123
```

This creates traceable link between code and requirements.

### 3. Monitor Production After Deployment

Always check production for 24 hours after deployment:

```bash
# Hour 1: Intensive monitoring
while true; do
  curl -s https://app.turbofix.co.in/api/health | jq .
  sleep 300  # Every 5 minutes
done

# Check error logs
npm run logs:production | tail -f
```

### 4. Keep Rollback Ready

For 24 hours after deployment:
- Previous version is available
- Rollback takes < 5 minutes
- Keep team on standby

### 5. Document Custom Configurations

If you modify the workflow, document it:

```bash
cat > .claude/workflows/CUSTOMIZATIONS.md << 'EOF'
# Custom Workflow Configuration

## Modified On: 2026-07-25
## Modified By: Neetesh Kumar Soni

### Changes Made:
1. Increased Creator timeout to 3 hours (complex features)
2. Added Slack notifications to #turbofix-releases channel
3. Enabled canary deployment (10% → 50% → 100%)

### Rationale:
- More time for complex features to develop
- Team visibility into releases
- Safer rollout for high-impact features

### Testing:
Run test workflow: `claude workflow test turbofix-create-review-approve`
EOF
```

---

## Support & Help

### Get Help

```bash
# View available workflow commands
claude workflow --help

# View workflow configuration
cat .claude/workflows/turbofix-create-review-approve.yaml

# Check agent documentation
cat .claude/agents/creator.md
cat .claude/agents/reviewer.md
cat .claude/agents/approver.md
```

### Report Issues

If workflow fails unexpectedly:

1. Capture error message
2. Get workflow logs:
   ```bash
   claude workflow logs turbofix-create-review-approve > /tmp/workflow-error.log
   ```
3. Check Claude Code troubleshooting:
   ```bash
   claude /help
   ```

### Contact

- 📧 Email: neetesh548@gmail.com
- 🐙 GitHub Issues: https://github.com/TurboFix/TurboFix/issues
- 💬 Slack: #turbofix-dev channel

---

## Next Steps

1. ✅ **Verify Setup:**
   ```bash
   claude workflow validate turbofix-create-review-approve
   ```

2. ✅ **Test with Sample Feature:**
   ```bash
   claude workflow run turbofix-create-review-approve \
     --feature "Test Widget" \
     --description "A simple test component" \
     --acceptance-criteria "Renders on page, responds to clicks"
   ```

3. ✅ **Configure Notifications:** Update notification preferences

4. ✅ **Train Team:** Share this guide with team members

5. ✅ **Start Using:** Begin feature development with the workflow

---

**Happy automating! 🚀**
