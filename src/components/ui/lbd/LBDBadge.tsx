import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export type RAGStatus = 'red' | 'amber' | 'green';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type AlignmentStatus = 'hostile' | 'neutral' | 'supportive' | 'champion';
export type Phase = '1' | '2' | '3' | '4';
export type BadgeVariant = 'rag' | 'priority' | 'alignment' | 'phase' | 'role' | 'status';

interface LBDBadgeProps {
  variant: BadgeVariant;
  value: string;
  className?: string;
  size?: 'sm' | 'md';
}

/* ─────────────────────────────────────────────
   Colour maps
───────────────────────────────────────────── */

const ragColors: Record<string, string> = {
  red:   'bg-destructive/15 text-red-400 border-destructive/40 ring-1 ring-destructive/20',
  amber: 'bg-warning/15 text-yellow-400 border-warning/40 ring-1 ring-warning/20',
  green: 'bg-success/15 text-green-400 border-success/40 ring-1 ring-success/20',
};

const ragDots: Record<string, string> = {
  red:   'bg-red-500',
  amber: 'bg-yellow-500',
  green: 'bg-green-500',
};

const ragLabels: Record<string, string> = {
  red:   'RED',
  amber: 'AMBER',
  green: 'GREEN',
};

const priorityColors: Record<string, string> = {
  critical: 'bg-destructive/20 text-red-400 border-destructive/50',
  high:     'bg-orange-900/30 text-orange-400 border-orange-800/50',
  medium:   'bg-warning/10 text-yellow-500 border-warning/30',
  low:      'bg-muted/40 text-muted-foreground border-border',
};

const priorityDots: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-muted-foreground',
};

const alignmentColors: Record<string, string> = {
  hostile:    'bg-destructive/15 text-red-400 border-destructive/30',
  neutral:    'bg-muted/30 text-muted-foreground border-border',
  supportive: 'bg-blue-900/30 text-blue-400 border-blue-800/40',
  champion:   'bg-success/15 text-green-400 border-success/30',
};

const phaseColors: Record<string, string> = {
  '1': 'bg-blue-900/30 text-blue-400 border-blue-700/40',
  '2': 'bg-accent/10 text-accent border-accent/30',
  '3': 'bg-orange-900/20 text-orange-400 border-orange-700/30',
  '4': 'bg-success/10 text-green-400 border-success/30',
};

const statusColors: Record<string, string> = {
  active:    'bg-success/15 text-green-400 border-success/30',
  inactive:  'bg-muted/30 text-muted-foreground border-border',
  pending:   'bg-warning/15 text-yellow-400 border-warning/30',
  closed:    'bg-muted/20 text-muted-foreground/60 border-border/50',
  published: 'bg-success/15 text-green-400 border-success/30',
  draft:     'bg-muted/30 text-muted-foreground border-border',
  approved:  'bg-blue-900/30 text-blue-400 border-blue-700/40',
  scheduled: 'bg-accent/10 text-accent border-accent/30',
  archived:  'bg-muted/20 text-muted-foreground/50 border-border/40',
};

const roleColors: Record<string, string> = {
  super_admin:        'bg-accent/15 text-accent border-accent/30',
  lead_advisor:       'bg-blue-900/30 text-blue-400 border-blue-700/40',
  senior_advisor:     'bg-indigo-900/30 text-indigo-400 border-indigo-700/40',
  comms_director:     'bg-purple-900/30 text-purple-400 border-purple-700/40',
  intel_analyst:      'bg-cyan-900/30 text-cyan-400 border-cyan-700/40',
  digital_strategist: 'bg-teal-900/30 text-teal-400 border-teal-700/40',
  client_principal:   'bg-muted/30 text-muted-foreground border-border',
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export function LBDBadge({ variant, value, className, size = 'md' }: LBDBadgeProps) {
  const normalized = value.toLowerCase().replace(/\s+/g, '_');

  const base = cn(
    'inline-flex items-center gap-1.5 font-mono tracking-wide border rounded-full leading-none',
    size === 'sm' ? 'text-[9px] px-2 py-0.5' : 'text-[10px] px-2.5 py-1',
  );

  /* RAG */
  if (variant === 'rag') {
    const colorClass = ragColors[normalized] ?? ragColors.amber;
    const dotClass = ragDots[normalized] ?? ragDots.amber;
    const label = ragLabels[normalized] ?? value.toUpperCase();
    return (
      <span className={cn(base, colorClass, className)} aria-label={`Status: ${label}`}>
        <span className={cn('w-1.5 h-1.5 rounded-full flex-none', dotClass)} />
        {label}
      </span>
    );
  }

  /* Priority */
  if (variant === 'priority') {
    const colorClass = priorityColors[normalized] ?? priorityColors.medium;
    const dotClass = priorityDots[normalized] ?? priorityDots.medium;
    return (
      <span className={cn(base, colorClass, className)} aria-label={`Priority: ${value}`}>
        <span className={cn('w-1.5 h-1.5 rounded-full flex-none', dotClass)} />
        {value.toUpperCase()}
      </span>
    );
  }

  /* Alignment */
  if (variant === 'alignment') {
    const colorClass = alignmentColors[normalized] ?? alignmentColors.neutral;
    return (
      <span className={cn(base, colorClass, className)} aria-label={`Alignment: ${value}`}>
        {value.toUpperCase()}
      </span>
    );
  }

  /* Phase */
  if (variant === 'phase') {
    const colorClass = phaseColors[value] ?? phaseColors['1'];
    return (
      <span className={cn(base, colorClass, className)} aria-label={`Phase ${value}`}>
        PHASE {value}
      </span>
    );
  }

  /* Status */
  if (variant === 'status') {
    const colorClass = statusColors[normalized] ?? 'bg-muted/30 text-muted-foreground border-border';
    return (
      <span className={cn(base, colorClass, className)} aria-label={`Status: ${value}`}>
        {value.toUpperCase().replace('_', ' ')}
      </span>
    );
  }

  /* Role */
  if (variant === 'role') {
    const colorClass = roleColors[normalized] ?? 'bg-muted/30 text-muted-foreground border-border';
    return (
      <span className={cn(base, colorClass, className)} aria-label={`Role: ${value}`}>
        {value.replace(/_/g, ' ').toUpperCase()}
      </span>
    );
  }

  return null;
}
