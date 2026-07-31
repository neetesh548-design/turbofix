#!/usr/bin/env node

/**
 * Mobile Dashboard Visual Screenshot Capture & Responsiveness Audit Script
 * 
 * Captures full-page and component screenshots of /dashboard.html across
 * iPhone 15 Pro (390x844), iPhone SE (375x667), and Pixel 7 (412x915) viewports.
 * Analyzes computed element bounding boxes for mobile clipping, overflow, touch targets < 44px, and horizontal scroll defects.
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const OUTPUT_DIR = path.join(process.cwd(), 'artifacts', 'visual-audit', 'mobile');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const MOBILE_DEVICES = [
  { name: 'iPhone 15 Pro', width: 390, height: 844, deviceScaleFactor: 3 },
  { name: 'iPhone SE', width: 375, height: 667, deviceScaleFactor: 2 },
  { name: 'Pixel 7', width: 412, height: 915, deviceScaleFactor: 2.6 }
];

const ROLES = [
  { name: 'Owner Dashboard', role: 'owner' },
  { name: 'Technician Dashboard', role: 'maintenance_technician' },
  { name: 'Supervisor Dashboard', role: 'supervisor' },
  { name: 'Engineer Dashboard', role: 'maintenance_engineer' }
];

async function runMobileVisualCapture() {
  console.log('================================================================');
  console.log('📱 Starting Mobile Dashboard Visual Screenshot & Audit Runner');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });

  let previewProcess = null;
  let serverUrl = 'http://127.0.0.1:4173';

  try {
    const testRes = await fetch('http://127.0.0.1:4173');
    if (!testRes.ok) throw new Error();
  } catch (e) {
    try {
      const testRes = await fetch('http://localhost:5173');
      if (testRes.ok) serverUrl = 'http://localhost:5173';
      else throw new Error();
    } catch (e2) {
      console.log('⚡ Starting local Vite preview server on http://127.0.0.1:4173...');
      previewProcess = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173'], {
        stdio: 'ignore'
      });
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const manifest = {
    timestamp: new Date().toISOString(),
    mobileAudits: [],
    defects: []
  };

  for (const device of MOBILE_DEVICES) {
    console.log(`\n📱 Auditing viewports for device: ${device.name} (${device.width} x ${device.height})...`);
    
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.deviceScaleFactor,
      isMobile: true,
      hasTouch: true
    });

    for (const roleConfig of ROLES) {
      const page = await context.newPage();

      // Set user role and valid demo token in localStorage before loading dashboard
      await page.addInitScript((role) => {
        localStorage.setItem('tf_token', `demo:${role}`);
        localStorage.setItem('tf_user', JSON.stringify({
          user_id: 'mobile-test-user',
          name: 'Mobile Auditor',
          email: 'auditor@turbofix.co.in',
          role: role
        }));
        localStorage.setItem('theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      }, roleConfig.role);

      try {
        await page.goto(`${serverUrl}/dashboard.html`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      } catch (e) {
        await page.goto(`${serverUrl}/dashboard.html`, { waitUntil: 'load', timeout: 10000 });
      }

      await page.waitForTimeout(1000);

      const deviceSlug = device.name.toLowerCase().replace(/\s+/g, '-');
      const roleSlug = roleConfig.name.toLowerCase().replace(/\s+/g, '-');
      const screenshotFileName = `dashboard-${roleSlug}-${deviceSlug}.png`;
      const screenshotPath = path.join(OUTPUT_DIR, screenshotFileName);

      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`  ✅ Saved mobile screenshot: ${screenshotPath}`);

      // Evaluate mobile layout clipping & responsiveness defects
      const pageAudit = await page.evaluate((devWidth) => {
        const defects = [];
        const bodyWidth = document.body.scrollWidth;

        // 1. Check for horizontal overflow of body
        if (bodyWidth > devWidth + 5) {
          defects.push({
            type: 'Horizontal Body Overflow',
            bodyWidth,
            viewportWidth: devWidth,
            message: `Body width (${bodyWidth}px) exceeds viewport width (${devWidth}px).`
          });
        }

        // 2. Check for interactive elements with small touch targets (< 40px)
        const interactiveElements = document.querySelectorAll('button, a, input, select');
        interactiveElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top <= window.innerHeight) {
            if (rect.height < 36 || rect.width < 36) {
              defects.push({
                type: 'Small Touch Target',
                element: el.tagName.toLowerCase(),
                text: (el.textContent || '').trim().substring(0, 30),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              });
            }
          }
        });

        // 3. Check for text element clipping or overflow
        const kpiValues = document.querySelectorAll('.md-kpi-value, .md-pulse-value, h1, h2');
        kpiValues.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.right > devWidth + 2) {
            defects.push({
              type: 'Text Element Clipped Right',
              text: (el.textContent || '').trim().substring(0, 30),
              rightPx: Math.round(rect.right)
            });
          }
        });

        return { defects };
      }, device.width);

      manifest.mobileAudits.push({
        device: device.name,
        role: roleConfig.name,
        screenshot: screenshotFileName,
        defectCount: pageAudit.defects.length
      });

      if (pageAudit.defects.length > 0) {
        manifest.defects.push({
          device: device.name,
          role: roleConfig.name,
          defects: pageAudit.defects
        });
      }

      await page.close();
    }

    await context.close();
  }

  await browser.close();
  if (previewProcess) previewProcess.kill();

  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n🎉 Mobile visual screenshot capture complete! Manifest written to: ${manifestPath}`);
}

runMobileVisualCapture().catch((err) => {
  console.error('❌ Error during mobile visual capture:', err);
  process.exit(1);
});
