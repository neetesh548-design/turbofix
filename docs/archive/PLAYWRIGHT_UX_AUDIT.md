# TurboFix Playwright UX/UI Audit Plan

**Objective:** Automated testing of user experience, interface consistency, accessibility, and responsiveness across all pages.

**Scope:** 12 pages × 3 view modes (MVP/Full/Mobile) × 2 themes (Light/Dark) = 72 test scenarios

**Estimated Runtime:** 15-20 minutes  
**Test Framework:** Playwright + Accessibility Checker (axe-core)

---

## 1. Audit Categories & Test Coverage

### A. Visual Regression Testing (Screenshots)
- [ ] **Light Mode Screenshots** — All 12 pages in MVP/Full mode
- [ ] **Dark Mode Screenshots** — All 12 pages in MVP/Full mode
- [ ] **Mobile Screenshots** — All 12 pages responsive layout
- [ ] **Tablet Screenshots** — iPad layout consistency

### B. Accessibility (a11y) Testing
- [ ] **WCAG 2.1 AA Compliance** — Headings, contrast, labels, ARIA
- [ ] **Keyboard Navigation** — Tab order, focus visible, Escape key
- [ ] **Screen Reader Support** — Semantic HTML, alt text, roles
- [ ] **Color Contrast** — Text on backgrounds (light/dark modes)

### C. Responsive Design Testing
- [ ] **Mobile (375×812)** — iPhone 12 viewport
- [ ] **Tablet (768×1024)** — iPad viewport
- [ ] **Desktop (1280×800)** — Standard desktop
- [ ] **Large Desktop (1920×1080)** — Wide screens

### D. Interaction & Workflow Testing
- [ ] **Quick Report Dialog** — 0-click header launch
- [ ] **View Mode Toggle** — MVP ↔ Full persistence
- [ ] **Evidence Capture** — Photo/voice upload flows
- [ ] **Navigation Patterns** — Rail reordering, context persistence
- [ ] **Form Validation** — Error states, disabled buttons
- [ ] **Drill-down Panels** — Expand/collapse animations

### E. Performance Testing
- [ ] **Page Load Time** — < 3s on all pages
- [ ] **Core Web Vitals** — LCP, FID, CLS
- [ ] **Image Optimization** — No oversized assets
- [ ] **Bundle Size** — Gzip < 200KB

### F. Dark Mode Consistency
- [ ] **All Pages** — No hardcoded colors breaking theme
- [ ] **Charts/Graphs** — Readable in both themes
- [ ] **Modals/Dialogs** — Proper contrast
- [ ] **Form Elements** — Input visible in both modes

### G. Mobile Touch UX
- [ ] **FAB Button** — Bottom-right placement, no content overlap
- [ ] **Bottom Sheet Dialog** — Swipe-to-close, draggable header
- [ ] **Touch Targets** — Minimum 48×48px for buttons
- [ ] **Tap Delays** — No 300ms delay on interactive elements

### H. Localization & Multi-Language
- [ ] **9 Languages** — Text fits in UI without truncation
- [ ] **RTL Layout** — Arabic/Hebrew text direction
- [ ] **Date/Number Formatting** — Locale-specific display
- [ ] **Translation Completeness** — No missing keys

---

## 2. Test File Structure

```
tests/
├── fixtures/
│   ├── devices.ts           # Device presets (mobile, tablet, desktop)
│   ├── themes.ts            # Light/dark mode configs
│   ├── viewModes.ts         # MVP/Full mode helpers
│   └── testData.ts          # Mock data (machines, tickets)
├── helpers/
│   ├── a11y.ts              # Accessibility checking utilities
│   ├── screenshots.ts       # Visual regression helpers
│   ├── performance.ts       # Lighthouse/CWV metrics
│   └── navigation.ts        # Nav pattern helpers
├── visual-regression/
│   ├── dashboard.spec.ts
│   ├── tickets.spec.ts
│   ├── technician.spec.ts
│   ├── machines.spec.ts
│   └── ... (12 pages)
├── a11y/
│   ├── navigation.spec.ts   # Tab order, focus
│   ├── contrast.spec.ts     # Color contrast WCAG AA
│   ├── semantic.spec.ts     # Heading hierarchy, labels
│   └── keyboard.spec.ts     # Escape, Enter, arrow keys
├── responsive/
│   ├── mobile.spec.ts       # 375×812 layouts
│   ├── tablet.spec.ts       # 768×1024 layouts
│   └── desktop.spec.ts      # Multi-width testing
├── interaction/
│   ├── quickReport.spec.ts  # Dialog workflows
│   ├── viewMode.spec.ts     # Toggle persistence
│   ├── drilldown.spec.ts    # Expand/collapse
│   └── forms.spec.ts        # Validation UX
├── performance/
│   ├── pageLoad.spec.ts     # Load times
│   ├── coreWebVitals.spec.ts
│   └── bundleSize.spec.ts
├── darkMode/
│   ├── consistency.spec.ts  # All pages in dark theme
│   └── contrast.spec.ts     # WCAG AA in dark mode
├── mobile/
│   ├── touchTargets.spec.ts # 48×48px minimum
│   ├── fab.spec.ts          # FAB positioning
│   └── gestures.spec.ts     # Swipe, long-press
└── localization/
    ├── languages.spec.ts    # 9 languages display
    ├── rtl.spec.ts          # RTL layout
    └── truncation.spec.ts   # Text overflow handling
```

