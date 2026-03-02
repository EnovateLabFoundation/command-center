import { useParams } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function ReportsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <LBDPageHeader
        eyebrow="REPORTING"
        title="Reports"
        description="Programme reporting — engagement summaries, activity reports, and deliverable exports."
      />
      <LBDEmptyState
        icon={<BarChart3 className="w-8 h-8" />}
        title="Reports Module"
        description="Automated engagement reports, custom dashboards, and PDF export coming soon."
      />
    </div>
  );
}
