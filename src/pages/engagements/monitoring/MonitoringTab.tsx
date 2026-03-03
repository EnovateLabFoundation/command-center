/**
 * MonitoringTab
 *
 * Media Monitoring Hub — live inbound feed aggregation dashboard.
 * Rendered as a sub-tab within Intel Tracker page.
 *
 * Layout: Left 55% = scrollable live feed, Right 45% = analytics sidebar.
 * Features: platform/sentiment/date filters, keyword manager, realtime urgent toasts.
 */

import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { Settings, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LBDLoadingSkeleton, LBDBadge, toast } from '@/components/ui/lbd';
import {
  useMonitoringFeed,
  useDismissItem,
  filterFeedItems,
  type PlatformFilter,
  type SentimentFilter,
  type DateFilter,
  type IntelFeedItem,
} from '@/hooks/useMediaMonitoring';
import FeedCard from './FeedCard';
import AnalyticsSidebar from './AnalyticsSidebar';

const KeywordManagerModal = lazy(() => import('./KeywordManagerModal'));

interface MonitoringTabProps {
  engagementId: string;
  /** Called when user clicks "Log to Tracker" — opens the IntelDrawer with pre-filled data */
  onLogToTracker: (item: IntelFeedItem) => void;
}

/* ── Filter option definitions ─────────────── */

const PLATFORM_OPTIONS: { value: PlatformFilter; label: string }[] = [
  { value: 'print', label: 'Print' },
  { value: 'digital', label: 'Digital' },
  { value: 'broadcast', label: 'Broadcast' },
  { value: 'social', label: 'Social' },
];

const SENTIMENT_OPTIONS: { value: SentimentFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'negative', label: 'Negative Only' },
  { value: 'positive', label: 'Positive Only' },
  { value: 'urgent', label: 'Urgent Only' },
];

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '3days', label: 'Last 3 Days' },
  { value: '7days', label: 'Last 7 Days' },
];

export default function MonitoringTab({ engagementId, onLogToTracker }: MonitoringTabProps) {
  /* ── Data ────────────────────────────────────── */
  const { data: feedItems = [], isLoading } = useMonitoringFeed(engagementId);
  const dismissMutation = useDismissItem(engagementId);

  /* ── Filter state ───────────────────────────── */
  const [platformFilters, setPlatformFilters] = useState<PlatformFilter[]>([]);
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('7days');
  const [showKeywords, setShowKeywords] = useState(false);

  /* ── Filtered items ─────────────────────────── */
  const filteredItems = useMemo(
    () => filterFeedItems(feedItems, platformFilters, sentimentFilter, dateFilter),
    [feedItems, platformFilters, sentimentFilter, dateFilter],
  );

  /* ── Realtime urgent toast listener ─────────── */
  useEffect(() => {
    const handler = (e: Event) => {
      const item = (e as CustomEvent<IntelFeedItem>).detail;
      toast.error(
        '🚨 Urgent Intel',
        item.headline,
      );
    };
    window.addEventListener('urgent-intel', handler);
    return () => window.removeEventListener('urgent-intel', handler);
  }, []);

  /* ── Toggle platform filter ─────────────────── */
  const togglePlatform = useCallback((p: PlatformFilter) => {
    setPlatformFilters((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }, []);

  /* ── Mark all urgent as reviewed ────────────── */
  const handleMarkAllReviewed = useCallback(async () => {
    const urgentIds = feedItems
      .filter((i) => i.is_urgent || Number(i.sentiment_score ?? 0) <= -2)
      .map((i) => i.id);
    for (const id of urgentIds) {
      await dismissMutation.mutateAsync(id);
    }
    toast.success('All urgent items marked as reviewed.');
  }, [feedItems, dismissMutation]);

  /* ── Render ─────────────────────────────────── */
  return (
    <div className="space-y-4 mt-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-3 rounded-xl bg-card/50 border border-border/40">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Platform filters */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Platform:</span>
            {PLATFORM_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-1 text-xs cursor-pointer text-foreground"
              >
                <Checkbox
                  checked={platformFilters.includes(opt.value)}
                  onCheckedChange={() => togglePlatform(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>

          {/* Sentiment filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Sentiment:</span>
            {SENTIMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSentimentFilter(opt.value)}
                className={cn(
                  'px-2 py-1 rounded-md text-[11px] transition-colors',
                  sentimentFilter === opt.value
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Date filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Date:</span>
            {DATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDateFilter(opt.value)}
                className={cn(
                  'px-2 py-1 rounded-md text-[11px] transition-colors',
                  dateFilter === opt.value
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Keyword manager button */}
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-xs"
          onClick={() => setShowKeywords(true)}
        >
          <Settings className="w-3.5 h-3.5" />
          Keywords
        </Button>
      </div>

      {/* Main layout: Feed + Sidebar */}
      <div className="flex gap-4">
        {/* Live feed (55%) */}
        <div className="w-[55%] flex-none space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
          {/* Live indicator */}
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-3.5 h-3.5 text-[hsl(var(--success))] animate-pulse" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              Live Feed · {filteredItems.length} items
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <LBDLoadingSkeleton key={i} className="h-[140px] rounded-xl" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">No items match current filters.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <FeedCard
                key={item.id}
                item={item}
                onLogToTracker={onLogToTracker}
                onDismiss={(id) => dismissMutation.mutate(id)}
                isDismissing={dismissMutation.isPending}
              />
            ))
          )}
        </div>

        {/* Analytics sidebar (45%) */}
        <div className="flex-1 min-w-0">
          <AnalyticsSidebar
            items={feedItems}
            onMarkAllReviewed={handleMarkAllReviewed}
          />
        </div>
      </div>

      {/* Keyword manager modal */}
      <Suspense fallback={null}>
        <KeywordManagerModal
          open={showKeywords}
          onClose={() => setShowKeywords(false)}
          engagementId={engagementId}
        />
      </Suspense>
    </div>
  );
}