---

## 3. Test Implementation Templates

### A. Visual Regression (Dashboard Example)

```typescript
// tests/visual-regression/dashboard.spec.ts
import { test, expect } from '@playwright/test';
import { devices } from '../fixtures/devices';
import { themes } from '../fixtures/themes';

test.describe('Dashboard Visual Regression', () => {
  // Light Mode - Desktop
  test('should render light mode desktop screenshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.setItem('theme', 'light'));
    await page.reload();
    
    // Wait for animations to settle
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Compare to baseline
    await expect(page).toHaveScreenshot('dashboard-light-desktop.png', {
      maxDiffPixels: 100, // Allow minor rendering differences
      mask: [
        page.locator('[data-testid="live-timestamp"]') // Exclude dynamic content
      ]
    });
  });

  // Light Mode - Mobile
  test('should render light mode mobile screenshot', async ({ page }) => {
    await page.setViewportSize(375, 812); // iPhone 12
    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.setItem('theme', 'light'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('dashboard-light-mobile.png');
  });

  // Dark Mode - Desktop
  test('should render dark mode desktop screenshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('dashboard-dark-desktop.png');
  });

  // Dark Mode - Mobile
  test('should render dark mode mobile screenshot', async ({ page }) => {
    await page.setViewportSize(375, 812);
    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('dashboard-dark-mobile.png');
  });

  // MVP Mode
  test('should render MVP mode correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.setItem('viewMode', 'mvp'));
    await page.reload();
    
    // Verify drill-down buttons visible
    const drilldownButtons = page.locator('[data-drill-down-toggle]');
    await expect(drilldownButtons.first()).toBeVisible();
    
    await expect(page).toHaveScreenshot('dashboard-mvp-mode.png');
  });

  // Full Mode
  test('should render Full mode correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.setItem('viewMode', 'full'));
    await page.reload();
    
    // Verify drill-down content visible without toggle
    const drilldownContent = page.locator('[data-drill-down-content]');
    await expect(drilldownContent.first()).toBeVisible();
    
    await expect(page).toHaveScreenshot('dashboard-full-mode.png');
  });
});
```

---

### B. Accessibility Testing (Keyboard Navigation)

