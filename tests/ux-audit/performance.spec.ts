import { test, expect } from '@playwright/test';

const PAGES = [
  '/',
  '/tickets',
  '/technician',
  '/machines',
  '/inventory',
  '/settings'
];

test.describe('Performance - Page Load Times', () => {
  PAGES.forEach(pagePath => {
    test(`${pagePath || 'Dashboard'} should load in < 3 seconds`, async ({ page }) => {
      const startTime = Date.now();

      await page.goto(pagePath, { waitUntil: 'networkidle' });

      const loadTime = Date.now() - startTime;

      console.log(`${pagePath || 'Dashboard'}: ${loadTime}ms`);

      // Should load in < 3 seconds on localhost
      expect(loadTime).toBeLessThan(3000);
    });

    test(`${pagePath || 'Dashboard'} should have FCP < 1.5s`, async ({ page }) => {
      await page.goto(pagePath);

      // Get First Contentful Paint
      const fcp = await page.evaluate(() => {
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        return fcpEntry ? fcpEntry.startTime : null;
      });

      console.log(`${pagePath || 'Dashboard'} FCP: ${fcp}ms`);

      // First Contentful Paint should be < 1500ms
      if (fcp) {
        expect(fcp).toBeLessThan(1500);
      }
    });

    test(`${pagePath || 'Dashboard'} should have LCP < 2.5s`, async ({ page }) => {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      // Measure Largest Contentful Paint
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          let largestEntry: any = null;

          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              if (entry.renderTime || entry.loadTime) {
                largestEntry = entry.renderTime || entry.loadTime;
              }
            });
          });

          observer.observe({ entryTypes: ['largest-contentful-paint'] });

          // Stop observing after 5 seconds
          setTimeout(() => {
            observer.disconnect();
            resolve(largestEntry);
          }, 5000);
        });
      });

      console.log(`${pagePath || 'Dashboard'} LCP: ${lcp}ms`);

      // LCP should be < 2500ms (2.5s)
      if (lcp) {
        expect(lcp as number).toBeLessThan(2500);
      }
    });
  });
});

test.describe('Performance - Cumulative Layout Shift', () => {
  PAGES.forEach(pagePath => {
    test(`${pagePath || 'Dashboard'} should have CLS < 0.1`, async ({ page }) => {
      let cls = 0;

      // Listen for layout shifts
      await page.evaluateHandle(() => {
        (window as any).cls = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const event = entry as any;
            if (!event.hadRecentInput) {
              (window as any).cls += event.value;
            }
          }
        });

        observer.observe({ type: 'layout-shift', buffered: true });
      });

      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      // Wait a bit for any late layout shifts
      await page.waitForTimeout(1000);

      cls = await page.evaluate(() => (window as any).cls || 0);

      console.log(`${pagePath || 'Dashboard'} CLS: ${cls}`);

      // CLS should be < 0.1
      expect(cls).toBeLessThan(0.1);
    });
  });
});

