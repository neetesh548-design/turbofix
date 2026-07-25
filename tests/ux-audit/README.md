# TurboFix UX/UI Playwright Audit Suite

Comprehensive automated testing for user experience, accessibility, responsiveness, and performance.

## Quick Start

```bash
# Run all UX/UI tests
npm run test:ux

# Run specific test suites
npm run test:ux:visual      # Visual regression (light/dark, MVP/Full modes)
npm run test:ux:a11y        # Accessibility (WCAG 2.1 AA compliance)
npm run test:ux:responsive  # Responsive design (mobile/tablet/desktop)
npm run test:ux:interactions # User workflows (Quick Report, view mode toggle)
npm run test:ux:dark-mode   # Dark mode consistency
npm run test:ux:performance # Load times, Core Web Vitals, bundle size

# View interactive reports
npm run test:ux:headed      # Run with visible browser
npm run test:ux:debug       # Debug mode (step through)

# View HTML report
npm run test:report
```

## Test Coverage

### 1. Visual Regression (`visual-regression.spec.ts`)
Tests screenshot consistency across:
- **Light & Dark Modes** — All pages
- **MVP & Full View Modes** — User-controlled toggle
- **Mobile, Tablet, Desktop** — Responsive layouts
- **Dynamic Content Masking** — Excludes timestamps, real-time data

**Example:**
```bash
npm run test:ux:visual
```

**Output:**
- `dashboard-light-mvp-desktop.png`
- `dashboard-dark-full-mobile.png`
- `tickets-tablet-landscape.png`

---

### 2. Accessibility (`accessibility.spec.ts`)
Tests WCAG 2.1 AA compliance:
- **Keyboard Navigation** — Tab order, focus traps, Escape key
- **Color Contrast** — 4.5:1 minimum for text
- **Semantic HTML** — Heading hierarchy, labels, ARIA
- **Screen Reader Support** — Alt text, aria-live regions
- **Focus Indicators** — Visible focus outlines

**Example:**
```bash
npm run test:ux:a11y
```

**Keyboard Shortcuts Tested:**
- `Cmd+Shift+R` / `Ctrl+Shift+R` — Open Quick Report
- `Tab` — Navigate form fields
- `Escape` — Close dialogs
- `Enter` — Submit forms

---

### 3. Responsive Design (`responsive.spec.ts`)
Tests mobile-first, device-agnostic layouts:
- **Devices:** iPhone SE (375), iPhone 12 (390), Pixel 5 (393), Galaxy S21 (360)
- **Tablets:** iPad Mini (768), iPad Pro (1024)
- **Desktops:** 1280×800, 1920×1080
- **Touch Targets** — Minimum 48×48px for buttons
- **No Horizontal Scroll** — All viewports fit content
- **FAB Positioning** — Quick Report button in bottom-right on mobile

**Example:**
```bash
npm run test:ux:responsive
```

---

### 4. Interaction Workflows (`interactions.spec.ts`)
Tests core user workflows:
- **Quick Report Dialog**
  - Opens instantly from header (< 500ms)
  - Form validation (disable submit until required fields filled)
  - Success messages after submission
  - Close with Escape key
  - Preserves machine selection between open/close

- **View Mode Toggle**
  - MVP ↔ Full mode switch
  - Persists across pages and browser refresh
  - Shows/hides drill-down content correctly

- **Navigation**
  - 1-click access to frequent pages (Dashboard, Tickets, Technician)
  - Active page indicator
  - Scroll position maintained on back navigation

- **Evidence Capture** (Technician Page)
  - Photo upload with preview
  - Form submission blocking without evidence on critical jobs

**Example:**
```bash
npm run test:ux:interactions
```

---

### 5. Dark Mode Consistency (`dark-mode.spec.ts`)
Tests dark theme implementation:
- **Readability** — Text visible on dark backgrounds
- **No Hardcoded Colors** — All colors respond to theme toggle
- **Charts & Graphs** — Readable in both light and dark
- **Form Inputs** — Properly styled, visible borders
- **Modals** — Proper contrast in dark mode
- **Persistence** — Theme persists across pages and refresh

**Example:**
```bash
npm run test:ux:dark-mode
```

---

### 6. Performance (`performance.spec.ts`)
Tests loading speed and runtime performance:
- **Page Load Times** — < 3 seconds for all pages
- **First Contentful Paint (FCP)** — < 1.5 seconds
- **Largest Contentful Paint (LCP)** — < 2.5 seconds
- **Cumulative Layout Shift (CLS)** — < 0.1 (avoid jank)
- **Bundle Sizes** — JS < 500KB, CSS < 100KB (pre-gzip)
- **Network Requests** — No excessive requests (< 100 total)
- **Cache Usage** — Static assets cached on reload
- **Form Responsiveness** — Dialog opens in < 300ms, form fills smoothly

**Example:**
```bash
npm run test:ux:performance
```

**Output Example:**
```
Dashboard: 1243ms
Dashboard FCP: 847ms
Dashboard LCP: 1652ms
Dashboard CLS: 0.042
Total JS bundle size: 245.67KB
Total CSS bundle size: 42.15KB
Total requests: 47
Dialog open time: 142ms
```

---

## Running Tests in CI/CD

