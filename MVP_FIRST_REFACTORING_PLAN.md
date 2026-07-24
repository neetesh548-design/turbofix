# MVP-First Refactoring Plan — All Tabs

## Overview
Apply the same MVP-first layout with advanced features drill-down to all pages.

## Implementation Pattern

### Step 1: Import AdvancedFeaturesDrilldown
```jsx
import AdvancedFeaturesDrilldown from '../components/AdvancedFeaturesDrilldown';
```

### Step 2: Add State
```jsx
const [showAdvanced, setShowAdvanced] = useState(false);
```

### Step 3: Structure Content
```jsx
{/* MVP FEATURES - Always Visible */}
<section className="mvp-section">
  {/* Core features only */}
</section>

{/* ADVANCED FEATURES - Hidden by Default */}
<AdvancedFeaturesDrilldown isOpen={showAdvanced} onToggle={() => setShowAdvanced(!showAdvanced)}>
  {/* Secondary features, analytics, reports */}
</AdvancedFeaturesDrilldown>
```

---

## Per-Page MVP vs Advanced Classification

### Dashboard ✅ (DONE)
**MVP:**
- Closed-loop control card
- Pulse strip (plant status)
- Fleet strip
- Priority row

**Advanced:**
- Category 2 (Operational efficiency)
- Category 3 (Cost management)
- Category 4 (Strategic planning)

---

### Machines
**MVP:**
- Machine list with status (grid/list view)
- Search and basic filters
- Quick status (running/down)
- Add new machine button

**Advanced:**
- Documents tab
- Spare parts inventory
- Consumables tracking
- PM schedules
- Reliability & RCA
- Kaizen improvements
- Calendar view
- QR tag management

---

### Tickets
**MVP:**
- Open tickets list
- Urgent/critical filters
- Machine name, description
- Status badges
- Create new ticket button

**Advanced:**
- Historical/closed tickets
- Detailed analytics
- Trend reports
- Cost breakdown
- Assignment history
- Root cause analysis details

---

### Team
**MVP:**
- Team members roster
- Current role/position
- Basic availability
- Contact (phone/email)

**Advanced:**
- Skill matrix
- Certification tracking
- Performance metrics
- Historical assignments
- Training records
- Escalation paths

---

### Technician
**MVP:**
- Current assignments
- Today's scheduled work
- Active tickets
- Location/status

**Advanced:**
- Historical work log
- Performance metrics
- Skills & certifications
- Training progress
- Availability calendar
- Performance trends

---

### Kaizen
**MVP:**
- Active improvements (in-progress)
- Recent closed kaizens
- Quick status view

**Advanced:**
- All historical kaizens
- Category filters
- Waste analysis
- Impact metrics
- Standardization tracking
- Training materials

---

### Inventory
**MVP:**
- Critical stock levels
- Low stock warnings
- Quick reorder button

**Advanced:**
- Full inventory list
- Historical usage
- Consumption trends
- Supplier information
- Cost analysis
- Reorder history

---

### Records
**MVP:**
- Recent activity log
- Quick search
- Basic filtering

**Advanced:**
- Full audit trail
- Advanced filters
- Detailed reports
- Export options
- Archive management

---

### Settings
**MVP:**
- Basic user preferences
- Notification settings
- Theme/language

**Advanced:**
- Advanced security
- API keys
- Integrations
- Backup/restore
- Advanced permissions

---

## Rollout Sequence

### Phase 1: Core Pages (High Impact)
1. ✅ Dashboard
2. Machines
3. Tickets
4. Technician

### Phase 2: Secondary Pages
5. Team
6. Kaizen
7. Inventory

### Phase 3: Admin/Support Pages
8. Records
9. Settings
10. Support
11. Assistant

---

## Notes

- Use consistent drill-down styling across all pages
- MVP section should load/render instantly
- Advanced features should be progressive
- Remember to add showAdvanced state to each page
- Test mobile responsiveness for drill-down on each page
- Keep drill-down button styling consistent with AdvancedFeaturesDrilldown.jsx

---

## Success Criteria

✅ All pages follow same MVP-first pattern  
✅ Consistent drill-down component usage  
✅ No advanced features visible by default  
✅ Smooth animations on all pages  
✅ Mobile responsive on all pages  
✅ Performance not impacted  
✅ All functionality still accessible  

---

**Total Estimated Time**: 2-3 hours for full refactoring  
**Complexity**: Medium (mostly copy-paste with page-specific adjustments)  
**Risk Level**: Low (UI-only changes, no logic changes)