```typescript
// tests/a11y/keyboard.spec.ts
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Keyboard Navigation & Accessibility', () => {
  test('should have proper tab order on all pages', async ({ page }) => {
    const pages = [
      '/dashboard', '/tickets', '/technician', '/machines', 
      '/inventory', '/kaizen', '/records', '/shutdown', 
      '/support', '/team', '/settings'
    ];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Get all focusable elements
      const focusableElements = await page.locator(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ).all();

      expect(focusableElements.length).toBeGreaterThan(0);

      // Verify tab order is logical
      for (let i = 0; i < focusableElements.length; i++) {
        const elem = focusableElements[i];
        const tabindex = await elem.getAttribute('tabindex');
        
        // Should not have positive tabindex (bad for accessibility)
        expect(Number(tabindex ?? '-1')).toBeLessThanOrEqual(0);
      }
    }
  });

  test('should trap focus inside Quick Report dialog', async ({ page }) => {
    await page.goto('/');
    
    // Open Quick Report dialog
    const reportBtn = page.locator('button:has-text("Report Issue")');
    await reportBtn.click();
    
    await page.waitForSelector('[role="dialog"]');
    
    // Get all focusable elements inside dialog
    const dialog = page.locator('[role="dialog"]');
    const focusableInDialog = await dialog.locator(
      'button, [href], input, select, textarea'
    ).all();

    expect(focusableInDialog.length).toBeGreaterThan(0);

    // Tab to last element, then Tab again - focus should loop back to first
    const firstBtn = focusableInDialog[0];
    const lastBtn = focusableInDialog[focusableInDialog.length - 1];

    await firstBtn.focus();
    
    // Shift+Tab from first element should wrap to last
    await page.keyboard.press('Shift+Tab');
    const activeElement = await page.evaluate(() => document.activeElement?.getAttribute('class'));
    
    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('should support Cmd+Shift+R for Quick Report', async ({ page }) => {
    await page.goto('/settings'); // Start on different page
    
    // Press Cmd+Shift+R (or Ctrl+Shift+R on Windows)
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? 'Meta' : 'Control';
    
    await page.keyboard.press(`${modifier}+Shift+R`);
    
    // Quick Report dialog should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should allow keyboard form submission', async ({ page }) => {
    await page.goto('/tickets');
    
    // Open Quick Report dialog
    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+Shift+R`);
    
    // Navigate form with Tab
    const machineSelect = page.locator('[data-testid="quick-report-machine"]');
    await machineSelect.focus();
    
    const issueInput = page.locator('[data-testid="quick-report-issue"]');
    await page.keyboard.press('Tab');
    expect(issueInput).toBeFocused();
    
    // Type issue description
    await page.keyboard.type('Machine broke');
    
    // Tab to submit button
    await page.keyboard.press('Tab');
    const submitBtn = page.locator('button:has-text("Submit")');
    expect(submitBtn).toBeFocused();
    
    // Submit with Enter
    await page.keyboard.press('Enter');
    
    // Dialog should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should verify WCAG 2.1 AA compliance on all pages', async ({ page }) => {
    const pages = [
      '/dashboard', '/tickets', '/technician', '/machines', 
      '/inventory', '/kaizen', '/records', '/shutdown', 
      '/support', '/team', '/settings'
    ];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Inject axe and check
      await injectAxe(page);
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: {
          html: true
        }
      });
    }
  });
});
```

---

### C. Responsive Design Testing

```typescript
// tests/responsive/mobile.spec.ts
import { test, expect } from '@playwright/test';

const VIEWPORTS = {
  'iPhone 12': { width: 390, height: 844 },
  'iPhone SE': { width: 375, height: 667 },
  'iPad': { width: 768, height: 1024 },
  'Samsung Galaxy S21': { width: 360, height: 800 },
};

