import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LBDDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Width of the panel (default 480px) */
  width?: number | string;
  /** Show a gold top-border accent on the panel header */
  accent?: boolean;
  className?: string;
}

export function LBDDrawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 480,
  accent = true,
  className,
}: LBDDrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        />

        {/* Drawer panel */}
        <DialogPrimitive.Content
          className={cn(
            'fixed right-0 top-0 bottom-0 z-50 flex flex-col',
            'bg-card border-l border-border',
            accent && 'border-t-0',
            'shadow-2xl shadow-black/50',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right',
            'duration-300',
            className,
          )}
          style={{ width: typeof width === 'number' ? `${width}px` : width }}
          aria-describedby={description ? 'drawer-desc' : undefined}
        >
          {/* Gold accent top stripe */}
          {accent && (
            <div className="h-[2px] w-full bg-accent flex-none" aria-hidden="true" />
          )}

          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-border/60 flex-none">
            <div className="min-w-0 pr-4">
              <DialogPrimitive.Title className="text-base font-semibold text-foreground leading-snug">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description
                  id="drawer-desc"
                  className="mt-1 text-sm text-muted-foreground leading-relaxed"
                >
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="flex-none p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/60 flex-none flex-wrap">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ─────────────────────────────────────────────
   Section divider for drawer body
───────────────────────────────────────────── */

interface DrawerSectionProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function LBDDrawerSection({ label, children, className }: DrawerSectionProps) {
  return (
    <section className={cn('mb-6', className)}>
      <h4 className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase mb-3">
        {label}
      </h4>
      {children}
    </section>
  );
}

interface DrawerFieldProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function LBDDrawerField({ label, value, className }: DrawerFieldProps) {
  return (
    <div className={cn('flex flex-col gap-0.5 py-2.5 border-b border-border/30 last:border-0', className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value ?? '—'}</span>
    </div>
  );
}
