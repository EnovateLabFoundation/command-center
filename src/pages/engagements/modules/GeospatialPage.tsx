import { useParams } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function GeospatialPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <LBDPageHeader
        eyebrow="INTELLIGENCE"
        title="Geospatial"
        description="Geographic intelligence — regional influence, constituency mapping, and spatial analysis."
      />
      <LBDEmptyState
        icon={<Globe className="w-8 h-8" />}
        title="Geospatial Module"
        description="Interactive geographic mapping and regional intelligence analysis coming soon."
      />
    </div>
  );
}
