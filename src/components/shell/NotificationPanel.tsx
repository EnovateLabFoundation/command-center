/**
 * NotificationPanel
 *
 * Right-side slide-in panel showing the current user's notifications,
 * newest first. Powered by Supabase Realtime — updates in real-time.
 *
 * Features:
 *   - Colour-coded notification types
 *   - Click → mark as read + navigate to link_to
 *   - "Mark all as read" button
 *   - "View all" → /notifications full page
 *   - Unread count badge (exported for parent header bell)
 *
 * Props:
 *   open    — whether the panel is visible
 *   onClose — called when user clicks backdrop or close button
 */

import { useNavigate } from 'react-router-dom';
import {
  X, CheckCheck, ExternalLink, Bell, Loader2,
  AlertTriangle, Clock, Shield, Key, Settings,
  Smile, Clapperboard, FileText, TriangleAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  type AppNotification,
  type NotificationType,
} from '@/hooks/useNotifications';

/* ─── Type config ────────────────────────────────────────────────────────── */

const TYPE_CONFIG: Record<NotificationType, {
  Icon:   React.ElementType;
  colour: string;
}> = {
  escalation:    { Icon: AlertTriangle,  colour: 'text-red-400 bg-red-900/20 border-red-700/40'    },
  crisis:        { Icon: TriangleAlert,  colour: 'text-red-500 bg-red-900/30 border-red-600/50'    },
  overdue:       { Icon: Clock,          colour: 'text-amber-400 bg-amber-900/20 border-amber-700/40' },
  quality_gate:  { Icon: Shield,         colour: 'text-orange-400 bg-orange-900/20 border-orange-700/40' },
  portal_access: { Icon: Key,            colour: 'text-blue-400 bg-blue-900/20 border-blue-700/40'  },
  system:        { Icon: Settings,       colour: 'text-muted-foreground bg-card border-border'      },
  sentiment:     { Icon: Smile,          colour: 'text-purple-400 bg-purple-900/20 border-purple-700/40' },
  scenario:      { Icon: AlertTriangle,  colour: 'text-amber-300 bg-amber-900/20 border-amber-600/40' },
  content:       { Icon: Clapperboard,   colour: 'text-emerald-400 bg-emerald-900/20 border-emerald-700/40' },
  report:        { Icon: FileText,       colour: 'text-accent bg-accent/10 border-accent/30'        },
};

/* ─── Time-ago helper ────────────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/* ─── Single notification item ───────────────────────────────────────────── */

function NotifItem({
  notif,
  onRead,
  onClose,
}: {
  notif:   AppNotification;
  onRead:  (id: string) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;

  function handleClick() {
    if (!notif.is_read) onRead(notif.id);
    if (notif.link_to) {
      onClose();
      navigate(notif.link_to);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={cn(
        'flex items-start gap-2.5 p-3 rounded-lg border transition-all cursor-pointer',
        'hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        notif.is_read
          ? 'opacity-50 border-border/30 bg-card/10'
          : 'border-border/60 bg-card/30',
      )}
    >
      {/* Icon */}
      <div className="relative flex-none mt-0.5">
        <div className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center border text-xs flex-none',
          cfg.colour,
        )}>
          <cfg.Icon className="w-3 h-3" aria-hidden="true" />
        </div>
        {!notif.is_read && (
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-xs leading-snug line-clamp-2',
          notif.is_read ? 'text-muted-foreground' : 'text-foreground font-medium',
        )}>
          {notif.title}
        </p>
        {notif.body && (
          <p className="text-[11px] text-muted-foreground/50 mt-0.5 line-clamp-2 leading-relaxed">
            {notif.body}
          </p>
        )}
        <p className="text-[9px] font-mono text-muted-foreground/35 mt-1">
          {timeAgo(notif.created_at)}
        </p>
      </div>

      {/* Link hint */}
      {notif.link_to && !notif.is_read && (
        <ExternalLink className="w-3 h-3 text-muted-foreground/30 flex-none mt-1" aria-hidden="true" />
      )}
    </div>
  );
}

/* ─── Props ──────────────────────────────────────────────────────────────── */

interface NotificationPanelProps {
  open:    boolean;
  onClose: () => void;
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading } = useNotifications();
  const { mutate: markAsRead } = useMarkAsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAllAsRead();

  /* Close on Escape */
  // Handled via useEffect in parent (AppShell)

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
          'fixed top-0 right-0 h-full z-50 flex flex-col',
          'w-full sm:w-80 bg-card border-l border-border shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-border flex-none">
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
            <span className="font-mono text-[10px] tracking-[0.3em] text-accent uppercase">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="text-[9px] font-mono bg-accent text-accent-foreground rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Mark all read */}
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                disabled={isMarkingAll}
                title="Mark all as read"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {isMarkingAll
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  : <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                }
              </button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Close notifications"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-accent" aria-label="Loading notifications" />
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="text-center py-16 space-y-2">
              <Bell className="w-6 h-6 text-muted-foreground/20 mx-auto" aria-hidden="true" />
              <p className="text-xs text-muted-foreground/40">No notifications yet.</p>
            </div>
          )}

          {!isLoading && notifications.map((notif) => (
            <NotifItem
              key={notif.id}
              notif={notif}
              onRead={markAsRead}
              onClose={onClose}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex-none border-t border-border px-4 py-3 flex items-center justify-between">
          <p className="text-[9px] font-mono tracking-widest text-muted-foreground/40 uppercase">
            LBD-SIP
          </p>
          <button
            onClick={() => { onClose(); navigate('/notifications'); }}
            className="text-[10px] font-mono text-accent/70 hover:text-accent transition-colors"
          >
            View all →
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─── Re-export unread count for parent ──────────────────────────────────── */
export { useNotifications };
