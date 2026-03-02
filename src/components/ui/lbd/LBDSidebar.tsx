import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Radio,
  Network,
  Eye,
  Telescope,
  Target,
  FileText,
  Megaphone,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Settings,
  Users,
  Calendar,
  CheckSquare,
  TrendingUp,
  BookOpen,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import type { AppRole } from '@/stores/authStore';

/* ─────────────────────────────────────────────
   Nav item definition
───────────────────────────────────────────── */

interface NavItem {
  label: string;
  href: string;
  Icon: React.ElementType;
  badge?: string;
}

interface NavGroup {
  group?: string;
  items: NavItem[];
}

/* ─────────────────────────────────────────────
   Role → nav config
───────────────────────────────────────────── */

const roleNav: Record<AppRole, NavGroup[]> = {
  super_admin: [
    {
      items: [
        { label: 'Dashboard',  href: '/admin/dashboard',  Icon: LayoutDashboard },
        { label: 'Clients',    href: '/admin/clients',    Icon: Building2 },
        { label: 'Engagements',href: '/admin/engagements',Icon: Briefcase },
      ],
    },
    {
      group: 'INTELLIGENCE',
      items: [
        { label: 'Intel Feed',    href: '/admin/intel',        Icon: Radio },
        { label: 'Stakeholders',  href: '/admin/stakeholders',  Icon: Network },
        { label: 'Competitors',   href: '/admin/competitors',   Icon: Eye },
        { label: 'Scenarios',     href: '/admin/scenarios',     Icon: Telescope },
        { label: 'Sentiment',     href: '/admin/sentiment',     Icon: TrendingUp },
      ],
    },
    {
      group: 'STRATEGY',
      items: [
        { label: 'Narrative',      href: '/admin/narrative', Icon: Target },
        { label: 'Audience Matrix',href: '/admin/audience',  Icon: Users },
        { label: 'Comms',          href: '/admin/comms',     Icon: Megaphone },
        { label: 'Content',        href: '/admin/content',   Icon: FileText },
        { label: 'Crisis',         href: '/admin/crisis',    Icon: AlertTriangle },
      ],
    },
    {
      group: 'PLATFORM',
      items: [
        { label: 'Analytics',  href: '/admin/analytics', Icon: BarChart3 },
        { label: 'Audit Log',  href: '/admin/audit',     Icon: ClipboardList },
        { label: 'Settings',   href: '/admin/settings',  Icon: Settings },
      ],
    },
  ],

  lead_advisor: [
    {
      items: [
        { label: 'Dashboard',   href: '/advisor/dashboard',   Icon: LayoutDashboard },
        { label: 'Clients',     href: '/advisor/clients',     Icon: Building2 },
        { label: 'Engagements', href: '/advisor/engagements', Icon: Briefcase },
      ],
    },
    {
      group: 'INTELLIGENCE',
      items: [
        { label: 'Intel Feed',   href: '/advisor/intel',       Icon: Radio },
        { label: 'Stakeholders', href: '/advisor/stakeholders', Icon: Network },
        { label: 'Scenarios',    href: '/advisor/scenarios',    Icon: Telescope },
        { label: 'Sentiment',    href: '/advisor/sentiment',    Icon: TrendingUp },
      ],
    },
    {
      group: 'STRATEGY',
      items: [
        { label: 'Narrative', href: '/advisor/narrative', Icon: Target },
        { label: 'Comms',     href: '/advisor/comms',     Icon: Megaphone },
        { label: 'Content',   href: '/advisor/content',   Icon: FileText },
        { label: 'Crisis',    href: '/advisor/crisis',    Icon: AlertTriangle },
      ],
    },
  ],

  senior_advisor: [
    {
      items: [
        { label: 'Dashboard',   href: '/senior/dashboard',   Icon: LayoutDashboard },
        { label: 'Engagements', href: '/senior/engagements', Icon: Briefcase },
      ],
    },
    {
      group: 'INTELLIGENCE',
      items: [
        { label: 'Intel Feed',   href: '/senior/intel',       Icon: Radio },
        { label: 'Stakeholders', href: '/senior/stakeholders', Icon: Network },
        { label: 'Scenarios',    href: '/senior/scenarios',    Icon: Telescope },
      ],
    },
    {
      group: 'STRATEGY',
      items: [
        { label: 'Narrative', href: '/senior/narrative', Icon: Target },
        { label: 'Content',   href: '/senior/content',   Icon: FileText },
      ],
    },
  ],

  comms_director: [
    {
      items: [
        { label: 'Dashboard', href: '/comms/dashboard', Icon: LayoutDashboard },
      ],
    },
    {
      group: 'STRATEGY',
      items: [
        { label: 'Narrative Platform', href: '/comms/narrative', Icon: Target },
        { label: 'Audience Matrix',    href: '/comms/audience',  Icon: Users },
        { label: 'Comms Initiatives',  href: '/comms/comms',     Icon: Megaphone },
      ],
    },
    {
      group: 'EXECUTION',
      items: [
        { label: 'Content Calendar', href: '/comms/content',   Icon: Calendar },
        { label: 'Crisis Comms',     href: '/comms/crisis',    Icon: AlertTriangle },
        { label: 'Intel Feed',       href: '/comms/intel',     Icon: Radio },
      ],
    },
  ],

  intel_analyst: [
    {
      items: [
        { label: 'Dashboard', href: '/intel/dashboard', Icon: LayoutDashboard },
      ],
    },
    {
      group: 'INTELLIGENCE',
      items: [
        { label: 'Intel Feed',    href: '/intel/feed',         Icon: Radio },
        { label: 'Stakeholders',  href: '/intel/stakeholders', Icon: Network },
        { label: 'Competitors',   href: '/intel/competitors',  Icon: Eye },
        { label: 'Scenarios',     href: '/intel/scenarios',    Icon: Telescope },
        { label: 'Sentiment',     href: '/intel/sentiment',    Icon: TrendingUp },
        { label: 'Urgent Flags',  href: '/intel/flags',        Icon: AlertTriangle, badge: '!' },
      ],
    },
  ],

  digital_strategist: [
    {
      items: [
        { label: 'Dashboard', href: '/digital/dashboard', Icon: LayoutDashboard },
      ],
    },
    {
      group: 'CONTENT',
      items: [
        { label: 'Content Studio',   href: '/digital/content',  Icon: FileText },
        { label: 'Comms Initiatives',href: '/digital/comms',    Icon: Megaphone },
        { label: 'Approval Queue',   href: '/digital/approvals',Icon: CheckSquare },
        { label: 'Published',        href: '/digital/published',Icon: Newspaper },
      ],
    },
    {
      group: 'REFERENCE',
      items: [
        { label: 'Narrative Ref', href: '/digital/narrative', Icon: BookOpen },
        { label: 'Intel Snapshot',href: '/digital/intel',     Icon: Radio },
        { label: 'Metrics',       href: '/digital/metrics',   Icon: BarChart3 },
      ],
    },
  ],

  client_principal: [
    {
      items: [
        { label: 'Dashboard', href: '/portal/dashboard', Icon: LayoutDashboard },
      ],
    },
    {
      group: 'ENGAGEMENT',
      items: [
        { label: 'Overview',           href: '/portal/overview',   Icon: Briefcase },
        { label: 'Strategic Updates',  href: '/portal/updates',    Icon: BarChart3 },
        { label: 'Narrative Summary',  href: '/portal/narrative',  Icon: Target },
        { label: 'Published Content',  href: '/portal/content',    Icon: Newspaper },
        { label: 'Touchpoints',        href: '/portal/touchpoints',Icon: Calendar },
        { label: 'Documents',          href: '/portal/documents',  Icon: BookOpen },
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

export function LBDSidebar({ className }: LBDSidebarProps) {
  const { user, role } = useAuthStore();
  const { logout } = useAuth();
  const location = useLocation();

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
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href + '/'));

              return (
                <NavLink
                  key={item.href}
                  to={item.href}
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
