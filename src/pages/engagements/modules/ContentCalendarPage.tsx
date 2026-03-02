import { useParams } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function ContentCalendarPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <LBDPageHeader
        eyebrow="EXECUTION"
        title="Content Calendar"
        description="Publishing schedule — plan, queue, and track content across all channels."
      />
      <LBDEmptyState
        icon={<Calendar className="w-8 h-8" />}
        title="Content Calendar Module"
        description="Drag-and-drop content scheduling and multi-channel publishing queue coming soon."
      />
    </div>
  );
}