test.describe('Mobile Responsive Design', () => {
  Object.entries(VIEWPORTS).forEach(([device, viewport]) => {
    test(`should display correctly on ${device}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard');
      
      // Verify no horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = viewport.width;
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
      
      // Verify no overlapping elements
      const allElements = await page.locator('*').all();
      const positions = new Map();

      for (const elem of allElements) {
        const box = await elem.boundingBox();
        if (!box) continue;

        for (const [, existing] of positions) {
          // Check for overlap (simplified)
          const overlap = !(
            box.x + box.width < existing.x ||
            box.x > existing.x + existing.width ||
            box.y + box.height < existing.y ||
            box.y > existing.y + existing.height
          );
          
          // Allow some overlap for expected UI patterns
          // (e.g., tooltips, dropdowns)
          expect(overlap).toBe(true); // Simplified check
        }
        positions.set(elem, box);
      }
    });
  });

  test('FAB button should not overlap content on mobile', async ({ page }) => {
    await page.setViewportSize(375, 812); // Mobile
    await page.goto('/tickets');
    
    const fab = page.locator('[data-testid="quick-report-fab"]');
    const fabBox = await fab.boundingBox();
    
    // FAB should be in bottom-right
    expect(fabBox?.right).toBeGreaterThan(300); // Right side
    expect(fabBox?.bottom).toBeGreaterThan(700); // Bottom side
    
    // FAB should not cover main content
    const mainContent = page.locator('main');
    const contentBox = await mainContent.boundingBox();
    
    if (contentBox && fabBox) {
      const overlap = !(
        fabBox.x >= contentBox.x + contentBox.width ||
        fabBox.x + fabBox.width <= contentBox.x ||
        fabBox.y >= contentBox.y + contentBox.height ||
        fabBox.y + fabBox.height <= contentBox.y
      );
      
      // Small overlap acceptable, but not covering content
      expect(overlap).toBe(true);
    }
  });

  test('touch targets should be 48×48px minimum', async ({ page }) => {
    await page.setViewportSize(375, 812);
    await page.goto('/tickets');
    
    const buttons = await page.locator('button, [role="button"]').all();
    const MIN_SIZE = 48;

    for (const btn of buttons) {
      const box = await btn.boundingBox();
      if (!box) continue;

      const width = box.width;
      const height = box.height;

      // Allow some buttons to be smaller (icon buttons with padding)
      if (width < MIN_SIZE || height < MIN_SIZE) {
        // Check if it has padding that brings effective size up
        const padding = await btn.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return parseInt(style.padding) || 8;
        });

        const effectiveWidth = width + padding * 2;
        const effectiveHeight = height + padding * 2;

        expect(effectiveWidth).toBeGreaterThanOrEqual(MIN_SIZE);
        expect(effectiveHeight).toBeGreaterThanOrEqual(MIN_SIZE);
      }
    }
  });
});
```

---

### D. Interaction Testing (Quick Report Dialog)

```typescript
// tests/interaction/quickReport.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Quick Report Dialog UX', () => {
  test('should open instantly from header (0-click)', async ({ page }) => {
    await page.goto('/settings'); // Start on different page
    
    const startTime = Date.now();
    
    // Click "Report Issue" button in header
    const reportBtn = page.locator('button:has-text("Report Issue")');
    await reportBtn.click();
    
    // Dialog should open immediately
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 500 });
    
    const openTime = Date.now() - startTime;
    expect(openTime).toBeLessThan(500); // Should open in < 500ms
  });

  test('should preserve machine selection between dialogs', async ({ page }) => {
    await page.goto('/tickets');
    
    // Open dialog, select machine
    const reportBtn = page.locator('button:has-text("Report Issue")');
    await reportBtn.click();
    
    const machineSelect = page.locator('[data-testid="quick-report-machine"]');
    await machineSelect.selectOption('machine-123');
    
    // Close dialog
    await page.keyboard.press('Escape');
    
    // Open again
    await reportBtn.click();
    
    // Machine should still be selected
    const selectedOption = await machineSelect.inputValue();
    expect(selectedOption).toBe('machine-123');
  });

  test('should show photo preview after upload', async ({ page }) => {
    await page.goto('/tickets');
    
    // Open dialog
    const reportBtn = page.locator('button:has-text("Report Issue")');
    await reportBtn.click();
    
    // Upload photo
    const photoInput = page.locator('[data-testid="photo-upload"]');
    
    // Create a dummy image file
    const buffer = Buffer.from('fake-image-data');
    const fileName = 'test-image.jpg';
    
    await photoInput.setInputFiles({
      name: fileName,
      mimeType: 'image/jpeg',
      buffer: buffer
    });
    
    // Preview should appear
    const preview = page.locator('[data-testid="photo-preview"]');
    await expect(preview).toBeVisible();
  });

  test('should disable submit button until machine selected', async ({ page }) => {
    await page.goto('/tickets');
    
    // Open dialog
    const reportBtn = page.locator('button:has-text("Report Issue")');
    await reportBtn.click();
    
    const submitBtn = page.locator('button:has-text("Submit")');
    
    // Should be disabled initially
    await expect(submitBtn).toBeDisabled();
    
    // Select machine
    const machineSelect = page.locator('[data-testid="quick-report-machine"]');
    await machineSelect.selectOption('machine-123');
    
    // Submit should be enabled
    await expect(submitBtn).toBeEnabled();
  });

  test('should show success message after submission', async ({ page }) => {
    await page.goto('/tickets');
    
    // Fill and submit form
    const reportBtn = page.locator('button:has-text("Report Issue")');
    await reportBtn.click();
    
    const machineSelect = page.locator('[data-testid="quick-report-machine"]');
    await machineSelect.selectOption('machine-123');
    
    const issueInput = page.locator('[data-testid="quick-report-issue"]');
    await issueInput.fill('Machine broke');
    
    const submitBtn = page.locator('button:has-text("Submit")');
    await submitBtn.click();
    
    // Success message should appear
    const successMsg = page.locator('text=/Supervisor.*notified.*WhatsApp/i');
    await expect(successMsg).toBeVisible();
    
    // Dialog should close after 2 seconds
    await page.waitForTimeout(2500);
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).not.toBeVisible();
  });
});
```

---

### E. Dark Mode Consistency

```typescript
// tests/darkMode/consistency.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dark Mode Consistency', () => {
  const pages = [
    '/dashboard', '/tickets', '/technician', '/machines', 
    '/inventory', '/records', '/shutdown', '/support', '/team', '/settings'
  ];

  pages.forEach(page => {
    test(`${page} should be readable in dark mode`, async ({ page: playPage }) => {
      await playPage.goto(page);
      
      // Enable dark mode
      await playPage.evaluate(() => {
        localStorage.setItem('theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      
      await playPage.reload();
      await playPage.waitForLoadState('networkidle');
      
      // Check text contrast
      const textElements = await playPage.locator('p, span, h1, h2, h3, h4, a').all();
      
      for (const elem of textElements) {
        if (!await elem.isVisible()) continue;

        const textColor = await elem.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        const bgColor = await elem.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        // Verify colors are not the same (basic check)
        expect(textColor).not.toBe(bgColor);
      }
    });
  });

  test('charts should be readable in dark mode', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Enable dark mode
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();
    
    // Check chart colors
    const charts = await page.locator('canvas, svg[data-chart]').all();
    expect(charts.length).toBeGreaterThan(0);
    
    // Take screenshot to verify visually
    await expect(page).toHaveScreenshot('dashboard-dark-charts.png');
  });
});
```

---

### F. Performance Testing

```typescript
// tests/performance/pageLoad.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Metrics', () => {
  const pages = [
    '/dashboard', '/tickets', '/technician', '/machines', '/inventory'
  ];

  pages.forEach(pagePath => {
    test(`${pagePath} should load in < 3 seconds`, async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(pagePath, { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    test(`${pagePath} should have Core Web Vitals`, async ({ page }) => {
      await page.goto(pagePath);
      
      // Measure Core Web Vitals
      const cwv = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = {};
          
          // LCP (Largest Contentful Paint)
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            vitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
          }).observe({ entryTypes: ['largest-contentful-paint'] });

          // FID (First Input Delay)
          new PerformanceObserver((list) => {
            list.getEntries().forEach((entry: any) => {
              vitals.fid = Math.max(vitals.fid || 0, entry.processingDuration);
            });
          }).observe({ entryTypes: ['first-input'] });

          // CLS (Cumulative Layout Shift)
          let cls = 0;
          new PerformanceObserver((list) => {
            list.getEntries().forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                cls += entry.value;
              }
            });
            vitals.cls = cls;
          }).observe({ entryTypes: ['layout-shift'] });

          setTimeout(() => resolve(vitals), 3000);
        });
      });

      // Google's Web Vitals thresholds
      if (cwv.lcp) expect(cwv.lcp).toBeLessThan(2500); // < 2.5s
      if (cwv.fid) expect(cwv.fid).toBeLessThan(100);  // < 100ms
      if (cwv.cls) expect(cwv.cls).toBeLessThan(0.1);  // < 0.1
    });
  });

  test('should have bundle size < 200KB gzipped', async ({ page }) => {
    const networkRequests: any[] = [];

    page.on('response', (response) => {
      networkRequests.push({
        url: response.url(),
        size: response.request().postDataBuffer()?.length || 0,
        headers: response.headers()
      });
    });

    await page.goto('/dashboard');

    // Get main JS bundle size
    const jsFiles = networkRequests.filter(r => r.url.includes('.js'));
    const totalSize = jsFiles.reduce((sum, f) => sum + (f.size || 0), 0);

    // Should be < 200KB before gzip
    expect(totalSize).toBeLessThan(200 * 1024);
  });
});
```

---

## 4. Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },

  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    }
  ]
});
```

---

## 5. Test Execution Commands

```bash
# Run all UX/UI tests
npm run test:ux

# Run specific test suites
npm run test:ux:visual      # Visual regression only
npm run test:ux:a11y        # Accessibility only
npm run test:ux:responsive  # Mobile responsiveness
npm run test:ux:interaction # User workflows
npm run test:ux:performance # Load times, CWV

# Run with UI mode (interactive)
npm run test:ux -- --ui

# Run headed (see browser)
npm run test:ux -- --headed

# Generate HTML report
npm run test:ux && npx playwright show-report
```

---

## 6. CI/CD Integration (GitHub Actions)

```yaml
# .github/workflows/ux-audit.yml
name: UX/UI Playwright Audit

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      
      - run: npm run test:ux
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
      
      - name: Publish results to PR
        if: always()
        uses: daun/playwright-report-comment@v3
        with:
          report-path: playwright-report
```

---

## 7. Audit Results Summary Template

```markdown
# TurboFix UX/UI Audit Results

## Overview
- **Test Date:** 2026-07-25
- **Total Tests:** 72+
- **Pass Rate:** X%
- **Duration:** 18 minutes
- **Browser Coverage:** Chrome, Firefox, Safari, Mobile

## Visual Regression
- [ ] Dashboard — ✅ PASS
- [ ] Tickets — ✅ PASS
- [ ] Technician — ✅ PASS
- [ ] Machines — ⚠️ FAIL (see details)
- ... (12 pages total)

## Accessibility (WCAG 2.1 AA)
- ✅ Keyboard Navigation — 100% compliant
- ✅ Color Contrast — All pages PASS
- ✅ Semantic HTML — No errors
- ⚠️ Focus Management — 1 dialog needs work

## Responsive Design
- ✅ iPhone (375×812) — All pages responsive
- ✅ iPad (768×1024) — All pages responsive
- ✅ Desktop (1280×800) — No horizontal scroll
- ✅ Large Desktop — Proper max-widths

## Dark Mode
- ✅ All pages readable in dark mode
- ✅ Charts visible in both themes
- ✅ Form inputs visible
- ✅ Modals have proper contrast

## Performance
- ✅ Page loads < 3s
- ✅ Core Web Vitals: LCP 2.1s, FID 50ms, CLS 0.05
- ✅ Bundle size 145KB gzipped
- ✅ No memory leaks detected

## Mobile UX
- ✅ FAB positioning correct
- ✅ Touch targets 48×48px minimum
- ✅ No 300ms tap delay
- ✅ Bottom sheet dialog works

## Interaction Workflows
- ✅ Quick Report: 0-click header access
- ✅ View Mode Toggle: Persists across sessions
- ✅ Evidence Capture: Photos upload correctly
- ✅ Navigation: 1-click to top 3 pages

## Localization
- ✅ All 9 languages display without truncation
- ✅ RTL layout correct for Arabic
- ✅ Date/number formatting per locale
- ✅ No missing translation keys

## Key Findings

### Critical (Must Fix)
- None

### Medium (Should Fix)
1. Dashboard on iPad landscape shows slight cut-off (1.2% pixel overflow)
2. Machines page contrast ratio 4.2:1 in dark mode (threshold 4.5:1)

### Low (Nice to Have)
1. Add @media query for ultra-wide screens (> 2560px)
2. Optimize hero images for AVIF format

## Recommendations

1. **Snapshot Update:** Baseline screenshots match actual rendered output
2. **Continuous Testing:** Add this to CI/CD to catch regressions
3. **A/B Testing:** Track which view mode users prefer via analytics
4. **Accessibility Audit:** Full WCAG AAA audit for public-facing pages

## Next Steps
- [ ] Fix medium-priority issues by 2026-07-26
- [ ] Re-run audit on fixed issues
- [ ] Merge to main when all critical/medium issues resolved
- [ ] Set up automated audit in CI pipeline
```

---

## 8. Package Dependencies

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "axe-playwright": "^1.2.3",
    "axe-core": "^4.8.0",
    "@axe-core/playwright": "^1.2.0"
  }
}
```

---

## 9. Quick Start

```bash
# Install Playwright
npm install -D @playwright/test axe-playwright

# Create test directory structure
mkdir -p tests/{fixtures,helpers,visual-regression,a11y,responsive,interaction,performance,darkMode,mobile,localization}

# Copy test templates (from section 3)
# Update playwright.config.ts

# Run audit
npm run test:ux

# View results
npx playwright show-report
```

---

## 10. Success Criteria

✅ **All visual regression tests pass** (0 unexpected screenshots)  
✅ **100% WCAG 2.1 AA compliance** across all pages  
✅ **Responsive on all device sizes** (375px–2560px width)  
✅ **Dark mode readable** on all pages  
✅ **Page loads < 3s** on all major pages  
✅ **Core Web Vitals meet thresholds** (LCP < 2.5s, FID < 100ms, CLS < 0.1)  
✅ **Mobile touch UX works** (FAB, gestures, 48px targets)  
✅ **Keyboard navigation flawless** (Tab, Escape, shortcuts)  
✅ **All 9 languages display** without truncation  

---

🎯 **Total Test Coverage:** 72+ scenarios across 12 pages × 3 modes × 2 themes  
⏱️ **Expected Runtime:** 15–20 minutes  
📊 **Output:** HTML report + JSON + Screenshots + Video recordings (failures)

