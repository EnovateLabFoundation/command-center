/**
 * PortalShell
 *
 * The layout shell for the Client Portal. Designed to be cleaner and more
 * polished than the internal AppShell. Features:
 *   - Top header with LBD branding + client name + logout
 *   - Left sidebar showing only granted modules from client_portal_access
 *   - Main content area via <Outlet />
 *
 * Every page navigation is logged to audit_logs via logPortalAccess().
 */

import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import {
  LogOut,
  LayoutDashboard,
  TrendingUp,
  Newspaper,
  Target,
  FileText,
  BookOpen,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import {
  usePortalAccess,
  usePortalEngagement,
  usePortalClient,
  logPortalAccess,
} from '@/hooks/usePortalData';

/* ─────────────────────────────────────────────
   Module → route/icon mapping
───────────────────────────────────────────── */

const MODULE_NAV: Record<string, { label: string; path: string; icon: typeof LayoutDashboard }> = {
  'Engagement Overview': { label: 'Dashboard', path: '/portal', icon: LayoutDashboard },
  'Sentiment Dashboard': { label: 'Sentiment', path: '/portal/insights/sentiment', icon: TrendingUp },
  'Media Coverage Summary': { label: 'Media Coverage', path: '/portal/insights/media', icon: Newspaper },
  'Brand Scorecard': { label: 'Brand Scorecard', path: '/portal/insights/brand', icon: Target },
  'Monthly Reports': { label: 'Reports', path: '/portal/reports', icon: FileText },
  'Intelligence Briefing': { label: 'Briefings', path: '/portal/reports/briefings', icon: BookOpen },
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function PortalShell() {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: portalAccess } = usePortalAccess();
  const { data: engagement } = usePortalEngagement(portalAccess?.engagement_id);
  const { data: client } = usePortalClient(engagement?.client_id);

  // Audit log every page navigation
  useEffect(() => {
    if (user?.id) {
      logPortalAccess(user.id, location.pathname);
    }
  }, [location.pathname, user?.id]);

  const allowedModules = portalAccess?.allowed_modules ?? [];

  // Always show dashboard; filter rest by allowed_modules
  const navItems = Object.entries(MODULE_NAV).filter(
    ([key]) => key === 'Engagement Overview' || allowedModules.includes(key)
  );

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ─────────────────────────────── */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-card/95 backdrop-blur-sm transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo area */}
        <div className="flex items-center gap-2 h-16 px-4 border-b border-border flex-none">
          <span className="font-mono text-xs font-bold tracking-[0.2em] text-accent">LBD</span>
          <span className="text-[10px] text-muted-foreground tracking-wider">STRATEGIC ADVISORY PORTAL</span>
          <button
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Client info */}
        {client && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-foreground truncate">{client.name}</p>
            {engagement && (
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{engagement.title}</p>
            )}
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(([, item]) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/portal'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors',
                  isActive
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent',
                )
              }
            >
              <item.icon className="w-4 h-4 flex-none" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom user area */}
        <div className="flex-none border-t border-border px-3 py-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex-none h-14 flex items-center gap-3 px-4 border-b border-border bg-card/80 backdrop-blur-sm">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* Client name + user */}
          <span className="text-[10px] font-mono tracking-wider text-muted-foreground hidden sm:block">
            {client?.name ?? 'CLIENT PORTAL'}
          </span>
          <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
            <span className="font-mono text-[9px] font-bold text-accent">
              {user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
