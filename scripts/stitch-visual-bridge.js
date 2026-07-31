#!/usr/bin/env node

/**
 * Stitch Visual Remediation Bridge
 * 
 * Processes captured light theme screenshots and visual audit metadata,
 * generates a comprehensive LIGHT_THEME_VISUAL_AUDIT_REPORT.md report,
 * and formulates actionable Stitch MCP prompts for design system updates and visual screen rectifications.
 */

import fs from 'fs';
import path from 'path';

const AUDIT_DIR = path.join(process.cwd(), 'artifacts', 'visual-audit', 'light-theme');
const MANIFEST_PATH = path.join(AUDIT_DIR, 'manifest.json');
const REPORT_PATH = path.join(process.cwd(), 'LIGHT_THEME_VISUAL_AUDIT_REPORT.md');

function runStitchBridge() {
  console.log('================================================================');
  console.log('🧵 Running Stitch MCP Visual Remediation Bridge');
  console.log('================================================================\n');

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`❌ Manifest file not found at ${MANIFEST_PATH}. Please run scripts/capture-light-theme-visuals.js first.`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  let markdown = `# Stitch Visual Remediation Audit & Design System Bridge\n\n`;
  markdown += `*Generated: ${manifest.timestamp}*\n\n`;
  markdown += `This report details full-page light-theme screenshot artifacts captured across application routes, visual defect analyses, and actionable Stitch MCP prompt specifications to visually rectify light mode UI styling.\n\n`;

  markdown += `## 📸 Light Theme Screenshot Catalog\n\n`;
  markdown += `| Page Route | Screenshot File | Visual Defects Found |\n`;
  markdown += `| :--- | :--- | :--- |\n`;

  manifest.pagesAudited.forEach((page) => {
    const relScreenshotPath = `artifacts/visual-audit/light-theme/${page.screenshot}`;
    markdown += `| **${page.name}** (\`${page.path}\`) | [${page.screenshot}](file:///${path.join(process.cwd(), relScreenshotPath)}) | ${page.defectCount === 0 ? '✅ Clean' : `⚠️ ${page.defectCount} issues`} |\n`;
  });

  markdown += `\n## 🎨 Stitch MCP Design System & Screen Rectiation Prompts\n\n`;
  markdown += `Use the following structured prompts with Stitch MCP tools (\`edit_screens\`, \`generate_screen_from_text\`, \`create_design_system\`) to update and harmonize light theme visuals:\n\n`;

  markdown += `### 1. Light Theme Design System Tokens (\`create_design_system\` / \`update_design_system\`)\n`;
  markdown += `\`\`\`json\n`;
  markdown += JSON.stringify({
    name: "TurboFix Light Mode Theme",
    tokens: {
      colors: {
        background: "#F8FAFC",
        surface: "#FFFFFF",
        primaryHeading: "#0F172A",
        secondaryText: "#334155",
        accentLink: "#047857",
        borderSubtle: "rgba(15, 23, 42, 0.12)",
        cardShadow: "0 4px 20px rgba(0, 0, 0, 0.05)"
      },
      typography: {
        headingFont: "Outfit, sans-serif",
        bodyFont: "Inter, sans-serif"
      }
    }
  }, null, 2);
  markdown += `\n\`\`\`\n\n`;

  markdown += `### 2. Stitch MCP Screen Edit Instructions (\`edit_screens\`)\n`;
  markdown += `> **Instruction Prompt for Stitch Creator Subagent**:\n`;
  markdown += `> "Refactor the light theme UI components so that all glass tiles (\`.stitch-glass-tile\`), cards (\`.marketing-pricing-card\`, \`.rd-chart-card\`), and navigation bars use high-contrast dark headings (\`#0f172a\`), dark slate body text (\`#334155\`), and deep emerald CTA links (\`#047857\`). Ensure non-themed always-dark sections maintain white text against dark slate backgrounds."\n\n`;

  markdown += `## 🔍 Detailed Visual Defect Breakdown\n\n`;

  if (manifest.visualDefects.length === 0) {
    markdown += `> [!NOTE]\n`;
    markdown += `> All audited pages passed automated visual clip & background contrast checks without invisible text defects!\n`;
  } else {
    manifest.visualDefects.forEach((item) => {
      markdown += `### ${item.page}\n`;
      item.defects.forEach((d, idx) => {
        markdown += `${idx + 1}. **${d.type}** on \`<${d.element}>\`: "${d.text}" (Foreground: \`${d.color}\`, Background: \`${d.bg}\`)\n`;
      });
      markdown += `\n`;
    });
  }

  fs.writeFileSync(REPORT_PATH, markdown);
  console.log(`✅ Stitch Visual Remediation Report generated successfully: ${REPORT_PATH}`);
}

runStitchBridge();
