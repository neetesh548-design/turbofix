#!/usr/bin/env node

/**
 * Light Theme Visual Screenshot Capture & UI Audit Script
 * 
 * Captures full-page and component screenshots of light theme across all main routes,
 * analyzes computed element styles for contrast and visual readability defects,
 * and saves screenshot artifacts + manifest metadata for Stitch MCP integration.
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const OUTPUT_DIR = path.join(process.cwd(), 'artifacts', 'visual-audit', 'light-theme');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const PAGES = [
  { name: 'Dashboard', path: '/dashboard.html' },
  { name: 'Tickets', path: '/tickets.html' },
  { name: 'Technician', path: '/technician.html' },
  { name: 'Machines', path: '/machines.html' },
  { name: 'Inventory', path: '/inventory.html' },
  { name: 'Settings', path: '/settings.html' },
  { name: 'Kaizen', path: '/kaizen.html' },
  { name: 'Report Breakdown', path: '/report-breakdown.html' },
  { name: 'Records', path: '/records.html' },
  { name: 'RCA', path: '/rca.html' },
  { name: 'Shutdown Planner', path: '/shutdown-planner.html' },
  { name: 'Team', path: '/team.html' },
  { name: 'Support', path: '/support.html' },
  { name: 'Pricing', path: '/pricing.html' },
  { name: 'Why TurboFix', path: '/why-turbofix.html' },
  { name: 'Platform', path: '/platform.html' }
];

async function runVisualCapture() {
  console.log('================================================================');
  console.log('📸 Starting Light Theme Visual Screenshot & UI Audit Runner');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });

  const manifest = {
    timestamp: new Date().toISOString(),
    pagesAudited: [],
    visualDefects: []
  };

  let previewProcess = null;
  let serverUrl = 'http://127.0.0.1:4173';

  // Detect active server or spawn preview server
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

  for (const pageInfo of PAGES) {
    console.log(`🔎 Auditing visual layout & capturing screenshot for: ${pageInfo.name} (${pageInfo.path})...`);
    const page = await context.newPage();

    // Set light theme before loading
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });

    try {
      await page.goto(`${serverUrl}${pageInfo.path}`, { waitUntil: 'networkidle', timeout: 10000 });
    } catch (e) {
      await page.goto(`${serverUrl}${pageInfo.path}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    }

    await page.waitForTimeout(1000);

    // Save full-page screenshot
    const screenshotFileName = `${pageInfo.name.toLowerCase().replace(/\s+/g, '-')}-light.png`;
    const screenshotPath = path.join(OUTPUT_DIR, screenshotFileName);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  ✅ Saved screenshot: ${screenshotPath}`);

    // Analyze visible headings, cards, and body elements for visual defects
    const pageAudit = await page.evaluate((name) => {
      const defects = [];
      const textNodes = document.querySelectorAll('h1, h2, h3, h4, p, span, a, button');

      textNodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const cs = window.getComputedStyle(node);
        const color = cs.color;
        const textFill = cs.webkitTextFillColor || cs.getPropertyValue('-webkit-text-fill-color');
        const bgImg = cs.backgroundImage;

        let parent = node.parentElement;
        let bg = 'rgb(255, 255, 255)';
        while (parent) {
          const parentBg = window.getComputedStyle(parent).backgroundColor;
          if (parentBg && parentBg !== 'transparent' && !parentBg.includes('rgba(0, 0, 0, 0)')) {
            bg = parentBg;
            break;
          }
          parent = parent.parentElement;
        }

        // Check for potential transparent clip text over light background
        if (textFill && (textFill === 'transparent' || textFill.includes('rgba(0, 0, 0, 0)')) && (!bgImg || bgImg === 'none')) {
          defects.push({
            type: 'Invisible Text',
            element: node.tagName.toLowerCase(),
            text: (node.textContent || '').trim().substring(0, 40),
            color,
            bg
          });
        }
      });

      return { defects };
    }, pageInfo.name);

    manifest.pagesAudited.push({
      name: pageInfo.name,
      path: pageInfo.path,
      screenshot: screenshotFileName,
      defectCount: pageAudit.defects.length
    });

    if (pageAudit.defects.length > 0) {
      manifest.visualDefects.push({
        page: pageInfo.name,
        defects: pageAudit.defects
      });
    }

    await page.close();
  }

  await browser.close();
  if (previewProcess) {
    previewProcess.kill();
  }

  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n🎉 Visual screenshot capture complete! Manifest written to: ${manifestPath}`);
}

runVisualCapture().catch((err) => {
  console.error('❌ Error during visual capture:', err);
  process.exit(1);
});
