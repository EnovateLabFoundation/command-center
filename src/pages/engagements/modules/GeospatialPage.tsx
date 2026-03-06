/**
 * GeospatialPage
 *
 * Main page for the Geospatial Analytics Engine module.
 * Renders an interactive map (Nigeria-centred), geographic level tabs,
 * field report submission, region detail panel, and data panels.
 *
 * Route: /engagements/:id/geospatial
 */

import { useState, useMemo, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { Globe, Plus, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  LBDPageHeader,
  LBDLoadingSkeleton,
  LBDEmptyState,
  LBDStatCard,
} from '@/components/ui/lbd';
import {
  useIntelByRegion,
  useStakeholderLocations,
  aggregateByState,
  NIGERIA_STATES,
  type GeoLevel,
} from '@/hooks/useGeospatial';

/* Lazy-load heavy map component to avoid blocking initial render */
const GeospatialMap = lazy(() => import('../geospatial/GeospatialMap'));
const RegionDetailPanel = lazy(() => import('../geospatial/RegionDetailPanel'));
const FieldReportModal = lazy(() => import('../geospatial/FieldReportModal'));
const DataPanels = lazy(() => import('../geospatial/DataPanels'));
const WardTableView = lazy(() => import('../geospatial/WardTableView'));

/* ── Geographic level definitions ────────── */

const GEO_LEVELS: { value: GeoLevel; label: string }[] = [
  { value: 'national', label: 'NATIONAL' },
  { value: 'state', label: 'STATE' },
  { value: 'lga', label: 'LGA' },
  { value: 'ward', label: 'WARD' },
  { value: 'polling_unit', label: 'POLLING UNIT' },
];

export default function GeospatialPage() {
  const { id: engagementId } = useParams<{ id: string }>();
  const [geoLevel, setGeoLevel] = useState<GeoLevel>('national');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showFieldReport, setShowFieldReport] = useState(false);

  /* Data hooks */
  const { data: intelItems = [], isLoading: intelLoading } = useIntelByRegion(engagementId);
  const { data: stakeholders = [], isLoading: stakeholderLoading } = useStakeholderLocations(engagementId);

  const isLoading = intelLoading || stakeholderLoading;

  /* Computed metrics */
  const stateAgg = useMemo(() => aggregateByState(intelItems), [intelItems]);

  const totalIntel = intelItems.length;
  const statesWithData = stateAgg.size;
  const geoStakeholders = stakeholders.filter((s) => s.lat != null && s.lng != null).length;
  const coverageGaps = NIGERIA_STATES.length - statesWithData;

  /* Region detail data for selected region */
  const selectedRegionData = useMemo(() => {
    if (!selectedRegion) return null;
    const d = stateAgg.get(selectedRegion);
    if (!d) return { avgSentiment: null, itemCount: 0 };
    return {
      avgSentiment: d.count > 0 ? d.sentimentSum / d.count : null,
      itemCount: d.total,
    };
  }, [selectedRegion, stateAgg]);

  /** Ward/polling unit levels use table view */
  const isTableLevel = geoLevel === 'ward' || geoLevel === 'polling_unit';

  return (
    <div className="flex h-full">
      {/* Main content area */}
      <div className={cn('flex-1 overflow-y-auto p-6 space-y-6', selectedRegion && 'pr-0')}>
        {/* Page header */}
        <LBDPageHeader
          eyebrow="INTELLIGENCE"
          title="Geospatial Intelligence"
          description="Geographic intelligence — regional influence, constituency mapping, and spatial analysis."
          actions={
            <Button
              onClick={() => setShowFieldReport(true)}
              className="gap-1.5"
              size="sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Field Report
            </Button>
          }
        />

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <LBDStatCard label="Intel Items" value={totalIntel} loading={isLoading} />
          <LBDStatCard label="States Covered" value={`${statesWithData} / ${NIGERIA_STATES.length}`} loading={isLoading} />
          <LBDStatCard label="Mapped Stakeholders" value={geoStakeholders} loading={isLoading} />
          <LBDStatCard
            label="Coverage Gaps"
            value={coverageGaps}
            loading={isLoading}
            trend={coverageGaps > 10 ? 'down' : coverageGaps > 5 ? 'flat' : 'up'}
          />
        </div>

        {/* Geographic level tabs */}
        <Tabs value={geoLevel} onValueChange={(v) => setGeoLevel(v as GeoLevel)}>
          <TabsList className="bg-muted/50">
            {GEO_LEVELS.map((lvl) => (
              <TabsTrigger key={lvl.value} value={lvl.value} className="text-xs font-mono tracking-wider">
                {lvl.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Map view for national/state/LGA levels */}
          {!isTableLevel && (
            <TabsContent value={geoLevel} className="mt-4">
              {isLoading ? (
                <LBDLoadingSkeleton className="h-[600px] rounded-xl" />
              ) : (
                <Suspense fallback={<LBDLoadingSkeleton className="h-[600px] rounded-xl" />}>
                  <GeospatialMap
                    stakeholders={stakeholders}
                    onMarkerClick={(s) => {
                      // Use the stakeholder's state field for region detail lookup
                      const region = (s as any).state ?? s.name;
                      setSelectedRegion(region);
                    }}
                  />
                </Suspense>
              )}
            </TabsContent>
          )}

          {/* Table view for ward/polling unit levels */}
          {isTableLevel && (
            <TabsContent value={geoLevel} className="mt-4">
              <Suspense fallback={<LBDLoadingSkeleton className="h-[400px] rounded-xl" />}>
                <WardTableView intelItems={intelItems} />
              </Suspense>
            </TabsContent>
          )}
        </Tabs>

        {/* Data panels (below map) */}
        {!isTableLevel && (
          <Suspense fallback={<LBDLoadingSkeleton className="h-[200px] rounded-xl" />}>
            <DataPanels intelItems={intelItems} />
          </Suspense>
        )}
      </div>

      {/* Region detail side panel */}
      {selectedRegion && engagementId && selectedRegionData && (
        <Suspense fallback={<div className="w-[360px] border-l border-border bg-card" />}>
          <RegionDetailPanel
            engagementId={engagementId}
            region={selectedRegion}
            avgSentiment={selectedRegionData.avgSentiment}
            itemCount={selectedRegionData.itemCount}
            onClose={() => setSelectedRegion(null)}
          />
        </Suspense>
      )}

      {/* Field report modal */}
      {engagementId && (
        <Suspense fallback={null}>
          <FieldReportModal
            open={showFieldReport}
            onClose={() => setShowFieldReport(false)}
            engagementId={engagementId}
          />
        </Suspense>
      )}
    </div>
  );
}
