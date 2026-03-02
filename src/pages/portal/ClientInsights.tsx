/**
 * ClientInsights
 *
 * Curated strategic insights and intelligence briefings for client_principal
 * users. Surfaces relevant intel items shared by the advisory team.
 */

import { FileText } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function ClientInsights() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <LBDPageHeader
        eyebrow="CLIENT PORTAL"
        title="Strategic Insights"
        description="Curated intelligence briefings and strategic analysis shared by your advisory team."
      />
      <LBDEmptyState
        icon={<FileText className="w-8 h-8" />}
        title="Insights Coming Soon"
        description="Your advisory team will publish strategic briefings, intelligence summaries, and key insights here."
      />
    </div>
  );
}
