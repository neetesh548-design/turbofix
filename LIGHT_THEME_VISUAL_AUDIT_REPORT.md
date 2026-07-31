# Stitch Visual Remediation Audit & Design System Bridge

*Generated: 2026-07-31T14:10:09.851Z*

This report details full-page light-theme screenshot artifacts captured across application routes, visual defect analyses, and actionable Stitch MCP prompt specifications to visually rectify light mode UI styling.

## 📸 Light Theme Screenshot Catalog

| Page Route | Screenshot File | Visual Defects Found |
| :--- | :--- | :--- |
| **Dashboard** (`/`) | [dashboard-light.png](file:////Users/nkumarsoni/TurboFix/artifacts/visual-audit/light-theme/dashboard-light.png) | ✅ Clean |
| **Tickets** (`/tickets`) | [tickets-light.png](file:////Users/nkumarsoni/TurboFix/artifacts/visual-audit/light-theme/tickets-light.png) | ✅ Clean |
| **Technician** (`/technician`) | [technician-light.png](file:////Users/nkumarsoni/TurboFix/artifacts/visual-audit/light-theme/technician-light.png) | ✅ Clean |
| **Machines** (`/machines`) | [machines-light.png](file:////Users/nkumarsoni/TurboFix/artifacts/visual-audit/light-theme/machines-light.png) | ✅ Clean |
| **Inventory** (`/inventory`) | [inventory-light.png](file:////Users/nkumarsoni/TurboFix/artifacts/visual-audit/light-theme/inventory-light.png) | ✅ Clean |
| **Settings** (`/settings`) | [settings-light.png](file:////Users/nkumarsoni/TurboFix/artifacts/visual-audit/light-theme/settings-light.png) | ✅ Clean |
| **Kaizen** (`/kaizen`) | [kaizen-light.png](file:////Users/nkumarsoni/TurboFix/artifacts/visual-audit/light-theme/kaizen-light.png) | ✅ Clean |
| **Report Breakdown** (`/report-breakdown`) | [report-breakdown-light.png](file:////Users/nkumarsoni/TurboFix/artifacts/visual-audit/light-theme/report-breakdown-light.png) | ✅ Clean |

## 🎨 Stitch MCP Design System & Screen Rectiation Prompts

Use the following structured prompts with Stitch MCP tools (`edit_screens`, `generate_screen_from_text`, `create_design_system`) to update and harmonize light theme visuals:

### 1. Light Theme Design System Tokens (`create_design_system` / `update_design_system`)
```json
{
  "name": "TurboFix Light Mode Theme",
  "tokens": {
    "colors": {
      "background": "#F8FAFC",
      "surface": "#FFFFFF",
      "primaryHeading": "#0F172A",
      "secondaryText": "#334155",
      "accentLink": "#047857",
      "borderSubtle": "rgba(15, 23, 42, 0.12)",
      "cardShadow": "0 4px 20px rgba(0, 0, 0, 0.05)"
    },
    "typography": {
      "headingFont": "Outfit, sans-serif",
      "bodyFont": "Inter, sans-serif"
    }
  }
}
```

### 2. Stitch MCP Screen Edit Instructions (`edit_screens`)
> **Instruction Prompt for Stitch Creator Subagent**:
> "Refactor the light theme UI components so that all glass tiles (`.stitch-glass-tile`), cards (`.marketing-pricing-card`, `.rd-chart-card`), and navigation bars use high-contrast dark headings (`#0f172a`), dark slate body text (`#334155`), and deep emerald CTA links (`#047857`). Ensure non-themed always-dark sections maintain white text against dark slate backgrounds."

## 🔍 Detailed Visual Defect Breakdown

> [!NOTE]
> All audited pages passed automated visual clip & background contrast checks without invisible text defects!
