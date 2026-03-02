/**
 * ClientReports
 *
 * Programme status reports and deliverables for client_principal users.
 * Curated view of engagement progress, milestones, and key outputs.
 */

import { BarChart3 } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function ClientReports() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <LBDPageHeader
        eyebrow="CLIENT PORTAL"
        title="Programme Reports"
        description="Status reports, milestone tracking, and deliverable summaries for your engagement."
      />
      <LBDEmptyState
        icon={<BarChart3 className="w-8 h-8" />}
        title="Reports Coming Soon"
        description="Formal programme status reports, milestone updates, and PDF deliverable exports will appear here."
      />
    </div>
  );
}
