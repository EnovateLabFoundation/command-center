import { useParams } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function IntelTrackerPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <LBDPageHeader
        eyebrow="INTELLIGENCE"
        title="Intel Tracker"
        description="Live intelligence feed — monitor, tag, and escalate strategic intelligence items."
      />
      <LBDEmptyState
        icon={<Radio className="w-8 h-8" />}
        title="Intel Tracker Module"
        description="Real-time intelligence monitoring, tagging, and urgency escalation coming soon."
      />
    </div>
  );
}
