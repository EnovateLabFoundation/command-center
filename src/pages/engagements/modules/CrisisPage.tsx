import { useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function CrisisPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <LBDPageHeader
        eyebrow="STRATEGY"
        title="Crisis Communications"
        description="Crisis preparedness — protocols, holding statements, and escalation playbooks."
      />
      <LBDEmptyState
        icon={<AlertTriangle className="w-8 h-8" />}
        title="Crisis Comms Module"
        description="Crisis response protocols, stakeholder communication trees, and live crisis management coming soon."
      />
    </div>
  );
}
