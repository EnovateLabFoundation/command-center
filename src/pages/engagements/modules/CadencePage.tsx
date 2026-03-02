import { useParams } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function CadencePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <LBDPageHeader
        eyebrow="EXECUTION"
        title="Cadence"
        description="Client touchpoints — schedule and track meetings, calls, and briefings."
      />
      <LBDEmptyState
        icon={<CheckSquare className="w-8 h-8" />}
        title="Cadence Module"
        description="Meeting cadence management, action item tracking, and touchpoint scheduling coming soon."
      />
    </div>
  );
}
