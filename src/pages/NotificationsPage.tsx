/**
 * NotificationsPage — /notifications
 *
 * Full-page view of all notifications for the current user.
 * Groups by date, colour-codes by type, and supports bulk mark-as-read.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, AlertTriangle, Shield, Clock, TriangleAlert,
  Key, Settings, Smile, Clapperboard, FileText, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LBDPageHeader } from '@/components/ui/lbd';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  type AppNotification,
  type NotificationType,
} from '@/hooks/useNotifications';

/* ─── Type config ────────────────────────────────────────────────────────── */

const TYPE_CONFIG: Record<NotificationType, {
  Icon: React.ElementType;
  colour: string;
  label: string;
}> = {
  escalation:    { Icon: AlertTriangle,  colour: 'text-red-400 bg-red-900/20 border-red-700/40',     label: 'Escalation'      },
  crisis:        { Icon: TriangleAlert,  colour: 'text-red-500 bg-red-900/30 border-red-600/50',     label: 'Crisis'          },
  overdue:       { Icon: Clock,          colour: 'text-amber-400 bg-amber-900/20 border-amber-700/40', label: 'Overdue'         },
  quality_gate:  { Icon: Shield,         colour: 'text-orange-400 bg-orange-900/20 border-orange-700/40', label: 'Quality Gate' },
  portal_access: { Icon: Key,            colour: 'text-blue-400 bg-blue-900/20 border-blue-700/40',  label: 'Portal Access'   },
  system:        { Icon: Settings,       colour: 'text-muted-foreground bg-card border-border',       label: 'System'          },
  sentiment:     { Icon: Smile,          colour: 'text-purple-400 bg-purple-900/20 border-purple-700/40', label: 'Sentiment'   },
  scenario:      { Icon: AlertTriangle,  colour: 'text-amber-300 bg-amber-900/20 border-amber-600/40', label: 'Scenario'      },
  content:       { Icon: Clapperboard,   colour: 'text-emerald-400 bg-emerald-900/20 border-emerald-700/40', label: 'Content' },
  report:        { Icon: FileText,       colour: 'text-accent bg-accent/10 border-accent/30',        label: 'Report'          },
};

/* ─── Time-ago helper ────────────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* ─── Single notification row ────────────────────────────────────────────── */

function NotifRow({ notif, onRead }: { notif: AppNotification; onRead: (id: string) => void }) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;

  function handleClick() {
    if (!notif.is_read) onRead(notif.id);
    if (notif.link_to) navigate(notif.link_to);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer',
        'hover:border-accent/30 hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        notif.is_read
          ? 'opacity-60 border-border/40 bg-card/20'
          : 'border-border/60 bg-card/40',
      )}
    >
      {/* Unread indicator */}
      <div className="mt-1 flex-none relative">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center border text-sm flex-none',
          cfg.colour,
        )}>
          <cfg.Icon className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
        {!notif.is_read && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <p className={cn(
            'text-sm leading-snug flex-1',
            notif.is_read ? 'text-foreground/60' : 'text-foreground font-medium',
          )}>
            {notif.title}
          </p>
          <span className="text-[10px] font-mono text-muted-foreground/40 flex-none mt-0.5">
            {timeAgo(notif.created_at)}
          </span>
        </div>
        {notif.body && (
          <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2 leading-relaxed">
            {notif.body}
          </p>
        )}
        <span className={cn(
          'inline-block mt-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider',
          cfg.colour,
        )}>
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading } = useNotifications();
  const { mutate: markAsRead } = useMarkAsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAllAsRead();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const displayed = filter === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  /* Group by day */
  const grouped = displayed.reduce((acc, n) => {
    const key = dayLabel(n.created_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {} as Record<string, AppNotification[]>);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <LBDPageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        icon={<Bell className="w-5 h-5" />}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter toggle */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-mono transition-colors',
                  filter === f
                    ? 'bg-accent/10 text-accent border border-accent/30'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f === 'all' ? 'All' : `Unread (${unreadCount})`}
              </button>
            ))}
          </div>

          {/* Mark all read */}
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              disabled={isMarkingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-accent/30 transition-colors disabled:opacity-50"
            >
              {isMarkingAll
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <CheckCheck className="w-3 h-3" />
              }
              Mark all read
            </button>
          )}
        </div>
      </LBDPageHeader>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && displayed.length === 0 && (
        <div className="rounded-xl border border-border/60 bg-card/20 p-16 text-center space-y-3">
          <Bell className="w-8 h-8 text-muted-foreground/20 mx-auto" />
          <p className="text-sm text-muted-foreground/50">
            {filter === 'unread' ? 'All caught up!' : 'No notifications yet.'}
          </p>
        </div>
      )}

      {/* Grouped list */}
      {!isLoading && Object.entries(grouped).map(([day, items]) => (
        <div key={day} className="space-y-2">
          <p className="text-[10px] font-mono tracking-widest text-muted-foreground/40 uppercase px-1">
            {day}
          </p>
          {items.map((n) => (
            <NotifRow key={n.id} notif={n} onRead={markAsRead} />
          ))}
        </div>
      ))}
    </div>
  );
}
