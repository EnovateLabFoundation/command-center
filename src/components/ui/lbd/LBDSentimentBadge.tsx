import { TrendingUp, TrendingDown, Minus, ChevronsUp, ChevronsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SentimentScore = -2 | -1 | 0 | 1 | 2;

interface LBDSentimentBadgeProps {
  score: SentimentScore;
  showLabel?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface ScoreConfig {
  label: string;
  shortLabel: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  Icon: React.ElementType;
}

const scoreConfig: Record<number, ScoreConfig> = {
  '-2': {
    label: 'Very Negative',
    shortLabel: '-2',
    colorClass: 'text-red-400',
    bgClass: 'bg-red-950/50',
    borderClass: 'border-red-800/50',
    Icon: ChevronsDown,
  },
  '-1': {
    label: 'Negative',
    shortLabel: '-1',
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-950/40',
    borderClass: 'border-orange-800/40',
    Icon: TrendingDown,
  },
  '0': {
    label: 'Neutral',
    shortLabel: '0',
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted/20',
    borderClass: 'border-border',
    Icon: Minus,
  },
  '1': {
    label: 'Positive',
    shortLabel: '+1',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-950/40',
    borderClass: 'border-blue-800/40',
    Icon: TrendingUp,
  },
  '2': {
    label: 'Very Positive',
    shortLabel: '+2',
    colorClass: 'text-green-400',
    bgClass: 'bg-green-950/40',
    borderClass: 'border-green-800/40',
    Icon: ChevronsUp,
  },
};

const sizeClasses = {
  sm: {
    container: 'px-2 py-0.5 gap-1 text-[10px]',
    icon: 'w-2.5 h-2.5',
  },
  md: {
    container: 'px-2.5 py-1 gap-1.5 text-xs',
    icon: 'w-3 h-3',
  },
  lg: {
    container: 'px-3 py-1.5 gap-2 text-sm',
    icon: 'w-3.5 h-3.5',
  },
};

export function LBDSentimentBadge({
  score,
  showLabel = true,
  showIcon = true,
  size = 'md',
  className,
}: LBDSentimentBadgeProps) {
  const config = scoreConfig[score] ?? scoreConfig[0];
  const { Icon } = config;
  const sz = sizeClasses[size];

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-semibold border rounded-full leading-none',
        config.bgClass,
        config.colorClass,
        config.borderClass,
        sz.container,
        className,
      )}
      aria-label={`Sentiment: ${config.label} (${config.shortLabel})`}
      title={config.label}
    >
      {showIcon && <Icon className={cn(sz.icon, 'flex-none')} aria-hidden="true" />}
      {showLabel ? config.label : config.shortLabel}
    </span>
  );
}
