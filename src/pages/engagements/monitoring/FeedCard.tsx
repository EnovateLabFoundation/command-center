/**
 * FeedCard
 *
 * Individual card for a media monitoring feed item.
 * Shows platform icon, source, headline, sentiment, reach, and actions.
 */

import { Globe, Twitter, Facebook, Instagram, Youtube, Radio, Newspaper, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LBDBadge, LBDSentimentBadge, type SentimentScore } from '@/components/ui/lbd';
import { Button } from '@/components/ui/button';
import type { IntelFeedItem } from '@/hooks/useMediaMonitoring';

interface FeedCardProps {
  item: IntelFeedItem;
  onLogToTracker: (item: IntelFeedItem) => void;
  onDismiss: (itemId: string) => void;
  isDismissing?: boolean;
}

/** Map source_type / platform to an icon */
function getPlatformIcon(item: IntelFeedItem) {
  const platform = (item.platform ?? item.source_type ?? '').toLowerCase();
  if (platform.includes('twitter') || platform.includes('x')) return Twitter;
  if (platform.includes('facebook')) return Facebook;
  if (platform.includes('instagram')) return Instagram;
  if (platform.includes('youtube')) return Youtube;
  if (platform.includes('broadcast') || platform.includes('radio')) return Radio;
  if (platform.includes('print') || platform.includes('news')) return Newspaper;
  return Globe;
}

/** Reach tier labels */
const REACH_LABELS: Record<number, string> = {
  1: 'Local',
  2: 'Regional',
  3: 'National',
  4: 'International',
};

export default function FeedCard({ item, onLogToTracker, onDismiss, isDismissing }: FeedCardProps) {
  const PlatformIcon = getPlatformIcon(item);
  const sentimentScore = item.sentiment_score != null
    ? (Math.round(Math.max(-2, Math.min(2, Number(item.sentiment_score)))) as SentimentScore)
    : (0 as SentimentScore);

  const timeAgo = (() => {
    const diff = Date.now() - new Date(item.created_at).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  })();

  return (
    <div
      className={cn(
        'p-4 rounded-xl border border-border/60 bg-card/80 hover:bg-card transition-colors space-y-3',
        item.is_urgent && 'border-l-2 border-l-destructive',
      )}
    >
      {/* Top row: platform + source + time */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-none">
            <PlatformIcon className="w-4 h-4 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {item.source_name ?? item.platform ?? 'Unknown Source'}
            </p>
            <p className="text-[10px] text-muted-foreground">{timeAgo}</p>
          </div>
        </div>
        {item.is_urgent && (
          <LBDBadge variant="red" size="sm">URGENT</LBDBadge>
        )}
      </div>

      {/* Headline */}
      <p className="text-sm text-foreground leading-snug line-clamp-2">{item.headline}</p>

      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap">
        <LBDSentimentBadge score={sentimentScore} size="sm" />
        {item.reach_tier != null && (
          <LBDBadge variant="outline" size="sm">
            {REACH_LABELS[item.reach_tier] ?? `Tier ${item.reach_tier}`}
          </LBDBadge>
        )}
        {item.narrative_theme && (
          <LBDBadge variant="outline" size="sm">{item.narrative_theme}</LBDBadge>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs gap-1"
          onClick={() => onLogToTracker(item)}
        >
          Log to Tracker
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground"
          onClick={() => onDismiss(item.id)}
          disabled={isDismissing}
        >
          <X className="w-3 h-3" />
          Dismiss
        </Button>
      </div>
    </div>
  );
}
