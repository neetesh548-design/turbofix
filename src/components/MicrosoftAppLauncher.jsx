import React, { useState, useEffect, useRef } from 'react';
import {
  Grid,
  X,
  Search,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { launcherCategories } from '@/lib/navigation';

const iconBg = {
  overview: 'bg-teal-500/10 text-teal-600',
  tickets: 'bg-amber-500/10 text-amber-600',
  technician: 'bg-blue-500/10 text-blue-600',
  report: 'bg-emerald-500/10 text-emerald-600',
  machines: 'bg-emerald-500/10 text-emerald-600',
  inventory: 'bg-purple-500/10 text-purple-600',
  shutdown: 'bg-rose-500/10 text-rose-600',
  kaizen: 'bg-indigo-500/10 text-indigo-600',
  assistant: 'bg-cyan-500/10 text-cyan-600',
  records: 'bg-sky-500/10 text-sky-600',
  support: 'bg-orange-500/10 text-orange-600',
  team: 'bg-violet-500/10 text-violet-600',
  settings: 'bg-slate-500/10 text-slate-600',
};

export default function MicrosoftAppLauncher({ open, onClose, active, role, onOpenQuickReport }) {
  const [search, setSearch] = useState('');
  const flyoutRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !flyoutRef.current) return;
      const focusable = flyoutRef.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  const appCategories = launcherCategories(role);

  const filteredCategories = appCategories.map(cat => ({
    ...cat,
    apps: cat.apps.filter(app =>
      app.launcherTitle.toLowerCase().includes(search.toLowerCase()) ||
      app.desc.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.apps.length > 0);

  return (
    <div className="ms-launcher-overlay fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-start p-3 sm:p-4">
      <div
        ref={flyoutRef}
        className="ms-launcher-flyout bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="TurboFix workspace apps"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600/10 text-teal-600 flex items-center justify-center font-bold">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                TurboFix Workspace Apps
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any tool to open instantly · Simple space-saving launcher
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
            aria-label="Close launcher"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search apps or features (e.g. Breakdown, Machines, Inventory)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 border-0 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 outline-hidden"
              autoFocus
            />
          </div>
        </div>

        {/* Apps Grid */}
        <div className="p-5 overflow-y-auto space-y-6">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No apps found matching "{search}".
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div key={category.title} className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                  {category.title}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {category.apps.map((app) => {
                    const IconComp = app.launcherIcon || app.Icon;
                    const isActive = active === app.id;
                    const content = (
                      <div
                        className={`group relative flex items-start gap-3.5 p-3 rounded-xl border transition-all text-left ${
                          isActive
                            ? 'bg-teal-500/5 border-teal-500/30 dark:bg-teal-500/10 dark:border-teal-500/40'
                            : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg[app.id] || iconBg.overview} transition-transform group-hover:scale-105`}>
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                              {app.launcherTitle}
                            </span>
                            {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {app.desc}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 self-center" />
                      </div>
                    );

                    if (app.id === 'report') {
                      return (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => { onClose(); onOpenQuickReport?.(); }}
                          className="w-full cursor-pointer"
                          aria-current={isActive ? 'page' : undefined}
                        >
                          {content}
                        </button>
                      );
                    }

                    return (
                      <a
                        key={app.id}
                        href={app.href}
                        onClick={onClose}
                        className="block text-decoration-none"
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {content}
                      </a>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
