/**
 * EngagementWorkspace
 *
 * The layout wrapper for all module pages within a specific engagement.
 * On mount (and when the :id param changes) it finds the matching engagement
 * in context and sets it as the selected engagement — keeping the header
 * EngagementSelector in sync.
 *
 * Renders:
 *   - A workspace header (engagement name, status badges, phase)
 *   - A horizontal module tab strip for quick switching between modules
 *   - <Outlet /> for the active module page content
 */

import { useEffect, useMemo } from 'react';
import { useParams, Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  Network,
  Radio,
  Eye,
  Globe,
  Telescope,
  Target,
  Palette,
  Megaphone,
  Calendar,
  AlertTriangle,
  CheckSquare,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEngagement } from '@/contexts/EngagementContext';
import { LBDBadge, LBDLoadingSkeleton } from '@/components/ui/lbd';
import { useAuthStore, type AppRole } from '@/stores/authStore';

/* ─────────────────────────────────────────────
   Module tab definitions
───────────────────────────────────────────── */

interface ModuleTab {
  path: string;
  label: string;
  Icon: React.ElementType;
  /** Roles that can see this tab */
  roles: AppRole[];
}

const ALL_INTERNAL: AppRole[] = [
  'super_admin', 'lead_advisor', 'senior_advisor',
  'comms_director', 'intel_analyst', 'digital_strategist',
];

const moduleTabs: ModuleTab[] = [
  { path: 'onboarding',      label: 'Onboarding',   Icon: ClipboardList, roles: ALL_INTERNAL },
  { path: 'power-map',       label: 'Power Map',    Icon: Network,       roles: ['super_admin','lead_advisor','senior_advisor','intel_analyst'] },
  { path: 'intel-tracker',   label: 'Intel',        Icon: Radio,         roles: ALL_INTERNAL },
  { path: 'competitors',     label: 'Competitors',  Icon: Eye,           roles: ['super_admin','lead_advisor','senior_advisor','intel_analyst'] },
  { path: 'geospatial',      label: 'Geospatial',   Icon: Globe,         roles: ['super_admin','lead_advisor','senior_advisor','intel_analyst'] },
  { path: 'scenarios',       label: 'Scenarios',    Icon: Telescope,     roles: ['super_admin','lead_advisor','senior_advisor','intel_analyst'] },
  { path: 'narrative',       label: 'Narrative',    Icon: Target,        roles: ['super_admin','lead_advisor','senior_advisor','comms_director','digital_strategist'] },
  { path: 'brand-audit',     label: 'Brand',        Icon: Palette,       roles: ['super_admin','lead_advisor','senior_advisor','digital_strategist'] },
  { path: 'comms-planner',   label: 'Comms',        Icon: Megaphone,     roles: ['super_admin','lead_advisor','senior_advisor','comms_director','digital_strategist'] },
  { path: 'content-calendar',label: 'Content',      Icon: Calendar,      roles: ['super_admin','comms_director','digital_strategist'] },
  { path: 'crisis',          label: 'Crisis',       Icon: AlertTriangle, roles: ['super_admin','lead_advisor','senior_advisor','comms_director'] },
  { path: 'cadence',         label: 'Cadence',      Icon: CheckSquare,   roles: ['super_admin','lead_advisor'] },
  { path: 'reports',         label: 'Reports',      Icon: BarChart3,     roles: ALL_INTERNAL },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function EngagementWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { engagements, setSelectedEngagement, isLoading } = useEngagement();
  const { role } = useAuthStore();
  const location = useLocation();

  /* Sync context with URL param */
  useEffect(() => {
    if (!id || engagements.length === 0) return;
    const found = engagements.find((e) => e.id === id);
    if (found) setSelectedEngagement(found);
  }, [id, engagements, setSelectedEngagement]);

  const engagement = engagements.find((e) => e.id === id) ?? null;

  /* Filter tabs by role */
  const visibleTabs = useMemo(
    () => moduleTabs.filter((t) => !role || t.roles.includes(role)),
    [role],
  );

  /* ── Loading state ──────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border px-6 py-4">
          <LBDLoadingSkeleton className="h-6 w-48 rounded-lg mb-2" />
          <LBDLoadingSkeleton className="h-4 w-32 rounded-lg" />
        </div>
        <div className="flex-1 p-6">
          <LBDLoadingSkeleton className="h-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Workspace header ────────────────────── */}
      <div className="flex-none border-b border-border bg-card/50 px-6 pt-4 pb-0">
        {/* Engagement name + badges */}
        <div className="flex items-center gap-3 mb-3">
          <div className="min-w-0">
            <p className="font-mono text-[9px] tracking-[0.3em] text-muted-foreground/50 uppercase mb-1">
              Engagement
            </p>
            <h1 className="text-lg font-semibold text-foreground truncate">
              {engagement?.title ?? 'Engagement Workspace'}
            </h1>
          </div>

          {engagement && (
            <div className="flex items-center gap-2 flex-none">
              <LBDBadge
                variant={engagement.health_rag === 'red' ? 'red' : engagement.health_rag === 'amber' ? 'amber' : 'green'}
                size="sm"
              >
                {engagement.health_rag.toUpperCase()}
              </LBDBadge>
              <LBDBadge variant="outline" size="sm">
                PHASE {engagement.phase}
              </LBDBadge>
              <LBDBadge variant={engagement.status === 'active' ? 'green' : 'amber'} size="sm">
                {engagement.status.toUpperCase()}
              </LBDBadge>
            </div>
          )}
        </div>

        {/* Module tab strip */}
        <nav
          className="flex items-end gap-0 overflow-x-auto scrollbar-hide -mb-px"
          aria-label="Engagement modules"
        >
          {visibleTabs.map((tab) => {
            const href = `/engagements/${id}/${tab.path}`;
            const isActive =
              location.pathname === href ||
              location.pathname.startsWith(href + '/');

            return (
              <NavLink
                key={tab.path}
                to={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap',
                  'border-b-2 transition-colors duration-150 flex-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <tab.Icon className="w-3.5 h-3.5 flex-none" aria-hidden="true" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* ── Module content ──────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
