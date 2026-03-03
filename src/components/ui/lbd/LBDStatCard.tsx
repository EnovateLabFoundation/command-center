import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import { LBDLoadingSkeleton } from './LBDLoadingSkeleton';

export type Trend = 'up' | 'down' | 'flat';

interface SparkDatum {
  value: number;
}

export interface LBDStatCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: Trend;
  change?: string | number;
  changeLabel?: string;
  sparkline?: number[];
  loading?: boolean;
  /** Alias for `loading` */
  isLoading?: boolean;
  className?: string;
  /** Override accent colour for the sparkline / trend */
  accentClass?: 'gold' | 'success' | 'danger' | 'info';
  onClick?: () => void;
}

const trendConfig = {
  up: {
    Icon: TrendingUp,
    text: 'text-green-400',
    label: 'increased',
  },
  down: {
    Icon: TrendingDown,
    text: 'text-red-400',
    label: 'decreased',
  },
  flat: {
    Icon: Minus,
    text: 'text-muted-foreground',
    label: 'unchanged',
  },
};

const accentColors: Record<string, { stroke: string; gradient: string }> = {
  gold:    { stroke: '#C9A84C', gradient: '#C9A84C' },
  success: { stroke: '#27AE60', gradient: '#27AE60' },
  danger:  { stroke: '#C0392B', gradient: '#C0392B' },
  info:    { stroke: '#2563EB', gradient: '#2563EB' },
};

export function LBDStatCard({
  label,
  value,
  subLabel,
  trend,
  change,
  changeLabel = 'vs last period',
  sparkline,
  loading: loadingProp = false,
  isLoading: isLoadingProp,
  className,
  accentClass = 'gold',
  onClick,
}: LBDStatCardProps) {
  const loading = loadingProp || isLoadingProp || false;
  if (loading) {
    return <LBDLoadingSkeleton variant="stat" className={className} />;
  }

  const sparkData: SparkDatum[] = sparkline?.map((v) => ({ value: v })) ?? [];
  const accent = accentColors[accentClass];
  const trendCfg = trend ? trendConfig[trend] : null;
  const gradId = `spark-grad-${accentClass}-${label.replace(/\s/g, '')}`;

  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border border-t-[2px] border-t-accent overflow-hidden',
        onClick && 'cursor-pointer transition-all duration-200 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick?.() : undefined}
    >
      <div className="p-6">
        {/* Label */}
        <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
          {label}
        </p>

        {/* Value */}
        <p className="mt-2 text-4xl font-bold text-foreground tracking-tight leading-none">
          {value}
        </p>

        {/* Sub-label */}
        {subLabel && (
          <p className="mt-1 text-xs text-muted-foreground">{subLabel}</p>
        )}

        {/* Trend row */}
        {(trend || change !== undefined) && (
          <div className="flex items-center gap-1.5 mt-3">
            {trendCfg && (
              <trendCfg.Icon
                className={cn('w-3.5 h-3.5 flex-none', trendCfg.text)}
                aria-hidden="true"
              />
            )}
            {change !== undefined && (
              <span
                className={cn(
                  'text-xs font-mono font-semibold',
                  trendCfg?.text ?? 'text-muted-foreground',
                )}
                aria-label={`${trendCfg?.label ?? ''} by ${change}`}
              >
                {typeof change === 'number' && change > 0 ? '+' : ''}
                {change}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          </div>
        )}
      </div>

      {/* Sparkline */}
      {sparkData.length > 0 && (
        <div className="h-14 -mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sparkData}
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={accent.gradient} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={accent.gradient} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E1E2E',
                  border: '1px solid hsl(240 15% 22%)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#fff',
                  padding: '4px 8px',
                }}
                itemStyle={{ color: accent.stroke }}
                cursor={{ stroke: accent.stroke, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={accent.stroke}
                strokeWidth={1.5}
                fill={`url(#${gradId})`}
                dot={false}
                activeDot={{ r: 3, fill: accent.stroke, stroke: '#1E1E2E', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
