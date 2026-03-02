import { useParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function OnboardingPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <LBDPageHeader
        eyebrow="ENGAGEMENT"
        title="Onboarding"
        description="Client intake, context capture, and engagement setup for this programme."
      />
      <LBDEmptyState
        icon={<ClipboardList className="w-8 h-8" />}
        title="Onboarding Module"
        description="Structured onboarding workflow coming soon. Capture client context, key stakeholders, and programme objectives."
      />
    </div>
  );
}
