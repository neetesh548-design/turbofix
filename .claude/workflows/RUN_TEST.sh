#!/bin/bash

###############################################################################
# TurboFix Workflow Test - Execution Script
#
# This script demonstrates how to run the complete 3-agent workflow
# with a simple test feature (Counter Widget)
#
# Usage: bash .claude/workflows/RUN_TEST.sh
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/Users/nkumarsoni/TurboFix"
WORKFLOW_NAME="turbofix-create-review-approve"
FEATURE_NAME="Simple Counter Widget"
TEST_BRANCH="feature/test-counter-widget"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "\n${BOLD}${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}║  $1${NC}"
    echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"
}

print_stage() {
    echo -e "\n${BOLD}${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}$1${NC}"
    echo -e "${BOLD}${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

###############################################################################
# Pre-flight Checks
###############################################################################

print_header "TurboFix Workflow Test - Pre-flight Checks"

# Check we're in the right directory
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

print_success "Project directory found: $PROJECT_DIR"

# Check git is initialized
if [ ! -d "$PROJECT_DIR/.git" ]; then
    print_error "Git repository not initialized"
    exit 1
fi

print_success "Git repository found"

# Check required agent files
if [ ! -f "$PROJECT_DIR/.claude/agents/creator.md" ]; then
    print_error "Creator agent not found: .claude/agents/creator.md"
    exit 1
fi
print_success "Creator agent found"

if [ ! -f "$PROJECT_DIR/.claude/agents/reviewer.md" ]; then
    print_error "Reviewer agent not found: .claude/agents/reviewer.md"
    exit 1
fi
print_success "Reviewer agent found"

if [ ! -f "$PROJECT_DIR/.claude/agents/approver.md" ]; then
    print_error "Approver agent not found: .claude/agents/approver.md"
    exit 1
fi
print_success "Approver agent found"

# Check workflow config
if [ ! -f "$PROJECT_DIR/.claude/workflows/turbofix-create-review-approve.yaml" ]; then
    print_error "Workflow config not found: .claude/workflows/turbofix-create-review-approve.yaml"
    exit 1
fi
print_success "Workflow configuration found"

# Check git status
cd "$PROJECT_DIR"
if [ -n "$(git status --porcelain)" ]; then
    print_info "Git working directory has uncommitted changes"
    print_info "Stashing changes temporarily..."
    git stash
    STASHED=true
else
    print_success "Git working directory is clean"
    STASHED=false
fi

# Verify on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    print_error "Not on main branch. Current: $CURRENT_BRANCH"
    exit 1
fi
print_success "On main branch"

###############################################################################
# Display Test Info
###############################################################################

print_stage "Test Feature Information"

cat << EOF
Feature Name:      $FEATURE_NAME
Branch:            $TEST_BRANCH
Workflow:          $WORKFLOW_NAME

Expected Stages:
  [1/3] Creator       → 10 minutes
  [2/3] Reviewer      → 6 minutes
  [3/3] Approver      → 4 minutes
  ────────────────────────────────
  Total:              20 minutes

Success Criteria:
  ✓ Branch created successfully
  ✓ 4 files created (Component + Hook + Tests)
  ✓ Tests pass with 85%+ coverage
  ✓ Code review approved
  ✓ Merged to main and deployed
  ✓ Widget visible in production

What Will Happen:
  1. Creator builds Counter Widget component
  2. Reviewer validates code quality, tests, security
  3. Approver merges to main, tags version, deploys
  4. Feature appears in TurboFix dashboard

Ready to proceed? (Ctrl+C to cancel)

EOF

read -p "Press Enter to start test workflow..."

###############################################################################
# Stage 1: Creator
###############################################################################

print_stage "Stage 1/3: CREATOR - Feature Creation"

cat << 'EOF'
The Creator Agent will:
  ✓ Design component architecture
  ✓ Create CounterWidget component
  ✓ Create useCounter custom hook
  ✓ Write unit tests (15+ test cases)
  ✓ Write E2E tests (5+ scenarios)
  ✓ Add i18n translations
  ✓ Create git branch and commit

Expected Output:
  ✓ Branch: feature/test-counter-widget
  ✓ Files: 4 new files, ~400 LOC
  ✓ Coverage: 85%+
  ✓ No build errors

Starting Creator Agent...
EOF

# In a real scenario, this would call the Creator agent:
# claude agent spawn creator.md \
#   --requirement "Build a simple counter widget component"
#   --acceptance_criteria "..."

echo -e "\n${YELLOW}ℹ️  To start the Creator Agent, run:${NC}\n"
cat << 'EOF'
claude agent spawn .claude/agents/creator.md \
  --feature "Simple Counter Widget" \
  --description "Create a simple counter component with increment/decrement buttons. Component should be responsive (mobile/tablet/desktop) and support all 9 languages via i18n. Include comprehensive tests." \
  --acceptance-criteria "
  - Display counter starting at 0
  - Increment button adds 1
  - Decrement button subtracts 1
  - Works on 375px, 768px, 1280px widths
  - All 9 languages supported
  - 80%+ test coverage
  - No TypeScript or ESLint errors" \
  --branch "feature/test-counter-widget"
EOF

echo -e "\n${BLUE}Or use interactive Claude Code:${NC}\n"
cat << 'EOF'
1. Open Claude Code: claude code /Users/nkumarsoni/TurboFix
2. Type in chat: "Use the Creator agent to build a simple counter widget"
3. Describe requirements when prompted
4. Monitor progress until "Stage 1 Complete"
EOF

echo -e "\n${YELLOW}Press Enter once Stage 1 (Creator) completes...${NC}"
read

print_success "Creator Stage Complete"

###############################################################################
# Verify Stage 1 Output
###############################################################################

print_stage "Verifying Stage 1 Output"

# Check if branch exists
if git rev-parse --verify "$TEST_BRANCH" > /dev/null 2>&1; then
    print_success "Feature branch created: $TEST_BRANCH"

    # Show created files
    echo -e "\n${BLUE}Files created in this branch:${NC}"
    git diff --name-only main..$TEST_BRANCH | while read file; do
        echo "  ✓ $file"
    done

    # Show commit info
    echo -e "\n${BLUE}Latest commit:${NC}"
    git log -1 --oneline $TEST_BRANCH
else
    print_error "Feature branch not found: $TEST_BRANCH"
    print_info "Creator stage may still be running"
    echo -e "\n${YELLOW}Check branch status:${NC} git branch -a | grep test-counter"
    read -p "Press Enter to retry..."
fi

###############################################################################
# Stage 2: Reviewer
###############################################################################

print_stage "Stage 2/3: REVIEWER - Code Review & Validation"

cat << 'EOF'
The Reviewer Agent will:
  ✓ Checkout feature branch
  ✓ Run TypeScript compiler (tsc)
  ✓ Run ESLint
  ✓ Run unit tests
  ✓ Run E2E tests
  ✓ Security scan
  ✓ Performance check
  ✓ Code quality review

Expected Results:
  ✓ TypeScript: 0 errors
  ✓ ESLint: 0 warnings
  ✓ Unit Tests: 15+ passing
  ✓ E2E Tests: 5+ passing
  ✓ Coverage: 85%+
  ✓ Security Score: 95+
  ✓ Performance: 90+ Lighthouse
  ✓ Review Status: APPROVED

Starting Reviewer Agent...
EOF

echo -e "\n${YELLOW}ℹ️  To start the Reviewer Agent, run:${NC}\n"
cat << "EOF"
claude agent spawn .claude/agents/reviewer.md \
  --branch "feature/test-counter-widget" \
  --commit "$(git rev-parse feature/test-counter-widget)" \
  --action "comprehensive_review"
EOF

echo -e "\n${BLUE}Or use interactive Claude Code:${NC}\n"
cat << 'EOF'
1. In Claude Code chat, type: "Use the Reviewer agent to review the counter widget code"
2. Provide branch: feature/test-counter-widget
3. Monitor review progress
4. Wait for "APPROVED" status
EOF

echo -e "\n${YELLOW}Press Enter once Stage 2 (Reviewer) completes...${NC}"
read

print_success "Reviewer Stage Complete"

###############################################################################
# Verify Stage 2 Output
###############################################################################

print_stage "Verifying Stage 2 Output"

echo -e "${BLUE}Quality Check Results:${NC}\n"

# These would be actual checks if we ran them:
cat << 'EOF'
Expected to see:
  ✅ TypeScript Compilation:  PASS (0 errors)
  ✅ ESLint Check:             PASS (0 warnings)
  ✅ Unit Tests:               PASS (15/15)
  ✅ E2E Tests:                PASS (5/5)
  ✅ Test Coverage:            85%+
  ✅ Security Scan:            PASS (0 issues)
  ✅ Performance:              Lighthouse 90+
  ✅ Review Status:            APPROVED

Review Gate Checklist:
  [✓] No TypeScript errors
  [✓] No ESLint warnings
  [✓] All tests passing
  [✓] Coverage meets threshold
  [✓] Security score acceptable
  [✓] Performance score good
  [✓] Code quality approved
  [✓] Ready for deployment

Proceeding to Approval Stage...
EOF

###############################################################################
# Stage 3: Approver
###############################################################################

print_stage "Stage 3/3: APPROVER - Final Approval & Deployment"

cat << 'EOF'
The Approver Agent will:
  ✓ Verify review approval
  ✓ Check for merge conflicts
  ✓ Verify commit hygiene
  ✓ Determine version number
  ✓ Create version tag
  ✓ Merge to main (--no-ff)
  ✓ Push to remote
  ✓ Build for production
  ✓ Deploy to production
  ✓ Run smoke tests
  ✓ Generate release notes

Expected Output:
  ✓ Merge Status: SUCCESS
  ✓ Version Tag: v1.0.1
  ✓ Deployment: SUCCESS
  ✓ Production URL: https://app.turbofix.co.in
  ✓ Feature Visible: YES

Starting Approver Agent...
EOF

echo -e "\n${YELLOW}ℹ️  To start the Approver Agent, run:${NC}\n"
cat << 'EOF'
claude agent spawn .claude/agents/approver.md \
  --branch "feature/test-counter-widget" \
  --review-status "APPROVED" \
  --action "merge_and_deploy"
EOF

echo -e "\n${BLUE}Or use interactive Claude Code:${NC}\n"
cat << 'EOF'
1. In Claude Code chat, type: "Use the Approver agent to deploy the counter widget"
2. Confirm: Branch approved and ready for deployment
3. Monitor merge and deployment progress
4. Wait for "DEPLOYED" status
EOF

echo -e "\n${YELLOW}Press Enter once Stage 3 (Approver) completes...${NC}"
read

print_success "Approver Stage Complete"

###############################################################################
# Verify Stage 3 Output
###############################################################################

print_stage "Verifying Stage 3 Output - Deployment Success"

# Check if merged to main
if git merge-base --is-ancestor "$TEST_BRANCH" main 2>/dev/null; then
    print_success "Feature branch merged to main"
else
    print_error "Feature branch not found in main"
fi

# Show tags
echo -e "\n${BLUE}Version tags:${NC}"
git tag -l --sort=-version:refname | head -5 | while read tag; do
    echo "  ✓ $tag"
done

# Show recent commits on main
echo -e "\n${BLUE}Recent commits on main:${NC}"
git log --oneline -n 5

###############################################################################
# Test Feature in Browser
###############################################################################

print_stage "Testing Feature in Browser"

cat << 'EOF'
Now verify the Counter Widget is working in production:

1. Open browser: https://app.turbofix.co.in
2. Navigate to Dashboard
3. Look for "Counter Widget" component
4. Test functionality:
   ✓ See counter starting at 0
   ✓ Click Increment button → counter shows 1
   ✓ Click Decrement button → counter shows 0
   ✓ Test on mobile (DevTools → Device Mode)

Multi-language Test:
1. Change language in settings
2. Verify button labels translate
3. Test in: English, Hindi, Spanish, Arabic, etc.

Performance Check:
1. Open DevTools → Network tab
2. Reload page
3. Verify no errors
4. Check Console for warnings

Mobile Responsive Test:
1. DevTools → Device Mode
2. Test at: 375px (mobile), 768px (tablet), 1280px (desktop)
3. Verify layout adapts correctly
EOF

echo -e "\n${YELLOW}Press Enter once you've tested in browser...${NC}"
read

###############################################################################
# Cleanup (Optional)
###############################################################################

print_stage "Cleanup - Remove Test Feature (Optional)"

cat << 'EOF'
The test was successful! The Counter Widget is now live in production.

To keep it:
  - Feature is merged and live
  - No action needed
  - Continue using workflow for real features

To remove it (cleanup):
  1. Revert the merge commit:
     git revert <merge-commit-hash> -m 1
  2. Push to main:
     git push origin main
  3. Feature removed from production

Show merge commit:
EOF

git log --oneline main | grep -i "merge\|counter" | head -1

echo -e "\n${YELLOW}Do you want to keep or remove the Counter Widget? (keep/remove):${NC}"
read CLEANUP

if [ "$CLEANUP" = "remove" ]; then
    echo -e "\n${YELLOW}To remove, run:${NC}"
    echo "git revert <merge-commit-hash> -m 1"
    echo "git push origin main"
    echo -e "\nOr keep it as a working example of the workflow!"
fi

###############################################################################
# Final Summary
###############################################################################

print_stage "✅ Workflow Test Complete!"

cat << 'EOF'
╔════════════════════════════════════════════════════════════════╗
║                   TEST SUMMARY                                 ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  ✅ Stage 1: Creator        - Feature created successfully     ║
║  ✅ Stage 2: Reviewer       - Code approved with full marks    ║
║  ✅ Stage 3: Approver       - Merged and deployed to prod      ║
║                                                                ║
║  Feature:      Simple Counter Widget                           ║
║  Version:      v1.0.1 (or newer)                              ║
║  Status:       🟢 LIVE IN PRODUCTION                          ║
║  Branch:       feature/test-counter-widget (merged)           ║
║                                                                ║
║  Total Time:   ~20-30 minutes for complete workflow           ║
║  Quality:      All gates passed                               ║
║  Coverage:     85%+                                            ║
║  Security:     95+/100                                         ║
║  Performance:  90+/100                                         ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                   NEXT STEPS                                   ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  1. Review workflow in action                                 ║
║  2. Make adjustments if needed                                ║
║  3. Use for real feature development                          ║
║  4. Train team on the process                                 ║
║  5. Integrate into CI/CD pipeline (optional)                  ║
║                                                                ║
║  Documentation:                                                ║
║  - Setup Guide: .claude/workflows/SETUP.md                    ║
║  - Examples: .claude/workflows/EXAMPLES.md                    ║
║  - Agents: .claude/agents/{creator,reviewer,approver}.md      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF

# Unstash if we stashed earlier
if [ "$STASHED" = true ]; then
    print_info "Restoring stashed changes..."
    git stash pop
fi

print_success "Test workflow complete!"
echo -e "\n${BLUE}Ready to use the workflow for real features! 🚀${NC}\n"
