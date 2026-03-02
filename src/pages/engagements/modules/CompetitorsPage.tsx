import { useParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function CompetitorsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <LBDPageHeader
        eyebrow="INTELLIGENCE"
        title="Competitors"
        description="Competitive landscape monitoring — track opposition activity, positioning, and messaging."
      />
      <LBDEmptyState
        icon={<Eye className="w-8 h-8" />}
        title="Competitors Module"
        description="Competitor profile tracking, activity monitoring, and threat assessment coming soon."
      />
    </div>
  );
}
