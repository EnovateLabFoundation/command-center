import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, Trash2, ShieldAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface LBDConfirmDialogProps {
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  title: string;
  description?: string;
  /** Extra detail below description */
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  /** Require user to type a confirmation phrase */
  confirmPhrase?: string;
  /** Show loading spinner on confirm button after click */
  loading?: boolean;
}

const variantConfig: Record<
  ConfirmVariant,
  {
    Icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    confirmBtn: string;
  }
> = {
  danger: {
    Icon: Trash2,
    iconBg: 'bg-destructive/10',
    iconColor: 'text-red-400',
    confirmBtn:
      'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive',
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: 'bg-warning/10',
    iconColor: 'text-yellow-400',
    confirmBtn:
      'bg-warning text-white hover:bg-warning/90 focus-visible:ring-warning',
  },
  info: {
    Icon: ShieldAlert,
    iconBg: 'bg-blue-900/30',
    iconColor: 'text-blue-400',
    confirmBtn:
      'bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-500',
  },
};

export function LBDConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  detail,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  confirmPhrase,
  loading = false,
}: LBDConfirmDialogProps) {
  const [phraseInput, setPhraseInput] = useState('');
  const [busy, setBusy] = useState(false);

  const cfg = variantConfig[variant];
  const { Icon } = cfg;

  const phraseMatch = confirmPhrase ? phraseInput.trim() === confirmPhrase.trim() : true;
  const isDisabled = !phraseMatch || busy || loading;

  const handleConfirm = async () => {
    if (isDisabled) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setPhraseInput('');
    }
  };

  const handleCancel = () => {
    setPhraseInput('');
    onCancel();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/75 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        />

        {/* Dialog */}
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-md',
            'bg-card border border-border rounded-xl shadow-2xl shadow-black/50',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}
        >
          <div className="p-6">
            {/* Close */}
            <DialogPrimitive.Close
              className="absolute right-4 top-4 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={handleCancel}
              aria-label="Cancel"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </DialogPrimitive.Close>

            {/* Icon + title */}
            <div className="flex items-start gap-4 mb-4">
              <div
                className={cn(
                  'flex-none flex items-center justify-center w-10 h-10 rounded-full',
                  cfg.iconBg,
                )}
                aria-hidden="true"
              >
                <Icon className={cn('w-5 h-5', cfg.iconColor)} />
              </div>
              <div className="min-w-0 pt-1">
                <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                  {title}
                </DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
            </div>

            {/* Detail */}
            {detail && (
              <p className="mb-4 text-xs text-muted-foreground leading-relaxed bg-background/50 border border-border/50 rounded-lg px-3 py-2.5">
                {detail}
              </p>
            )}

            {/* Confirm phrase input */}
            {confirmPhrase && (
              <div className="mb-5">
                <label className="block text-xs text-muted-foreground mb-1.5">
                  Type{' '}
                  <code className="font-mono text-foreground bg-background/60 px-1.5 py-0.5 rounded">
                    {confirmPhrase}
                  </code>{' '}
                  to confirm
                </label>
                <input
                  type="text"
                  value={phraseInput}
                  onChange={(e) => setPhraseInput(e.target.value)}
                  placeholder={confirmPhrase}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  aria-label="Confirmation phrase"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:border-accent/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {cancelLabel}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isDisabled}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                  'disabled:opacity-40 disabled:pointer-events-none',
                  cfg.confirmBtn,
                )}
                aria-busy={busy || loading}
              >
                {(busy || loading) && (
                  <svg
                    className="w-3.5 h-3.5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                )}
                {confirmLabel}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
