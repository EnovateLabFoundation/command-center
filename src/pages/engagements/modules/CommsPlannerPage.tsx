import { useParams } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function CommsPlannerPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <LBDPageHeader
        eyebrow="STRATEGY"
        title="Comms Planner"
        description="Communications planning — campaigns, initiatives, and channel strategy."
      />
      <LBDEmptyState
        icon={<Megaphone className="w-8 h-8" />}
        title="Comms Planner Module"
        description="Campaign planning, initiative tracking, and channel allocation tools coming soon."
      />
    </div>
  );
}
