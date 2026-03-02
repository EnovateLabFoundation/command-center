import { useParams } from 'react-router-dom';
import { Palette } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function BrandAuditPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <LBDPageHeader
        eyebrow="STRATEGY"
        title="Brand Audit"
        description="Brand positioning assessment — evaluate perception, identity, and strategic alignment."
      />
      <LBDEmptyState
        icon={<Palette className="w-8 h-8" />}
        title="Brand Audit Module"
        description="Brand health scoring, perception analysis, and strategic repositioning tools coming soon."
      />
    </div>
  );
}
