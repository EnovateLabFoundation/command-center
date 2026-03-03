/**
 * AppShell
 *
 * The persistent layout wrapper for all authenticated routes. Renders:
 *   - LBDSidebar (collapsible 60px ↔ 220px on desktop; off-canvas on mobile)
 *   - Top header bar (64px) with:
 *       • Hamburger toggle on mobile (md:hidden)
 *       • EngagementSelector (internal portal only)
 *       • Notification bell with live unread badge (Supabase Realtime)
 *       • User avatar dropdown
 *   - Scrollable main content area (<Outlet />)
 *   - NotificationPanel (right slide-in overlay)
 *
 * Mobile behaviour:
 *   - Sidebar is hidden off-screen on mobile (< md)
 *   - Hamburger in the header toggles a full-height overlay sidebar
 *   - Overlay backdrop dismisses the sidebar
 */

import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, User, ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { LBDSidebar } from '@/components/ui/lbd';
import { EngagementSelector } from '@/components/shell/EngagementSelector';
import { NotificationPanel } from '@/components/shell/NotificationPanel';

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function AppShell() {
  const { user, role } = useAuthStore();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifOpen,      setNotifOpen]    = useState(false);
  const [userMenuOpen,   setUserMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  /* Live unread count via Realtime */
  const { unreadCount } = useNotifications();

  const isClientPortal = role === 'client_principal';

  /* Close mobile sidebar on route change */
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  /* Close mobile sidebar on resize to desktop */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = () => { if (mq.matches) setMobileSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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

      {/* ── Mobile sidebar backdrop ─────────────────────────────── */}
      {mobileSidebarOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      {/* Desktop: always visible, participates in flex flow */}
      <div className={cn('hidden md:flex flex-none')}>
        <LBDSidebar />
      </div>

      {/* Mobile: fixed off-canvas overlay */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-40 flex md:hidden transition-transform duration-300 ease-in-out',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <LBDSidebar />
        {/* Close button inside sidebar on mobile */}
        <button
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close navigation"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Main column ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Header ────────────────────────────────────────────── */}
        <header
          className={cn(
            'flex-none h-16 flex items-center gap-2 sm:gap-3 px-3 sm:px-4',
            'border-b border-border bg-card/80 backdrop-blur-sm',
            'sticky top-0 z-30',
          )}
          role="banner"
        >
          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-accent/30 transition-colors flex-none"
            onClick={() => setMobileSidebarOpen((v) => !v)}
            aria-label="Open navigation menu"
            aria-expanded={mobileSidebarOpen}
          >
            <Menu className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Engagement selector — internal only */}
          {!isClientPortal && (
            <div className="flex-1 min-w-0">
              <EngagementSelector />
            </div>
          )}

          {/* Spacer — only when engagement selector not present */}
          {isClientPortal && <div className="flex-1" aria-hidden="true" />}

          {/* ── Notification bell ─────────────────── */}
          <button
            onClick={() => setNotifOpen((v) => !v)}
            aria-label={`Open notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={notifOpen}
            className={cn(
              'relative flex items-center justify-center w-9 h-9 rounded-lg border transition-colors flex-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              notifOpen
                ? 'bg-accent/10 border-accent/40 text-accent'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-accent/30',
            )}
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {/* Live unread badge */}
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-accent text-accent-foreground text-[9px] font-bold font-mono flex items-center justify-center"
                aria-hidden="true"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* ── User avatar dropdown ───────────────── */}
          <div className="relative flex-none">
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
              <span className="text-xs text-foreground max-w-[100px] truncate hidden sm:block">
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
                    onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                  >
                    <User className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="text-xs">Profile &amp; Settings</span>
                  </button>

                  {/* Notifications */}
                  <button
                    role="menuitem"
                    onClick={() => { setUserMenuOpen(false); navigate('/notifications'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                  >
                    <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="text-xs">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto text-[9px] font-mono bg-accent text-accent-foreground rounded-full px-1.5 py-0.5">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Sign out */}
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-destructive/80 hover:text-destructive hover:bg-white/5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="text-xs">Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* ── Main content ──────────────────────────────────────── */}
        <main
          className="flex-1 overflow-y-auto"
          role="main"
          id="main-content"
        >
          <Outlet />
        </main>
      </div>

      {/* ── Notification panel (right slide-in) ──────────────────── */}
      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
      />
    </div>
  );
}
