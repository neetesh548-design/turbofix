import {
  Box,
  Calendar,
  Cog,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  MessageCircleQuestion,
  Package,
  Plus,
  Power,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import { canViewWorkspace } from '@/lib/roles';

const BASE = import.meta.env.BASE_URL || '/';

export const appNavItems = [
  { id: 'overview', label: 'Dashboard', launcherTitle: 'Dashboard', href: `${BASE}dashboard.html`, Icon: LayoutDashboard, category: 'Daily Operations', desc: 'Factory health, urgent work, approvals, and risk' },
  { id: 'tickets', label: 'Tickets', launcherTitle: 'Maintenance Tickets', href: `${BASE}tickets.html`, Icon: Ticket, category: 'Daily Operations', desc: 'Breakdown tracking and work order status' },
  { id: 'technician', label: 'Technician', launcherTitle: 'Technician Hub', href: `${BASE}technician.html`, Icon: Wrench, category: 'Daily Operations', desc: 'Assigned work, checklists, and repair evidence' },
  { id: 'report', label: 'Report', launcherTitle: 'Report Breakdown', href: `${BASE}report-breakdown.html`, Icon: Plus, category: 'Daily Operations', desc: 'Fast issue capture from the shop floor' },
  { id: 'machines', label: 'Machines', launcherTitle: 'Machines Register', href: `${BASE}machines.html`, Icon: Cog, launcherIcon: ShieldCheck, category: 'Plant & Assets', desc: 'Machine state, owners, QR codes, PM, and history' },
  { id: 'inventory', label: 'Inventory', launcherTitle: 'Spare Parts Inventory', href: `${BASE}inventory.html`, Icon: Package, launcherIcon: Box, category: 'Plant & Assets', desc: 'Stock levels, critical spares, and reorder signals' },
  { id: 'shutdown', label: 'Shutdown Planner', launcherTitle: 'Shutdown Planner', href: `${BASE}shutdown-planner.html`, Icon: Power, launcherIcon: Calendar, category: 'Plant & Assets', desc: 'Planned overhauls and preventive work' },
  { id: 'kaizen', label: 'Kaizen', launcherTitle: 'Kaizen Improvements', href: `${BASE}kaizen.html`, Icon: Lightbulb, launcherIcon: TrendingUp, category: 'Plant & Assets', desc: 'Root-cause fixes and continuous uptime ideas' },
  { id: 'assistant', label: 'Maintenance Help', launcherTitle: 'Maintenance Help', href: `${BASE}assistant.html`, Icon: MessageCircleQuestion, launcherIcon: Sparkles, category: 'Support & Records', desc: 'Voice and photo troubleshooting guidance' },
  { id: 'records', label: 'Work Records', launcherTitle: 'Work Records', href: `${BASE}records.html`, Icon: FileText, category: 'Support & Records', desc: 'Uploads, review drafts, and approved knowledge' },
  { id: 'support', label: 'Support & Decisions', launcherTitle: 'Support & Decisions', href: `${BASE}support.html`, Icon: HelpCircle, category: 'Support & Records', desc: 'Exceptions, approvals, and business decisions' },
  { id: 'team', label: 'Team', launcherTitle: 'Team & Roster', href: `${BASE}team.html`, Icon: Users, category: 'Workspace', desc: 'Technicians, supervisors, and shift ownership' },
  { id: 'settings', label: 'Settings', launcherTitle: 'Workspace Settings', href: `${BASE}settings.html`, Icon: Settings, category: 'Workspace', desc: 'Factory profile, permissions, and alerts' },
];

export function visibleAppNavItems(role) {
  return appNavItems.filter((item) => !role || canViewWorkspace(role, item.id));
}

export function launcherCategories(role) {
  return ['Daily Operations', 'Plant & Assets', 'Support & Records', 'Workspace']
    .map((title) => ({
      title,
      apps: visibleAppNavItems(role).filter((item) => item.category === title),
    }))
    .filter((category) => category.apps.length > 0);
}
