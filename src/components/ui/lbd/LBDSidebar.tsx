/**
 * LBDSidebar
 *
 * The persistent navigation sidebar for LBD-SIP. Renders role-specific navigation
 * groups with dynamic engagement-scoped module links.
 *
 * Architecture:
 *   - `roleNav` maps each AppRole to an array of NavGroup definitions.
 *   - Module links (under /engagements/:id/*) are computed at render time by
 *     `getModuleHref(path, engagementId)`. If no engagement is selected the
 *     resulting href is `null` which renders a disabled, non-navigable item.
 *   - Collapse state (60px ↔ 220px) is stored in localStorage.
 *
 * Disabled state:
 *   When engagementId is null, module-level items are rendered with
 *   `opacity-50 pointer-events-none cursor-not-allowed` and a tooltip
 *   prompting the user to select an engagement.
 */

import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Network,
  Eye,
  Telescope,
  Target,
  FileText,
  Megaphone,
  AlertTriangle,
  BarChart3,
  Settings,
  Users,
  Calendar,
  CheckSquare,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Radio,
  Globe,
  Palette,
  ClipboardList,
  Key,
  PlugZap,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import type { AppRole } from '@/stores/authStore';
import { useEngagementSafe } from '@/contexts/EngagementContext';

/* ─────────────────────────────────────────────
   Nav item definition
───────────────────────────────────────────── */

interface NavItem {
  label: string;
  /** Static href (always navigable) */
  href?: string;
  /**
   * Module path under /engagements/:id/ (requires active engagement).
   * When set, the rendered href becomes `/engagements/${engagementId}/${modulePath}`.
   * If no engagement is selected, the item is disabled.
   */
  modulePath?: string;
  Icon: React.ElementType;
  badge?: string;
}

