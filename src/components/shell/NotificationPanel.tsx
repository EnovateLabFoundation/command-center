/**
 * NotificationPanel
 *
 * A right-side slide-in panel showing:
 *   1. Urgent Intel — intel_items flagged as urgent
 *   2. Upcoming Touchpoints — cadence_touchpoints in next 7 days
 *   3. Overdue Actions — action_items past their due date
 *
 * Fetches lazily (only on first open). The panel renders as a fixed overlay
 * that slides in from the right with a backdrop.
 *
 * Props:
 *   open    — whether the panel is visible
 *   onClose — called when user clicks backdrop or close button
 */

import { useEffect, useState } from 'react';
import { X, AlertTriangle, Calendar, CheckSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { LBDCard, LBDBadge } from '@/components/ui/lbd';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

interface UrgentIntelItem {
  id: string;
  title: string;
  category: string;
  created_at: string;
}

interface Touchpoint {
  id: string;
  title: string;
  scheduled_date: string;
  touchpoint_type: string;
}

interface ActionItem {
  id: string;
  title: string;
  due_date: string;
  priority: string;
}

interface NotificationData {
  urgentIntel: UrgentIntelItem[];
  touchpoints: Touchpoint[];
  overdueActions: ActionItem[];
}

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const [data, setData] = useState<NotificationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  /* Fetch on first open */
  useEffect(() => {
    if (!open || hasFetched) return;

    const fetch = async () => {
      setIsLoading(true);
      try {
        const now = new Date().toISOString();
        const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const [intelRes, touchRes] = await Promise.allSettled([
          supabase
            .from('intel_items')
            .select('id, headline, narrative_theme, created_at')
            .eq('is_urgent', true)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('cadence_touchpoints')
            .select('id, touchpoint_type, scheduled_date, status')
            .gte('scheduled_date', now)
            .lte('scheduled_date', in7Days)
            .order('scheduled_date', { ascending: true })
            .limit(5),
        ]);

        const urgentIntel = (intelRes.status === 'fulfilled' ? (intelRes.value.data ?? []) : [])
          .map((i: any) => ({ id: i.id, title: i.headline, category: i.narrative_theme ?? 'Intel', created_at: i.created_at }));
        const touchpoints = (touchRes.status === 'fulfilled' ? (touchRes.value.data ?? []) : [])
          .map((t: any) => ({ id: t.id, title: t.touchpoint_type?.replace(/_/g, ' ') ?? 'Touchpoint', scheduled_date: t.scheduled_date, touchpoint_type: t.touchpoint_type }));

        setData({
          urgentIntel,
          touchpoints,
          overdueActions: [],
        });
        setHasFetched(true);
      } catch (err) {
        console.error('[NotificationPanel] fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetch();
  }, [open, hasFetched]);

  /* Close on Escape */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const total =
    (data?.urgentIntel.length ?? 0) +
    (data?.touchpoints.length ?? 0) +
    (data?.overdueActions.length ?? 0);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Panel */}
      <aside
        aria-label="Notifications"
        aria-hidden={!open}
        className={cn(
          'fixed top-0 right-0 h-full z-50 w-80 flex flex-col',
          'bg-card border-l border-border shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-border flex-none">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.3em] text-accent uppercase">
              Notifications
            </span>
            {total > 0 && (
              <span className="text-[9px] font-mono bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center">
                {total > 9 ? '9+' : total}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close notifications"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-accent" aria-label="Loading notifications" />
            </div>
          )}

          {!isLoading && data && (
            <>
              {/* Urgent Intel */}
              <NotifSection
                icon={<AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                title="Urgent Intel"
                count={data.urgentIntel.length}
                empty="No urgent items"
              >
                {data.urgentIntel.map((item) => (
                  <NotifItem
                    key={item.id}
                    title={item.title}
                    meta={item.category}
                    variant="urgent"
                  />
                ))}
              </NotifSection>

              {/* Upcoming Touchpoints */}
              <NotifSection
                icon={<Calendar className="w-3.5 h-3.5 text-accent" />}
                title="Upcoming Touchpoints"
                count={data.touchpoints.length}
                empty="No touchpoints this week"
              >
                {data.touchpoints.map((item) => (
                  <NotifItem
                    key={item.id}
                    title={item.title}
                    meta={formatDate(item.scheduled_date)}
                    variant="info"
                  />
                ))}
              </NotifSection>

              {/* Overdue Actions */}
              <NotifSection
                icon={<CheckSquare className="w-3.5 h-3.5 text-amber-400" />}
                title="Overdue Actions"
                count={data.overdueActions.length}
                empty="No overdue actions"
              >
                {data.overdueActions.map((item) => (
                  <NotifItem
                    key={item.id}
                    title={item.title}
                    meta={`Due ${formatDate(item.due_date)}`}
                    badge={item.priority}
                    variant="warning"
                  />
                ))}
              </NotifSection>
            </>
          )}

          {!isLoading && !data && (
            <p className="text-center text-xs text-muted-foreground py-8">
              Failed to load notifications.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none border-t border-border px-4 py-3">
          <p className="text-[9px] font-mono tracking-widest text-muted-foreground/50 text-center uppercase">
            LBD-SIP Intelligence Platform
          </p>
        </div>
      </aside>
    </>
  );
}

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

function NotifSection({
  icon,
  title,
  count,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <LBDCard className="p-3">
      <div className="flex items-center gap-1.5 mb-2.5">
        {icon}
        <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
          {title}
        </span>
        {count > 0 && (
          <span className="ml-auto text-[9px] font-mono text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {count === 0 ? (
        <p className="text-xs text-muted-foreground/50 text-center py-2">{empty}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </LBDCard>
  );
}

function NotifItem({
  title,
  meta,
  badge,
  variant,
}: {
  title: string;
  meta: string;
  badge?: string;
  variant: 'urgent' | 'info' | 'warning';
}) {
  const borderColor = {
    urgent: 'border-l-destructive',
    info:   'border-l-accent',
    warning:'border-l-amber-400',
  }[variant];

  return (
    <div className={cn('border-l-2 pl-2.5 py-0.5', borderColor)}>
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs text-foreground leading-snug line-clamp-2">{title}</p>
        {badge && (
          <LBDBadge variant="priority" value={badge} size="sm" className="flex-none mt-0.5" />
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5">{meta}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

/* ─────────────────────────────────────────────
   Unread count helper (for parent header badge)
───────────────────────────────────────────── */

/** Returns the total notification count from fetched data (for header badge) */
export function getNotifCount(data: NotificationData | null): number {
  if (!data) return 0;
  return data.urgentIntel.length + data.touchpoints.length + data.overdueActions.length;
}
