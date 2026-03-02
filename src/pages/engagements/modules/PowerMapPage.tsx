import { useParams } from 'react-router-dom';
import { Network } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function PowerMapPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <LBDPageHeader
        eyebrow="INTELLIGENCE"
        title="Power Map"
        description="Stakeholder influence network — map decision-makers, allies, and opposition."
      />
      <LBDEmptyState
        icon={<Network className="w-8 h-8" />}
        title="Power Map Module"
        description="Interactive stakeholder network visualisation and influence scoring coming soon."
      />
    </div>
  );
}
