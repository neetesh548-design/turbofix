# Role-Based Navigation Implementation

## Overview
Navigation tabs are now filtered based on the user's role after login. Each role sees only the tabs they are authorized to access.

## Implementation Details

### 1. Role Definitions (`src/lib/roles.js`)
The `ROLE_NAV` object maps each role to their accessible tabs:

```javascript
const ROLE_NAV = {
  operator: ['machines', 'assistant', 'support'],
  maintenance_technician: ['machines', 'records', 'assistant', 'technician', 'support'],
  maintenance_engineer: ['overview', 'machines', 'records', 'tickets', 'assistant', 'shutdown', 'technician', 'support'],
  supervisor: ['overview', 'machines', 'tickets', 'assistant', 'shutdown', 'technician', 'support'],
  maintenance_head: ['overview', 'machines', 'records', 'tickets', 'assistant', 'shutdown', 'technician', 'support', 'team', 'settings'],
  owner: ['overview', 'machines', 'records', 'tickets', 'assistant', 'shutdown', 'support', 'team', 'settings'],
  quality_inspector: ['overview', 'machines', 'records', 'tickets', 'support'],
  safety_officer: ['overview', 'machines', 'records', 'tickets', 'support'],
  vendor: ['machines', 'records', 'support'],
};
```

### 2. Permission Check Function
The `canViewWorkspace()` function validates if a user can access a specific workspace:

```javascript
export function canViewWorkspace(role, workspace) {
  const allowed = ROLE_NAV[role];
  return !allowed || allowed.includes(workspace);
}
```

### 3. Navigation Filtering (`src/components/AppShell.jsx`)

#### Desktop Navigation (Line 432)
```javascript
{NAV_LIVE.filter((item) => canViewWorkspace(user?.role, item.id)).map((item) => (
  // Render navigation items
))}
```

#### Mobile Navigation (Line 453) - **UPDATED**
```javascript
{NAV_LIVE.filter((item) => canViewWorkspace(user?.role, item.id)).slice(0, 4).map((item) => (
  // Render mobile navigation items
))}
```

## Tab Visibility by Role

### 🏭 Owner / Plant Director
**Visible:** Dashboard, Tickets, Machines, AI Assistant, AI Records, Shutdown Planner, Support & Decisions, Team, Settings
**Hidden:** Technician, Inventory

### 👨‍💼 Maintenance Head
**Visible:** Dashboard, Machines, AI Records, Tickets, AI Assistant, Shutdown Planner, Technician, Support & Decisions, Team, Settings
**Hidden:** Inventory

### 🔧 Maintenance Engineer
**Visible:** Dashboard, Machines, AI Records, Tickets, AI Assistant, Shutdown Planner, Technician, Support & Decisions
**Hidden:** Team, Settings, Inventory

### 👷 Maintenance Technician
**Visible:** Machines, AI Records, AI Assistant, Technician, Support & Decisions
**Hidden:** Dashboard, Tickets, Shutdown Planner, Team, Settings, Inventory

### 🏃 Plant Operator
**Visible:** Machines, AI Assistant, Support & Decisions
**Hidden:** All others

### ✅ Quality Inspector
**Visible:** Dashboard, Machines, AI Records, Tickets, Support & Decisions
**Hidden:** Technician, Shutdown Planner, Team, Settings, Inventory

### 🛡️ Safety Officer
**Visible:** Dashboard, Machines, AI Records, Tickets, Support & Decisions
**Hidden:** Technician, Shutdown Planner, Team, Settings, Inventory

### 🏢 Vendor / OEM Specialist
**Visible:** Machines, AI Records, Support & Decisions
**Hidden:** Dashboard, Tickets, Technician, Shutdown Planner, Team, Settings, Inventory

## Features

✅ **Desktop Navigation:** Filters tabs based on user role
✅ **Mobile Navigation:** Filters tabs based on user role (shows top 4 authorized tabs)
✅ **Access Control:** Attempts to access unauthorized tabs redirect to Support & Decisions
✅ **Role Label Display:** Shows user's role in the header with role contribution message

## Testing

1. **Login as different roles** and verify only authorized tabs appear
2. **Try accessing unauthorized routes** directly and confirm redirect to appropriate page
3. **Check mobile view** to ensure filtered navigation appears in bottom bar

## Future Enhancements

- Add role-based content filtering within permitted tabs
- Implement role-based feature flags for advanced features
- Add role-based analytics and reporting
- Customize drill-down features by role
