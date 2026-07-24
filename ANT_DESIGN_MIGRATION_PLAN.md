# Ant Design Migration Plan for TurboFix

## Overview
Migrate from Radix UI + Tailwind to Ant Design for improved enterprise dashboard capabilities while maintaining i18n, performance, and closed-loop system functionality.

---

## Phase 1: Foundation (This Phase)
**Goal:** Install Ant Design and establish design tokens compatible with TurboFix brand

### 1.1 Installation & Setup
- [ ] Install `antd` and `@ant-design/icons`
- [ ] Configure Ant Design theme tokens (green accent, dark mode support)
- [ ] Create Ant Design + Tailwind CSS coexistence strategy
- [ ] Setup i18n bridge for Ant Design components

### 1.2 Design Token Customization
- [ ] Primary color: Green (#52C41A for actions, alerts)
- [ ] Dark mode: Support current dark theme
- [ ] RTL support: Integrate with existing i18n.js
- [ ] Typography: Match TurboFix design system

---

## Phase 2: High-Impact Components (Next)
**Goal:** Migrate dashboards and forms to Ant Design

### 2.1 Dashboard Components
- [ ] KPI Cards → Ant `Statistic` with custom styling
- [ ] Health Ring → Ant `Progress` (circular)
- [ ] Fleet Status → Ant `Badge` system
- [ ] Priority Queue → Ant `List` + `Avatar`
- [ ] Charts/Trends → Ant `Empty` states + custom `<Chart>` wrapper

### 2.2 Forms & Inputs
- [ ] Machine Profile Form → Ant `Form` component
- [ ] Ticket Creation → Ant `Form` + `Upload`
- [ ] Settings Panel → Ant `Form` + `Collapse`
- [ ] Search/Filter → Ant `Input.Search` + `Select`

### 2.3 Tables & Lists
- [ ] Tickets Table → Ant `Table` with sorting/filtering
- [ ] Machine Records → Ant `Table` with pagination
- [ ] Work Assignment → Ant `Table` + `Badge` (status)
- [ ] Admin Lists → Ant `List` or `Table`

---

## Phase 3: Navigation & Layout (After Phase 2)
**Goal:** Unify navigation with Ant Design

### 3.1 Navigation
- [ ] Sidebar → Ant `Layout.Sider` + `Menu`
- [ ] Top Bar → Ant `Layout.Header` + `Dropdown` (user menu)
- [ ] Breadcrumbs → Ant `Breadcrumb`
- [ ] Tabs → Ant `Tabs` (already using in Kaizen)

### 3.2 Layout Structure
- [ ] Main Layout → Ant `Layout` (Header + Sider + Content + Footer)
- [ ] Page Headers → Ant `PageHeader` / `Segmented` (view selector)

---

## Phase 4: Modals & Feedback (After Phase 3)
**Goal:** Unify dialogs and notifications

### 4.1 Modals & Drawers
- [ ] Approve/Reject Dialogs → Ant `Modal`
- [ ] Detail Panels → Ant `Drawer`
- [ ] Confirmation Prompts → Ant `Popconfirm`

### 4.2 Feedback & Alerts
- [ ] Notifications → Ant `notification` (WhatsApp-style feed)
- [ ] Messages → Ant `message` (toast-style)
- [ ] Alerts → Ant `Alert` (info/warning/error/success)
- [ ] Empty States → Ant `Empty`

---

## Phase 5: Polish & Optimization (Final)
**Goal:** Refactor custom components and optimize performance

### 5.1 Component Cleanup
- [ ] Remove redundant Radix UI wrappers
- [ ] Consolidate button styles → Ant `Button`
- [ ] Standardize card styling → Ant `Card`
- [ ] Unify color system across all pages

### 5.2 Performance
- [ ] Lazy-load Ant Design CSS for critical path
- [ ] Tree-shake unused Ant Design icons
- [ ] Verify i18n works with all Ant components
- [ ] Benchmark performance vs. Radix UI baseline

---

## Benefits After Migration

### For Users
✅ **Consistency** — Professional enterprise look across all pages
✅ **Discoverability** — Familiar Ant Design patterns reduce learning curve
✅ **Rich Components** — Built-in data viz, date pickers, cascaders
✅ **Internationalization** — Ant Design has i18n built in (9 languages + RTL)

### For Developers
✅ **Productivity** — Pre-built complex components (Table, Form, etc.)
✅ **Maintenance** — Single component library vs. custom + Radix
✅ **Type Safety** — Ant Design v5+ has great TypeScript support
✅ **Theming** — Centralized design tokens, easy dark mode

---

## Migration Strategy Notes

### Coexistence (Don't Rip & Replace)
- Ant Design and Radix UI can coexist temporarily
- Migrate one page/feature at a time
- Keep git history clean with incremental commits
- Each phase is independently mergeable

### i18n Bridge
- Wrap Ant locale provider in existing i18n context
- Map TurboFix i18n keys to Ant design locales
- Test RTL with Arabic/Farsi/Hebrew (if supported)

### Performance Considerations
- Use `antd/es` imports (tree-shakeable)
- Lazy-load Ant Design CSS conditionally
- Monitor bundle size growth
- Consider dynamic imports for large tables/forms

---

## Rollback Plan
If migration causes issues:
1. Keep Radix UI dependencies installed
2. Tag each phase with git markers
3. Can revert to Radix UI components within a phase
4. No breaking changes to backend/API

---

## Timeline Estimate
- **Phase 1 (Foundation):** 2-4 hours
- **Phase 2 (Dashboard & Forms):** 4-6 hours
- **Phase 3 (Navigation):** 2-3 hours
- **Phase 4 (Modals & Feedback):** 2-3 hours
- **Phase 5 (Polish):** 2-3 hours

**Total:** ~14-20 hours for full migration

---

## Success Criteria
- [ ] All pages render without visual regressions
- [ ] i18n works for all Ant Design locales
- [ ] RTL layout works for supported languages
- [ ] Dark mode works across all Ant Design components
- [ ] Performance baseline maintained or improved
- [ ] No increase in bundle size >10%
- [ ] All existing features work end-to-end
