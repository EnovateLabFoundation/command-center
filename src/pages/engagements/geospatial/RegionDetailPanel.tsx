/**
 * RegionDetailPanel
 *
 * Slide-in side panel that appears when a region/state is selected on the map.
 * Shows area sentiment, stakeholders, and recent intel items for that region.
 */

import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LBDBadge, LBDSentimentBadge, type SentimentScore } from '@/components/ui/lbd';
import { useRegionDetail } from '@/hooks/useGeospatial';

interface RegionDetailPanelProps {
  engagementId: string;
  region: string;
  avgSentiment: number | null;
  itemCount: number;
  onClose: () => void;
}

export default function RegionDetailPanel({
  engagementId,
  region,
  avgSentiment,
  itemCount,
  onClose,
}: RegionDetailPanelProps) {
  const { data, isLoading } = useRegionDetail(engagementId, region);

  /** Clamp sentiment to valid SentimentScore range */
  const sentimentScore = avgSentiment != null
    ? (Math.round(Math.max(-2, Math.min(2, avgSentiment))) as SentimentScore)
    : (0 as SentimentScore);

  return (
    <div className="w-[360px] flex-none border-l border-border bg-card overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border/60">
        <div>
          <p className="font-mono text-[10px] tracking-[0.3em] text-accent uppercase mb-1">
            Region Detail
          </p>
          <h3 className="text-base font-semibold text-foreground">{region}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sentiment summary */}
      <div className="p-4 border-b border-border/40 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Average Sentiment</span>
          <LBDSentimentBadge score={sentimentScore} size="sm" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Intel Items</span>
          <span className="text-sm font-mono text-foreground">{itemCount}</span>
        </div>
      </div>

      {/* Stakeholders */}
      <div className="p-4 border-b border-border/40">
        <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-3">
          Stakeholders in Area
        </p>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : data?.stakeholders?.length ? (
          <div className="space-y-2">
            {data.stakeholders.map((s: any) => (
              <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{s.role_position}</p>
                </div>
                <LBDBadge
                  variant={s.alignment === 'champion' ? 'green' : s.alignment === 'hostile' ? 'red' : 'outline'}
                  size="sm"
                >
                  {(s.alignment ?? 'neutral').toUpperCase()}
                </LBDBadge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No stakeholders tagged for this area.</p>
        )}
      </div>

      {/* Recent intel */}
      <div className="p-4">
        <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-3">
          Recent Intel
        </p>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : data?.intel?.length ? (
          <div className="space-y-2">
            {data.intel.slice(0, 10).map((item: any) => (
              <div key={item.id} className="p-2 rounded-lg bg-muted/30 space-y-1">
                <p className="text-xs font-medium text-foreground line-clamp-2">{item.headline}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{item.date_logged}</span>
                  {item.sentiment_score != null && (
                    <LBDSentimentBadge
                      score={Math.round(Math.max(-2, Math.min(2, item.sentiment_score))) as SentimentScore}
                      size="sm"
                      showLabel={false}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No intel items for this area.</p>
        )}
      </div>
    </div>
  );
}