interface NavGroup {
  group?: string;
  items: NavItem[];
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

/**
 * Builds the full href for a module item.
 * Returns null when no engagement is selected (item will be disabled).
 */
function getModuleHref(modulePath: string, engagementId: string | null): string | null {
  if (!engagementId) return null;
  return `/engagements/${engagementId}/${modulePath}`;
}

/* ─────────────────────────────────────────────
   Role → nav config
   All internal module items use `modulePath` so they are
   dynamically scoped to the active engagement.
───────────────────────────────────────────── */

const roleNav: Record<AppRole, NavGroup[]> = {
  super_admin: [
    {
      items: [
        { label: 'Dashboard',   href: '/dashboard',   Icon: LayoutDashboard },
        { label: 'Engagements', href: '/engagements', Icon: Briefcase },
      ],
    },
    {
      group: 'INTELLIGENCE',
      items: [
        { label: 'Power Map',      modulePath: 'power-map',     Icon: Network },
        { label: 'Intel Tracker',  modulePath: 'intel-tracker', Icon: Radio },
        { label: 'Competitors',    modulePath: 'competitors',   Icon: Eye },
        { label: 'Geospatial',     modulePath: 'geospatial',    Icon: Globe },
        { label: 'Scenarios',      modulePath: 'scenarios',     Icon: Telescope },
      ],
    },
    {
      group: 'STRATEGY',
      items: [
        { label: 'Narrative',       modulePath: 'narrative',       Icon: Target },
        { label: 'Brand Audit',     modulePath: 'brand-audit',     Icon: Palette },
        { label: 'Comms Planner',   modulePath: 'comms-planner',   Icon: Megaphone },
        { label: 'Content Calendar',modulePath: 'content-calendar',Icon: Calendar },
        { label: 'Crisis Comms',    modulePath: 'crisis',          Icon: AlertTriangle },
        { label: 'Cadence',         modulePath: 'cadence',         Icon: CheckSquare },
        { label: 'Reports',         modulePath: 'reports',         Icon: BarChart3 },
      ],
    },
    {
      group: 'PLATFORM',
      items: [
        { label: 'Cmd Dashboard', href: '/admin/dashboard',     Icon: TrendingUp },
        { label: 'Admin',         href: '/admin',               Icon: Settings },
        { label: 'Users',         href: '/admin/users',         Icon: Users },
        { label: 'Portal Access', href: '/admin/portal-access', Icon: Key },
        { label: 'Integrations',  href: '/admin/integrations',  Icon: PlugZap },
      ],
    },
  ],

  lead_advisor: [
    {
      items: [
        { label: 'Dashboard',   href: '/dashboard',   Icon: LayoutDashboard },
        { label: 'Engagements', href: '/engagements', Icon: Briefcase },
      ],
    },
    {
      group: 'INTELLIGENCE',
      items: [
        { label: 'Power Map',     modulePath: 'power-map',     Icon: Network },
        { label: 'Intel Tracker', modulePath: 'intel-tracker', Icon: Radio },
        { label: 'Competitors',   modulePath: 'competitors',   Icon: Eye },
        { label: 'Geospatial',    modulePath: 'geospatial',    Icon: Globe },
        { label: 'Scenarios',     modulePath: 'scenarios',     Icon: Telescope },
      ],
    },
    {
      group: 'STRATEGY',
      items: [
        { label: 'Narrative',     modulePath: 'narrative',     Icon: Target },
        { label: 'Brand Audit',   modulePath: 'brand-audit',   Icon: Palette },
        { label: 'Comms Planner', modulePath: 'comms-planner', Icon: Megaphone },
        { label: 'Crisis Comms',  modulePath: 'crisis',        Icon: AlertTriangle },
        { label: 'Cadence',       modulePath: 'cadence',       Icon: CheckSquare },
        { label: 'Reports',       modulePath: 'reports',       Icon: BarChart3 },
      ],
    },
  ],

  senior_advisor: [
    {
      items: [
        { label: 'Dashboard',   href: '/dashboard',   Icon: LayoutDashboard },
        { label: 'Engagements', href: '/engagements', Icon: Briefcase },
      ],
    },
    {
      group: 'INTELLIGENCE',
      items: [
        { label: 'Power Map',     modulePath: 'power-map',     Icon: Network },
        { label: 'Intel Tracker', modulePath: 'intel-tracker', Icon: Radio },
        { label: 'Competitors',   modulePath: 'competitors',   Icon: Eye },
        { label: 'Geospatial',    modulePath: 'geospatial',    Icon: Globe },
        { label: 'Scenarios',     modulePath: 'scenarios',     Icon: Telescope },
      ],
    },
    {
      group: 'STRATEGY',
      items: [
        { label: 'Narrative',     modulePath: 'narrative',     Icon: Target },
        { label: 'Brand Audit',   modulePath: 'brand-audit',   Icon: Palette },
        { label: 'Comms Planner', modulePath: 'comms-planner', Icon: Megaphone },
        { label: 'Crisis Comms',  modulePath: 'crisis',        Icon: AlertTriangle },
        { label: 'Reports',       modulePath: 'reports',       Icon: BarChart3 },
      ],
    },
  ],

  comms_director: [
    {
      items: [
        { label: 'Dashboard',   href: '/dashboard',   Icon: LayoutDashboard },
        { label: 'Engagements', href: '/engagements', Icon: Briefcase },
      ],
    },
    {
      group: 'STRATEGY',
      items: [
        { label: 'Narrative',     modulePath: 'narrative',     Icon: Target },
        { label: 'Comms Planner', modulePath: 'comms-planner', Icon: Megaphone },
        { label: 'Crisis Comms',  modulePath: 'crisis',        Icon: AlertTriangle },
        { label: 'Reports',       modulePath: 'reports',       Icon: BarChart3 },
      ],
    },
    {
      group: 'EXECUTION',
      items: [
        { label: 'Content Calendar', modulePath: 'content-calendar', Icon: Calendar },
        { label: 'Intel Feed',        modulePath: 'intel-tracker',   Icon: Radio },
      ],
    },
  ],

  intel_analyst: [
    {
      items: [
        { label: 'Dashboard',   href: '/dashboard',   Icon: LayoutDashboard },
        { label: 'Engagements', href: '/engagements', Icon: Briefcase },
      ],
    },
    {
      group: 'INTELLIGENCE',
      items: [
        { label: 'Power Map',     modulePath: 'power-map',     Icon: Network },
        { label: 'Intel Tracker', modulePath: 'intel-tracker', Icon: Radio, badge: '!' },
        { label: 'Competitors',   modulePath: 'competitors',   Icon: Eye },
        { label: 'Geospatial',    modulePath: 'geospatial',    Icon: Globe },
        { label: 'Scenarios',     modulePath: 'scenarios',     Icon: Telescope },
      ],
    },
  ],

  digital_strategist: [
    {
      items: [
        { label: 'Dashboard',   href: '/dashboard',   Icon: LayoutDashboard },
        { label: 'Engagements', href: '/engagements', Icon: Briefcase },
      ],
    },
    {
      group: 'EXECUTION',
      items: [
        { label: 'Content Calendar', modulePath: 'content-calendar', Icon: Calendar },
        { label: 'Comms Planner',    modulePath: 'comms-planner',    Icon: Megaphone },
        { label: 'Intel Feed',       modulePath: 'intel-tracker',    Icon: Radio },
      ],
    },
    {
      group: 'REFERENCE',
      items: [
        { label: 'Narrative Ref', modulePath: 'narrative', Icon: BookOpen },
        { label: 'Brand Audit',   modulePath: 'brand-audit', Icon: Palette },
        { label: 'Reports',       modulePath: 'reports',   Icon: TrendingUp },
      ],
    },
  ],

  client_principal: [
    {
      items: [
        { label: 'Dashboard', href: '/portal',          Icon: LayoutDashboard },
        { label: 'Reports',   href: '/portal/reports',  Icon: BarChart3 },
        { label: 'Insights',  href: '/portal/insights', Icon: FileText },
      ],
    },
  ],
};

/* ─────────────────────────────────────────────
   Role display labels
───────────────────────────────────────────── */

const roleLabels: Record<AppRole, string> = {
  super_admin:        'Super Admin',
  lead_advisor:       'Lead Advisor',
  senior_advisor:     'Senior Advisor',
  comms_director:     'Comms Director',
  intel_analyst:      'Intel Analyst',
  digital_strategist: 'Digital Strategist',
  client_principal:   'Client Portal',
};

/* ─────────────────────────────────────────────
   Storage key for collapsed state
───────────────────────────────────────────── */

const COLLAPSED_KEY = 'lbd:sidebar:collapsed';

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

interface LBDSidebarProps {
  className?: string;
}

/**
 * LBDSidebar
 *
 * Renders the role-based navigation sidebar. Module items are dynamically
 * linked to the active engagement via EngagementContext. Items without an
 * active engagement are rendered as disabled links.
 */
export function LBDSidebar({ className }: LBDSidebarProps) {
  const { user, role } = useAuthStore();
  const { logout } = useAuth();
  const location = useLocation();

  // useEngagementSafe returns null outside EngagementProvider (e.g. client portal)
  const engagementCtx = useEngagementSafe();
  const engagementId = engagementCtx?.selectedEngagement?.id ?? null;

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, String(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);

  const navGroups = role ? (roleNav[role] ?? []) : [];
  const roleLabel = role ? roleLabels[role] : '';

  /* Avatar initials */
  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-card border-r border-border transition-all duration-300 ease-in-out',
        collapsed ? 'w-[60px]' : 'w-[220px]',
        className,
      )}
      aria-label="Main navigation"
    >
      {/* ── Logo ── */}
      <div
        className={cn(
          'flex items-center border-b border-border flex-none',
          collapsed ? 'justify-center px-0 h-14' : 'gap-3 px-4 h-14',
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex-none">
          <span className="font-mono font-black text-[10px] text-accent">LBD</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-widest text-accent leading-none">
              LBD-SIP
            </p>
            <p className="text-[9px] text-muted-foreground tracking-wider mt-0.5 truncate">
              INTELLIGENCE PLATFORM
            </p>
          </div>
        )}
      </div>

      {/* ── Nav items ── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5" aria-label="Sidebar navigation">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {/* Group label */}
            {group.group && !collapsed && (
              <p className="font-mono text-[9px] tracking-[0.3em] text-muted-foreground/50 uppercase px-4 mb-1.5">
                {group.group}
              </p>
            )}
            {group.group && collapsed && (
              <div className="h-px bg-border/50 mx-3 mb-2 mt-3" aria-hidden="true" />
            )}

            {/* Items */}
            {group.items.map((item) => {
              // Resolve href — module items depend on engagement selection
              const resolvedHref = item.href
                ? item.href
                : item.modulePath
                  ? getModuleHref(item.modulePath, engagementId)
                  : null;

              const isDisabled = resolvedHref === null;

              const isActive =
                !isDisabled && (
                  location.pathname === resolvedHref ||
                  (resolvedHref !== '/' && location.pathname.startsWith(resolvedHref + '/'))
                );

              const disabledTitle = 'Select an engagement to access this module';

              if (isDisabled) {
                return (
                  <span
                    key={item.modulePath}
                    className={cn(
                      'relative flex items-center gap-2.5 mx-2 rounded-lg text-sm',
                      'opacity-40 cursor-not-allowed pointer-events-none',
                      collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
                      'text-muted-foreground',
                    )}
                    title={disabledTitle}
                    aria-disabled="true"
                  >
                    <item.Icon
                      className={cn('flex-none', collapsed ? 'w-4.5 h-4.5' : 'w-4 h-4')}
                      aria-hidden="true"
                    />
                    {!collapsed && (
                      <span className="truncate text-xs font-medium">{item.label}</span>
                    )}
                  </span>
                );
              }

              return (
                <NavLink
                  key={resolvedHref}
                  to={resolvedHref}
                  className={cn(
                    'relative flex items-center gap-2.5 mx-2 rounded-lg text-sm transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
                    isActive
                      ? 'bg-accent/10 text-accent'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                  )}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Active indicator stripe */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full"
                      aria-hidden="true"
                    />
                  )}

                  <item.Icon
                    className={cn(
                      'flex-none transition-colors',
                      collapsed ? 'w-4.5 h-4.5' : 'w-4 h-4',
                    )}
                    aria-hidden="true"
                  />

                  {!collapsed && (
                    <span className="truncate text-xs font-medium">{item.label}</span>
                  )}

                  {/* Badge */}
                  {item.badge && !collapsed && (
                    <span className="ml-auto flex-none text-[9px] font-mono bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  {item.badge && collapsed && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-destructive" />
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Bottom: User + collapse toggle ── */}
      <div className="flex-none border-t border-border">
        {/* MFA verified indicator */}
        {!collapsed && (
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/50">
            <Shield className="w-2.5 h-2.5 text-green-400" aria-hidden="true" />
            <span className="font-mono text-[9px] tracking-widest text-green-400">
              MFA VERIFIED
            </span>
          </div>
        )}

        {/* User info */}
        <div
          className={cn(
            'flex items-center gap-2.5 py-3',
            collapsed ? 'justify-center px-0' : 'px-3',
          )}
          title={collapsed ? `${user?.full_name ?? user?.email} · ${roleLabel}` : undefined}
        >
          {/* Avatar */}
          <div className="flex-none w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
            <span className="font-mono text-[9px] font-bold text-accent">{initials}</span>
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate leading-none">
                {user?.full_name ?? user?.email}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{roleLabel}</p>
            </div>
          )}

          {/* Sign out */}
          {!collapsed && (
            <button
              onClick={() => logout()}
              className="flex-none p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            'w-full flex items-center border-t border-border/50 py-2.5 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors text-xs',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            collapsed ? 'justify-center px-0' : 'justify-between px-4',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {!collapsed && (
            <span className="font-mono text-[9px] tracking-widest">COLLAPSE</span>
          )}
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
    </aside>
  );
}
