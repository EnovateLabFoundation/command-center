import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Breadcrumb {
  label: string;
  href?: string;
}

export interface LBDPageHeaderProps {
  title: string;
  subtitle?: string;
  /** Alias for subtitle — kept for backward compat */
  description?: string;
  breadcrumbs?: Breadcrumb[];
  /** Action buttons rendered on the right */
  actions?: React.ReactNode;
  /** Tag/badge rendered next to title */
  tag?: React.ReactNode;
  className?: string;
  /** Mono label above title (like "INTEL / STAKEHOLDERS") */
  eyebrow?: string;
  eyebrowColor?: string;
  divider?: boolean;
}

export function LBDPageHeader({
  title,
  subtitle,
  description,
  breadcrumbs,
  actions,
  tag,
  className,
  eyebrow,
  eyebrowColor = 'text-accent',
  divider = true,
}: LBDPageHeaderProps) {
  const resolvedSubtitle = subtitle ?? description;
  const hasBreadcrumbs = breadcrumbs && breadcrumbs.length > 0;

  return (
    <header
      className={cn(
        'mb-8',
        divider && 'pb-6 border-b border-border/50',
        className,
      )}
    >
      {/* Breadcrumbs */}
      {hasBreadcrumbs && (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex items-center gap-1 flex-wrap">
            {/* Home */}
            <li>
              <Link
                to="/"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Home"
              >
                <Home className="w-3 h-3" aria-hidden="true" />
              </Link>
            </li>

            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <li key={i} className="flex items-center gap-1">
                  <ChevronRight
                    className="w-3 h-3 text-muted-foreground/50 flex-none"
                    aria-hidden="true"
                  />
                  {crumb.href && !isLast ? (
                    <Link
                      to={crumb.href}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        'text-xs',
                        isLast ? 'text-foreground font-medium' : 'text-muted-foreground',
                      )}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Eyebrow */}
      {eyebrow && (
        <p
          className={cn(
            'font-mono text-[10px] tracking-[0.3em] uppercase mb-1.5',
            eyebrowColor,
          )}
        >
          {eyebrow}
        </p>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {title}
            </h1>
            {tag && <div className="flex-none">{tag}</div>}
          </div>
          {resolvedSubtitle && (
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {resolvedSubtitle}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-none flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
