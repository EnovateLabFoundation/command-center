import { useParams } from 'react-router-dom';
import { Telescope } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function ScenariosPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <LBDPageHeader
        eyebrow="INTELLIGENCE"
        title="Scenarios"
        description="Strategic scenario planning — model possible futures and prepare contingency responses."
      />
      <LBDEmptyState
        icon={<Telescope className="w-8 h-8" />}
        title="Scenarios Module"
        description="Scenario modelling, probability weighting, and response planning coming soon."
      />
    </div>
  );
}
