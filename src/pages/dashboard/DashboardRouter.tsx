/**
 * DashboardRouter
 *
 * Renders role-appropriate dashboard content inside AppShell.
 * Unlike the legacy DashboardShell, this component does NOT include
 * its own sidebar or outer header — those are provided by AppShell.
 *
 * Each role gets a tailored welcome view with relevant stat cards and
 * quick-links to their primary modules. The data shown is illustrative;
 * individual modules contain the live data.
 */

import { useNavigate } from 'react-router-dom';
import { useAuthStore, type AppRole } from '@/stores/authStore';
import { useEngagement } from '@/contexts/EngagementContext';
import {
  LBDPageHeader,
  LBDCard,
  LBDStatCard,
  LBDEmptyState,
  LBDBadge,
} from '@/components/ui/lbd';
import {
  Briefcase,
  Network,
  Radio,
  Target,
  BarChart3,
  Settings,
  Users,
  AlertTriangle,
  Calendar,
  Eye,
  Megaphone,
  FileText,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Role content definitions
───────────────────────────────────────────── */

interface QuickLink {
  label: string;
  description: string;
  href: string;
  Icon: React.ElementType;
}

interface RoleDashboardConfig {
  eyebrow: string;
  title: string;
  subtitle: string;
  quickLinks: QuickLink[];
}

const roleDashboardConfig: Record<AppRole, RoleDashboardConfig> = {
  super_admin: {
    eyebrow: 'SUPER ADMIN',
    title: 'Platform Overview',
    subtitle: 'Full visibility across all engagements, users, and platform health.',
    quickLinks: [
      { label: 'User Management',  description: 'Manage roles & access',          href: '/admin/users',         Icon: Users },
      { label: 'All Engagements',  description: 'View every active engagement',    href: '/engagements',         Icon: Briefcase },
      { label: 'Portal Access',    description: 'Client principal permissions',    href: '/admin/portal-access', Icon: Settings },
      { label: 'Integrations',     description: 'API keys & external platforms',   href: '/admin/integrations',  Icon: BarChart3 },
    ],
  },
  lead_advisor: {
    eyebrow: 'LEAD ADVISOR',
    title: 'Advisory Command',
    subtitle: 'Oversight across your portfolio of engagements and strategic intelligence.',
    quickLinks: [
      { label: 'Engagements',      description: 'Your active engagement portfolio', href: '/engagements',  Icon: Briefcase },
      { label: 'Power Map',        description: 'Stakeholder influence networks',   href: '/engagements',  Icon: Network },
      { label: 'Narrative',        description: 'Strategic messaging frameworks',   href: '/engagements',  Icon: Target },
      { label: 'Cadence',          description: 'Client meeting & touchpoints',     href: '/engagements',  Icon: Calendar },
    ],
  },
  senior_advisor: {
    eyebrow: 'SENIOR ADVISOR',
    title: 'Senior Advisory',
    subtitle: 'Deep engagement analysis and strategic intelligence gathering.',
    quickLinks: [
      { label: 'Engagements',      description: 'Your assigned engagements',       href: '/engagements',  Icon: Briefcase },
      { label: 'Intel Tracker',    description: 'Monitor intelligence items',      href: '/engagements',  Icon: Radio },
      { label: 'Scenarios',        description: 'Strategic scenario planning',     href: '/engagements',  Icon: BarChart3 },
      { label: 'Brand Audit',      description: 'Brand positioning assessment',    href: '/engagements',  Icon: Target },
    ],
  },
  comms_director: {
    eyebrow: 'COMMS DIRECTOR',
    title: 'Communications Hub',
    subtitle: 'Narrative strategy, content planning, and crisis communications management.',
    quickLinks: [
      { label: 'Engagements',      description: 'Your active engagements',         href: '/engagements',  Icon: Briefcase },
      { label: 'Narrative',        description: 'Messaging & narrative frameworks', href: '/engagements', Icon: Target },
      { label: 'Comms Planner',    description: 'Campaign and initiative planning', href: '/engagements', Icon: Megaphone },
      { label: 'Content Calendar', description: 'Publishing schedule & queue',     href: '/engagements',  Icon: Calendar },
    ],
  },
  intel_analyst: {
    eyebrow: 'INTEL ANALYST',
    title: 'Intelligence Centre',
    subtitle: 'Monitor, analyse, and surface strategic intelligence across all engagements.',
    quickLinks: [
      { label: 'Engagements',      description: 'Your assigned engagements',       href: '/engagements',  Icon: Briefcase },
      { label: 'Intel Tracker',    description: 'Live intelligence feed',           href: '/engagements', Icon: Radio },
      { label: 'Competitors',      description: 'Competitive landscape monitoring', href: '/engagements', Icon: Eye },
      { label: 'Geospatial',       description: 'Geographic intelligence mapping',  href: '/engagements', Icon: BarChart3 },
    ],
  },
  digital_strategist: {
    eyebrow: 'DIGITAL STRATEGIST',
    title: 'Digital Strategy',
    subtitle: 'Content production, scheduling, and digital channel management.',
    quickLinks: [
      { label: 'Engagements',      description: 'Your active engagements',         href: '/engagements',  Icon: Briefcase },
      { label: 'Content Calendar', description: 'Content schedule & queue',        href: '/engagements',  Icon: Calendar },
      { label: 'Comms Planner',    description: 'Campaign planning tools',         href: '/engagements',  Icon: Megaphone },
      { label: 'Intel Feed',       description: 'Research & intelligence',         href: '/engagements',  Icon: Radio },
    ],
  },
  client_principal: {
    eyebrow: 'CLIENT PORTAL',
    title: 'Your Engagement',
    subtitle: 'Real-time visibility into your strategic programme.',
    quickLinks: [
      { label: 'Reports',  description: 'Programme status reports', href: '/portal/reports',  Icon: BarChart3 },
      { label: 'Insights', description: 'Strategic insights brief',  href: '/portal/insights', Icon: FileText },
    ],
  },
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function DashboardRouter() {
  const { role, user } = useAuthStore();
  const navigate = useNavigate();

  // Safely access engagement context (not available for client_principal)
  let selectedEngagement = null;
  let engagements: { id: string; title: string; health_rag: string }[] = [];
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useEngagement();
    selectedEngagement = ctx.selectedEngagement;
    engagements = ctx.engagements;
  } catch {
    // Outside EngagementProvider — client portal
  }

  if (!role) return null;

  const config = roleDashboardConfig[role];

  const greeting = getGreeting();
  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <LBDPageHeader
        eyebrow={config.eyebrow}
        title={`${greeting}, ${firstName}`}
        description={config.subtitle}
      />

      {/* Active engagement banner */}
      {selectedEngagement && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl border border-accent/20 bg-accent/5 cursor-pointer hover:border-accent/40 transition-colors"
          onClick={() => navigate(`/engagements/${selectedEngagement.id}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate(`/engagements/${selectedEngagement.id}`)}
          aria-label={`Open engagement: ${selectedEngagement.title}`}
        >
          <div className="flex items-center gap-3">
            <Briefcase className="w-4 h-4 text-accent flex-none" aria-hidden="true" />
            <div>
              <p className="text-xs font-mono tracking-widest text-accent uppercase">
                Active Engagement
              </p>
              <p className="text-sm font-medium text-foreground mt-0.5">
                {selectedEngagement.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LBDBadge
              variant={selectedEngagement.health_rag as 'green' | 'amber' | 'red'}
              size="sm"
            >
              {selectedEngagement.health_rag.toUpperCase()}
            </LBDBadge>
            <LBDBadge variant="outline" size="sm">
              Phase {selectedEngagement.phase}
            </LBDBadge>
          </div>
        </div>
      )}

      {/* No engagement selected hint (internal roles only) */}
      {!selectedEngagement && role !== 'client_principal' && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card cursor-pointer hover:border-accent/30 transition-colors"
          onClick={() => navigate('/engagements')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/engagements')}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-none" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">
              No Engagement Selected
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select an engagement from the header to unlock module navigation →
            </p>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div>
        <p className="font-mono text-[9px] tracking-[0.3em] text-muted-foreground/50 uppercase mb-3">
          Quick Access
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {config.quickLinks.map((link) => (
            <LBDCard
              key={link.href + link.label}
              className="p-4 cursor-pointer hover:border-accent/30 transition-colors group"
              onClick={() => navigate(link.href)}
              role="button"
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && navigate(link.href)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-none w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center group-hover:border-accent/40 transition-colors">
                  <link.Icon className="w-4 h-4 text-accent" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{link.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{link.description}</p>
                </div>
              </div>
            </LBDCard>
          ))}
        </div>
      </div>

      {/* Recent engagements — internal only */}
      {role !== 'client_principal' && engagements.length > 0 && (
        <div>
          <p className="font-mono text-[9px] tracking-[0.3em] text-muted-foreground/50 uppercase mb-3">
            Recent Engagements
          </p>
          <div className="space-y-2">
            {engagements.slice(0, 4).map((eng) => (
              <LBDCard
                key={eng.id}
                className="px-4 py-3 cursor-pointer hover:border-accent/30 transition-colors"
                onClick={() => navigate(`/engagements/${eng.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && navigate(`/engagements/${eng.id}`)}
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground flex-none" aria-hidden="true" />
                  <span className="text-sm text-foreground flex-1 truncate">{eng.title}</span>
                  <LBDBadge
                    variant={eng.health_rag as 'green' | 'amber' | 'red'}
                    size="sm"
                  >
                    {eng.health_rag.toUpperCase()}
                  </LBDBadge>
                </div>
              </LBDCard>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for no engagements */}
      {role !== 'client_principal' && engagements.length === 0 && (
        <LBDEmptyState
          icon={<Briefcase className="w-8 h-8" />}
          title="No Engagements Yet"
          description="Active engagements will appear here once created by an administrator."
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Helper
───────────────────────────────────────────── */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
