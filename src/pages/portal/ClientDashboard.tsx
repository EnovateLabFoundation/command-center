/**
 * ClientDashboard
 *
 * The primary landing page for client_principal users.
 * Shows engagement overview, recent updates, and quick access to reports.
 */

import { BarChart3, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { LBDPageHeader, LBDCard, LBDEmptyState } from '@/components/ui/lbd';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <LBDPageHeader
        eyebrow="CLIENT PORTAL"
        title={`Welcome back, ${firstName}`}
        description="Your strategic engagement overview — reports, insights, and programme updates."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LBDCard
          className="p-5 cursor-pointer hover:border-accent/30 transition-colors group"
          onClick={() => navigate('/portal/reports')}
          role="button"
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && navigate('/portal/reports')}
        >
          <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-3 group-hover:border-accent/40 transition-colors">
            <BarChart3 className="w-4.5 h-4.5 text-accent" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">Programme Reports</p>
          <p className="text-xs text-muted-foreground">Status reports, milestones, and deliverable updates.</p>
        </LBDCard>

        <LBDCard
          className="p-5 cursor-pointer hover:border-accent/30 transition-colors group"
          onClick={() => navigate('/portal/insights')}
          role="button"
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && navigate('/portal/insights')}
        >
          <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-3 group-hover:border-accent/40 transition-colors">
            <FileText className="w-4.5 h-4.5 text-accent" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">Strategic Insights</p>
          <p className="text-xs text-muted-foreground">Curated intelligence briefings and strategic analysis.</p>
        </LBDCard>
      </div>

      <LBDEmptyState
        icon={<BarChart3 className="w-8 h-8" />}
        title="Engagement Updates Coming Soon"
        description="Real-time programme status, key milestones, and advisor briefings will appear here."
      />
    </div>
  );
}
