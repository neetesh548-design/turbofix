import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Cog, Plus, Ticket, Bot, ShieldCheck } from 'lucide-react';
import { canViewWorkspace } from '@/lib/roles';
import { readAuth } from '@/utils/auth';

const BASE = import.meta.env.BASE_URL || '/';

/**
 * MobileBottomNav — Smartphone-optimized bottom navigation bar
 * Designed for 1-hand shopfloor usage by operators, technicians, and plant owners.
 * Appears only on mobile screens (md:hidden).
 */
export default function MobileBottomNav() {
  const location = useLocation();
  const { user } = readAuth();
  const role = user?.role || 'operator';

  const currentPath = location.pathname;

  const navs = [
    { id: 'overview', label: 'Dashboard', path: `${BASE}dashboard.html`, icon: LayoutDashboard },
    { id: 'machines', label: 'Machines', path: `${BASE}machines.html`, icon: Cog },
    { id: 'report', label: 'Report', path: `${BASE}report-breakdown.html`, icon: Plus, isPrimary: true },
    { id: 'tickets', label: 'Tickets', path: `${BASE}tickets.html`, icon: Ticket },
    { id: 'assistant', label: 'AI Copilot', path: `${BASE}assistant.html`, icon: Bot },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-2xl px-2 py-1.5"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navs.map((nav) => {
          const Icon = nav.icon;
          const isActive = currentPath.endsWith(nav.path) || (nav.id === 'overview' && currentPath === '/');

          if (nav.isPrimary) {
            return (
              <Link
                key={nav.id}
                to={nav.path}
                className="relative -top-4 bg-gradient-to-tr from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white p-3.5 rounded-full shadow-xl border-2 border-slate-950 flex items-center justify-center transition-transform active:scale-95"
                title="Report Breakdown Now (<20s)"
              >
                <Plus className="w-6 h-6 stroke-[3]" />
                <span className="sr-only">Report Breakdown</span>
              </Link>
            );
          }

          return (
            <Link
              key={nav.id}
              to={nav.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive 
                  ? 'text-indigo-400 font-bold scale-105' 
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
              <span className="text-[10px] tracking-tight">{nav.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
