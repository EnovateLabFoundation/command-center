/**
 * ClientDashboard (/portal)
 *
 * The primary landing page for client_principal users. Shows:
 *   - Personalised greeting with client name + engagement title
 *   - Current phase indicator (1–4)
 *   - Last updated timestamp
 *   - Quick stats: last sentiment score, last report date, next briefing
 */

import { useEffect } from 'react';
import { BarChart3, Clock, TrendingUp, FileText, Calendar } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import {
  usePortalAccess,
  usePortalEngagement,
  usePortalClient,
  usePortalIntel,
  usePortalBriefs,
} from '@/hooks/usePortalData';
import { LBDCard, LBDEmptyState } from '@/components/ui/lbd';
import { format } from 'date-fns';

/* ─────────────────────────────────────────────
   Phase descriptions
───────────────────────────────────────────── */

const PHASE_DESC: Record<string, string> = {
  '1': 'Discovery & Intelligence Gathering',
  '2': 'Strategy Development & Planning',
  '3': 'Execution & Campaign Delivery',
  '4': 'Review & Legacy Planning',
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function ClientDashboard() {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  const { data: access } = usePortalAccess();
  const { data: engagement, isLoading } = usePortalEngagement(access?.engagement_id);
  const { data: client } = usePortalClient(engagement?.client_id);
  const { data: intelItems } = usePortalIntel(access?.engagement_id);
  const { data: briefs } = usePortalBriefs(access?.engagement_id);

  // Quick stats derivation
  const lastSentiment = intelItems?.[0]?.sentiment_score ?? null;
  const lastBriefDate = briefs?.[0]?.generated_at ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-accent" />
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <LBDEmptyState
          icon={<BarChart3 className="w-8 h-8" />}
          title="No Active Engagement"
          description="Your advisory team has not yet linked an engagement to your portal. Please contact your lead advisor."
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* ── Greeting ──────────────────────────── */}
      <div>
        <p className="text-[10px] font-mono tracking-[0.3em] text-accent mb-1">
          {client?.name?.toUpperCase() ?? 'CLIENT PORTAL'}
        </p>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{engagement.title}</p>
      </div>

      {/* ── Phase indicator ───────────────────── */}
      <LBDCard className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {['1', '2', '3', '4'].map((p) => (
              <div
                key={p}
                className={`w-10 h-2 rounded-full transition-colors ${
                  Number(p) <= Number(engagement.phase)
                    ? 'bg-accent'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Phase {engagement.phase}
            </p>
            <p className="text-xs text-muted-foreground">
              {PHASE_DESC[engagement.phase] ?? 'In progress'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px]">
              Updated {format(new Date(engagement.updated_at), 'dd MMM yyyy')}
            </span>
          </div>
        </div>
      </LBDCard>

      {/* ── Quick stats ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Latest sentiment */}
        <LBDCard className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-[10px] font-mono tracking-wider text-muted-foreground">SENTIMENT</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {lastSentiment !== null ? (lastSentiment > 0 ? '+' : '') + lastSentiment.toFixed(1) : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Latest score</p>
        </LBDCard>

        {/* Last report */}
        <LBDCard className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-accent" />
            <span className="text-[10px] font-mono tracking-wider text-muted-foreground">LAST REPORT</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {lastBriefDate ? format(new Date(lastBriefDate), 'dd MMM') : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Most recent briefing</p>
        </LBDCard>

        {/* Engagement status */}
        <LBDCard className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-accent" />
            <span className="text-[10px] font-mono tracking-wider text-muted-foreground">STATUS</span>
          </div>
          <p className="text-xl font-bold text-foreground capitalize">{engagement.status}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Engagement health</p>
        </LBDCard>
      </div>
    </div>
  );
}