### GitHub Actions Workflow
```yaml
# .github/workflows/ux-audit.yml
- run: npm run test:ux
- uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

### Run Specific Browsers
```bash
# Chromium only
npx playwright test tests/ux-audit --project=chromium

# Mobile browsers
npx playwright test tests/ux-audit --project="Mobile Chrome" --project="Mobile Safari"

# All browsers
npx playwright test tests/ux-audit
```

---

## Test Configuration

See `playwright.config.ts` for:
- **Web Server:** Runs `npm run dev` on localhost:5173
- **Screenshot Comparison:** ±100px tolerance for minor rendering differences
- **Video Recording:** Only on test failure for debugging
- **HTML Report:** Auto-generated in `playwright-report/`

---

## Adding New Tests

### Template for Visual Regression
```typescript
test('Component X - Light mode desktop', async ({ page }) => {
  await page.goto('/component-x');
  await page.evaluate(() => localStorage.setItem('theme', 'light'));
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  await expect(page).toHaveScreenshot('component-x-light-desktop.png', {
    maxDiffPixels: 100,
    mask: [page.locator('[data-dynamic]')] // Hide dynamic content
  });
});
```

### Template for Accessibility
```typescript
test('Component X - keyboard navigation', async ({ page }) => {
  await page.goto('/component-x');
  
  // Tab through elements
  const focusableElements = await page.locator('button, input, a').all();
  expect(focusableElements.length).toBeGreaterThan(0);
  
  // Verify focus is visible
  await focusableElements[0].focus();
  const focusStyle = await focusableElements[0].evaluate(el => {
    return window.getComputedStyle(el).outline;
  });
  expect(focusStyle).not.toMatch(/none/);
});
```

---

## Common Issues & Fixes

### Tests Timeout
**Problem:** `Timeout waiting for getSnapshot`  
**Fix:** Increase timeout or wait for element:
```typescript
await page.waitForSelector('[data-ready]', { timeout: 5000 });
```

### Screenshot Mismatch
**Problem:** `Screenshot mismatch: 1500 pixels`  
**Fix:** Update baseline:
```bash
npx playwright test --update-snapshots
```

### Mobile Viewport Issues
**Problem:** FAB button position not matching  
**Fix:** Ensure viewport set before navigation:
```typescript
await page.setViewportSize(375, 812);
await page.goto('/');
```

### Theme Not Applying
**Problem:** Dark mode screenshot looks light  
**Fix:** Reload after setting theme:
```typescript
await page.evaluate(() => localStorage.setItem('theme', 'dark'));
await page.reload();
```

---

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| FCP (First Contentful Paint) | < 1.5s | ⏳ Monitor |
| LCP (Largest Contentful Paint) | < 2.5s | ✅ Target |
| CLS (Cumulative Layout Shift) | < 0.1 | ✅ Target |
| Page Load Time | < 3s | ✅ Target |
| JS Bundle (pre-gzip) | < 500KB | ✅ Target |
| CSS Bundle (pre-gzip) | < 100KB | ✅ Target |
| Touch Target Size | ≥ 48×48px | ✅ Target |
| Dialog Open Time | < 300ms | ✅ Target |

---

## Accessibility Compliance

- ✅ WCAG 2.1 AA — All pages
- ✅ Color Contrast — 4.5:1 minimum
- ✅ Keyboard Navigation — Full tab order
- ✅ Focus Management — Visible, trappable
- ✅ Semantic HTML — Proper heading hierarchy
- ✅ Screen Reader Support — Alt text, ARIA labels
- ✅ Form Labels — All inputs have associated labels

---

## Reporting Results

### View HTML Report
```bash
npm run test:report
```

### Export Results as JSON
```bash
npx playwright test tests/ux-audit --reporter=json > results.json
```

### Export as JUnit XML (CI/CD)
```bash
npx playwright test tests/ux-audit --reporter=junit
```

---

## Continuous Integration

### Pre-commit
```bash
npm run test:ux:a11y  # Fast accessibility check
```

### Pre-merge
```bash
npm run test:ux:visual  # Screenshot regression
npm run test:ux:responsive  # Mobile layouts
```

### Pre-release
```bash
npm run test:ux  # Full suite
npm run test:ux:performance  # Performance baseline
```

---

## Debugging Tests

### Run Single Test File
```bash
npx playwright test tests/ux-audit/interactions.spec.ts
```

### Run Single Test
```bash
npx playwright test --grep "Quick Report Dialog should open instantly"
```

### Debug Mode (Step Through)
```bash
npm run test:ux:debug
```

### Run Headed (See Browser)
```bash
npm run test:ux:headed
```

### Video Recording
```bash
npx playwright test --project=chromium --reporter=list --headed --video=on
```

---

## Next Steps

1. **Generate Baselines** — First run creates baseline screenshots
2. **Run in CI/CD** — Add to GitHub Actions workflow
3. **Monitor Performance** — Track metrics over time
4. **Iterate** — Update baselines as design evolves
5. **Accessibility Audit** — Run full WCAG AAA audit before public launch

---

**Last Updated:** 2026-07-25  
**Test Count:** 72+ scenarios  
**Expected Runtime:** 15-20 minutes  
**Browsers:** Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari

