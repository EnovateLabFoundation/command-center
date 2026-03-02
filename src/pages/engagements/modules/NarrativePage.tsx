import { useParams } from 'react-router-dom';
import { Target } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function NarrativePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <LBDPageHeader
        eyebrow="STRATEGY"
        title="Narrative Platform"
        description="Master narrative, key messages, and audience-specific messaging frameworks."
      />
      <LBDEmptyState
        icon={<Target className="w-8 h-8" />}
        title="Narrative Module"
        description="Narrative architecture, message hierarchy, and audience targeting tools coming soon."
      />
    </div>
  );
}
