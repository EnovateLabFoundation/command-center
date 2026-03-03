/**
 * AIUsagePanel
 *
 * AI Usage section for the Super Admin dashboard.
 * Queries audit_logs for AI function calls and displays:
 *  - Total tokens used this month
 *  - Estimated cost
 *  - Usage breakdown by function
 */

import { useState, useEffect, useMemo } from 'react';
import { Bot, Zap, DollarSign, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LBDStatCard } from '@/components/ui/lbd/LBDStatCard';
import { LBDCard } from '@/components/ui/lbd/LBDCard';
import { LBDLoadingSkeleton } from '@/components/ui/lbd/LBDLoadingSkeleton';

/* ── Types ──────────────────────────────────── */

interface AILogEntry {
  new_values: {
    tokens_used?: number;
    model?: string;
    function_name?: string;
    duration_ms?: number;
  } | null;
  created_at: string;
}

/* ── Constants ──────────────────────────────── */

/** AI function table names logged to audit_logs */
const AI_TABLE_NAMES = [
  'generate_intel_brief',
  'generate_discovery_brief',
  'check_narrative_compliance',
  'ai_summarise',
  'detect_scenario_triggers',
  'sentiment-score',
];

/** Rough cost estimate per 1M tokens (USD) */
const COST_PER_MILLION_TOKENS = 0.15;

/* ── Component ──────────────────────────────── */

export default function AIUsagePanel() {
  const [logs, setLogs] = useState<AILogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setIsLoading(true);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('audit_logs')
        .select('new_values, created_at')
        .in('table_name', AI_TABLE_NAMES)
        .gte('created_at', startOfMonth.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      setLogs((data as unknown as AILogEntry[]) ?? []);
      setIsLoading(false);
    }
    fetchLogs();
  }, []);

  /** Computed stats */
  const stats = useMemo(() => {
    let totalTokens = 0;
    let totalCalls = 0;
    const byFunction: Record<string, { calls: number; tokens: number }> = {};

    for (const log of logs) {
      const vals = log.new_values;
      if (!vals) continue;
      totalCalls++;
      const tokens = Number(vals.tokens_used) || 0;
      totalTokens += tokens;

      const fn = vals.function_name ?? 'unknown';
      if (!byFunction[fn]) byFunction[fn] = { calls: 0, tokens: 0 };
      byFunction[fn].calls++;
      byFunction[fn].tokens += tokens;
    }

    const costEstimate = (totalTokens / 1_000_000) * COST_PER_MILLION_TOKENS;

    const breakdown = Object.entries(byFunction)
      .sort((a, b) => b[1].tokens - a[1].tokens)
      .map(([name, data]) => ({ name, ...data }));

    return { totalTokens, totalCalls, costEstimate, breakdown };
  }, [logs]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <LBDLoadingSkeleton className="h-24" />
        <LBDLoadingSkeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">AI Usage — This Month</h3>
          <p className="text-[10px] text-muted-foreground font-mono">
            Lovable AI Gateway consumption
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <LBDStatCard
          label="Total Tokens"
          value={stats.totalTokens.toLocaleString()}
        />
        <LBDStatCard
          label="AI Calls"
          value={stats.totalCalls}
        />
        <LBDStatCard
          label="Est. Cost"
          value={`$${stats.costEstimate.toFixed(4)}`}
        />
      </div>

      {/* Breakdown table */}
      {stats.breakdown.length > 0 && (
        <LBDCard padding="none" noBorderAccent>
          <div className="px-4 py-3 border-b border-border/50">
            <p className="text-xs font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
              Usage by Function
            </p>
          </div>
          <div className="divide-y divide-border/30">
            {stats.breakdown.map((fn) => (
              <div key={fn.name} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Zap className="w-3.5 h-3.5 text-accent/60" />
                  <span className="text-xs font-mono text-foreground">{fn.name}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-xs text-muted-foreground">
                    {fn.calls} call{fn.calls !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-mono text-foreground">
                    {fn.tokens.toLocaleString()} tokens
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ${((fn.tokens / 1_000_000) * COST_PER_MILLION_TOKENS).toFixed(4)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </LBDCard>
      )}

      {stats.breakdown.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No AI usage recorded this month.
        </div>
      )}
    </div>
  );
}
