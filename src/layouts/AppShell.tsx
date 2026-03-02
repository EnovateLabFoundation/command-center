/**
 * AppShell
 *
 * The persistent layout wrapper for all authenticated routes. It renders:
 *   - LBDSidebar (collapsible, 60px ↔ 220px)
 *   - A top header bar (64px) containing:
 *       • EngagementSelector (internal portal only)
 *       • Notification bell with unread badge
 *       • User avatar dropdown (profile link + logout)
 *   - A scrollable main content area (renders <Outlet />)
 *   - NotificationPanel (right slide-in overlay)
 *
 * Usage:
 *   Both the internal portal and client portal use AppShell as their layout
 *   route. The EngagementSelector is hidden for client_principal role since
 *   they access a single portal view.
 *
 * Note:
 *   AppShell must be used inside BrowserRouter + AuthProvider.
 *   The internal portal wraps AppShell in <EngagementProvider>.
 */

import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import { LBDSidebar } from '@/components/ui/lbd';
import { EngagementSelector } from '@/components/shell/EngagementSelector';
import { NotificationPanel } from '@/components/shell/NotificationPanel';

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

/**
 * AppShell renders the full authenticated shell including sidebar, header,
 * notification panel, and the main content area via <Outlet />.
 */
export default function AppShell() {
  const { user, role } = useAuthStore();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isClientPortal = role === 'client_principal';

  /* Avatar initials */
  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ─────────────────────────────── */}
      <LBDSidebar />

      {/* ── Main column ─────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Header ────────────────────────────── */}
        <header
          className={cn(
            'flex-none h-16 flex items-center gap-3 px-4',
            'border-b border-border bg-card/80 backdrop-blur-sm',
            'sticky top-0 z-40',
          )}
          role="banner"
        >
          {/* Engagement selector — internal only */}
          {!isClientPortal && <EngagementSelector />}

          {/* Spacer */}
          <div className="flex-1" aria-hidden="true" />

          {/* ── Notification bell ─────────────────── */}
          <button
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Open notifications"
            aria-expanded={notifOpen}
            className={cn(
              'relative flex items-center justify-center w-9 h-9 rounded-lg border transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              notifOpen
                ? 'bg-accent/10 border-accent/40 text-accent'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-accent/30',
            )}
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {/* Static unread dot — will update once panel fetches data */}
            <span
              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-destructive"
              aria-hidden="true"
            />
          </button>

          {/* ── User avatar dropdown ───────────────── */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              aria-label="User menu"
              className={cn(
                'flex items-center gap-2 h-9 px-2 rounded-lg border transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                userMenuOpen
                  ? 'bg-accent/10 border-accent/40'
                  : 'bg-card border-border hover:border-accent/30',
              )}
            >
              {/* Avatar circle */}
              <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-none">
                <span className="font-mono text-[9px] font-bold text-accent">{initials}</span>
              </div>
              <span className="text-xs text-foreground max-w-[120px] truncate hidden sm:block">
                {user?.full_name ?? user?.email}
              </span>
              <ChevronDown
                className={cn(
                  'w-3 h-3 text-muted-foreground transition-transform duration-200',
                  userMenuOpen && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </button>

            {/* Dropdown menu */}
            {userMenuOpen && (
              <>
                {/* Backdrop to close */}
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden="true"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div
                  role="menu"
                  className={cn(
                    'absolute top-full right-0 mt-1.5 z-50',
                    'w-48 rounded-xl border border-border bg-card shadow-xl py-1',
                    'animate-in fade-in-0 zoom-in-95 duration-150',
                  )}
                >
                  {/* User info */}
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-medium text-foreground truncate">
                      {user?.full_name ?? user?.email}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {user?.email}
                    </p>
                  </div>

                  {/* Profile */}
                  <button
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                  >
                    <User className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="text-xs">Profile & Settings</span>
                  </button>

                  {/* Sign out */}
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive/80 hover:text-destructive hover:bg-white/5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="text-xs">Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* ── Main content ──────────────────────── */}
        <main
          className="flex-1 overflow-y-auto"
          role="main"
          id="main-content"
        >
          <Outlet />
        </main>
      </div>

      {/* ── Notification panel (right slide-in) ── */}
      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
      />
    </div>
  );
}