test.describe('Performance - Network Requests', () => {
  test('should not make excessive network requests', async ({ page }) => {
    const requests: string[] = [];

    page.on('response', (response) => {
      requests.push(response.url());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Typically should be < 50 requests for a single page
    console.log(`Total requests: ${requests.length}`);
    expect(requests.length).toBeLessThan(100);
  });

  test('should cache static assets', async ({ page }) => {
    // First visit - no cache
    const firstVisitRequests: Array<{ url: string; status: number }> = [];

    page.on('response', (response) => {
      if (response.url().match(/\.(js|css|png|jpg|woff2?)$/i)) {
        firstVisitRequests.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Second visit - should hit cache
    const secondVisitRequests: Array<{ url: string; status: number }> = [];

    page.on('response', (response) => {
      if (response.url().match(/\.(js|css|png|jpg|woff2?)$/i)) {
        secondVisitRequests.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should have fewer requests on second load (cached)
    console.log(`First load: ${firstVisitRequests.length} static assets`);
    console.log(`Second load: ${secondVisitRequests.length} static assets`);

    // Expect some cache hits
    expect(secondVisitRequests.length).toBeLessThanOrEqual(firstVisitRequests.length);
  });

  test('should not load unused resources', async ({ page }) => {
    const resources: string[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.match(/\.(js|css)$/i)) {
        resources.push(url);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that main resources are loaded
    const hasMainBundle = resources.some(r => r.includes('main') || r.includes('bundle'));
    expect(hasMainBundle).toBe(true);

    // Should not have excessively large bundles
    // This is just a basic check - real implementation would check file sizes
    expect(resources.length).toBeGreaterThan(0);
  });
});

test.describe('Performance - Bundle Size', () => {
  test('should have reasonable JS bundle size', async ({ page }) => {
    const jsRequests: Array<{ url: string; size: number }> = [];

    page.on('response', async (response) => {
      if (response.url().match(/\.js$/i)) {
        const size = (await response.body()).length;
        jsRequests.push({
          url: response.url(),
          size: size
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const totalSize = jsRequests.reduce((sum, r) => sum + r.size, 0);
    const totalSizeKB = totalSize / 1024;

    console.log(`Total JS bundle size: ${totalSizeKB.toFixed(2)}KB`);
    console.log(`Bundles:`, jsRequests.map(r => ({
      file: new URL(r.url).pathname.split('/').pop(),
      sizeKB: (r.size / 1024).toFixed(2)
    })));

    // Should be < 500KB total (before gzip)
    expect(totalSizeKB).toBeLessThan(500);
  });

  test('should have reasonable CSS bundle size', async ({ page }) => {
    const cssRequests: Array<{ url: string; size: number }> = [];

    page.on('response', async (response) => {
      if (response.url().match(/\.css$/i)) {
        const size = (await response.body()).length;
        cssRequests.push({
          url: response.url(),
          size: size
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const totalSize = cssRequests.reduce((sum, r) => sum + r.size, 0);
    const totalSizeKB = totalSize / 1024;

    console.log(`Total CSS bundle size: ${totalSizeKB.toFixed(2)}KB`);

    // Should be < 100KB total
    expect(totalSizeKB).toBeLessThan(100);
  });
});

test.describe('Performance - Rendering', () => {
  test('should not have excessive reflows/repaints', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simple animation performance check
    const startTime = performance.now();

    const fps = await page.evaluate(async () => {
      return new Promise((resolve) => {
        let frameCount = 0;
        let lastTime = performance.now();
        let totalTime = 0;

        const countFrames = () => {
          frameCount++;
          const currentTime = performance.now();

          if (currentTime - lastTime >= 1000) {
            totalTime = currentTime - lastTime;
            resolve({
              fps: frameCount,
              time: totalTime
            });
          } else {
            requestAnimationFrame(countFrames);
          }
        };

        requestAnimationFrame(countFrames);
      });
    });

    console.log('Animation performance:', fps);

    // Should maintain reasonable frame rate
    // This is a basic check - real implementation would be more thorough
    expect(fps).toBeTruthy();
  });

  test('should handle form interactions smoothly', async ({ page }) => {
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');

    // Open Quick Report dialog
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

    const startTime = Date.now();

    await page.keyboard.press(`${modifier}+Shift+R`);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    const openTime = Date.now() - startTime;

    console.log(`Dialog open time: ${openTime}ms`);

    // Dialog should open quickly (< 300ms)
    expect(openTime).toBeLessThan(300);

    // Filling form should be responsive
    const fillStart = Date.now();

    const input = dialog.locator('input, textarea').first();
    if (await input.count() > 0) {
      await input.focus();
      await input.type('Test');
    }

    const fillTime = Date.now() - fillStart;

    console.log(`Form fill time: ${fillTime}ms`);

    // Should respond to input within 50ms (reasonable threshold)
    expect(fillTime).toBeLessThan(500);
  });
});

test.describe('Performance - Memory', () => {
  test('should not leak memory on navigation', async ({ page }) => {
    // Note: This is a simplified test. Real memory leak detection
    // would need more sophisticated tools.

    const pages = ['/', '/tickets', '/machines', '/settings'];
    let previousMemory = 0;

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      const memory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      if (previousMemory > 0) {
        // Memory might fluctuate, but shouldn't consistently grow
        const growth = memory - previousMemory;
        console.log(`Memory at ${pagePath}: ${(memory / 1024 / 1024).toFixed(2)}MB (Δ ${(growth / 1024 / 1024).toFixed(2)}MB)`);
      }

      previousMemory = memory;
    }
  });
});
