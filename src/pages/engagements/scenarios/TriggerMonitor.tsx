/**
 * TriggerMonitor
 *
 * Real-time subscription to intel_items for the engagement.
 * Checks if new urgent items match any scenario trigger_events.
 * Shows a yellow alert banner with "View Scenario" | "Dismiss" actions.
 */

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { Scenario } from '@/hooks/useScenarios';

/* ─────────────────────────────────────────────
   Alert type
───────────────────────────────────────────── */

interface TriggerAlert {
  id: string;
  scenarioName: string;
  scenarioId: string;
  matchedKeyword: string;
  intelHeadline: string;
}

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */

interface TriggerMonitorProps {
  engagementId: string;
  scenarios: Scenario[];
  onViewScenario?: (scenarioId: string) => void;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function TriggerMonitor({ engagementId, scenarios, onViewScenario }: TriggerMonitorProps) {
  const [alerts, setAlerts] = useState<TriggerAlert[]>([]);

  useEffect(() => {
    if (!engagementId) return;

    const channel = supabase
      .channel(`scenario-trigger-${engagementId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'intel_items',
          filter: `engagement_id=eq.${engagementId}`,
        },
        (payload) => {
          const item = payload.new as { id: string; headline: string; is_urgent: boolean };
          if (!item.is_urgent) return;

          // Check trigger event keywords against headline (case-insensitive)
          const headline = (item.headline ?? '').toLowerCase();
          for (const s of scenarios) {
            if (s.status === 'resolved') continue;
            for (const te of s.trigger_events) {
              if (headline.includes(te.toLowerCase())) {
                setAlerts((prev) => {
                  // Deduplicate
                  if (prev.some((a) => a.scenarioId === s.id && a.id === item.id)) return prev;
                  return [
                    ...prev,
                    {
                      id: item.id,
                      scenarioName: s.name,
                      scenarioId: s.id,
                      matchedKeyword: te,
                      intelHeadline: item.headline,
                    },
                  ];
                });
              }
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [engagementId, scenarios]);

  /** Dismiss a single alert */
  const dismiss = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={`${alert.id}-${alert.scenarioId}`}
          className="flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-500/40 bg-amber-500/10"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="flex-1 text-xs text-foreground">
            <span className="font-semibold">Potential scenario trigger detected:</span>{' '}
            <span className="text-amber-300">{alert.scenarioName}</span>{' '}
            — keyword "{alert.matchedKeyword}" matched in intel item.
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {onViewScenario && (
              <button
                type="button"
                onClick={() => onViewScenario(alert.scenarioId)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 transition-colors"
              >
                <Eye className="w-3 h-3" />
                View
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(alert.id)}
              className="p-1 rounded hover:bg-card transition-colors text-muted-foreground hover:text-foreground"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
